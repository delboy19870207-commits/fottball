'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Player } from '@/types/database'
import clsx from 'clsx'

interface AgeGroup {
  id: string
  name: string
}

interface Props {
  clubId: string
  ageGroups: AgeGroup[]
}

interface PlayerRating {
  player_id: string
  minutes_played: number
  effort_rating: number
  technical_rating: number
  decision_rating: number
  physical_rating: number
  scored_goal: boolean
  got_assist: boolean
}

const RATING_CATEGORIES = [
  { key: 'effort_rating' as const, label: 'Effort', weight: '20%' },
  { key: 'technical_rating' as const, label: 'Technical', weight: '35%' },
  { key: 'decision_rating' as const, label: 'Decisions', weight: '30%' },
  { key: 'physical_rating' as const, label: 'Physical', weight: '15%' },
]

const FORMATIONS = [
  '4-4-2', '4-3-3', '4-2-3-1', '4-5-1', '3-5-2', '3-4-3', '5-3-2', '4-1-4-1',
]

function RatingButtons({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex gap-0.5 flex-wrap">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={clsx(
            'w-7 h-7 rounded text-xs font-bold transition-all',
            value === n
              ? n >= 7
                ? 'bg-green-600 text-white'
                : n >= 4
                ? 'bg-yellow-600 text-white'
                : 'bg-red-600 text-white'
              : 'bg-pitch-600 text-slate-400 hover:bg-pitch-500 hover:text-white'
          )}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

