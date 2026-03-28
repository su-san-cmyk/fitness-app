import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

// ─── LocalStorage ────────────────────────────────────────────────────────────
const LS_KEY = 'fitness_v2'

function getLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} } catch { return {} }
}
function setLocal(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch {}
}

// ─── デフォルト値 ──────────────────────────────────────────────────────────────
export const DEFAULT_SETTINGS = {
  names: ['すもも', 'ともこ'],
  profiles: [
    { height: '', birthday: '', goalWeight: '' },
    { height: '', birthday: '', goalWeight: '' },
  ],
  goals: { plank: 60, hip: 20, squat: 20 },
}

const SEED_MEMOS = [
  { id: 'seed-1', who: 'b', text: '今日から一緒にがんばろう！', created_at: new Date(Date.now() - 300000).toISOString() },
  { id: 'seed-2', who: 'a', text: 'よろしくね。毎日続けよう', created_at: new Date(Date.now() - 240000).toISOString() },
]

// ─── 全データ一括ロード ───────────────────────────────────────────────────────
export async function loadAll() {
  if (supabase) {
    try {
      const [settingsRes, recordsRes, weeklyRes, memosRes] = await Promise.all([
        supabase.from('app_settings').select('data').eq('id', 'main').maybeSingle(),
        supabase.from('daily_records').select('*'),
        supabase.from('weekly_records').select('*'),
        supabase.from('memos').select('*').order('created_at', { ascending: true }),
      ])

      const settings = settingsRes.data?.data || DEFAULT_SETTINGS

      // records: { [dateStr]: { a: {plank,hip,squat,fiber}, b: {...} } }
      const records = {}
      recordsRes.data?.forEach((row) => {
        if (!records[row.date]) records[row.date] = { a: emptyRec(), b: emptyRec() }
        records[row.date][row.user_key] = {
          plank: row.plank, hip: row.hip, squat: row.squat, fiber: row.fiber,
        }
      })

      // weekly: { [dateStr]: { weight_a, fat_a, weight_b, fat_b } }
      const weekly = {}
      weeklyRes.data?.forEach((row) => {
        weekly[row.date] = {
          weight_a: row.weight_a, fat_a: row.fat_a,
          weight_b: row.weight_b, fat_b: row.fat_b,
        }
      })

      const memos = (memosRes.data || []).map((r) => ({
        id: r.id, who: r.who, text: r.text, created_at: r.created_at,
      }))

      const result = { settings, records, weekly, memos }
      setLocal(result)
      return result
    } catch (e) {
      console.error('Supabase loadAll failed:', e)
    }
  }

  // localStorage fallback
  const local = getLocal()
  return {
    settings: local.settings || DEFAULT_SETTINGS,
    records: local.records || {},
    weekly: local.weekly || {},
    memos: local.memos || SEED_MEMOS,
  }
}

function emptyRec() {
  return { plank: false, hip: false, squat: false, fiber: false }
}

// ─── チェック記録の保存 ──────────────────────────────────────────────────────
export async function saveRecord(date, userKey, rec) {
  // localStorage
  const local = getLocal()
  if (!local.records) local.records = {}
  if (!local.records[date]) local.records[date] = { a: emptyRec(), b: emptyRec() }
  local.records[date][userKey] = rec
  setLocal(local)

  // Supabase
  if (supabase) {
    try {
      await supabase.from('daily_records').upsert(
        { date, user_key: userKey, plank: !!rec.plank, hip: !!rec.hip, squat: !!rec.squat, fiber: !!rec.fiber },
        { onConflict: 'date,user_key' }
      )
    } catch (e) {
      console.error('saveRecord failed:', e)
    }
  }
}

// ─── 週次計測の保存 ──────────────────────────────────────────────────────────
export async function saveWeekly(date, data) {
  // localStorage
  const local = getLocal()
  if (!local.weekly) local.weekly = {}
  local.weekly[date] = data
  setLocal(local)

  // Supabase
  if (supabase) {
    try {
      await supabase.from('weekly_records').upsert(
        {
          date,
          weight_a: data.weight_a ? parseFloat(data.weight_a) : null,
          fat_a: data.fat_a ? parseFloat(data.fat_a) : null,
          weight_b: data.weight_b ? parseFloat(data.weight_b) : null,
          fat_b: data.fat_b ? parseFloat(data.fat_b) : null,
        },
        { onConflict: 'date' }
      )
    } catch (e) {
      console.error('saveWeekly failed:', e)
    }
  }
}

// ─── メモ送信 ────────────────────────────────────────────────────────────────
export async function sendMemo(who, text) {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('memos').insert({ who, text }).select().single()
      if (!error && data) {
        const memo = { id: data.id, who: data.who, text: data.text, created_at: data.created_at }
        // cache
        const local = getLocal()
        if (!local.memos) local.memos = []
        local.memos.push(memo)
        setLocal(local)
        return memo
      }
    } catch (e) {
      console.error('sendMemo failed:', e)
    }
  }

  const memo = { id: crypto.randomUUID(), who, text, created_at: new Date().toISOString() }
  const local = getLocal()
  if (!local.memos) local.memos = []
  local.memos.push(memo)
  setLocal(local)
  return memo
}

// ─── 設定保存 ────────────────────────────────────────────────────────────────
export async function saveAppSettings(settings) {
  const local = getLocal()
  local.settings = settings
  setLocal(local)

  if (supabase) {
    try {
      await supabase.from('app_settings').upsert(
        { id: 'main', data: settings, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )
    } catch (e) {
      console.error('saveAppSettings failed:', e)
    }
  }
}
