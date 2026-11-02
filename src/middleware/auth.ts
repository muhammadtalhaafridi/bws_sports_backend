import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { forbidden, unauthorized } from "../utils/HttpError";
import { verifyToken } from "../utils/jwt";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw unauthorized();

  let payload;
  try {
    payload = verifyToken(header.slice(7));
  } catch {
    throw unauthorized("Your session has expired. Please log in again");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, role: true },
  });
  if (!user) throw unauthorized();

  req.user = user;
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") throw forbidden("Admin access only");
  next();
}