export default function MatchLogForm({ clubId, ageGroups }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // Match details
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [ageGroupId, setAgeGroupId] = useState('')
  const [opposition, setOpposition] = useState('')
  const [venue, setVenue] = useState<'home' | 'away' | 'neutral'>('home')
  const [ourScore, setOurScore] = useState(0)
  const [theirScore, setTheirScore] = useState(0)
  const [formation, setFormation] = useState('4-3-3')
  const [competition, setCompetition] = useState<'league' | 'cup' | 'friendly'>('league')
  const [coachNotes, setCoachNotes] = useState('')

  // Squad & ratings
  const [squad, setSquad] = useState<Player[]>([])
  const [loadingSquad, setLoadingSquad] = useState(false)
  const [ratings, setRatings] = useState<Record<string, PlayerRating>>({})
  const [step, setStep] = useState<'details' | 'ratings'>('details')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ageGroupId) return
    setLoadingSquad(true)
    supabase
      .from('players')
      .select('*')
      .eq('age_group_id', ageGroupId)
      .eq('is_active', true)
      .order('last_name')
      .then(({ data }) => {
        const players = data ?? []
        setSquad(players)
        const initial: Record<string, PlayerRating> = {}
        for (const p of players) {
          initial[p.id] = {
            player_id: p.id,
            minutes_played: 90,
            effort_rating: 6,
            technical_rating: 6,
            decision_rating: 6,
            physical_rating: 6,
            scored_goal: false,
            got_assist: false,
          }
        }
        setRatings(initial)
        setLoadingSquad(false)
      })
  }, [ageGroupId])

  function updateRating<K extends keyof PlayerRating>(
    playerId: string,
    key: K,
    value: PlayerRating[K]
  ) {
    setRatings((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], [key]: value },
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { data: match, error: matchErr } = await supabase
        .from('matches')
        .insert({
          club_id: clubId,
          age_group_id: ageGroupId,
          date,
          opposition,
          venue,
          our_score: ourScore,
          their_score: theirScore,
          formation,
          competition,
          coach_notes: coachNotes || null,
        })
        .select('id')
        .single()

      if (matchErr) throw matchErr

      const ratingRows = Object.values(ratings).map((r) => ({
        ...r,
        match_id: match.id,
      }))

      if (ratingRows.length > 0) {
        const { error: ratingErr } = await supabase
          .from('match_player_ratings')
          .insert(ratingRows)
        if (ratingErr) throw ratingErr
      }

      router.push('/dashboard')
    } catch (err: unknown) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  const canProceedToRatings =
    date && ageGroupId && opposition && ourScore >= 0 && theirScore >= 0

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-5 rounded-lg bg-red-900/40 border border-red-700/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {['Match Details', 'Player Ratings'].map((label, i) => (
          <div
            key={label}
            className={clsx(
              'flex items-center gap-2 text-sm font-medium',
              (step === 'details' ? 0 : 1) >= i ? 'text-white' : 'text-slate-500'
            )}
          >
            {i > 0 && <span className="text-slate-600 mx-1">→</span>}
            <span
              className={clsx(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                (step === 'details' ? 0 : 1) >= i
                  ? 'bg-brand text-white'
                  : 'bg-pitch-700 text-slate-500'
              )}
            >
              {i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
      </div>

      {step === 'details' && (
        <div className="card space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="form-label">Age Group</label>
              <select
                className="form-select"
                value={ageGroupId}
                onChange={(e) => setAgeGroupId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {ageGroups.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Opposition</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Newport City FC"
              value={opposition}
              onChange={(e) => setOpposition(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Venue</label>
              <select
                className="form-select"
                value={venue}
                onChange={(e) => setVenue(e.target.value as 'home' | 'away' | 'neutral')}
              >
                <option value="home">Home</option>
                <option value="away">Away</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <div>
              <label className="form-label">Our Score</label>
              <input
                type="number"
                min="0"
                max="30"
                className="form-input text-center"
                value={ourScore}
                onChange={(e) => setOurScore(parseInt(e.target.value) || 0)}
                required
              />
            </div>
            <div>
              <label className="form-label">Their Score</label>
              <input
                type="number"
                min="0"
                max="30"
                className="form-input text-center"
                value={theirScore}
                onChange={(e) => setTheirScore(parseInt(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Formation</label>
              <select
                className="form-select"
                value={formation}
                onChange={(e) => setFormation(e.target.value)}
              >
                {FORMATIONS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Competition</label>
              <select
                className="form-select"
                value={competition}
                onChange={(e) =>
                  setCompetition(e.target.value as 'league' | 'cup' | 'friendly')
                }
              >
                <option value="league">League</option>
                <option value="cup">Cup</option>
                <option value="friendly">Friendly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Coach Notes <span className="text-slate-500">(optional)</span></label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Tactical observations, standout moments, areas to work on…"
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
            />
          </div>

          <button
            type="button"
            disabled={!canProceedToRatings}
            onClick={() => setStep('ratings')}
            className="btn-primary"
          >
            Continue to Player Ratings →
          </button>
        </div>
      )}

      {step === 'ratings' && (
        <div className="space-y-4">
          {/* Match summary */}
          <div className="card flex flex-wrap items-center gap-4">
            <div className="text-sm text-slate-400">{date}</div>
            <div className="font-bold text-white text-lg">
              Cascade FC {ourScore}–{theirScore} {opposition}
            </div>
            <span className={clsx('badge', ourScore > theirScore ? 'badge-green' : ourScore < theirScore ? 'badge-red' : 'badge-slate')}>
              {ourScore > theirScore ? 'Win' : ourScore < theirScore ? 'Loss' : 'Draw'}
            </span>
            <button
              type="button"
              onClick={() => setStep('details')}
              className="btn-ghost ml-auto"
            >
              ← Edit Details
            </button>
          </div>

          {loadingSquad ? (
            <div className="card text-slate-400 text-sm py-8 text-center">Loading squad…</div>
          ) : squad.length === 0 ? (
            <div className="card text-slate-400 text-sm py-8 text-center">
              No active players found for this age group.
            </div>
          ) : (
            <div className="space-y-3">
              {squad.map((player) => {
                const r = ratings[player.id]
                if (!r) return null
                return (
                  <div key={player.id} className="card">
                    <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
                      <div>
                        <div className="font-semibold text-white">
                          {player.first_name} {player.last_name}
                        </div>
                        <span className="badge-blue mt-1">{player.position}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Minutes</label>
                          <input
                            type="number"
                            min="0"
                            max="120"
                            className="form-input w-20 text-center py-1.5 text-sm"
                            value={r.minutes_played}
                            onChange={(e) =>
                              updateRating(player.id, 'minutes_played', parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-2 pt-4">
                          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={r.scored_goal}
                              onChange={(e) => updateRating(player.id, 'scored_goal', e.target.checked)}
                              className="rounded border-pitch-500 bg-pitch-700 text-brand"
                            />
                            ⚽ Goal
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={r.got_assist}
                              onChange={(e) => updateRating(player.id, 'got_assist', e.target.checked)}
                              className="rounded border-pitch-500 bg-pitch-700 text-brand"
                            />
                            🅰️ Assist
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {RATING_CATEGORIES.map(({ key, label, weight }) => (
                        <div key={key} className="flex items-center gap-3">
                          <div className="w-28 flex-shrink-0">
                            <div className="text-xs font-medium text-slate-300">{label}</div>
                            <div className="text-xs text-slate-500">{weight}</div>
                          </div>
                          <RatingButtons
                            value={r[key] as number}
                            onChange={(v) => updateRating(player.id, key, v)}
                          />
                          <div className="text-sm font-bold text-white w-6 flex-shrink-0">
                            {r[key]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || squad.length === 0}
              className="btn-primary"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                  </svg>
                  Saving…
                </>
              ) : (
                'Save Match Report'
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </form>
  )
}
