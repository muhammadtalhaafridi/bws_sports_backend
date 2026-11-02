import type { Request, Response } from "express";
import type { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { parseQuery } from "../middleware/validate";
import { badRequest, conflict, notFound } from "../utils/HttpError";
import { pageMeta, pagination, parseId, removeUpload, uploadPath } from "../utils/helpers";
import { productQuerySchema, type productSchema } from "../validators";

const withCategory = { category: { select: { id: true, name: true } } } as const;

const sortOrder: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  price_asc: { price: "asc" },
  price_desc: { price: "desc" },
  name: { name: "asc" },
  // Products that appear in the most orders first
  popular: { orderItems: { _count: "desc" } },
};

export async function listProducts(req: Request, res: Response) {
  const query = parseQuery(productQuerySchema, req);
  const { page, limit, skip } = pagination(query);

  const where: Prisma.ProductWhereInput = {
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ],
    }),
    ...(query.category && { categoryId: query.category }),
    ...(query.featured !== undefined && { featured: query.featured }),
    ...(query.inStock && { stock: { gt: 0 } }),
    ...((query.minPrice !== undefined || query.maxPrice !== undefined) && {
      price: {
        ...(query.minPrice !== undefined && { gte: query.minPrice }),
        ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
      },
    }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: withCategory,
      orderBy: [sortOrder[query.sort], { id: "desc" }],
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  res.json({ products, pagination: pageMeta(total, page, limit) });
}

export async function getProduct(req: Request, res: Response) {
  const product = await prisma.product.findUnique({
    where: { id: parseId(req.params.id) },
    include: withCategory,
  });
  if (!product) throw notFound("Product not found");

  const related = await prisma.product.findMany({
    where: { categoryId: product.categoryId, id: { not: product.id } },
    include: withCategory,
    take: 4,
    orderBy: { featured: "desc" },
  });

  res.json({ product, related });
}

async function ensureCategory(categoryId: number) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw badRequest("Selected category does not exist");
}

export async function createProduct(req: Request, res: Response) {
  const data = req.body as z.output<typeof productSchema>;
  await ensureCategory(data.categoryId);

  const product = await prisma.product.create({
    data: { ...data, image: uploadPath(req.file) },
    include: withCategory,
  });
  res.status(201).json({ product });
}

export async function updateProduct(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const data = req.body as z.output<typeof productSchema>;

  const current = await prisma.product.findUnique({ where: { id } });
  if (!current) throw notFound("Product not found");
  await ensureCategory(data.categoryId);

  const image = uploadPath(req.file);
  const product = await prisma.product.update({
    where: { id },
    data: {
      ...data,
      size: data.size ?? null,
      weight: data.weight ?? null,
      willow: data.willow ?? null,
      ...(image && { image }),
    },
    include: withCategory,
  });
  if (image) await removeUpload(current.image);

  res.json({ product });
}

export async function deleteProduct(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const product = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } } },
  });
  if (!product) throw notFound("Product not found");
  if (product._count.orderItems > 0) {
    throw conflict("This product is part of existing orders. Set its stock to 0 instead of deleting it.");
  }

  await prisma.product.delete({ where: { id } });
  await removeUpload(product.image);
  res.json({ message: "Product deleted" });
}
