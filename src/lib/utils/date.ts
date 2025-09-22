// File: src/lib/utils/date.ts
// NEW: Date utility functions

import {
  format,
  isWithinInterval,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { id as localeId } from "date-fns/locale";

export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (format(start, "yyyy-MM") === format(end, "yyyy-MM")) {
    // Same month
    return `${format(start, "d", { locale: localeId })} - ${format(end, "d MMMM yyyy", { locale: localeId })}`;
  } else if (format(start, "yyyy") === format(end, "yyyy")) {
    // Same year
    return `${format(start, "d MMM", { locale: localeId })} - ${format(end, "d MMM yyyy", { locale: localeId })}`;
  } else {
    // Different years
    return `${format(start, "d MMM yyyy", { locale: localeId })} - ${format(end, "d MMM yyyy", { locale: localeId })}`;
  }
}

export function getDateRangeArray(startDate: string, endDate: string): Date[] {
  return eachDayOfInterval({
    start: new Date(startDate),
    end: new Date(endDate),
  });
}

export function isDateInRange(
  date: Date,
  startDate: string,
  endDate: string
): boolean {
  return isWithinInterval(date, {
    start: new Date(startDate),
    end: new Date(endDate),
  });
}

export function getMonthDateRange(
  month: number,
  year: number
): { start: Date; end: Date } {
  const date = new Date(year, month - 1);
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

export function formatRelativeDate(date: string): string {
  const targetDate = new Date(date);
  const today = new Date();
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

  return format(targetDate, "d MMM yyyy", { locale: localeId });
}

export function getWorkingDays(startDate: string, endDate: string): number {
  const dates = getDateRangeArray(startDate, endDate);
  return dates.filter((date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6; // Exclude Sunday (0) and Saturday (6)
  }).length;
}

export function isOverdue(deadline: string, status?: string): boolean {
  if (status === "completed") return false;
  return new Date(deadline) < new Date();
}

export function getDaysUntilDeadline(deadline: string): number {
  const deadlineDate = new Date(deadline);
  const today = new Date();
  const diffTime = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getUrgencyLevel(
  deadline: string,
  status?: string
): {
  level: "low" | "medium" | "high" | "overdue";
  color: string;
  label: string;
} {
  if (status === "completed") {
    return {
      level: "low",
      color: "bg-green-100 text-green-800",
      label: "Completed",
    };
  }

  const days = getDaysUntilDeadline(deadline);

  if (days < 0) {
    return {
      level: "overdue",
      color: "bg-red-100 text-red-800",
      label: "Overdue",
    };
  }

  if (days <= 1) {
    return {
      level: "high",
      color: "bg-red-100 text-red-800",
      label: "Due Soon",
    };
  }

  if (days <= 3) {
    return {
      level: "medium",
      color: "bg-orange-100 text-orange-800",
      label: "Due This Week",
    };
  }

  return {
    level: "low",
    color: "bg-blue-100 text-blue-800",
    label: "On Track",
  };
}
