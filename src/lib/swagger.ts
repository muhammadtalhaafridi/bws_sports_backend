import path from "node:path";
import swaggerJsdoc from "swagger-jsdoc";
import { env } from "../config/env";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "BWS Sports API",
      version: "1.0.0",
      description: "REST API for the BWS Sports cricket equipment shop and its admin dashboard.",
    },
    servers: [{ url: `http://localhost:${env.port}/api` }],
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    },
  },
  apis: [path.resolve(import.meta.dirname, "../routes/*.ts")],
});
