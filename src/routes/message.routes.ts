import { Router } from "express";
import * as messages from "../controllers/message.controller";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { messageSchema } from "../validators";

const router = Router();

/**
 * @openapi
 * /messages:
 *   post:
 *     tags: [Messages]
 *     summary: Send a contact form message
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               message: { type: string }
 *     responses:
 *       201: { description: Saved }
 *   get:
 *     tags: [Messages]
 *     summary: All messages (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: unread, schema: { type: boolean } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer } }
 *     responses:
 *       200: { description: Messages and pagination }
 * /messages/{id}/read:
 *   patch:
 *     tags: [Messages]
 *     summary: Mark a message read or unread (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { isRead: { type: boolean } } }
 *     responses:
 *       200: { description: Updated }
 * /messages/{id}:
 *   delete:
 *     tags: [Messages]
 *     summary: Delete a message (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Deleted }
 */
router.post("/", validateBody(messageSchema), messages.sendMessage);
router.get("/", requireAuth, requireAdmin, messages.listMessages);
router.patch("/:id/read", requireAuth, requireAdmin, messages.markMessageRead);
router.delete("/:id", requireAuth, requireAdmin, messages.deleteMessage);

export default router;
