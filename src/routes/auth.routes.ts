import { Router } from "express";
import * as auth from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { uploadUserImage } from "../middleware/upload";
import { validateBody } from "../middleware/validate";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "../validators";

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Create a customer account
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, email, phone, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *               address: { type: string }
 *               image: { type: string, format: binary }
 *     responses:
 *       201: { description: Account created, returns token and user }
 *       409: { description: Email already used }
 */
router.post("/register", uploadUserImage, validateBody(registerSchema), auth.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, example: customer@bwssports.com }
 *               password: { type: string, example: Customer@123 }
 *     responses:
 *       200: { description: Returns token and user }
 *       401: { description: Wrong email or password }
 */
router.post("/login", validateBody(loginSchema), auth.login);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Email a password reset link
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               from: { type: string, enum: [website, dashboard] }
 *     responses:
 *       200: { description: Reset link sent if the account exists }
 */
router.post("/forgot-password", validateBody(forgotPasswordSchema), auth.forgotPassword);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Set a new password using the emailed token
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Password updated }
 *       400: { description: Invalid or expired token }
 */
router.post("/reset-password", validateBody(resetPasswordSchema), auth.resetPassword);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Current user
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: The logged-in user }
 *   put:
 *     tags: [Auth]
 *     summary: Update profile (name, phone, address, image)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               address: { type: string }
 *               image: { type: string, format: binary }
 *     responses:
 *       200: { description: Updated user }
 */
router.get("/me", requireAuth, auth.me);
router.put("/me", requireAuth, uploadUserImage, validateBody(updateProfileSchema), auth.updateProfile);

/**
 * @openapi
 * /auth/me/password:
 *   put:
 *     tags: [Auth]
 *     summary: Change password
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200: { description: Password changed }
 */
router.put("/me/password", requireAuth, validateBody(changePasswordSchema), auth.changePassword);

export default router;
