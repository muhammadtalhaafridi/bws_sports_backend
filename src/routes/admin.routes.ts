import { Router } from "express";
import * as admin from "../controllers/admin.controller";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireAdmin);

/**
 * @openapi
 * /admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Dashboard numbers, recent orders, low stock and top products
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Stats }
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: All users with order counts
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer } }
 *     responses:
 *       200: { description: Users and pagination }
 */
router.get("/stats", admin.getStats);
router.get("/users", admin.listUsers);

export default router;
