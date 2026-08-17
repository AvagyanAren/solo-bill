import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import {
  getHostedDatabaseConfigError,
  getProductionAuthConfigError,
} from "@/lib/server-config";

describe("getHostedDatabaseConfigError", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("returns null locally", () => {
    delete process.env.VERCEL;
    process.env.DATABASE_URL = "file:./dev.db";
    expect(getHostedDatabaseConfigError()).toBeNull();
  });

  it("requires libsql on Vercel", () => {
    process.env.VERCEL = "1";
    process.env.DATABASE_URL = "file:./dev.db";
    expect(getHostedDatabaseConfigError()).toMatch(/DATABASE_URL/);
  });

  it("requires Turso token on Vercel", () => {
    process.env.VERCEL = "1";
    process.env.DATABASE_URL = "libsql://demo.turso.io";
    delete process.env.TURSO_AUTH_TOKEN;
    expect(getHostedDatabaseConfigError()).toMatch(/TURSO_AUTH_TOKEN/);
  });
});

describe("getProductionAuthConfigError", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("returns null in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_SECRET", "");
    expect(getProductionAuthConfigError()).toBeNull();
  });

  it("requires AUTH_SECRET in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "");
    expect(getProductionAuthConfigError()).toMatch(/AUTH_SECRET/);
  });
});
