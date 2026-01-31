import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return uuidv4();
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatValue(value: number, decimals: number = 4): string {
  return value.toFixed(decimals);
}

// Operator colors for consistent visualization
const OPERATOR_COLORS: string[] = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#D946EF', // fuchsia
  '#0EA5E9', // sky
  '#22C55E', // green
  '#E11D48', // rose
];

const operatorColorMap: Map<string, string> = new Map();

export function getOperatorColor(operator: string): string {
  if (!operatorColorMap.has(operator)) {
    const index = operatorColorMap.size % OPERATOR_COLORS.length;
    operatorColorMap.set(operator, OPERATOR_COLORS[index]);
  }
  return operatorColorMap.get(operator)!;
}

export function resetOperatorColors(): void {
  operatorColorMap.clear();
}

export function getUniqueOperators(devices: { Operator: string }[]): string[] {
  const operators = new Set<string>();
  devices.forEach((d) => {
    if (d.Operator && d.Operator !== 'Private') {
      operators.add(d.Operator);
    }
  });
  return Array.from(operators).sort();
}
