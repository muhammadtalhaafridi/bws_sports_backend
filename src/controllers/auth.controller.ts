import crypto from "node:crypto";
import bcrypt from "bcrypt";
import type { Request, Response } from "express";
import type { z } from "zod";
import { env } from "../config/env";
import { isMailConfigured, sendPasswordResetEmail } from "../lib/mailer";
import { prisma } from "../lib/prisma";
import { HttpError, badRequest, conflict, unauthorized } from "../utils/HttpError";
import { removeUpload, uploadPath } from "../utils/helpers";
import { signToken } from "../utils/jwt";
import type {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyResetCodeSchema,
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

const RESET_CODE_MINUTES = 15;
const RESET_CODE_MAX_ATTEMPTS = 5;
const RESET_CODE_RESEND_SECONDS = 60;

/** Keyed hash, so a leaked database row cannot be brute-forced back to the 6-digit code. */
const hashResetCode = (userId: number, code: string) =>
  crypto.createHmac("sha256", env.jwtSecret).update(`${userId}:${code}`).digest("hex");

const sameHash = (a: string, b: string) =>
  a.length === b.length && crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));

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

  const { password: _password, resetToken: _t, resetTokenExpiry: _e, resetAttempts: _a, ...safe } = user;
  res.json({ token: signToken({ id: user.id, role: user.role }), user: safe });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email, from } = req.body as z.output<typeof forgotPasswordSchema>;
  // Same reply whether or not the account exists, so the form cannot be used to find accounts.
  const message = "If an account exists for this email, a verification code has been sent to it.";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.json({ message });
    return;
  }

  // A code sent less than a minute ago is still on its way; do not send another one yet.
  const issuedAt = user.resetTokenExpiry ? user.resetTokenExpiry.getTime() - RESET_CODE_MINUTES * 60_000 : 0;
  if (user.resetToken && Date.now() - issuedAt < RESET_CODE_RESEND_SECONDS * 1000) {
    res.json({ message });
    return;
  }

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: hashResetCode(user.id, code),
      resetTokenExpiry: new Date(Date.now() + RESET_CODE_MINUTES * 60_000),
      resetAttempts: 0,
    },
  });

  const baseUrl = user.role === "ADMIN" && from === "dashboard" ? env.dashboardUrl : env.clientUrl;
  const link = `${baseUrl}/reset-password?${new URLSearchParams({ email: user.email, code })}`;

  try {
    await sendPasswordResetEmail(user.email, user.name, code, link, RESET_CODE_MINUTES);
  } catch (error) {
    console.error(`[mail] Could not send reset code to ${user.email}:`, error);
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: null, resetTokenExpiry: null, resetAttempts: 0 },
    });
    throw new HttpError(503, "We could not send the email right now. Please try again in a few minutes.");
  }

  // Without SMTP in development, return the code so the flow can still be tested.
  res.json(!isMailConfigured && !env.isProduction ? { message, devResetCode: code } : { message });
}

/** Returns the user when the code is right; otherwise counts the attempt and throws. */
async function checkResetCode(email: string, code: string) {
  const expired = badRequest("This code is invalid or has expired. Please request a new code.");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.resetToken || !user.resetTokenExpiry || user.resetTokenExpiry <= new Date()) throw expired;
  if (user.resetAttempts >= RESET_CODE_MAX_ATTEMPTS) {
    throw badRequest("Too many wrong attempts. Please request a new code.");
  }

  if (!sameHash(hashResetCode(user.id, code), user.resetToken)) {
    const { resetAttempts } = await prisma.user.update({
      where: { id: user.id },
      data: { resetAttempts: { increment: 1 } },
      select: { resetAttempts: true },
    });
    const left = RESET_CODE_MAX_ATTEMPTS - resetAttempts;
    if (left <= 0) {
      await prisma.user.update({ where: { id: user.id }, data: { resetToken: null, resetTokenExpiry: null } });
      throw badRequest("Too many wrong attempts. Please request a new code.");
    }
    throw badRequest(`Wrong verification code. ${left} ${left === 1 ? "attempt" : "attempts"} left.`);
  }

  return user;
}

export async function verifyResetCode(req: Request, res: Response) {
  const { email, code } = req.body as z.output<typeof verifyResetCodeSchema>;
  await checkResetCode(email, code);
  res.json({ message: "Code verified. Choose a new password." });
}

export async function resetPassword(req: Request, res: Response) {
  const { email, code, password } = req.body as z.output<typeof resetPasswordSchema>;
  const user = await checkResetCode(email, code);

  // Matching on the stored hash makes the code single-use even if two requests arrive together.
  const { count } = await prisma.user.updateMany({
    where: { id: user.id, resetToken: user.resetToken },
    data: { password: await bcrypt.hash(password, 10), resetToken: null, resetTokenExpiry: null, resetAttempts: 0 },
  });
  if (count === 0) throw badRequest("This code has already been used. Please request a new code.");

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
