import type { Request, Response } from "express";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { parseQuery } from "../middleware/validate";
import { pageMeta, pagination } from "../utils/helpers";
import { listQuerySchema } from "../validators";

const LOW_STOCK = 5;

export async function getStats(_req: Request, res: Response) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 6);

  const [revenue, orders, pendingOrders, products, customers, unreadMessages, byStatus, recentOrders, lowStock, topItems, lastWeek] =
    await Promise.all([
      prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: "CANCELLED" } } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.product.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.message.count({ where: { isRead: false } }),
      prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.order.findMany({
        take: 6,
        orderBy: { orderDate: "desc" },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.product.findMany({
        where: { stock: { lte: LOW_STOCK } },
        orderBy: { stock: "asc" },
        take: 8,
        select: { id: true, name: true, stock: true, image: true },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: { order: { status: { not: "CANCELLED" } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.order.findMany({
        where: { orderDate: { gte: since }, status: { not: "CANCELLED" } },
        select: { orderDate: true, total: true },
      }),
    ]);

  const topProducts = await prisma.product.findMany({
    where: { id: { in: topItems.map((t) => t.productId) } },
    select: { id: true, name: true, image: true, price: true },
  });

  // Sales for each of the last 7 days (local dates).
  const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const salesByDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    return { date: dayKey(d), total: 0, orders: 0 };
  });
  for (const o of lastWeek) {
    const day = salesByDay.find((s) => s.date === dayKey(o.orderDate));
    if (day) {
      day.total += o.total.toNumber();
      day.orders += 1;
    }
  }

  res.json({
    totals: {
      revenue: revenue._sum.total?.toNumber() ?? 0,
      orders,
      pendingOrders,
      products,
      customers,
      unreadMessages,
    },
    ordersByStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
    salesByDay,
    recentOrders,
    lowStock,
    topProducts: topItems.map((t) => ({
      ...topProducts.find((p) => p.id === t.productId),
      sold: t._sum.quantity ?? 0,
    })),
  });
}

export async function listUsers(req: Request, res: Response) {
  const query = parseQuery(listQuerySchema, req);
  const { page, limit, skip } = pagination({ ...query, limit: query.limit ?? 15 });

  const where: Prisma.UserWhereInput = query.search
    ? {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        image: true,
        role: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    users: users.map(({ _count, ...u }) => ({ ...u, orderCount: _count.orders })),
    pagination: pageMeta(total, page, limit),
  });
}
