import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { calcDevelopmentScore, buildDevelopmentTimeline, calcTrend } from '@/lib/calculations'
import type { MatchPlayerRating, FlagType } from '@/types/database'
import PlayerProfileClient from './PlayerProfileClient'

// Supabase infers joined relations as T | T[]; unwrap safely
function unwrapJoin<T>(val: T | T[] | null | undefined): T | null {
  if (val == null) return null
  return Array.isArray(val) ? (val[0] ?? null) : val
}

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: coachClub } = await supabase
    .from('coach_clubs')
    .select('club_id')
    .eq('user_id', user!.id)
    .single()

  if (!coachClub) return notFound()

  const { data: playerRaw } = await supabase
    .from('players')
    .select('*, age_group:age_groups(id, name)')
    .eq('id', id)
    .eq('club_id', coachClub.club_id)
    .single()

  if (!playerRaw) return notFound()

  // Normalise the age_group join which Supabase may type as an array
  const ageGroupRaw = unwrapJoin(playerRaw.age_group)
  const player = {
    ...playerRaw,
    age_group: ageGroupRaw
      ? { id: String(ageGroupRaw.id), name: String(ageGroupRaw.name) }
      : null,
  }

  // Fetch all match ratings with match data
  const { data: ratingsRaw } = await supabase
    .from('match_player_ratings')
    .select(`
      *,
      match:matches(id, date, opposition, our_score, their_score, competition, age_group_id)
    `)
    .eq('player_id', id)
    .order('match(date)', { ascending: true })

  const ratings = (ratingsRaw ?? []) as MatchPlayerRating[]

  const timeline = buildDevelopmentTimeline(ratings)
  const trend = calcTrend(ratings)
  const appearances = ratings.length
  const goals = ratings.filter((r) => r.scored_goal).length
  const assists = ratings.filter((r) => r.got_assist).length
  const avgScore =
    appearances === 0
      ? 0
      : ratings.reduce((sum, r) => sum + calcDevelopmentScore(r), 0) / appearances

  // Training flags — normalise the session join
  const { data: flagsRaw } = await supabase
    .from('session_player_flags')
    .select('*, session:training_sessions(id, date, focus_tags)')
    .eq('player_id', id)
    .order('session(date)', { ascending: false })
    .limit(20)

  const flags = (flagsRaw ?? []).map((f) => {
    const s = unwrapJoin(f.session)
    return {
      id: String(f.id),
      flag_type: f.flag_type as FlagType,
      note: f.note as string | null,
      session: s
        ? {
            id: String(s.id),
            date: String(s.date),
            focus_tags: (s.focus_tags ?? []) as string[],
          }
        : null,
    }
  })

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto">
      <PlayerProfileClient
        player={player}
        timeline={timeline}
        ratings={ratings}
        flags={flags}
        stats={{ appearances, goals, assists, avgScore: parseFloat(avgScore.toFixed(2)), trend }}
      />
    </div>
  )
}
