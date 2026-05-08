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
