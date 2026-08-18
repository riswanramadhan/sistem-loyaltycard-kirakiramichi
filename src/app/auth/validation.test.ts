import { describe, expect, it } from "vitest";
import { whatsappSchema } from "./validation";

describe("whatsappSchema", () => {
  it.each(["08123", "+62 812-3456-7890", "+62 (812) 345.678"])(
    "accepts a DB-compatible number: %s",
    (value) => {
      expect(whatsappSchema.parse(value)).toBe(value);
    },
  );

  it.each([
    "1234",
    "1".repeat(31),
    "+62 812 ABC",
    "+62 812/345",
    "+62 812\n345",
  ])("rejects a number outside the DB constraint: %s", (value) => {
    expect(whatsappSchema.safeParse(value).success).toBe(false);
  });

  it("stores the same trimmed form validated by the database RPC", () => {
    expect(whatsappSchema.parse("  +62 812 345  ")).toBe("+62 812 345");
  });
});
