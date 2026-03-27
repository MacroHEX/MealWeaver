export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("es-CL", { day: "numeric", month: "long" });
}

export function formatMonth(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
  });
}

/** Returns the ISO week numbers that fall within a given month (1-indexed). */
export function getWeeksInMonth(year: number, month: number): number[] {
  const weeks = new Set<number>();
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    weeks.add(getWeekNumber(new Date(year, month - 1, day)));
  }
  // Handle year-boundary wrap (e.g., week 52/53 → week 1 of next year)
  return Array.from(weeks).sort((a, b) => a - b);
}

export function getWeekStartEnd(year: number, week: number): { start: Date; end: Date } {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1));

  const start = new Date(startOfWeek1);
  start.setUTCDate(startOfWeek1.getUTCDate() + (week - 1) * 7);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return { start, end };
}
