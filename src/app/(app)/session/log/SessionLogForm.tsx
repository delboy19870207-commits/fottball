'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Player, FlagType } from '@/types/database'
import clsx from 'clsx'

interface AgeGroup {
  id: string
  name: string
}

interface Props {
  clubId: string
  ageGroups: AgeGroup[]
}

interface PlayerFlag {
  player_id: string
  flag_type: FlagType
  note: string
}

const FOCUS_TAGS = [
  'Technical', 'Tactical', 'Pressing', 'Set pieces',
  'Physical', 'Small-sided', 'Transition', '1v1',
]

const FLAG_TYPES: { value: FlagType; label: string; color: string }[] = [
  { value: 'standout', label: '⭐ Standout', color: 'badge-green' },
  { value: 'developing', label: '📈 Developing', color: 'badge-blue' },
  { value: 'concern', label: '⚠️ Concern', color: 'badge-yellow' },
  { value: 'injury_risk', label: '🩹 Injury Risk', color: 'badge-red' },
]

export default function SessionLogForm({ clubId, ageGroups }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [ageGroupId, setAgeGroupId] = useState('')
  const [duration, setDuration] = useState(75)
  const [playersAttended, setPlayersAttended] = useState(0)
  const [focusTags, setFocusTags] = useState<string[]>([])
  const [coachNotes, setCoachNotes] = useState('')
  const [flags, setFlags] = useState<PlayerFlag[]>([])
  const [squad, setSquad] = useState<Player[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ageGroupId) return
    supabase
      .from('players')
      .select('*')
      .eq('age_group_id', ageGroupId)
      .eq('is_active', true)
      .order('last_name')
      .then(({ data }) => setSquad(data ?? []))
  }, [ageGroupId])

  function toggleTag(tag: string) {
    setFocusTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function addFlag() {
    setFlags((prev) => [...prev, { player_id: '', flag_type: 'standout', note: '' }])
  }

  function updateFlag(index: number, field: keyof PlayerFlag, value: string) {
    setFlags((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function removeFlag(index: number) {
    setFlags((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { data: session, error: sessionErr } = await supabase
        .from('training_sessions')
        .insert({
          club_id: clubId,
          age_group_id: ageGroupId,
          date,
          duration_minutes: duration,
          players_attended: playersAttended,
          focus_tags: focusTags,
          coach_notes: coachNotes || null,
        })
        .select('id')
        .single()

      if (sessionErr) throw sessionErr

      const validFlags = flags.filter((f) => f.player_id)
      if (validFlags.length > 0) {
        const { error: flagErr } = await supabase
          .from('session_player_flags')
          .insert(
            validFlags.map((f) => ({
              session_id: session.id,
              player_id: f.player_id,
              flag_type: f.flag_type,
              note: f.note || null,
            }))
          )
        if (flagErr) throw flagErr
      }

      router.push('/dashboard')
    } catch (err: unknown) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-900/40 border border-red-700/50 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

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
                <option key={ag.id} value={ag.id}>{ag.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Duration (minutes)</label>
            <input
              type="number"
              min="15"
              max="180"
              step="5"
              className="form-input"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
              required
            />
          </div>
          <div>
            <label className="form-label">Players Attended</label>
            <input
              type="number"
              min="0"
              max="30"
              className="form-input"
              value={playersAttended}
              onChange={(e) => setPlayersAttended(parseInt(e.target.value) || 0)}
              required
            />
          </div>
        </div>
      </div>

      {/* Focus tags */}
      <div className="card">
        <div className="card-header">Session Focus</div>
        <div className="flex flex-wrap gap-2">
          {FOCUS_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                focusTags.includes(tag)
                  ? 'bg-brand border-brand text-white'
                  : 'bg-pitch-700 border-pitch-600 text-slate-400 hover:text-white hover:border-pitch-500'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Coach notes */}
      <div className="card">
        <label className="form-label">Coach Notes <span className="text-slate-500">(optional)</span></label>
        <textarea
          className="form-textarea"
          rows={3}
          placeholder="Session observations, key themes covered, next steps…"
          value={coachNotes}
          onChange={(e) => setCoachNotes(e.target.value)}
        />
      </div>

      {/* Player flags */}
      <div className="card">
        <div className="card-header">Player Flags</div>
        <p className="text-xs text-slate-500 mb-4">Flag individual players with standout performances, development notes, or concerns.</p>

        {flags.length > 0 && (
          <div className="space-y-3 mb-4">
            {flags.map((flag, i) => (
              <div key={i} className="flex gap-2 items-start flex-wrap">
                <select
                  className="form-select flex-1 min-w-[140px]"
                  value={flag.player_id}
                  onChange={(e) => updateFlag(i, 'player_id', e.target.value)}
                >
                  <option value="">Select player…</option>
                  {squad.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                    </option>
                  ))}
                </select>

                <select
                  className="form-select w-40"
                  value={flag.flag_type}
                  onChange={(e) => updateFlag(i, 'flag_type', e.target.value)}
                >
                  {FLAG_TYPES.map((ft) => (
                    <option key={ft.value} value={ft.value}>
                      {ft.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  className="form-input flex-1 min-w-[180px]"
                  placeholder="One-line note…"
                  value={flag.note}
                  onChange={(e) => updateFlag(i, 'note', e.target.value)}
                />

                <button
                  type="button"
                  onClick={() => removeFlag(i)}
                  className="btn-ghost text-red-400 hover:text-red-300 px-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addFlag}
          disabled={!ageGroupId}
          className="btn-ghost text-sm"
        >
          + Add Player Flag
        </button>
        {!ageGroupId && (
          <p className="text-xs text-slate-500 mt-2">Select an age group first to add player flags.</p>
        )}
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={saving || !ageGroupId} className="btn-primary">
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
              </svg>
              Saving…
            </>
          ) : (
            'Save Session'
          )}
        </button>
        <button type="button" onClick={() => router.push('/dashboard')} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  )
}
