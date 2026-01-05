import { describe, it, expect } from "vitest";
import { parseDateRangeFromTitle } from "../dates";

describe("parseDateRangeFromTitle", () => {
  const referenceYear = 2026;

  describe("Multi-year patterns", () => {
    it("should parse [1YR] as single year range", () => {
      const result = parseDateRangeFromTitle("[1YR] Annual Goals", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 0, 1));
      expect(result!.end).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
    });

    it("should parse [3YR] as three year range", () => {
      const result = parseDateRangeFromTitle("[3YR] Long-term Strategy", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 0, 1));
      expect(result!.end).toEqual(new Date(2028, 11, 31, 23, 59, 59, 999));
    });

    it("should parse [5YR] as five year range", () => {
      const result = parseDateRangeFromTitle("[5YR] Vision 2031", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 0, 1));
      expect(result!.end).toEqual(new Date(2030, 11, 31, 23, 59, 59, 999));
    });

    it("should handle lowercase [3yr]", () => {
      const result = parseDateRangeFromTitle("[3yr] lowercase", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 0, 1));
    });
  });

  describe("Half-year patterns", () => {
    it("should parse [H1] as first half of year", () => {
      const result = parseDateRangeFromTitle("[H1] First Half Goals", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 0, 1));
      expect(result!.end).toEqual(new Date(2026, 5, 30));
    });

    it("should parse [H2] as second half of year", () => {
      const result = parseDateRangeFromTitle("[H2] Second Half Goals", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 6, 1));
      expect(result!.end).toEqual(new Date(2026, 11, 31));
    });

    it("should handle lowercase [h1] and [h2]", () => {
      const h1 = parseDateRangeFromTitle("[h1] lowercase", referenceYear);
      const h2 = parseDateRangeFromTitle("[h2] lowercase", referenceYear);
      expect(h1).not.toBeNull();
      expect(h2).not.toBeNull();
      expect(h1!.start).toEqual(new Date(2026, 0, 1));
      expect(h2!.start).toEqual(new Date(2026, 6, 1));
    });
  });

  describe("Quarter patterns", () => {
    it("should parse [Q1] as first quarter", () => {
      const result = parseDateRangeFromTitle("[Q1] Q1 Goals", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 0, 1));
      expect(result!.end).toEqual(new Date(2026, 2, 31, 23, 59, 59, 999));
    });

    it("should parse [Q2] as second quarter", () => {
      const result = parseDateRangeFromTitle("[Q2] Q2 Goals", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 3, 1));
      expect(result!.end).toEqual(new Date(2026, 5, 30, 23, 59, 59, 999));
    });

    it("should parse [Q3] as third quarter", () => {
      const result = parseDateRangeFromTitle("[Q3] Q3 Goals", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 6, 1));
      expect(result!.end).toEqual(new Date(2026, 8, 30, 23, 59, 59, 999));
    });

    it("should parse [Q4] as fourth quarter", () => {
      const result = parseDateRangeFromTitle("[Q4] Q4 Goals", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 9, 1));
      expect(result!.end).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
    });

    it("should handle lowercase [q1], [q2], [q3], [q4]", () => {
      const q1 = parseDateRangeFromTitle("[q1] lowercase", referenceYear);
      const q2 = parseDateRangeFromTitle("[q2] lowercase", referenceYear);
      const q3 = parseDateRangeFromTitle("[q3] lowercase", referenceYear);
      const q4 = parseDateRangeFromTitle("[q4] lowercase", referenceYear);
      expect(q1).not.toBeNull();
      expect(q2).not.toBeNull();
      expect(q3).not.toBeNull();
      expect(q4).not.toBeNull();
    });
  });

  describe("Month patterns", () => {
    it("should parse [JAN] as January", () => {
      const result = parseDateRangeFromTitle("[JAN] January Tasks", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 0, 1));
      expect(result!.end).toEqual(new Date(2026, 0, 31, 23, 59, 59, 999));
    });

    it("should parse [FEB] as February", () => {
      const result = parseDateRangeFromTitle("[FEB] February Tasks", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 1, 1));
      expect(result!.end).toEqual(new Date(2026, 1, 28, 23, 59, 59, 999));
    });

    it("should parse [MAR] as March", () => {
      const result = parseDateRangeFromTitle("[MAR] March Tasks", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 2, 1));
      expect(result!.end).toEqual(new Date(2026, 2, 31, 23, 59, 59, 999));
    });

    it("should parse [APR] as April", () => {
      const result = parseDateRangeFromTitle("[APR] April Tasks", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 3, 1));
      expect(result!.end).toEqual(new Date(2026, 3, 30, 23, 59, 59, 999));
    });

    it("should parse [MAY] as May", () => {
      const result = parseDateRangeFromTitle("[MAY] May Tasks", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 4, 1));
      expect(result!.end).toEqual(new Date(2026, 4, 31, 23, 59, 59, 999));
    });

    it("should parse [JUN] as June", () => {
      const result = parseDateRangeFromTitle("[JUN] June Tasks", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 5, 1));
      expect(result!.end).toEqual(new Date(2026, 5, 30, 23, 59, 59, 999));
    });

    it("should parse [JUL] as July", () => {
      const result = parseDateRangeFromTitle("[JUL] July Tasks", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 6, 1));
      expect(result!.end).toEqual(new Date(2026, 6, 31, 23, 59, 59, 999));
    });

    it("should parse [AUG] as August", () => {
      const result = parseDateRangeFromTitle("[AUG] August Tasks", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 7, 1));
      expect(result!.end).toEqual(new Date(2026, 7, 31, 23, 59, 59, 999));
    });

    it("should parse [SEP] as September", () => {
      const result = parseDateRangeFromTitle("[SEP] September Tasks", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 8, 1));
      expect(result!.end).toEqual(new Date(2026, 8, 30, 23, 59, 59, 999));
    });

    it("should parse [OCT] as October", () => {
      const result = parseDateRangeFromTitle("[OCT] October Tasks", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 9, 1));
      expect(result!.end).toEqual(new Date(2026, 9, 31, 23, 59, 59, 999));
    });

    it("should parse [NOV] as November", () => {
      const result = parseDateRangeFromTitle("[NOV] November Tasks", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 10, 1));
      expect(result!.end).toEqual(new Date(2026, 10, 30, 23, 59, 59, 999));
    });

    it("should parse [DEC] as December", () => {
      const result = parseDateRangeFromTitle("[DEC] December Tasks", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 11, 1));
      expect(result!.end).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
    });

    it("should handle lowercase month names", () => {
      const jan = parseDateRangeFromTitle("[jan] lowercase", referenceYear);
      const dec = parseDateRangeFromTitle("[dec] lowercase", referenceYear);
      expect(jan).not.toBeNull();
      expect(dec).not.toBeNull();
      expect(jan!.start).toEqual(new Date(2026, 0, 1));
      expect(dec!.start).toEqual(new Date(2026, 11, 1));
    });
  });

  describe("Week patterns", () => {
    it("should parse [W1] as first week", () => {
      const result = parseDateRangeFromTitle("[W1] Week 1", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 0, 1));
      expect(result!.end).toEqual(new Date(2026, 0, 7));
    });

    it("should parse [W2] as second week", () => {
      const result = parseDateRangeFromTitle("[W2] Week 2", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 0, 8));
      expect(result!.end).toEqual(new Date(2026, 0, 14));
    });

    it("should parse [W10] as tenth week", () => {
      const result = parseDateRangeFromTitle("[W10] Week 10", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 0, 64));
      expect(result!.end).toEqual(new Date(2026, 0, 70));
    });

    it("should parse [W52] as last week", () => {
      const result = parseDateRangeFromTitle("[W52] Week 52", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 0, 358));
      expect(result!.end).toEqual(new Date(2026, 0, 364));
    });

    it("should handle lowercase [w1]", () => {
      const result = parseDateRangeFromTitle("[w1] lowercase", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 0, 1));
    });
  });

  describe("Invalid inputs", () => {
    it("should return null for title without brackets", () => {
      const result = parseDateRangeFromTitle("No brackets here", referenceYear);
      expect(result).toBeNull();
    });

    it("should return null for empty brackets", () => {
      const result = parseDateRangeFromTitle("[] Empty", referenceYear);
      expect(result).toBeNull();
    });

    it("should return null for invalid quarter [Q5]", () => {
      const result = parseDateRangeFromTitle("[Q5] Invalid Quarter", referenceYear);
      expect(result).toBeNull();
    });

    it("should return null for invalid quarter [Q0]", () => {
      const result = parseDateRangeFromTitle("[Q0] Invalid Quarter", referenceYear);
      expect(result).toBeNull();
    });

    it("should return null for invalid month [XYZ]", () => {
      const result = parseDateRangeFromTitle("[XYZ] Invalid Month", referenceYear);
      expect(result).toBeNull();
    });

    it("should return null for invalid pattern [H3]", () => {
      const result = parseDateRangeFromTitle("[H3] Invalid Half", referenceYear);
      expect(result).toBeNull();
    });

    it("should handle edge case [0YR] as 0 year range", () => {
      const result = parseDateRangeFromTitle("[0YR] Edge Case", referenceYear);
      // [0YR] technically parses as 0 years from reference year
      // This is an edge case where the function allows it
      expect(result).not.toBeNull();
    });

    it("should return null for random text in brackets", () => {
      const result = parseDateRangeFromTitle("[RANDOM] Random Text", referenceYear);
      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const result = parseDateRangeFromTitle("", referenceYear);
      expect(result).toBeNull();
    });

    it("should return null for just brackets at end", () => {
      const result = parseDateRangeFromTitle("Title [Q1]", referenceYear);
      expect(result).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("should use default reference year when not provided", () => {
      const result = parseDateRangeFromTitle("[Q1] Default Year");
      expect(result).not.toBeNull();
      expect(result!.start.getFullYear()).toBe(2026);
    });

    it("should work with different reference years", () => {
      const result2025 = parseDateRangeFromTitle("[Q1] 2025", 2025);
      expect(result2025).not.toBeNull();
      expect(result2025!.start).toEqual(new Date(2025, 0, 1));

      const result2030 = parseDateRangeFromTitle("[Q1] 2030", 2030);
      expect(result2030).not.toBeNull();
      expect(result2030!.start).toEqual(new Date(2030, 0, 1));
    });

    it("should handle leap year February", () => {
      const result = parseDateRangeFromTitle("[FEB] Leap Year", 2024);
      expect(result).not.toBeNull();
      expect(result!.end).toEqual(new Date(2024, 1, 29, 23, 59, 59, 999));
    });

    it("should only parse first bracket occurrence", () => {
      const result = parseDateRangeFromTitle("[Q1] First [Q2] Second", referenceYear);
      expect(result).not.toBeNull();
      expect(result!.start).toEqual(new Date(2026, 0, 1));
    });

    it("should handle whitespace in brackets", () => {
      const result = parseDateRangeFromTitle("[ Q1 ] Whitespace", referenceYear);
      expect(result).toBeNull();
    });
  });
});
