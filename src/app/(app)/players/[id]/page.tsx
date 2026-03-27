import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { calcDevelopmentScore, buildDevelopmentTimeline, calcTrend } from '@/lib/calculations'
import type { MatchPlayerRating } from '@/types/database'
import PlayerProfileClient from './PlayerProfileClient'

export default async function PlayerProfilePage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: coachClub } = await supabase
    .from('coach_clubs')
    .select('club_id')
    .eq('user_id', user!.id)
    .single()

  if (!coachClub) return notFound()

  const { data: player } = await supabase
    .from('players')
    .select('*, age_group:age_groups(id, name)')
    .eq('id', params.id)
    .eq('club_id', coachClub.club_id)
    .single()

  if (!player) return notFound()

  // Fetch all match ratings with match data
  const { data: ratingsRaw } = await supabase
    .from('match_player_ratings')
    .select(`
      *,
      match:matches(id, date, opposition, our_score, their_score, competition, age_group_id)
    `)
    .eq('player_id', params.id)
    .order('match(date)', { ascending: true })

  const ratings = (ratingsRaw ?? []) as MatchPlayerRating[]

  // Timeline
  const timeline = buildDevelopmentTimeline(ratings)
  const trend = calcTrend(ratings)
  const appearances = ratings.length
  const goals = ratings.filter((r) => r.scored_goal).length
  const assists = ratings.filter((r) => r.got_assist).length
  const avgScore =
    appearances === 0
      ? 0
      : ratings.reduce((sum, r) => sum + calcDevelopmentScore(r), 0) / appearances

  // Training flags
  const { data: flagsRaw } = await supabase
    .from('session_player_flags')
    .select('*, session:training_sessions(id, date, focus_tags)')
    .eq('player_id', params.id)
    .order('session(date)', { ascending: false })
    .limit(20)

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto">
      <PlayerProfileClient
        player={player}
        timeline={timeline}
        ratings={ratings}
        flags={flagsRaw ?? []}
        stats={{ appearances, goals, assists, avgScore: parseFloat(avgScore.toFixed(2)), trend }}
      />
    </div>
  )
}
