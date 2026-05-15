import { describe, expect, it } from "vitest";
import { aggregateContractorStatus, calculateComplianceLevel } from "./compliance";

describe("laboral compliance", () => {
  const now = new Date("2026-05-14T12:00:00Z");

  it("marks documents expiring within seven days", () => {
    expect(calculateComplianceLevel({ expiresAt: "2026-05-17", isValid: true, now })).toBe("expiring");
  });

  it("prioritizes invalid and expired statuses", () => {
    expect(
      aggregateContractorStatus([
        { type: "repse", level: "compliant", expiresAt: "2027-01-01" },
        { type: "imss_32d", level: "expired", expiresAt: "2026-05-01" },
        { type: "sat_32d", level: "invalid" }
      ])
    ).toBe("invalid");
  });
});
