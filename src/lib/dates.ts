import { startOfYear, endOfYear, startOfMonth, endOfMonth, addYears, addMonths } from "date-fns";

const MONTHS: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
};

export function parseDateRangeFromTitle(
  title: string,
  referenceYear: number = 2026
): { start: Date; end: Date } | null {
  const match = title.match(/^\[([^\]]+)\]/);
  if (!match) return null;

  const tag = match[1].toUpperCase();
  const baseDate = new Date(referenceYear, 0, 1);

  // Multi-year: [3YR], [1YR], [5YR]
  const yearMatch = tag.match(/^(\d+)YR$/);
  if (yearMatch) {
    const years = parseInt(yearMatch[1]);
    return {
      start: startOfYear(baseDate),
      end: endOfYear(addYears(baseDate, years - 1)),
    };
  }

  // Half year: [H1], [H2]
  if (tag === "H1") {
    return {
      start: new Date(referenceYear, 0, 1),
      end: new Date(referenceYear, 5, 30),
    };
  }
  if (tag === "H2") {
    return {
      start: new Date(referenceYear, 6, 1),
      end: new Date(referenceYear, 11, 31),
    };
  }

  // Quarters: [Q1], [Q2], [Q3], [Q4]
  const quarterMatch = tag.match(/^Q([1-4])$/);
  if (quarterMatch) {
    const q = parseInt(quarterMatch[1]);
    const startMonth = (q - 1) * 3;
    return {
      start: new Date(referenceYear, startMonth, 1),
      end: endOfMonth(new Date(referenceYear, startMonth + 2, 1)),
    };
  }

  // Months: [JAN], [FEB], etc.
  if (tag in MONTHS) {
    const month = MONTHS[tag];
    return {
      start: startOfMonth(new Date(referenceYear, month, 1)),
      end: endOfMonth(new Date(referenceYear, month, 1)),
    };
  }

  // Week patterns: [W1], [W2], etc.
  const weekMatch = tag.match(/^W(\d+)$/);
  if (weekMatch) {
    const week = parseInt(weekMatch[1]);
    const start = addMonths(baseDate, 0);
    start.setDate(1 + (week - 1) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  }

  return null;
}
