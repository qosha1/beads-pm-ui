import { describe, it, expect } from "vitest";
import { parseDateRangeFromTitle, parseHierarchyFromTitle, HierarchyLevel } from "../dates";

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

describe("parseHierarchyFromTitle", () => {
  const referenceYear = 2026;

  describe("Hierarchy level detection", () => {
    it("should return MULTI_YEAR level for [nYR] patterns", () => {
      const result = parseHierarchyFromTitle("[3YR] Three Year Plan", referenceYear);
      expect(result.prefix.level).toBe(HierarchyLevel.MULTI_YEAR);
      expect(result.prefix.raw).toBe("3YR");
      expect(result.prefix.years).toBe(3);
      expect(result.prefix.periodSortKey).toBe(-3); // Larger spans sort first
    });

    it("should return HALF_YEAR level for [H1] and [H2] patterns", () => {
      const h1 = parseHierarchyFromTitle("[H1] First Half", referenceYear);
      const h2 = parseHierarchyFromTitle("[H2] Second Half", referenceYear);

      expect(h1.prefix.level).toBe(HierarchyLevel.HALF_YEAR);
      expect(h1.prefix.periodSortKey).toBe(1);
      expect(h2.prefix.level).toBe(HierarchyLevel.HALF_YEAR);
      expect(h2.prefix.periodSortKey).toBe(2);
    });

    it("should return QUARTERLY level for [Q1-4] patterns", () => {
      const q1 = parseHierarchyFromTitle("[Q1] Q1 Goals", referenceYear);
      const q4 = parseHierarchyFromTitle("[Q4] Q4 Goals", referenceYear);

      expect(q1.prefix.level).toBe(HierarchyLevel.QUARTERLY);
      expect(q1.prefix.periodSortKey).toBe(1);
      expect(q4.prefix.level).toBe(HierarchyLevel.QUARTERLY);
      expect(q4.prefix.periodSortKey).toBe(4);
    });

    it("should return MONTHLY level for month patterns", () => {
      const jan = parseHierarchyFromTitle("[JAN] January Tasks", referenceYear);
      const dec = parseHierarchyFromTitle("[DEC] December Tasks", referenceYear);

      expect(jan.prefix.level).toBe(HierarchyLevel.MONTHLY);
      expect(jan.prefix.periodSortKey).toBe(0); // 0-indexed months
      expect(dec.prefix.level).toBe(HierarchyLevel.MONTHLY);
      expect(dec.prefix.periodSortKey).toBe(11);
    });

    it("should return WEEKLY level for [W1-52] patterns", () => {
      const w1 = parseHierarchyFromTitle("[W1] Week 1", referenceYear);
      const w52 = parseHierarchyFromTitle("[W52] Week 52", referenceYear);

      expect(w1.prefix.level).toBe(HierarchyLevel.WEEKLY);
      expect(w1.prefix.periodSortKey).toBe(1);
      expect(w52.prefix.level).toBe(HierarchyLevel.WEEKLY);
      expect(w52.prefix.periodSortKey).toBe(52);
    });

    it("should return TASK level for titles without prefix", () => {
      const result = parseHierarchyFromTitle("Plain task title", referenceYear);

      expect(result.prefix.level).toBe(HierarchyLevel.TASK);
      expect(result.prefix.raw).toBeNull();
      expect(result.prefix.periodSortKey).toBe(0);
    });

    it("should return TASK level for unknown prefix patterns", () => {
      const result = parseHierarchyFromTitle("[UNKNOWN] Unknown prefix", referenceYear);

      expect(result.prefix.level).toBe(HierarchyLevel.TASK);
      expect(result.prefix.raw).toBe("UNKNOWN");
    });
  });

  describe("Case insensitivity", () => {
    it("should handle lowercase [3yr]", () => {
      const result = parseHierarchyFromTitle("[3yr] Lowercase Year", referenceYear);
      expect(result.prefix.level).toBe(HierarchyLevel.MULTI_YEAR);
      expect(result.prefix.years).toBe(3);
    });

    it("should handle lowercase [h1] and [h2]", () => {
      const h1 = parseHierarchyFromTitle("[h1] Lowercase", referenceYear);
      const h2 = parseHierarchyFromTitle("[h2] Lowercase", referenceYear);
      expect(h1.prefix.level).toBe(HierarchyLevel.HALF_YEAR);
      expect(h2.prefix.level).toBe(HierarchyLevel.HALF_YEAR);
    });

    it("should handle lowercase [q1-q4]", () => {
      const q1 = parseHierarchyFromTitle("[q1] Lowercase", referenceYear);
      expect(q1.prefix.level).toBe(HierarchyLevel.QUARTERLY);
    });

    it("should handle lowercase month names", () => {
      const jan = parseHierarchyFromTitle("[jan] Lowercase", referenceYear);
      expect(jan.prefix.level).toBe(HierarchyLevel.MONTHLY);
    });

    it("should handle lowercase [w1-w52]", () => {
      const w1 = parseHierarchyFromTitle("[w1] Lowercase", referenceYear);
      expect(w1.prefix.level).toBe(HierarchyLevel.WEEKLY);
    });
  });

  describe("Combined hierarchy and date range", () => {
    it("should return both hierarchy info and date range for [Q1]", () => {
      const result = parseHierarchyFromTitle("[Q1] Quarter One", referenceYear);

      // Hierarchy info
      expect(result.prefix.level).toBe(HierarchyLevel.QUARTERLY);
      expect(result.prefix.periodSortKey).toBe(1);

      // Date range
      expect(result.dateRange).not.toBeNull();
      expect(result.dateRange!.start).toEqual(new Date(2026, 0, 1));
      expect(result.dateRange!.end).toEqual(new Date(2026, 2, 31, 23, 59, 59, 999));
    });

    it("should return both hierarchy info and date range for [JAN]", () => {
      const result = parseHierarchyFromTitle("[JAN] January Goals", referenceYear);

      // Hierarchy info
      expect(result.prefix.level).toBe(HierarchyLevel.MONTHLY);
      expect(result.prefix.periodSortKey).toBe(0);

      // Date range
      expect(result.dateRange).not.toBeNull();
      expect(result.dateRange!.start).toEqual(new Date(2026, 0, 1));
      expect(result.dateRange!.end).toEqual(new Date(2026, 0, 31, 23, 59, 59, 999));
    });

    it("should return hierarchy info but null date range for unknown prefix", () => {
      const result = parseHierarchyFromTitle("[RANDOM] Random Task", referenceYear);

      // Hierarchy info present but at TASK level
      expect(result.prefix.level).toBe(HierarchyLevel.TASK);
      expect(result.prefix.raw).toBe("RANDOM");

      // No date range for unknown prefix
      expect(result.dateRange).toBeNull();
    });

    it("should return hierarchy info but null date range for no prefix", () => {
      const result = parseHierarchyFromTitle("Plain task", referenceYear);

      // Hierarchy info present but at TASK level
      expect(result.prefix.level).toBe(HierarchyLevel.TASK);
      expect(result.prefix.raw).toBeNull();

      // No date range for no prefix
      expect(result.dateRange).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string", () => {
      const result = parseHierarchyFromTitle("", referenceYear);
      expect(result.prefix.level).toBe(HierarchyLevel.TASK);
      expect(result.prefix.raw).toBeNull();
      expect(result.dateRange).toBeNull();
    });

    it("should not match brackets in middle of title", () => {
      const result = parseHierarchyFromTitle("Title [Q1] in middle", referenceYear);
      expect(result.prefix.level).toBe(HierarchyLevel.TASK);
      expect(result.prefix.raw).toBeNull();
      expect(result.dateRange).toBeNull();
    });

    it("should work with different reference years", () => {
      const result2025 = parseHierarchyFromTitle("[Q1] Q1", 2025);
      expect(result2025.prefix.level).toBe(HierarchyLevel.QUARTERLY);
      expect(result2025.dateRange!.start.getFullYear()).toBe(2025);

      const result2030 = parseHierarchyFromTitle("[Q1] Q1", 2030);
      expect(result2030.prefix.level).toBe(HierarchyLevel.QUARTERLY);
      expect(result2030.dateRange!.start.getFullYear()).toBe(2030);
    });

    it("should use default reference year when not provided", () => {
      const result = parseHierarchyFromTitle("[Q1] Default Year");
      expect(result.dateRange!.start.getFullYear()).toBe(2026);
    });
  });
});
