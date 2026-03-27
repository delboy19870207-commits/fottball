'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DevelopmentScore } from '@/types/database'

interface Props {
  data: DevelopmentScore[]
}

export default function DevelopmentLineChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        No match data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickFormatter={(val) => {
            const d = new Date(val as string)
            return `${d.getDate()}/${d.getMonth() + 1}`
          }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 10]}
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#f1f5f9',
            fontSize: 12,
          }}
          labelFormatter={(val) => new Date(val as string).toLocaleDateString('en-GB')}
          formatter={(val) => [(val as number).toFixed(2), 'Dev Score']}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#3b82f6"
          strokeWidth={2.5}
          dot={{ fill: '#3b82f6', r: 4, strokeWidth: 0 }}
          activeDot={{ r: 6, fill: '#60a5fa' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
