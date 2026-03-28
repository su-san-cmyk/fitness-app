import { useState, useEffect } from 'react'
import { useApp, dateKey, isSat } from '../App'

const EX = [
  { id: 'plank', label: 'プランク', unit: '秒' },
  { id: 'hip', label: 'ヒップリフト', unit: '回' },
  { id: 'squat', label: 'スクワット', unit: '回' },
]

// ─── チェックマーク SVG ───────────────────────────────────────────────────────
function CheckSVG() {
  return (
    <svg className="ck-icon" viewBox="0 0 12 10">
      <polyline points="1,5 4,9 11,1" />
    </svg>
  )
}

// ─── 今週の達成率バッジ ────────────────────────────────────────────────────────
function WeekBadgeRow() {
  const { settings, records, currentDay } = useApp()

  function weekStats(userKey) {
    const d = new Date()
    const dow = d.getDay()
    const diffToMon = dow === 0 ? -6 : 1 - dow
    const mon = new Date(d)
    mon.setDate(d.getDate() + diffToMon)

    let total = 0
    let full = 0
    for (const cur = new Date(mon); cur <= d; cur.setDate(cur.getDate() + 1)) {
      const k = cur.toISOString().slice(0, 10)
      const rec = records[k]?.[userKey] || {}
      total++
      if (EX.every((e) => rec[e.id]) && rec.fiber) full++
    }
    return { total, full, pct: total > 0 ? Math.round((full / total) * 100) : 0 }
  }

  return (
    <div className="week-badge-row">
      {['a', 'b'].map((u, i) => {
        const { total, full, pct } = weekStats(u)
        const r = 15, cx = 18, cy = 18, sw = 3
        const circ = 2 * Math.PI * r
        const dash = circ * (pct / 100)
        const col = u === 'a' ? '#1D9E75' : '#D4537E'
        const bg = u === 'a' ? '#9FE1CB' : '#F4C0D1'
        const name = settings.names[i]

        return (
          <div key={u} className="week-badge-card">
            <svg className="week-ring" viewBox="0 0 36 36">
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={bg} strokeWidth={sw} />
              <circle
                cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={sw}
                strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
              />
              <text x={cx} y={cy} fontSize="8" fontWeight="500" textAnchor="middle"
                dominantBaseline="middle" fill={col}>{pct}%</text>
            </svg>
            <div className="week-info">
              <div className="week-info-name">{name}</div>
              <div className="week-info-sub">今週 {full}/{total}日達成</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── ストリーク計算 ───────────────────────────────────────────────────────────
function calcStreak(userKey, records) {
  let streak = 0
  const today = new Date()
  for (let i = 0; i >= -90; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const k = d.toISOString().slice(0, 10)
    const rec = records[k]?.[userKey] || {}
    if (EX.every((e) => rec[e.id]) && rec.fiber) {
      streak++
    } else if (i < 0) {
      break
    }
  }
  return streak
}

// ─── ユーザー列 ───────────────────────────────────────────────────────────────
function UserColumn({ userKey }) {
  const { settings, records, getRec, toggleField, currentDay } = useApp()
  const idx = userKey === 'a' ? 0 : 1
  const name = settings.names[idx]
  const goal = settings.goals
  const rec = getRec(userKey, currentDay)
  const streak = calcStreak(userKey, records)
  const avCls = userKey === 'a' ? 'av-a' : 'av-b'

  return (
    <div className="user-col">
      {/* ヘッダー */}
      <div className="col-header">
        <div className={`avatar ${avCls}`}>{name[0]}</div>
        <span className="col-name">{name}</span>
        <span className="streak-b">{streak > 1 ? `${streak}日` : ''}</span>
      </div>

      {/* 種目チェック */}
      {EX.map((ex) => {
        const done = !!rec[ex.id]
        return (
          <div
            key={ex.id}
            className={`ex-item${done ? ' done' : ''}`}
            onClick={() => toggleField(userKey, currentDay, ex.id)}
          >
            <div className={`check-box chk-ex${done ? ' checked' : ''}`}>
              <CheckSVG />
            </div>
            <span className="ex-name">
              {ex.label}
              <br />
              <span style={{ fontSize: 9, color: '#999' }}>{goal[ex.id]}{ex.unit}</span>
            </span>
          </div>
        )
      })}

      {/* 食物繊維 */}
      <div className="fiber-item" onClick={() => toggleField(userKey, currentDay, 'fiber')}>
        <div className={`check-box chk-fi${rec.fiber ? ' checked' : ''}`}>
          <CheckSVG />
        </div>
        <span className="ex-name">食物繊維</span>
      </div>
    </div>
  )
}

// ─── 土曜の体重・体脂肪入力 ───────────────────────────────────────────────────
function WeeklySection() {
  const { settings, weekly, doSaveWeekly, currentDay } = useApp()
  const k = dateKey(currentDay)
  const stored = weekly[k] || {}

  const [form, setForm] = useState({
    weight_a: stored.weight_a ?? '',
    fat_a: stored.fat_a ?? '',
    weight_b: stored.weight_b ?? '',
    fat_b: stored.fat_b ?? '',
  })

  // 日付変更時にフォームを更新
  useEffect(() => {
    const w = weekly[k] || {}
    setForm({
      weight_a: w.weight_a ?? '',
      fat_a: w.fat_a ?? '',
      weight_b: w.weight_b ?? '',
      fat_b: w.fat_b ?? '',
    })
  }, [k, weekly])

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }))
  }

  return (
    <div className="weekly-section">
      <div className="weekly-badge">土曜計測</div>
      <div className="weekly-inner">
        {['a', 'b'].map((u, i) => (
          <div key={u}>
            <div className="wu-label">
              <div
                className={`avatar ${u === 'a' ? 'av-a' : 'av-b'}`}
                style={{ width: 16, height: 16, fontSize: 8 }}
              >
                {settings.names[i][0]}
              </div>
              <span>{settings.names[i]}</span>
            </div>
            <div className="wfield" style={{ marginBottom: 4 }}>
              <label>体重 (kg)</label>
              <input
                type="number"
                value={form[`weight_${u}`]}
                onChange={(e) => set(`weight_${u}`, e.target.value)}
                placeholder={u === 'a' ? '52.5' : '55.0'}
                step="0.1"
              />
            </div>
            <div className="wfield">
              <label>体脂肪率 (%)</label>
              <input
                type="number"
                value={form[`fat_${u}`]}
                onChange={(e) => set(`fat_${u}`, e.target.value)}
                placeholder={u === 'a' ? '22.0' : '24.0'}
                step="0.1"
              />
            </div>
          </div>
        ))}
      </div>
      <button className="save-btn" onClick={() => doSaveWeekly(currentDay, form)}>
        保存
      </button>
    </div>
  )
}

// ─── RecordTab ────────────────────────────────────────────────────────────────
export default function RecordTab() {
  const { currentDay } = useApp()
  const sat = isSat(currentDay)

  return (
    <>
      <WeekBadgeRow />
      <div className="dual-grid">
        <UserColumn userKey="a" />
        <UserColumn userKey="b" />
      </div>
      {sat && <WeeklySection />}
    </>
  )
}
