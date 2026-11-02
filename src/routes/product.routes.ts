import { Router } from "express";
import * as products from "../controllers/product.controller";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { uploadProductImage } from "../middleware/upload";
import { validateBody } from "../middleware/validate";
import { productSchema } from "../validators";

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     ProductForm:
 *       type: object
 *       required: [name, description, categoryId, price, stock]
 *       properties:
 *         name: { type: string }
 *         description: { type: string }
 *         categoryId: { type: integer }
 *         price: { type: number }
 *         stock: { type: integer }
 *         size: { type: string }
 *         weight: { type: string }
 *         willow: { type: string }
 *         featured: { type: boolean }
 *         image: { type: string, format: binary }
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List products with search, category filter, sorting and paging
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: category, schema: { type: integer } }
 *       - { in: query, name: featured, schema: { type: boolean } }
 *       - { in: query, name: inStock, schema: { type: boolean } }
 *       - { in: query, name: minPrice, schema: { type: number } }
 *       - { in: query, name: maxPrice, schema: { type: number } }
 *       - { in: query, name: sort, schema: { type: string, enum: [newest, price_asc, price_desc, name, popular] } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses:
 *       200: { description: Products and pagination }
 *   post:
 *     tags: [Products]
 *     summary: Create a product (admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema: { $ref: '#/components/schemas/ProductForm' }
 *     responses:
 *       201: { description: Created }
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Product details with related products
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Product }
 *       404: { description: Not found }
 *   put:
 *     tags: [Products]
 *     summary: Update a product (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema: { $ref: '#/components/schemas/ProductForm' }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Deleted }
 *       409: { description: Product is part of existing orders }
 */
router.get("/", products.listProducts);
router.get("/:id", products.getProduct);
router.post("/", requireAuth, requireAdmin, uploadProductImage, validateBody(productSchema), products.createProduct);
router.put("/:id", requireAuth, requireAdmin, uploadProductImage, validateBody(productSchema), products.updateProduct);
router.delete("/:id", requireAuth, requireAdmin, products.deleteProduct);

export default router;
