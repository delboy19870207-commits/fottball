import type { MatchPlayerRating, DevelopmentScore } from '@/types/database'

// Weighted average: effort 20%, technical 35%, decisions 30%, physical 15%
export function calcDevelopmentScore(rating: MatchPlayerRating): number {
  return (
    rating.effort_rating * 0.2 +
    rating.technical_rating * 0.35 +
    rating.decision_rating * 0.3 +
    rating.physical_rating * 0.15
  )
}

export function calcAvgScore(ratings: MatchPlayerRating[]): number {
  if (ratings.length === 0) return 0
  const sum = ratings.reduce((acc, r) => acc + calcDevelopmentScore(r), 0)
  return sum / ratings.length
}

export function calcTrend(
  ratings: MatchPlayerRating[]
): 'up' | 'stable' | 'down' {
  if (ratings.length < 4) return 'stable'
  const sorted = [...ratings].sort(
    (a, b) =>
      new Date(a.match?.date ?? 0).getTime() -
      new Date(b.match?.date ?? 0).getTime()
  )
  const last3 = sorted.slice(-3)
  const prev3 = sorted.slice(-6, -3)
  if (prev3.length === 0) return 'stable'
  const last3Avg = calcAvgScore(last3)
  const prev3Avg = calcAvgScore(prev3)
  const diff = last3Avg - prev3Avg
  if (diff > 0.3) return 'up'
  if (diff < -0.3) return 'down'
  return 'stable'
}

export function buildDevelopmentTimeline(
  ratings: MatchPlayerRating[]
): DevelopmentScore[] {
  return ratings
    .filter((r) => r.match)
    .sort(
      (a, b) =>
        new Date(a.match!.date).getTime() - new Date(b.match!.date).getTime()
    )
    .map((r) => ({
      score: parseFloat(calcDevelopmentScore(r).toFixed(2)),
      date: r.match!.date,
      match_id: r.match_id,
    }))
}
