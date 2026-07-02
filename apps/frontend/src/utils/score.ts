export type ScoreLevel = 'high' | 'mid' | 'low'

export function scoreLevel(value: number | null | undefined): ScoreLevel {
  const n = Number(value)
  return n >= 80 ? 'high' : n >= 60 ? 'mid' : 'low'
}
