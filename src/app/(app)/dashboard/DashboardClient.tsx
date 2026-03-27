'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import AgeGroupBarChart from '@/components/charts/AgeGroupBarChart'
import clsx from 'clsx'
import type { Player } from '@/types/database'

interface RecentMatch {
  id: string
  date: string
  opposition: string
  venue: string
  our_score: number
  their_score: number
  competition: string
  age_group: { name: string } | null
}

interface TopPerformer {
  player: Player
  avgScore: number
  appearances: number
}

interface AgeGroupScore {
  name: string
  score: number
}

interface AgeGroup {
  id: string
  name: string
}

interface Props {
  totalPlayers: number
  totalMatches: number
  totalSessions: number
  winRate: number
  recentMatches: RecentMatch[]
  topPerformers: TopPerformer[]
  ageGroupScores: AgeGroupScore[]
  ageGroups: AgeGroup[]
  selectedAg?: string
  clubName: string
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card">
      <div className="card-header">{label}</div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

function resultBadge(our: number, their: number) {
  if (our > their) return <span className="badge-green">W</span>
  if (our < their) return <span className="badge-red">L</span>
  return <span className="badge-slate">D</span>
}

export default function DashboardClient({
  totalPlayers,
  totalMatches,
  totalSessions,
  winRate,
  recentMatches,
  topPerformers,
  ageGroupScores,
  ageGroups,
  selectedAg,
  clubName,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function setFilter(agId?: string) {
    const url = agId ? `${pathname}?ag=${agId}` : pathname
    router.push(url)
  }

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white">{clubName}</h1>
        <p className="text-slate-400 text-sm mt-0.5">Season overview · Player development tracking</p>
      </div>

      {/* Age group filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Players" value={totalPlayers} sub="active squad" />
        <StatCard label="Matches Logged" value={totalMatches} />
        <StatCard label="Training Sessions" value={totalSessions} />
        <StatCard label="Win Rate" value={`${winRate}%`} sub={`from ${totalMatches} matches`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Recent results */}
        <div className="card">
          <div className="card-header">Recent Results</div>
          {recentMatches.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">No matches logged yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-pitch-600">
                    <th className="text-left text-xs text-slate-400 font-medium pb-2 pr-3">Date</th>
                    <th className="text-left text-xs text-slate-400 font-medium pb-2 pr-3">Opposition</th>
                    <th className="text-left text-xs text-slate-400 font-medium pb-2 pr-3">Score</th>
                    <th className="text-left text-xs text-slate-400 font-medium pb-2 pr-3">Group</th>
                    <th className="text-left text-xs text-slate-400 font-medium pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentMatches.map((m) => (
                    <tr key={m.id} className="border-b border-pitch-700/40">
                      <td className="py-2.5 pr-3 text-slate-400 whitespace-nowrap">
                        {new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-2.5 pr-3 text-white font-medium truncate max-w-[120px]">{m.opposition}</td>
                      <td className="py-2.5 pr-3 text-white font-mono font-bold">
                        {m.our_score}–{m.their_score}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="badge-blue">{m.age_group?.name ?? '—'}</span>
                      </td>
                      <td className="py-2.5">{resultBadge(m.our_score, m.their_score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top performers */}
        <div className="card">
          <div className="card-header">Top Performers This Month</div>
          {topPerformers.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">No ratings recorded this month.</p>
          ) : (
            <div className="space-y-3">
              {topPerformers.map(({ player, avgScore, appearances }, i) => (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="flex items-center gap-3 group"
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-pitch-700 flex items-center justify-center text-xs font-bold text-slate-400">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white group-hover:text-brand-light transition-colors truncate">
                      {player.first_name} {player.last_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {player.position} · {appearances} {appearances === 1 ? 'app' : 'apps'}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm font-bold text-white">{avgScore.toFixed(2)}</div>
                    <div className="text-xs text-slate-500">dev score</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Age group dev score chart */}
      <div className="card">
        <div className="card-header">Development Score by Age Group</div>
        <div className="h-52">
          <AgeGroupBarChart data={ageGroupScores} />
        </div>
      </div>
    </div>
  )
}
