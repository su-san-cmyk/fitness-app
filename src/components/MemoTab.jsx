import { useState, useEffect, useRef } from 'react'
import { useApp } from '../App'

function formatTime(isoStr) {
  const d = new Date(isoStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function MemoTab() {
  const { settings, memos, doSendMemo } = useApp()
  const [who, setWho] = useState('a')
  const [text, setText] = useState('')
  const chatRef = useRef(null)

  // 新メモ追加時に自動スクロール
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [memos])

  async function send() {
    const t = text.trim()
    if (!t) return
    setText('')
    await doSendMemo(who, t)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') send()
  }

  return (
    <div className="memo-section">
      <div className="chat-wrap" ref={chatRef}>
        {memos.map((m) => {
          const isMe = m.who === 'a'
          const senderName = settings.names[m.who === 'a' ? 0 : 1]
          return (
            <div key={m.id} className={`bubble ${isMe ? 'me' : 'other'}`}>
              {!isMe && <div className="bubble-who">{senderName}</div>}
              {m.text}
              <div className="bubble-time">{formatTime(m.created_at)}</div>
            </div>
          )
        })}
      </div>

      <div className="memo-input-row">
        <select value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="a">{settings.names[0]}</option>
          <option value="b">{settings.names[1]}</option>
        </select>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="メモを入力..."
        />
        <button onClick={send}>送信</button>
      </div>
    </div>
  )
}
