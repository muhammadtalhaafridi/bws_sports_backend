import type { Request, Response } from "express";
import type { z } from "zod";
import { prisma } from "../lib/prisma";
import { conflict } from "../utils/HttpError";
import { parseId, removeUpload, uploadPath } from "../utils/helpers";
import type { categorySchema } from "../validators";

export async function listCategories(_req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { products: true } } },
  });
  res.json({
    categories: categories.map(({ _count, ...c }) => ({ ...c, productCount: _count.products })),
  });
}

/** Names are compared without case so "Bats" and "bats" cannot both exist. */
async function ensureUniqueName(name: string, exceptId?: number) {
  const existing = await prisma.category.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(exceptId && { id: { not: exceptId } }) },
  });
  if (existing) throw conflict(`A category named "${existing.name}" already exists`);
}

export async function createCategory(req: Request, res: Response) {
  const { name } = req.body as z.output<typeof categorySchema>;
  const image = uploadPath(req.file);
  try {
    await ensureUniqueName(name);
  } catch (error) {
    await removeUpload(image);
    throw error;
  }
  const category = await prisma.category.create({ data: { name, image } });
  res.status(201).json({ category });
}

export async function updateCategory(req: Request, res: Response) {
  const { name, removeImage } = req.body as z.output<typeof categorySchema>;
  const id = parseId(req.params.id);
  const image = uploadPath(req.file);
  try {
    await ensureUniqueName(name, id);
  } catch (error) {
    await removeUpload(image);
    throw error;
  }

  const current = await prisma.category.findUniqueOrThrow({ where: { id } });
  const category = await prisma.category.update({
    where: { id },
    data: { name, ...(image ? { image } : removeImage && { image: null }) },
  });
  if (image || removeImage) await removeUpload(current.image);

  res.json({ category });
}

export async function deleteCategory(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const products = await prisma.product.count({ where: { categoryId: id } });
  if (products > 0) {
    throw conflict(`This category has ${products} product(s). Move or delete them first.`);
  }
  const category = await prisma.category.delete({ where: { id } });
  await removeUpload(category.image);
  res.json({ message: "Category deleted" });
}
