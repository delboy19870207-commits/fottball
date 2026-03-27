import { createServerSupabaseClient } from '@/lib/supabase-server'
import { calcDevelopmentScore } from '@/lib/calculations'
import type { MatchPlayerRating, Match, Player } from '@/types/database'
import DashboardClient from './DashboardClient'

async function getDashboardData(clubId: string, ageGroupId?: string) {
  const supabase = createServerSupabaseClient()

  // Base query builder
  const agFilter = ageGroupId ? `.eq('age_group_id', '${ageGroupId}')` : ''

  // Total players
  let playersQuery = supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId)
    .eq('is_active', true)
  if (ageGroupId) playersQuery = playersQuery.eq('age_group_id', ageGroupId)
  const { count: totalPlayers } = await playersQuery

  // Total matches
  let matchesQuery = supabase
    .from('matches')
    .select('id,our_score,their_score,age_group_id', { count: 'exact' })
    .eq('club_id', clubId)
  if (ageGroupId) matchesQuery = matchesQuery.eq('age_group_id', ageGroupId)
  const { data: allMatches, count: totalMatches } = await matchesQuery

  // Win rate
  const wins = allMatches?.filter((m) => m.our_score > m.their_score).length ?? 0
  const winRate = totalMatches ? Math.round((wins / totalMatches) * 100) : 0

  // Total sessions
  let sessionsQuery = supabase
    .from('training_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId)
  if (ageGroupId) sessionsQuery = sessionsQuery.eq('age_group_id', ageGroupId)
  const { count: totalSessions } = await sessionsQuery

  // Recent matches (last 5)
  let recentMatchesQuery = supabase
    .from('matches')
    .select('*, age_group:age_groups(name)')
    .eq('club_id', clubId)
    .order('date', { ascending: false })
    .limit(8)
  if (ageGroupId) recentMatchesQuery = recentMatchesQuery.eq('age_group_id', ageGroupId)
  const { data: recentMatches } = await recentMatchesQuery

  // This month's ratings for top performers
  const thisMonth = new Date()
  thisMonth.setDate(1)
  const monthStart = thisMonth.toISOString().split('T')[0]

  let ratingsQuery = supabase
    .from('match_player_ratings')
    .select(`
      *,
      player:players(id, first_name, last_name, age_group_id, position),
      match:matches(id, date, age_group_id, club_id)
    `)
    .gte('match.date', monthStart)

  const { data: monthRatings } = await ratingsQuery

  // Filter by club/age group manually since we joined
  const filteredRatings = (monthRatings ?? []).filter((r) => {
    if (!r.match) return false
    if (r.match.club_id !== clubId) return false
    if (ageGroupId && r.match.age_group_id !== ageGroupId) return false
    return true
  })

  // Group ratings by player, calc avg dev score
  const playerRatingMap = new Map<string, { player: Player; scores: number[] }>()
  for (const r of filteredRatings as MatchPlayerRating[]) {
    if (!r.player) continue
    const score = calcDevelopmentScore(r)
    if (!playerRatingMap.has(r.player_id)) {
      playerRatingMap.set(r.player_id, { player: r.player as Player, scores: [] })
    }
    playerRatingMap.get(r.player_id)!.scores.push(score)
  }

  const topPerformers = Array.from(playerRatingMap.entries())
    .map(([, { player, scores }]) => ({
      player,
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      appearances: scores.length,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 5)

  // Dev score by age group
  const { data: ageGroups } = await supabase
    .from('age_groups')
    .select('id, name')
    .eq('club_id', clubId)

  const { data: allRatings } = await supabase
    .from('match_player_ratings')
    .select(`
      effort_rating, technical_rating, decision_rating, physical_rating,
      match:matches(age_group_id, club_id)
    `)

  const ageGroupScores = (ageGroups ?? []).map((ag) => {
    const agRatings = (allRatings ?? []).filter(
      (r) => r.match?.club_id === clubId && r.match?.age_group_id === ag.id
    )
    const avg =
      agRatings.length === 0
        ? 0
        : agRatings.reduce(
            (sum, r) =>
              sum +
              r.effort_rating * 0.2 +
              r.technical_rating * 0.35 +
              r.decision_rating * 0.3 +
              r.physical_rating * 0.15,
            0
          ) / agRatings.length
    return { name: ag.name, score: parseFloat(avg.toFixed(2)) }
  })

  return {
    totalPlayers: totalPlayers ?? 0,
    totalMatches: totalMatches ?? 0,
    totalSessions: totalSessions ?? 0,
    winRate,
    recentMatches: recentMatches ?? [],
    topPerformers,
    ageGroupScores,
    ageGroups: ageGroups ?? [],
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { ag?: string }
}) {
  const supabase = createServerSupabaseClient()

  // Get user's club
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: coachClub } = await supabase
    .from('coach_clubs')
    .select('club_id, club:clubs(id, name)')
    .eq('user_id', user!.id)
    .single()

  const clubId = coachClub?.club_id
  if (!clubId) {
    return (
      <div className="p-8 text-slate-400">
        No club assigned to your account. Please contact your administrator.
      </div>
    )
  }

  const selectedAg = searchParams.ag
  const data = await getDashboardData(clubId, selectedAg)

  return <DashboardClient {...data} selectedAg={selectedAg} clubName={(coachClub?.club as { name: string })?.name ?? 'Cascade Youth FC'} />
}
