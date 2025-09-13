import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function getWorkloadColor(projectCount: number): string {
  if (projectCount <= 2) return 'workload-low'
  if (projectCount <= 4) return 'workload-medium'
  return 'workload-high'
}

export function getWorkloadLabel(projectCount: number): string {
  if (projectCount <= 2) return 'Ringan'
  if (projectCount <= 4) return 'Sedang'
  return 'Berat'
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

// Fixed TypeScript types for debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}