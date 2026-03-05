import { beforeEach, describe, expect, it, vi } from "vitest";

const { PrismaClient, PrismaPg, readReplicas, Pool, prismaInstances } = vi.hoisted(() => {
  const prismaInstances: object[] = [];
  const PrismaClient = vi.fn().mockImplementation(function (options) {
    const instance = {
      options,
      $extends: vi.fn().mockImplementation((ext) => ({ ...instance, extension: ext })),
    };
    prismaInstances.push(instance);
    return instance;
  });
  const PrismaPg = vi.fn().mockImplementation(function (pool) {
    return { pool };
  });
  const readReplicas = vi.fn().mockImplementation((config) => config);
  const Pool = vi.fn().mockImplementation(function (options) {
    return {
      options,
      on: vi.fn(),
    };
  });
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
    setEnv({
      DATABASE_URL: undefined,
      DATABASE_REPLICA_URL: undefined,
      LOCAL_DATABASE_URL: undefined,
      WEB_DB_TARGET: undefined,
      NODE_ENV: "test",
    });
    const globalAny = global as typeof global & { prisma?: object };
    delete globalAny.prisma;
  });

  it("throws when DATABASE_URL missing", async () => {
    setEnv({
      WEB_DB_TARGET: "prod",
      DATABASE_URL: undefined,
      DATABASE_REPLICA_URL: "postgres://replica",
    });
    await vi.resetModules();
    await expect(import("./cobuild-db-client")).rejects.toThrow("DATABASE_URL is not set");
  });

  it("throws when DATABASE_REPLICA_URL missing", async () => {
    setEnv({
      WEB_DB_TARGET: "prod",
      DATABASE_URL: "postgres://primary",
      DATABASE_REPLICA_URL: undefined,
    });
    await vi.resetModules();
    await expect(import("./cobuild-db-client")).rejects.toThrow("DATABASE_REPLICA_URL is not set");
  });

  it("throws when WEB_DB_TARGET is invalid", async () => {
    setEnv({
      WEB_DB_TARGET: "staging",
      DATABASE_URL: "postgres://primary",
      DATABASE_REPLICA_URL: "postgres://replica",
    });
    await vi.resetModules();
    await expect(import("./cobuild-db-client")).rejects.toThrow(
      "WEB_DB_TARGET must be either 'prod' or 'local'"
    );
  });

  it("throws when LOCAL_DATABASE_URL is missing in local mode", async () => {
    setEnv({
      WEB_DB_TARGET: "local",
      LOCAL_DATABASE_URL: undefined,
      DATABASE_URL: "postgres://primary",
      DATABASE_REPLICA_URL: "postgres://replica",
    });
    await vi.resetModules();
    await expect(import("./cobuild-db-client")).rejects.toThrow("LOCAL_DATABASE_URL is not set");
  });

  it("uses DATABASE_POOL_MAX when positive", async () => {
    setEnv({
      DATABASE_URL: "postgres://primary",
      DATABASE_REPLICA_URL: "postgres://replica",
      DATABASE_POOL_MAX: "22",
    });
    await vi.resetModules();
    await import("./cobuild-db-client");

    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: "postgres://primary",
        max: 22,
      })
    );
    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: "postgres://replica",
        max: 22,
      })
    );
  });

  it("falls back to default pool max when DATABASE_POOL_MAX is invalid", async () => {
    setEnv({
      DATABASE_URL: "postgres://primary",
      DATABASE_REPLICA_URL: "postgres://replica",
      DATABASE_POOL_MAX: "0",
    });
    await vi.resetModules();
    await import("./cobuild-db-client");

    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: "postgres://primary",
        max: 10,
      })
    );
    expect(Pool).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: "postgres://replica",
        max: 10,
      })
    );
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

  it("defaults to prod routing when WEB_DB_TARGET is unset", async () => {
    setEnv({
      LOCAL_DATABASE_URL: "postgres://local",
      DATABASE_URL: "postgres://primary",
      DATABASE_REPLICA_URL: "postgres://replica",
      WEB_DB_TARGET: undefined,
    });
    await vi.resetModules();
    await import("./cobuild-db-client");

    expect(Pool).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        connectionString: "postgres://primary",
      })
    );
    expect(Pool).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        connectionString: "postgres://replica",
      })
    );
    expect(Pool).not.toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: "postgres://local",
      })
    );
  });

  it("uses LOCAL_DATABASE_URL for primary and replica in local mode", async () => {
    setEnv({
      WEB_DB_TARGET: "local",
      LOCAL_DATABASE_URL: "postgres://local",
      DATABASE_URL: "postgres://primary",
      DATABASE_REPLICA_URL: undefined,
    });
    await vi.resetModules();
    await import("./cobuild-db-client");

    expect(Pool).toHaveBeenCalledWith({
      connectionString: "postgres://local",
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    expect(Pool).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        connectionString: "postgres://local",
      })
    );
    expect(Pool).not.toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: "postgres://primary",
      })
    );
    expect(Pool).not.toHaveBeenCalledWith(
      expect.objectContaining({
        connectionString: "postgres://replica",
      })
    );
  });

  it("logs when pool emits error events", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    setEnv({ DATABASE_URL: "postgres://primary", DATABASE_REPLICA_URL: "postgres://replica" });
    await vi.resetModules();
    await import("./cobuild-db-client");

    const primaryPool = Pool.mock.results[0]?.value;
    const errorHandler = primaryPool.on.mock.calls.find(
      ([event]: [string]) => event === "error"
    )?.[1];
    const error = new Error("pool blew up");
    errorHandler(error);

    expect(consoleError).toHaveBeenCalledWith("[db] pool error", error);
  });

  it("warns when session timeout setting fails", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setEnv({ DATABASE_URL: "postgres://primary", DATABASE_REPLICA_URL: "postgres://replica" });
    await vi.resetModules();
    await import("./cobuild-db-client");

    const primaryPool = Pool.mock.results[0]?.value;
    const connectHandler = primaryPool.on.mock.calls.find(
      ([event]: [string]) => event === "connect"
    )?.[1];
    const error = new Error("set failed");
    connectHandler({ query: vi.fn().mockRejectedValue(error) });
    await Promise.resolve();

    expect(consoleWarn).toHaveBeenCalledWith("[db] session setting failed", error);
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

  it("does not assign prisma to global in production", async () => {
    setEnv({
      DATABASE_URL: "postgres://primary",
      DATABASE_REPLICA_URL: "postgres://replica",
      NODE_ENV: "production",
    });
    const globalAny = global as typeof global & { prisma?: object };
    delete globalAny.prisma;

    await vi.resetModules();
    const dbModule = await import("./cobuild-db-client");

    expect(dbModule.default).toBeTruthy();
    expect(globalAny.prisma).toBeUndefined();
  });
});
