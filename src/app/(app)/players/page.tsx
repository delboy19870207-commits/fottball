import { createServerSupabaseClient } from '@/lib/supabase-server'
import { calcDevelopmentScore, calcTrend } from '@/lib/calculations'
import type { MatchPlayerRating } from '@/types/database'
import PlayersClient from './PlayersClient'

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ ag?: string }>
}) {
  const { ag } = await searchParams
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: coachClub } = await supabase
    .from('coach_clubs')
    .select('club_id')
    .eq('user_id', user!.id)
    .single()

  if (!coachClub) {
    return <div className="p-8 text-slate-400">No club assigned.</div>
  }

  const clubId = coachClub.club_id

  const { data: ageGroups } = await supabase
    .from('age_groups')
    .select('id, name')
    .eq('club_id', clubId)
    .order('name')

  let playersQuery = supabase
    .from('players')
    .select('*, age_group:age_groups(id, name)')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .order('last_name')

  if (ag) {
    playersQuery = playersQuery.eq('age_group_id', ag)
  }

  const { data: players } = await playersQuery

  // Fetch all ratings for these players
  const playerIds = (players ?? []).map((p) => p.id)
  const { data: allRatings } = await supabase
    .from('match_player_ratings')
    .select('*, match:matches(id, date, age_group_id, club_id)')
    .in('player_id', playerIds.length > 0 ? playerIds : ['00000000-0000-0000-0000-000000000000'])

  // Build stats per player
  const enriched = (players ?? []).map((player) => {
    const playerRatings = (allRatings ?? []).filter(
      (r) => r.player_id === player.id
    ) as MatchPlayerRating[]

    const appearances = playerRatings.length
    const goals = playerRatings.filter((r) => r.scored_goal).length
    const assists = playerRatings.filter((r) => r.got_assist).length

    const avgScore =
      appearances === 0
        ? 0
        : playerRatings.reduce((sum, r) => sum + calcDevelopmentScore(r), 0) / appearances

    const trend = calcTrend(playerRatings)

    return {
      ...player,
      appearances,
      goals,
      assists,
      development_score: parseFloat(avgScore.toFixed(2)),
      trend,
    }
  })

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white">Players</h1>
        <p className="text-slate-400 text-sm mt-0.5">Full squad overview with development metrics</p>
      </div>
      <PlayersClient
        players={enriched}
        ageGroups={ageGroups ?? []}
        selectedAg={ag}
      />
    </div>
  )
}
