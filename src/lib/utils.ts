import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

export function formatCurrency(amount: number, currency: string, decimals = 2): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

export function formatDate(date: string): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('pl-PL').format(new Date(date))
}
