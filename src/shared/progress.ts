import type { MigrationProgressEvent } from '@shared/ipc'

export function latestProgress(events: MigrationProgressEvent[]): MigrationProgressEvent | undefined {
  return events.at(-1)
}

/** Percentual 0–100 quando `total` é conhecido; senão null (barra indeterminada). */
export function progressPercent(event: MigrationProgressEvent | undefined): number | null {
  if (!event?.total || event.total <= 0) return null
  return Math.min(100, Math.max(0, Math.round((event.processed / event.total) * 100)))
}
