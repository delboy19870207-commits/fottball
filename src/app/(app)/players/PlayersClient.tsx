'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import clsx from 'clsx'
import type { Position } from '@/types/database'

interface AgeGroup {
  id: string
  name: string
}

interface PlayerRow {
  id: string
  first_name: string
  last_name: string
  position: Position
  age_group: { id: string; name: string } | null
  appearances: number
  goals: number
  assists: number
  development_score: number
  trend: 'up' | 'stable' | 'down'
}

interface Props {
  players: PlayerRow[]
  ageGroups: AgeGroup[]
  selectedAg?: string
}

function TrendIcon({ trend }: { trend: 'up' | 'stable' | 'down' }) {
  if (trend === 'up') return <span className="text-green-400 text-base">↑</span>
  if (trend === 'down') return <span className="text-red-400 text-base">↓</span>
  return <span className="text-slate-500 text-base">–</span>
}

function DevScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100
  const color =
    score >= 7 ? 'bg-green-500' : score >= 5 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-pitch-600 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-300 w-8 text-right">{score.toFixed(1)}</span>
    </div>
  )
}

const POSITION_ORDER: Position[] = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST']

export default function PlayersClient({ players, ageGroups, selectedAg }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function setFilter(agId?: string) {
    router.push(agId ? `${pathname}?ag=${agId}` : pathname)
  }

  const sorted = [...players].sort((a, b) => {
    const ai = POSITION_ORDER.indexOf(a.position)
    const bi = POSITION_ORDER.indexOf(b.position)
    if (ai !== bi) return ai - bi
    return a.last_name.localeCompare(b.last_name)
  })

  return (
    <>
      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilter(undefined)}
          className={clsx(
            'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
            !selectedAg
              ? 'bg-brand text-white'
              : 'bg-pitch-700 text-slate-400 hover:text-white hover:bg-pitch-600'
          )}
        >
          All
        </button>
        {ageGroups.map((ag) => (
          <button
            key={ag.id}
            onClick={() => setFilter(ag.id)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              selectedAg === ag.id
                ? 'bg-brand text-white'
                : 'bg-pitch-700 text-slate-400 hover:text-white hover:bg-pitch-600'
            )}
          >
            {ag.name}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Player</th>
                <th>Age Group</th>
                <th>Position</th>
                <th className="text-center">Apps</th>
                <th className="text-center">G</th>
                <th className="text-center">A</th>
                <th className="min-w-[120px]">Dev Score</th>
                <th className="text-center">Trend</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-slate-500 py-10">
                    No players found.
                  </td>
                </tr>
              ) : (
                sorted.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link
                        href={`/players/${p.id}`}
                        className="font-medium text-white hover:text-brand-light transition-colors"
                      >
                        {p.first_name} {p.last_name}
                      </Link>
                    </td>
                    <td>
                      <span className="badge-blue">{p.age_group?.name ?? '—'}</span>
                    </td>
                    <td>
                      <span className="badge-slate">{p.position}</span>
                    </td>
                    <td className="text-center text-slate-300">{p.appearances}</td>
                    <td className="text-center text-slate-300">{p.goals}</td>
                    <td className="text-center text-slate-300">{p.assists}</td>
                    <td>
                      <DevScoreBar score={p.development_score} />
                    </td>
                    <td className="text-center">
                      <TrendIcon trend={p.trend} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        {sorted.length} player{sorted.length !== 1 ? 's' : ''}
        {selectedAg ? ' in selected age group' : ' in total squad'}
      </div>
    </>
  )
}
