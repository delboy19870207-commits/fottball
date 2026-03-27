'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import clsx from 'clsx'
import { calcDevelopmentScore } from '@/lib/calculations'
import type { Player, MatchPlayerRating, DevelopmentScore, FlagType } from '@/types/database'

const DevelopmentLineChart = dynamic(
  () => import('@/components/charts/DevelopmentLineChart'),
  { ssr: false }
)

interface SessionFlag {
  id: string
  flag_type: FlagType
  note: string | null
  session: {
    id: string
    date: string
    focus_tags: string[]
  } | null
}

interface Props {
  player: Player & { age_group: { id: string; name: string } | null }
  timeline: DevelopmentScore[]
  ratings: MatchPlayerRating[]
  flags: SessionFlag[]
  stats: {
    appearances: number
    goals: number
    assists: number
    avgScore: number
    trend: 'up' | 'stable' | 'down'
  }
}

const FLAG_CONFIG: Record<FlagType, { label: string; badge: string }> = {
  standout: { label: '⭐ Standout', badge: 'badge-green' },
  developing: { label: '📈 Developing', badge: 'badge-blue' },
  concern: { label: '⚠️ Concern', badge: 'badge-yellow' },
  injury_risk: { label: '🩹 Injury Risk', badge: 'badge-red' },
}

function TrendChip({ trend }: { trend: 'up' | 'stable' | 'down' }) {
  const map = {
    up: { label: '↑ Improving', cls: 'badge-green' },
    down: { label: '↓ Declining', cls: 'badge-red' },
    stable: { label: '→ Stable', cls: 'badge-slate' },
  }
  const { label, cls } = map[trend]
  return <span className={cls}>{label}</span>
}

export default function PlayerProfileClient({ player, timeline, ratings, flags, stats }: Props) {
  const age = player.dob
    ? Math.floor((Date.now() - new Date(player.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  const recentRatings = [...ratings]
    .sort((a, b) => new Date(b.match?.date ?? 0).getTime() - new Date(a.match?.date ?? 0).getTime())
    .slice(0, 10)

  return (
    <>
      {/* Back nav */}
      <div className="mb-6">
        <Link href="/players" className="text-sm text-slate-400 hover:text-white transition-colors">
          ← Back to Players
        </Link>
      </div>

      {/* Player header */}
      <div className="card mb-5">
        <div className="flex flex-wrap gap-5 items-start">
          <div className="w-14 h-14 rounded-2xl bg-brand/20 border border-brand/30 flex items-center justify-center text-2xl font-bold text-brand-light flex-shrink-0">
            {player.first_name[0]}{player.last_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white">
              {player.first_name} {player.last_name}
            </h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="badge-blue">{player.age_group?.name ?? '—'}</span>
              <span className="badge-slate">{player.position}</span>
              {age && <span className="badge-slate">{age} yrs</span>}
              <TrendChip trend={stats.trend} />
            </div>
          </div>
          <div className="flex gap-6 flex-wrap">
            {[
              { label: 'Appearances', value: stats.appearances },
              { label: 'Goals', value: stats.goals },
              { label: 'Assists', value: stats.assists },
              {
                label: 'Dev Score',
                value: stats.appearances > 0 ? stats.avgScore.toFixed(2) : '—',
              },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dev score chart */}
      <div className="card mb-5">
        <div className="card-header">Development Score Over Time</div>
        <div className="h-52">
          <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-500 text-sm">Loading chart…</div>}>
            <DevelopmentLineChart data={timeline} />
          </Suspense>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent match ratings */}
        <div className="card">
          <div className="card-header">Recent Match Ratings</div>
          {recentRatings.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">No match ratings recorded yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-pitch-600">
                    {['Date', 'Opposition', 'Eff', 'Tech', 'Dec', 'Phys', 'Score'].map((h) => (
                      <th key={h} className="text-left text-xs text-slate-400 font-medium pb-2 pr-2">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentRatings.map((r) => {
                    const score = calcDevelopmentScore(r)
                    return (
                      <tr key={r.id} className="border-b border-pitch-700/40">
                        <td className="py-2.5 pr-2 text-slate-400 whitespace-nowrap">
                          {r.match
                            ? new Date(r.match.date).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                              })
                            : '—'}
                        </td>
                        <td className="py-2.5 pr-2 text-slate-300 truncate max-w-[90px]">
                          {r.match?.opposition ?? '—'}
                        </td>
                        <td className="py-2.5 pr-2">
                          <RatingDot v={r.effort_rating} />
                        </td>
                        <td className="py-2.5 pr-2">
                          <RatingDot v={r.technical_rating} />
                        </td>
                        <td className="py-2.5 pr-2">
                          <RatingDot v={r.decision_rating} />
                        </td>
                        <td className="py-2.5 pr-2">
                          <RatingDot v={r.physical_rating} />
                        </td>
                        <td className="py-2.5 font-bold font-mono text-white">
                          {score.toFixed(1)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Training flags */}
        <div className="card">
          <div className="card-header">Training Flags</div>
          {flags.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">No training flags recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {flags.map((flag) => {
                const config = FLAG_CONFIG[flag.flag_type]
                return (
                  <div key={flag.id} className="flex gap-3 items-start">
                    <span className={clsx(config.badge, 'flex-shrink-0 mt-0.5')}>{config.label}</span>
                    <div className="min-w-0">
                      {flag.note && (
                        <div className="text-sm text-slate-300">{flag.note}</div>
                      )}
                      {flag.session && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          {new Date(flag.session.date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {flag.session.focus_tags.length > 0 && (
                            <> · {flag.session.focus_tags.join(', ')}</>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Player details */}
      {(player.height_cm || player.weight_kg || player.joined_date || player.dob) && (
        <div className="card mt-5">
          <div className="card-header">Player Details</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {player.dob && (
              <div>
                <div className="text-xs text-slate-500">Date of Birth</div>
                <div className="text-sm text-white mt-0.5">
                  {new Date(player.dob).toLocaleDateString('en-GB')}
                </div>
              </div>
            )}
            {player.height_cm && (
              <div>
                <div className="text-xs text-slate-500">Height</div>
                <div className="text-sm text-white mt-0.5">{player.height_cm} cm</div>
              </div>
            )}
            {player.weight_kg && (
              <div>
                <div className="text-xs text-slate-500">Weight</div>
                <div className="text-sm text-white mt-0.5">{player.weight_kg} kg</div>
              </div>
            )}
            {player.joined_date && (
              <div>
                <div className="text-xs text-slate-500">Joined</div>
                <div className="text-sm text-white mt-0.5">
                  {new Date(player.joined_date).toLocaleDateString('en-GB')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function RatingDot({ v }: { v: number }) {
  const color =
    v >= 7 ? 'text-green-400' : v >= 4 ? 'text-yellow-400' : 'text-red-400'
  return <span className={clsx('font-mono font-bold text-xs', color)}>{v}</span>
}
