import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { Prisma } from "../generated/prisma/client";
import { HttpError } from "../utils/HttpError";
import { removeUpload, uploadPath } from "../utils/helpers";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export async function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // A failed request should not leave its uploaded image behind.
  if (req.file) await removeUpload(uploadPath(req.file));

  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message, errors: err.details });
    return;
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Image must be 2 MB or smaller" : err.message;
    res.status(400).json({ message });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      res.status(409).json({ message: "A record with this value already exists" });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ message: "Record not found" });
      return;
    }
    if (err.code === "P2003") {
      res.status(409).json({ message: "This record is used by other records and cannot be removed" });
      return;
    }
  }
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ message: "Invalid JSON body" });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server" });
}
