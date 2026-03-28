import { useState, useEffect } from 'react'
import { useApp } from '../App'

const EX = [
  { id: 'plank', label: 'プランク', unit: '秒' },
  { id: 'hip', label: 'ヒップリフト', unit: '回' },
  { id: 'squat', label: 'スクワット', unit: '回' },
]

function calcAge(birthday) {
  if (!birthday) return null
  const bd = new Date(birthday)
  const now = new Date()
  let age = now.getFullYear() - bd.getFullYear()
  const m = now.getMonth() - bd.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < bd.getDate())) age--
  return age
}

function calcBMI(weight, height) {
  if (!weight || !height) return null
  const hm = parseFloat(height) / 100
  if (hm <= 0) return null
  return (parseFloat(weight) / (hm * hm)).toFixed(1)
}

function bmiInfo(v) {
  if (!v) return { t: '-', c: '' }
  const f = parseFloat(v)
  if (f < 18.5) return { t: '低体重', c: 'bmi-low' }
  if (f < 25) return { t: '標準', c: 'bmi-ok' }
  if (f < 30) return { t: '過体重', c: 'bmi-hi' }
  return { t: '肥満', c: 'bmi-vhi' }
}

export default function SettingsTab() {
  const { settings, weekly, doSaveSettings } = useApp()
  const [form, setForm] = useState(settings)

  useEffect(() => {
    setForm(settings)
  }, [settings])

  // 週次データから統計計算
  function calcStats(userKey) {
    const vals = Object.values(weekly)
    const ws = vals.map((w) => parseFloat(w[`weight_${userKey}`])).filter((v) => !isNaN(v) && v > 0)
    const fs = vals.map((w) => parseFloat(w[`fat_${userKey}`])).filter((v) => !isNaN(v) && v > 0)
    return {
      avgW: ws.length ? (ws.reduce((a, b) => a + b, 0) / ws.length).toFixed(1) : null,
      avgF: fs.length ? (fs.reduce((a, b) => a + b, 0) / fs.length).toFixed(1) : null,
      latW: ws.length ? ws[ws.length - 1] : null,
    }
  }

  function setGoal(id, val) {
    setForm((f) => ({ ...f, goals: { ...f.goals, [id]: parseInt(val) || 1 } }))
  }

  function setName(idx, val) {
    setForm((f) => {
      const names = [...f.names]
      names[idx] = val
      return { ...f, names }
    })
  }

  function setProfile(idx, key, val) {
    setForm((f) => {
      const profiles = [...f.profiles]
      profiles[idx] = { ...profiles[idx], [key]: val }
      return { ...f, profiles }
    })
  }

  function save() {
    doSaveSettings(form)
  }

  return (
    <div className="settings-section">
      {/* 目標回数・秒数 */}
      <div className="ex-settings-card">
        <h3>目標回数・秒数</h3>
        {EX.map((ex) => (
          <div key={ex.id} className="ex-goal-row">
            <span className="ex-goal-label">{ex.label}</span>
            <input
              className="ex-goal-input"
              type="number"
              value={form.goals[ex.id]}
              onChange={(e) => setGoal(ex.id, e.target.value)}
              min="1"
            />
            <span className="ex-goal-unit">{ex.unit}</span>
          </div>
        ))}
      </div>

      {/* ユーザー設定 */}
      <div className="settings-dual">
        {['a', 'b'].map((u, i) => {
          const p = form.profiles[i] || {}
          const { avgW, avgF, latW } = calcStats(u)
          const bmi = calcBMI(latW, p.height)
          const bl = bmiInfo(bmi)
          const age = calcAge(p.birthday)

          return (
            <div key={u} className="settings-col">
              <h3>
                <div
                  className={`avatar ${u === 'a' ? 'av-a' : 'av-b'}`}
                  style={{ width: 18, height: 18, fontSize: 9 }}
                >
                  {(form.names[i] || '?')[0]}
                </div>
                {form.names[i]}
                {age !== null && (
                  <span style={{ fontSize: 10, color: '#999', fontWeight: 400 }}>{age}歳</span>
                )}
              </h3>

              <div className="sl">名前</div>
              <input
                className="si"
                value={form.names[i]}
                onChange={(e) => setName(i, e.target.value)}
              />

              <div className="sl">身長 (cm)</div>
              <input
                className="si"
                type="number"
                value={p.height}
                onChange={(e) => setProfile(i, 'height', e.target.value)}
                placeholder="158"
              />

              <div className="sl">誕生日</div>
              <input
                className="si"
                type="date"
                value={p.birthday}
                onChange={(e) => setProfile(i, 'birthday', e.target.value)}
              />

              <div className="sl">目標体重 (kg)</div>
              <input
                className="si"
                type="number"
                value={p.goalWeight}
                onChange={(e) => setProfile(i, 'goalWeight', e.target.value)}
                placeholder="50.0"
                step="0.1"
              />

              {/* 統計グリッド */}
              <div className="stat-grid">
                <div className="stat-item">
                  <div className="stat-label">BMI</div>
                  <div className="stat-val">{bmi || '-'}</div>
                  {bl.c && <span className={`bmi-badge ${bl.c}`}>{bl.t}</span>}
                </div>
                <div className="stat-item">
                  <div className="stat-label">最新体重</div>
                  <div className="stat-val">
                    {latW || '-'}
                    <span className="stat-unit">{latW ? ' kg' : ''}</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">体重平均</div>
                  <div className="stat-val">
                    {avgW || '-'}
                    <span className="stat-unit">{avgW ? ' kg' : ''}</span>
                  </div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">体脂肪平均</div>
                  <div className="stat-val">
                    {avgF || '-'}
                    <span className="stat-unit">{avgF ? ' %' : ''}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button className="save-btn" onClick={save}>
        設定を保存
      </button>
    </div>
  )
}
