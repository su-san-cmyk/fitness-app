import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useApp } from '../App'

const EX = ['plank', 'hip', 'squat', 'fiber']

// ─── 今日の完了カード ─────────────────────────────────────────────────────────
function CompareGrid() {
  const { settings, getRec, currentDay } = useApp()

  return (
    <div className="compare-grid">
      {['a', 'b'].map((u, i) => {
        const rec = getRec(u, currentDay)
        const total = EX.length
        const done = EX.filter((f) => rec[f]).length
        const pct = Math.round((done / total) * 100)
        const name = settings.names[i]

        return (
          <div key={u} className="compare-card">
            <h3>
              <div
                className={`avatar ${u === 'a' ? 'av-a' : 'av-b'}`}
                style={{ width: 18, height: 18, fontSize: 9 }}
              >
                {name[0]}
              </div>
              {name}
            </h3>
            <div className="score-big">
              {done}
              <span style={{ fontSize: 15, color: '#999' }}>/{total}</span>
            </div>
            <div className="score-sub">完了 {pct}%</div>
            <div className="prog-bg">
              <div
                className={`prog-fill ${u === 'a' ? 'fill-teal' : 'fill-pink'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── グラフ（recharts で Chart.js と同等の見た目） ────────────────────────────
function UserGraph({ userKey, idx, mode }) {
  const { settings, weekly } = useApp()

  const sortedKeys = Object.keys(weekly).sort()
  const field = mode === 'weight' ? `weight_${userKey}` : `fat_${userKey}`
  const unit = mode === 'weight' ? ' kg' : ' %'
  const color = userKey === 'a' ? 'rgb(29,158,117)' : 'rgb(212,83,126)'
  const hexColor = userKey === 'a' ? '#1D9E75' : '#D4537E'
  const avCls = userKey === 'a' ? 'av-a' : 'av-b'
  const name = settings.names[idx]

  const chartData = sortedKeys.map((k) => ({
    date: k.slice(5),
    value: weekly[k][field] ? parseFloat(weekly[k][field]) : null,
  }))
  const hasData = chartData.some((d) => d.value !== null)

  // 統計計算
  const vals = chartData.map((d) => d.value).filter((v) => v !== null)
  const avg = vals.length
    ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
    : null
  const goalVal =
    mode === 'weight'
      ? parseFloat(settings.profiles[idx]?.goalWeight) || null
      : null

  // カスタムツールチップ
  function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: '#fff', border: '0.5px solid #ddd', borderRadius: 8, padding: '5px 9px', fontSize: 11 }}>
        <div style={{ color: '#888', marginBottom: 2 }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color || '#111' }}>
            {p.name}: {p.value}{unit.trim()}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="graph-card">
      <div className="graph-card-header">
        <h4>
          <div className={`avatar ${avCls}`} style={{ width: 18, height: 18, fontSize: 9 }}>
            {name[0]}
          </div>
          {name}
        </h4>
        {hasData && (avg || goalVal) && (
          <div className="graph-stats">
            {avg && (
              <div className="graph-stat">
                平均 <span>{avg}{unit.trim()}</span>
              </div>
            )}
            {goalVal && mode === 'weight' && (
              <div className="graph-stat">
                目標 <span>{goalVal}kg</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="graph-wrap">
        {hasData ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id={`grad-${userKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={hexColor} stopOpacity={0.07} />
                  <stop offset="95%" stopColor={hexColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.4)' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'rgba(0,0,0,0.4)' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* 目標ライン */}
              {goalVal && (
                <ReferenceLine
                  y={goalVal}
                  stroke="rgba(150,150,150,0.45)"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                />
              )}
              {/* 平均ライン */}
              {avg && (
                <ReferenceLine
                  y={parseFloat(avg)}
                  stroke={color.replace(')', ',0.35)').replace('rgb', 'rgba')}
                  strokeDasharray="2 3"
                  strokeWidth={1.5}
                />
              )}

              <Area
                type="monotone"
                dataKey="value"
                name="実績"
                stroke={hexColor}
                strokeWidth={2}
                fill={`url(#grad-${userKey})`}
                dot={{ r: 4, fill: hexColor, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="no-data">土曜にデータを入力すると表示されます</div>
        )}
      </div>
    </div>
  )
}

// ─── CompareTab ───────────────────────────────────────────────────────────────
export default function CompareTab() {
  const [graphMode, setGraphMode] = useState('weight')

  return (
    <div className="section">
      <CompareGrid />

      <div className="graph-toggle">
        {[['weight', '体重'], ['fat', '体脂肪率']].map(([mode, label]) => (
          <div
            key={mode}
            className={`gtab${graphMode === mode ? ' active' : ''}`}
            onClick={() => setGraphMode(mode)}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="graph-col">
        <UserGraph userKey="a" idx={0} mode={graphMode} />
        <UserGraph userKey="b" idx={1} mode={graphMode} />
      </div>
    </div>
  )
}
