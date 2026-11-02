import type { Request, Response } from "express";
import type { z } from "zod";
import { Prisma } from "../generated/prisma/client";
import type { OrderStatus } from "../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { parseQuery } from "../middleware/validate";
import { badRequest, conflict, forbidden, notFound } from "../utils/HttpError";
import { pageMeta, pagination, parseId } from "../utils/helpers";
import { orderQuerySchema, type createOrderSchema, type orderStatusSchema } from "../validators";

const orderDetails = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  items: {
    include: { product: { select: { id: true, name: true, image: true, category: { select: { name: true } } } } },
    orderBy: { id: "asc" },
  },
} satisfies Prisma.OrderInclude;

export async function createOrder(req: Request, res: Response) {
  const { items, phone, address, description } = req.body as z.output<typeof createOrderSchema>;

  // Combine repeated products into one line.
  const quantities = new Map<number, number>();
  for (const item of items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);

  const order = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({ where: { id: { in: [...quantities.keys()] } } });

    let total = new Prisma.Decimal(0);
    const lines: { productId: number; quantity: number; price: Prisma.Decimal }[] = [];

    for (const [productId, quantity] of quantities) {
      const product = products.find((p) => p.id === productId);
      if (!product) throw badRequest("A product in your cart is no longer available");
      if (product.stock < quantity) {
        throw conflict(
          product.stock === 0
            ? `${product.name} is out of stock`
            : `Only ${product.stock} of ${product.name} left in stock`,
        );
      }

      // Guarded decrement so two orders cannot both take the last item.
      const updated = await tx.product.updateMany({
        where: { id: productId, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      if (updated.count === 0) throw conflict(`${product.name} just sold out. Please update your cart.`);

      total = total.add(product.price.mul(quantity));
      lines.push({ productId, quantity, price: product.price });
    }

    return tx.order.create({
      data: {
        userId: req.user!.id,
        total,
        phone,
        address,
        description,
        items: { create: lines },
      },
      include: orderDetails,
    });
  });

  res.status(201).json({ order });
}

export async function myOrders(req: Request, res: Response) {
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.id },
    include: orderDetails,
    orderBy: { orderDate: "desc" },
  });
  res.json({ orders });
}

export async function getOrder(req: Request, res: Response) {
  const order = await prisma.order.findUnique({ where: { id: parseId(req.params.id) }, include: orderDetails });
  if (!order) throw notFound("Order not found");
  if (req.user!.role !== "ADMIN" && order.userId !== req.user!.id) throw forbidden();
  res.json({ order });
}

/** Moves an order to a new status, putting stock back when it is cancelled. */
async function changeStatus(orderId: number, status: OrderStatus) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw notFound("Order not found");
    if (order.status === status) return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: orderDetails });
    if (order.status === "CANCELLED") throw badRequest("A cancelled order cannot be changed");

    if (status === "CANCELLED") {
      for (const item of order.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
    }

    return tx.order.update({ where: { id: orderId }, data: { status }, include: orderDetails });
  });
}

export async function cancelMyOrder(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw notFound("Order not found");
  if (order.userId !== req.user!.id) throw forbidden();
  if (order.status !== "PENDING") throw badRequest("Only pending orders can be cancelled");

  res.json({ order: await changeStatus(id, "CANCELLED") });
}

// ---------- Admin ----------
export async function listOrders(req: Request, res: Response) {
  const query = parseQuery(orderQuerySchema, req);
  const { page, limit, skip } = pagination({ ...query, limit: query.limit ?? 15 });

  const searchId = Number(query.search?.replace(/^BWS-?/i, ""));
  const where: Prisma.OrderWhereInput = {
    ...(query.status && { status: query.status }),
    ...(query.search && {
      OR: [
        { user: { name: { contains: query.search, mode: "insensitive" } } },
        { user: { email: { contains: query.search, mode: "insensitive" } } },
        { phone: { contains: query.search } },
        ...(Number.isInteger(searchId) && searchId > 0 && searchId < 2 ** 31 ? [{ id: searchId }] : []),
      ],
    }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } }, _count: { select: { items: true } } },
      orderBy: { orderDate: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  res.json({ orders, pagination: pageMeta(total, page, limit) });
}

export async function updateOrderStatus(req: Request, res: Response) {
  const { status } = req.body as z.output<typeof orderStatusSchema>;
  res.json({ order: await changeStatus(parseId(req.params.id), status) });
}
