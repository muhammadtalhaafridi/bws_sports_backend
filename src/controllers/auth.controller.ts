import crypto from "node:crypto";
import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import type { z } from "zod";
import { env } from "../config/env";
import { isMailConfigured, sendPasswordResetEmail } from "../lib/mailer";
import { prisma } from "../lib/prisma";
import { badRequest, conflict, unauthorized } from "../utils/HttpError";
import { removeUpload, uploadPath } from "../utils/helpers";
import { signToken } from "../utils/jwt";
import type {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validators";

/** Fields that are safe to send to the browser. */
export const publicUser = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  image: true,
  role: true,
  createdAt: true,
} as const;

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function register(req: Request, res: Response) {
  const data = req.body as z.output<typeof registerSchema>;

  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw conflict("An account with this email already exists");

  const user = await prisma.user.create({
    data: {
      ...data,
      password: await bcrypt.hash(data.password, 10),
      image: uploadPath(req.file),
    },
    select: publicUser,
  });

  res.status(201).json({ token: signToken({ id: user.id, role: user.role }), user });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as z.output<typeof loginSchema>;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw unauthorized("Wrong email or password");
  }

  const { password: _password, resetToken: _t, resetTokenExpiry: _e, ...safe } = user;
  res.json({ token: signToken({ id: user.id, role: user.role }), user: safe });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email, from } = req.body as z.output<typeof forgotPasswordSchema>;
  const message = "If an account exists for this email, a reset link has been sent.";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.json({ message });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: hashToken(token), resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) },
  });

  const baseUrl = user.role === "ADMIN" && from === "dashboard" ? env.dashboardUrl : env.clientUrl;
  const link = `${baseUrl}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, user.name, link);

  // Without SMTP in development, return the link so the flow can still be tested.
  res.json(!isMailConfigured && !env.isProduction ? { message, devResetLink: link } : { message });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body as z.output<typeof resetPasswordSchema>;

  const user = await prisma.user.findFirst({
    where: { resetToken: hashToken(token), resetTokenExpiry: { gt: new Date() } },
  });
  if (!user) throw badRequest("This reset link is invalid or has expired");

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(password, 10), resetToken: null, resetTokenExpiry: null },
  });

  res.json({ message: "Password updated. You can now log in." });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: publicUser });
  res.json({ user });
}

export async function updateProfile(req: Request, res: Response) {
  const data = req.body as z.output<typeof updateProfileSchema>;
  const image = uploadPath(req.file);

  const current = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  const user = await prisma.user.update({
    where: { id: current.id },
    data: { ...data, address: data.address ?? null, ...(image && { image }) },
    select: publicUser,
  });
  if (image) await removeUpload(current.image);

  res.json({ user });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body as z.output<typeof changePasswordSchema>;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    throw badRequest("Current password is wrong");
  }

  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, 10) } });
  res.json({ message: "Password changed" });
}
