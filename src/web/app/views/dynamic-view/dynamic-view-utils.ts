import type { ControlBlock, ControlLayoutNode } from "../../../services/daemon.service";

export function isValidExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeSplitSizes(sizes: number[], changedIndex: number, nextValue: number): number[] {
  if (sizes.length === 0) return [];
  const clampedValue = clampPercent(nextValue);
  const remaining = 100 - clampedValue;
  const otherIndexes = sizes.map((_, index) => index).filter((index) => index !== changedIndex);
  if (otherIndexes.length === 0) return [100];
  const otherTotal = otherIndexes.reduce((sum, index) => sum + Math.max(0, sizes[index] ?? 0), 0);
  const next = sizes.map((size, index) => {
    if (index === changedIndex) return clampedValue;
    if (otherTotal <= 0) return remaining / otherIndexes.length;
    return ((Math.max(0, size) / otherTotal) * remaining);
  });
  return normalizeTotal(next);
}

export function countSessionBindings(blocks: ControlBlock[], runId: string): number {
  return blocks.filter((block) => block.terminal?.runId === runId).length;
}

export function hasDuplicateTerminalBinding(blocks: ControlBlock[], runId: string): boolean {
  return countSessionBindings(blocks, runId) > 1;
}

export function layoutFingerprint(node: ControlLayoutNode): string {
  return JSON.stringify(node);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(90, Math.max(10, value));
}

function normalizeTotal(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return values.map(() => 100 / values.length);
  const normalized = values.map((value) => Number(((value / total) * 100).toFixed(2)));
  const drift = Number((100 - normalized.reduce((sum, value) => sum + value, 0)).toFixed(2));
  normalized[normalized.length - 1] = Number(((normalized[normalized.length - 1] ?? 0) + drift).toFixed(2));
  return normalized;
}

