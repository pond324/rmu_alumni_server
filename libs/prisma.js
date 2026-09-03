import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client/index.js";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// ป้องกัน error หลุดเมื่อ connection ใน idle state หลุด/timeout จากฝั่ง PostgreSQL server
pool.on("error", (err) => {
  console.error("⚠️ Unexpected error on idle PostgreSQL client:", err.message || err);
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

export { prisma };
export default prisma;