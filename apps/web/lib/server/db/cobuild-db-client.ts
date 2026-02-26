import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readReplicas } from "@prisma/extension-read-replicas";
import { Pool, type QueryResult } from "pg";

type PrismaGlobal = typeof globalThis & { prisma?: ReturnType<typeof createPrisma> };
const globalForPrisma = globalThis as PrismaGlobal;

const STATEMENT_TIMEOUT_MS = 10_000;
const LOCK_TIMEOUT_MS = 2_000;
const IDLE_IN_TX_TIMEOUT_MS = 60_000;
const DEFAULT_TRANSACTION_MAX_WAIT_MS = 5_000;

const DEFAULT_POOL_MAX = 10;
const POOL_MAX = Number.parseInt(process.env.DATABASE_POOL_MAX ?? "", 10);

const POOL_OPTIONS = {
  max: Number.isFinite(POOL_MAX) && POOL_MAX > 0 ? POOL_MAX : DEFAULT_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
};

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function applySessionSettings(client: { query: (sql: string) => Promise<QueryResult> }) {
  const statements = [
    `SET statement_timeout = '${STATEMENT_TIMEOUT_MS}ms'`,
    `SET lock_timeout = '${LOCK_TIMEOUT_MS}ms'`,
    `SET idle_in_transaction_session_timeout = '${IDLE_IN_TX_TIMEOUT_MS}ms'`,
  ];
  for (const statement of statements) {
    void client.query(statement).catch((error) => {
      console.warn("[db] session setting failed", error);
    });
  }
}

function makePool(connectionString: string, readOnly: boolean = false) {
  const pool = new Pool({ connectionString, ...POOL_OPTIONS });
  pool.on("error", (error) => console.error("[db] pool error", error));
  pool.on("connect", (client) => {
    applySessionSettings(client);
    if (readOnly) {
      void client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
    }
  });
  return pool;
}

function createPrisma() {
  const primaryUrl = getEnv("DATABASE_URL");
  const replicaUrl = getEnv("DATABASE_REPLICA_URL");

  const primaryPool = makePool(primaryUrl);
  const replicaPool = makePool(replicaUrl, true);

  // Single Cobuild DB now serves all schemas (cobuild, farcaster, capital_allocation, etc.).
  const primary = new PrismaClient({
    adapter: new PrismaPg(primaryPool),
    transactionOptions: { maxWait: DEFAULT_TRANSACTION_MAX_WAIT_MS },
  });
  const replica = new PrismaClient({
    adapter: new PrismaPg(replicaPool),
    transactionOptions: { maxWait: DEFAULT_TRANSACTION_MAX_WAIT_MS },
  });

  return primary.$extends(
    readReplicas({
      replicas: [replica],
    })
  );
}

const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
