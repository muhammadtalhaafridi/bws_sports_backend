import { Router } from "express";
import * as categories from "../controllers/category.controller";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { uploadCategoryImage } from "../middleware/upload";
import { validateBody } from "../middleware/validate";
import { categorySchema } from "../validators";

const router = Router();

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: All categories with image and product counts
 *     responses:
 *       200: { description: List of categories }
 *   post:
 *     tags: [Categories]
 *     summary: Create a category (admin)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               image: { type: string, format: binary }
 *     responses:
 *       201: { description: Created }
 * /categories/{id}:
 *   put:
 *     tags: [Categories]
 *     summary: Update a category's name or image (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               image: { type: string, format: binary }
 *               removeImage: { type: boolean, description: Clear the current image }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Categories]
 *     summary: Delete an empty category (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Deleted }
 *       409: { description: Category still has products }
 */
router.get("/", categories.listCategories);
router.post("/", requireAuth, requireAdmin, uploadCategoryImage, validateBody(categorySchema), categories.createCategory);
router.put("/:id", requireAuth, requireAdmin, uploadCategoryImage, validateBody(categorySchema), categories.updateCategory);
router.delete("/:id", requireAuth, requireAdmin, categories.deleteCategory);

export default router;
