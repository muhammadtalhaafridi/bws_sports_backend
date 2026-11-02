import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { Prisma } from "./generated/prisma/client";
import { prisma } from "./lib/prisma";
import { swaggerSpec } from "./lib/swagger";
import { errorHandler, notFoundHandler } from "./middleware/error";
import routes from "./routes";
import { UPLOADS_DIR } from "./utils/helpers";

const app = express();

// Send Prisma Decimal values (prices, totals) as JSON numbers instead of strings.
app.set("json replacer", function (this: Record<string, unknown>, key: string, value: unknown) {
  return this[key] instanceof Prisma.Decimal ? (this[key] as Prisma.Decimal).toNumber() : value;
});

// Allow requests from any website address. Login uses a Bearer token (no cookies), so no credentials are needed.
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "7d" }));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: "BWS Sports API" }));
app.get("/api-docs.json", (_req, res) => {
  res.json(swaggerSpec);
});
app.get("/", (_req, res) => {
  res.json({ name: "BWS Sports API", docs: "/api-docs" });
});

app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.port, () => {
  console.log(`BWS Sports API running on http://localhost:${env.port}`);
  console.log(`API docs: http://localhost:${env.port}/api-docs`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;
