import fs from "node:fs/promises";
import path from "node:path";
import { badRequest } from "./HttpError";

export const UPLOADS_DIR = path.resolve(import.meta.dirname, "../../uploads");

/** Parses a numeric route param such as /products/:id. */
export function parseId(value: unknown, label = "id"): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest(`Invalid ${label}`);
  return id;
}

export function pagination(query: { page?: number; limit?: number }) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 12));
  return { page, limit, skip: (page - 1) * limit };
}

export function pageMeta(total: number, page: number, limit: number) {
  return { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/** Public URL path for a file saved by multer, e.g. /uploads/products/abc.jpg */
export function uploadPath(file: Express.Multer.File | undefined): string | undefined {
  if (!file) return undefined;
  return "/" + path.relative(path.dirname(UPLOADS_DIR), file.path).split(path.sep).join("/");
}

/** Removes a previously uploaded file. Seed images are kept. */
export async function removeUpload(publicPath: string | null | undefined) {
  if (!publicPath || !/^\/uploads\/(products|users)\//.test(publicPath)) return;
  const file = path.join(path.dirname(UPLOADS_DIR), publicPath);
  await fs.unlink(file).catch(() => undefined);
}
