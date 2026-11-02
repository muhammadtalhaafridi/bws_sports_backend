import { Router } from "express";
import * as orders from "../controllers/order.controller";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createOrderSchema, orderStatusSchema } from "../validators";

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /orders:
 *   post:
 *     tags: [Orders]
 *     summary: Place an order (checkout)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items: { type: object, properties: { productId: { type: integer }, quantity: { type: integer } } }
 *               phone: { type: string }
 *               address: { type: string }
 *               description: { type: string }
 *     responses:
 *       201: { description: Order created }
 *       409: { description: Not enough stock }
 *   get:
 *     tags: [Orders]
 *     summary: All orders (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED] } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer } }
 *     responses:
 *       200: { description: Orders and pagination }
 * /orders/my:
 *   get:
 *     tags: [Orders]
 *     summary: The logged-in customer's orders
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Orders }
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: One order (owner or admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Order with items }
 * /orders/{id}/cancel:
 *   patch:
 *     tags: [Orders]
 *     summary: Cancel your own pending order
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Order cancelled, stock restored }
 * /orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Change order status (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { status: { type: string } } }
 *     responses:
 *       200: { description: Updated order }
 */
router.post("/", validateBody(createOrderSchema), orders.createOrder);
router.get("/my", orders.myOrders);
router.get("/", requireAdmin, orders.listOrders);
router.get("/:id", orders.getOrder);
router.patch("/:id/cancel", orders.cancelMyOrder);
router.patch("/:id/status", requireAdmin, validateBody(orderStatusSchema), orders.updateOrderStatus);

export default router;
