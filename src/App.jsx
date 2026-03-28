import { useState, useEffect, createContext, useContext } from 'react'
import { loadAll, saveRecord, saveWeekly, sendMemo as dbSendMemo, saveAppSettings, supabase, DEFAULT_SETTINGS } from './lib/db'
import RecordTab from './components/RecordTab'
import CompareTab from './components/CompareTab'
import MemoTab from './components/MemoTab'
import SettingsTab from './components/SettingsTab'

export const AppContext = createContext(null)
export function useApp() { return useContext(AppContext) }

// ─── 日付ユーティリティ（元HTMLと同じロジック）──────────────────────────────
const TODAY = new Date()

export function dateKey(offset) {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

export function dateLabel(offset) {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + offset)
  return `${d.getMonth() + 1}/${d.getDate()}（${'日月火水木金土'[d.getDay()]}）`
}

export function isSat(offset) {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + offset)
  return d.getDay() === 6
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('today')
  const [currentDay, setCurrentDay] = useState(0)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [records, setRecords] = useState({})   // { [dateStr]: { a: {plank,hip,squat,fiber}, b: {...} } }
  const [weekly, setWeekly] = useState({})      // { [dateStr]: { weight_a, fat_a, weight_b, fat_b } }
  const [memos, setMemos] = useState([])

  // 初回ロード
  useEffect(() => {
    loadAll().then((data) => {
      if (data.settings) setSettings(data.settings)
      setRecords(data.records || {})
      setWeekly(data.weekly || {})
      setMemos(data.memos || [])
      setLoading(false)
    })
  }, [])

  // Supabase Realtime（メモのリアルタイム同期）
  useEffect(() => {
    if (!supabase) return
    const ch = supabase
      .channel('memos-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'memos' }, (payload) => {
        const m = payload.new
        setMemos((prev) =>
          prev.find((x) => x.id === m.id)
            ? prev
            : [...prev, { id: m.id, who: m.who, text: m.text, created_at: m.created_at }]
        )
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  // ── チェック記録のトグル（即時保存）────────────────────────────────────────
  function toggleField(userKey, offset, field) {
    const k = dateKey(offset)
    setRecords((prev) => {
      const dateRec = prev[k] || { a: empty(), b: empty() }
      const userRec = dateRec[userKey] || empty()
      const newRec = { ...userRec, [field]: !userRec[field] }
      const newDateRec = { ...dateRec, [userKey]: newRec }
      saveRecord(k, userKey, newRec) // バックグラウンド保存
      return { ...prev, [k]: newDateRec }
    })
  }

  // ── 週次計測の保存 ──────────────────────────────────────────────────────────
  function doSaveWeekly(offset, data) {
    const k = dateKey(offset)
    setWeekly((prev) => ({ ...prev, [k]: data }))
    saveWeekly(k, data)
  }

  // ── メモ送信 ────────────────────────────────────────────────────────────────
  async function doSendMemo(who, text) {
    const memo = await dbSendMemo(who, text)
    // Supabase Realtime で同期する場合は重複チェック済みなので OK
    // localStorage のみの場合は直接追加
    if (!supabase) setMemos((prev) => [...prev, memo])
  }

  // ── 設定保存 ────────────────────────────────────────────────────────────────
  async function doSaveSettings(newSettings) {
    setSettings(newSettings)
    await saveAppSettings(newSettings)
  }

  // ── 現在の日のレコードを取得するヘルパー ────────────────────────────────────
  function getRec(userKey, offset) {
    const k = dateKey(offset)
    return records[k]?.[userKey] || empty()
  }

  const ctx = {
    settings, doSaveSettings,
    records, weekly, memos,
    currentDay, setCurrentDay,
    getRec, toggleField, doSaveWeekly, doSendMemo,
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ color: '#999', fontSize: 14 }}>読み込み中...</div>
      </div>
    )
  }

  const showDateNav = activeTab === 'today'
  const titles = { today: '記録', compare: '比較・グラフ', memo: 'メモ', settings: '設定' }

  return (
    <AppContext.Provider value={ctx}>
      <div className="app">
        {/* トップバー */}
        <div className="top-bar">
          <h1>{titles[activeTab]}</h1>

          <div className="date-nav" style={{ visibility: showDateNav ? 'visible' : 'hidden' }}>
            <button className="dnbtn" onClick={() => setCurrentDay((d) => d - 1)}>‹</button>
            <span>{dateLabel(currentDay)}</span>
            <button
              className="dnbtn"
              onClick={() => setCurrentDay((d) => Math.min(0, d + 1))}
            >›</button>
          </div>

          <button
            className="today-btn"
            style={{ visibility: showDateNav ? 'visible' : 'hidden' }}
            onClick={() => setCurrentDay(0)}
          >
            今日
          </button>
        </div>

        {/* タブバー */}
        <div className="tab-bar">
          {[['today', '記録'], ['compare', '比較'], ['memo', 'メモ'], ['settings', '設定']].map(
            ([key, label]) => (
              <div
                key={key}
                className={`tab${activeTab === key ? ' active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </div>
            )
          )}
        </div>

        {/* コンテンツ */}
        {activeTab === 'today' && <RecordTab />}
        {activeTab === 'compare' && <CompareTab />}
        {activeTab === 'memo' && <MemoTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </AppContext.Provider>
  )
}

function empty() {
  return { plank: false, hip: false, squat: false, fiber: false }
}
