import crypto from "node:crypto";
import path from "node:path";
import multer from "multer";
import { badRequest } from "../utils/HttpError";
import { UPLOADS_DIR } from "../utils/helpers";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function imageUpload(folder: "products" | "users") {
  return multer({
    storage: multer.diskStorage({
      destination: path.join(UPLOADS_DIR, folder),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED.includes(file.mimetype)) cb(null, true);
      else cb(badRequest("Only JPG, PNG, WEBP or GIF images are allowed"));
    },
  }).single("image");
}

export const uploadProductImage = imageUpload("products");
export const uploadUserImage = imageUpload("users");
