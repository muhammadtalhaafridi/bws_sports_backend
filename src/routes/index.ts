import { Router } from "express";
import adminRoutes from "./admin.routes";
import authRoutes from "./auth.routes";
import categoryRoutes from "./category.routes";
import messageRoutes from "./message.routes";
import orderRoutes from "./order.routes";
import productRoutes from "./product.routes";

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: API status
 *     responses:
 *       200: { description: OK }
 */
router.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/messages", messageRoutes);
router.use("/admin", adminRoutes);

export default router;
