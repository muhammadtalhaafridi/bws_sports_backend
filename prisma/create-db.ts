// Creates the database named in DATABASE_URL if it does not exist yet.
import "dotenv/config";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const target = new URL(url);
const dbName = decodeURIComponent(target.pathname.slice(1));
const admin = new URL(url);
admin.pathname = "/postgres";
admin.search = "";

const client = new pg.Client({ connectionString: admin.toString() });
try {
  await client.connect();
  const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (rowCount) {
    console.log(`Database "${dbName}" already exists`);
  } else {
    await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
    console.log(`Created database "${dbName}"`);
  }
} catch (err) {
  const e = err as NodeJS.ErrnoException;
  console.error(`Could not connect to PostgreSQL: ${e.message || e.code || String(err)}`);
  console.error("Check the user, password, host and port in DATABASE_URL (backend/.env).");
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
