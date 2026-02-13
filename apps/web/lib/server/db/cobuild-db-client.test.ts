import { beforeEach, describe, expect, it, vi } from "vitest";

const { PrismaClient, PrismaPg, readReplicas, Pool, prismaInstances } = vi.hoisted(() => {
  const prismaInstances: object[] = [];
  const PrismaClient = vi.fn().mockImplementation((options) => {
    const instance = {
      options,
      $extends: vi.fn().mockImplementation((ext) => ({ ...instance, extension: ext })),
    };
    prismaInstances.push(instance);
    return instance;
  });
  const PrismaPg = vi.fn().mockImplementation((pool) => ({ pool }));
  const readReplicas = vi.fn().mockImplementation((config) => config);
  const Pool = vi.fn().mockImplementation((options) => ({
    options,
    on: vi.fn(),
  }));
  return { PrismaClient, PrismaPg, readReplicas, Pool, prismaInstances };
});

vi.mock("@/generated/prisma/client", () => ({ PrismaClient }));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg }));
vi.mock("@prisma/extension-read-replicas", () => ({ readReplicas }));
vi.mock("pg", () => ({ Pool }));

const ORIGINAL_ENV = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>) {
  process.env = { ...ORIGINAL_ENV, ...overrides };
}

describe("cobuild-db-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaInstances.length = 0;
    setEnv({ DATABASE_URL: undefined, DATABASE_REPLICA_URL: undefined, NODE_ENV: "test" });
    const globalAny = global as typeof global & { prisma?: object };
    delete globalAny.prisma;
  });

  it("throws when DATABASE_URL missing", async () => {
    setEnv({ DATABASE_URL: undefined, DATABASE_REPLICA_URL: "postgres://replica" });
    await vi.resetModules();
    await expect(import("./cobuild-db-client")).rejects.toThrow("DATABASE_URL is not set");
  });

  it("creates prisma clients with read replicas", async () => {
    setEnv({ DATABASE_URL: "postgres://primary", DATABASE_REPLICA_URL: "postgres://replica" });
    await vi.resetModules();
    const dbModule = await import("./cobuild-db-client");

    expect(PrismaClient).toHaveBeenCalledTimes(2);
    expect(Pool).toHaveBeenCalledWith({
      connectionString: "postgres://primary",
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    expect(Pool).toHaveBeenCalledWith({
      connectionString: "postgres://replica",
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    const primaryPool = Pool.mock.results[0]?.value;
    const replicaPool = Pool.mock.results[1]?.value;
    expect(primaryPool.on).toHaveBeenCalledWith("error", expect.any(Function));
    expect(primaryPool.on).toHaveBeenCalledWith("connect", expect.any(Function));
    expect(replicaPool.on).toHaveBeenCalledWith("error", expect.any(Function));
    expect(replicaPool.on).toHaveBeenCalledWith("connect", expect.any(Function));

    const primaryConnect = primaryPool.on.mock.calls.find(
      ([event]: [string]) => event === "connect"
    )?.[1];
    const replicaConnect = replicaPool.on.mock.calls.find(
      ([event]: [string]) => event === "connect"
    )?.[1];
    const primaryClient = { query: vi.fn().mockResolvedValue(null) };
    const replicaClient = { query: vi.fn().mockResolvedValue(null) };
    primaryConnect(primaryClient);
    replicaConnect(replicaClient);

    expect(primaryClient.query).toHaveBeenCalledWith("SET statement_timeout = '10000ms'");
    expect(primaryClient.query).toHaveBeenCalledWith("SET lock_timeout = '2000ms'");
    expect(primaryClient.query).toHaveBeenCalledWith(
      "SET idle_in_transaction_session_timeout = '60000ms'"
    );
    expect(replicaClient.query).toHaveBeenCalledWith(
      "SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY"
    );
    expect(readReplicas).toHaveBeenCalledWith({
      replicas: [prismaInstances[1]],
    });
    expect(dbModule.default).toBeTruthy();
    const globalAny = global as typeof global & { prisma?: object };
    expect(globalAny.prisma).toBe(dbModule.default);
  });

  it("reuses global prisma when available", async () => {
    const sentinel = { sentinel: true };
    const globalAny = global as typeof global & { prisma?: object };
    globalAny.prisma = sentinel;

    await vi.resetModules();
    const dbModule = await import("./cobuild-db-client");

    expect(dbModule.default).toBe(sentinel);
    expect(PrismaClient).not.toHaveBeenCalled();
  });
});
