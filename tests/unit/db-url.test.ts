import { describe, expect, it } from "vitest";

import { databaseUrlKind, isLibsqlConnectionString } from "@/lib/db-url";

describe("db-url helpers", () => {
  it("detects libsql URLs", () => {
    expect(isLibsqlConnectionString("libsql://demo.turso.io")).toBe(true);
    expect(isLibsqlConnectionString("https://demo.turso.io")).toBe(false);
    expect(isLibsqlConnectionString("https://foo.libsql.example")).toBe(true);
    expect(isLibsqlConnectionString("file:./dev.db")).toBe(false);
  });

  it("classifies url kinds", () => {
    expect(databaseUrlKind(undefined)).toBe("missing");
    expect(databaseUrlKind("libsql://x.turso.io")).toBe("libsql");
    expect(databaseUrlKind("file:./dev.db")).toBe("file");
    expect(databaseUrlKind("postgres://x")).toBe("other");
  });
});
