export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

export function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addSLADays(date: Date, days: number, dayType: string | null): Date {
  if (days === 0) return new Date(date);
  if (dayType === "calendardays") return addCalendarDays(date, days);
  return addBusinessDays(date, days);
}

export type RiskStatus = "On Time" | "On Risk" | "Delayed";
export type SLAStage = "50" | "75" | "due_today" | "overdue";

/**
 * Determines which SLA notification stage a milestone has reached.
 * Uses dueDate (startDate + SLA days) as the SLA deadline.
 * Returns null when no stage threshold has been crossed yet.
 */
export function getSLAStage(
  startDate: Date | null,
  dueDate: Date | null
): SLAStage | null {
  if (!startDate || !dueDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  if (today > due) return "overdue";
  if (today.getTime() === due.getTime()) return "due_today";

  const totalMs = due.getTime() - start.getTime();
  if (totalMs <= 0) return null;

  const elapsedPct = ((today.getTime() - start.getTime()) / totalMs) * 100;

  if (elapsedPct >= 75) return "75";
  if (elapsedPct >= 50) return "50";

  return null;
}

/** Returns how far through the SLA period we are (0–100, capped). */
export function calculateSLAPercentage(startDate: Date, dueDate: Date): number {
  const total = dueDate.getTime() - startDate.getTime();
  if (total <= 0) return 100;
  const elapsed = Date.now() - startDate.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

/** Returns days remaining until plannedEndDate (negative when overdue). */
export function getRemainingDays(plannedEndDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const planned = new Date(plannedEndDate);
  planned.setHours(0, 0, 0, 0);
  return Math.round((planned.getTime() - today.getTime()) / 86_400_000);
}

export function getRiskStatus(
  dueDate: string | null,
  completedDate: string | null,
  status: string
): RiskStatus | null {
  if (!dueDate) return null;

  const dueEnd = new Date(dueDate);
  dueEnd.setHours(23, 59, 59, 999);

  if (status === "Completed" && completedDate) {
    return new Date(completedDate) <= dueEnd ? "On Time" : "Delayed";
  }

  if (status === "Pending") return null;

  // In Progress (or any other non-completed state)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(dueDate);
  dueDay.setHours(0, 0, 0, 0);

  if (today < dueDay) return "On Time";
  if (today.getTime() === dueDay.getTime()) return "On Risk";
  return "Delayed";
}
