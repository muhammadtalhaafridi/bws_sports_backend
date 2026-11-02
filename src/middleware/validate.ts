import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { z } from "zod";
import { badRequest } from "../utils/HttpError";

function fail(error: z.ZodError) {
  const fields = z.flattenError(error).fieldErrors;
  const first = error.issues[0];
  return badRequest(first ? first.message : "Invalid request", fields);
}

/** Validates and replaces req.body. */
export const validateBody = (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) throw fail(result.error);
  req.body = result.data;
  next();
};

/** Parses req.query (read-only in Express 5) and returns the typed result. */
export function parseQuery<T extends ZodType>(schema: T, req: Request): z.output<T> {
  const result = schema.safeParse(req.query);
  if (!result.success) throw fail(result.error);
  return result.data;
}
