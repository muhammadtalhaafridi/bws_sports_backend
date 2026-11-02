import type { Request, Response } from "express";
import type { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { parseQuery } from "../middleware/validate";
import { pageMeta, pagination, parseId } from "../utils/helpers";
import { listQuerySchema, type messageSchema } from "../validators";

export async function sendMessage(req: Request, res: Response) {
  const data = req.body as z.output<typeof messageSchema>;
  await prisma.message.create({ data });
  res.status(201).json({ message: "Thank you! Your message has been sent. We will reply soon." });
}

export async function listMessages(req: Request, res: Response) {
  const query = parseQuery(listQuerySchema, req);
  const { page, limit, skip } = pagination({ ...query, limit: query.limit ?? 15 });

  const where: Prisma.MessageWhereInput = {
    ...(query.unread && { isRead: false }),
    ...(query.search && {
      OR: [
        { name: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
        { message: { contains: query.search, mode: "insensitive" } },
      ],
    }),
  };

  const [messages, total] = await Promise.all([
    prisma.message.findMany({ where, orderBy: { sentAt: "desc" }, skip, take: limit }),
    prisma.message.count({ where }),
  ]);
  res.json({ messages, pagination: pageMeta(total, page, limit) });
}

export async function markMessageRead(req: Request, res: Response) {
  const isRead = req.body?.isRead !== false;
  const message = await prisma.message.update({ where: { id: parseId(req.params.id) }, data: { isRead } });
  res.json({ message });
}

export async function deleteMessage(req: Request, res: Response) {
  await prisma.message.delete({ where: { id: parseId(req.params.id) } });
  res.json({ message: "Message deleted" });
}
