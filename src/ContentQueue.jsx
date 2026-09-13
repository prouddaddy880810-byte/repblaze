import { useEffect, useMemo, useState } from 'react'

const API_URL = 'https://ixqzawhedscwggbhgwtz.supabase.co/functions/v1/repblaze-content'

const fmt = (value) => {
  if (!value) return 'Not scheduled'
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(new Date(value))
  } catch {
    return value
  }
}

export default function ContentQueue() {
  const [key, setKey] = useState(() => sessionStorage.getItem('repblaze_admin_key') || '')
  const [inputKey, setInputKey] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('READY_FOR_REVIEW')
  const [edits, setEdits] = useState({})

  const api = async (body) => {
    const options = {
      method: body ? 'POST' : 'GET',
      headers: { 'x-repblaze-key': key, 'Content-Type': 'application/json' },
    }
    if (body) options.body = JSON.stringify(body)
    const res = await fetch(API_URL, options)
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.ok) throw new Error(data.error || 'Request failed')
    return data
  }

  const load = async () => {
    if (!key) return
    setLoading(true)
    setError('')
    try {
      const data = await api()
      setItems(data.items || [])
    } catch (e) {
      setError(e.message === 'UNAUTHORIZED' ? 'Wrong admin key.' : e.message)
      if (e.message === 'UNAUTHORIZED') {
        sessionStorage.removeItem('repblaze_admin_key')
        setKey('')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [key])

  const counts = useMemo(() => items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {}), [items])

  const visible = filter === 'ALL' ? items : items.filter((item) => item.status === filter)

  const login = (e) => {
    e.preventDefault()
    const next = inputKey.trim()
    if (!next) return
    sessionStorage.setItem('repblaze_admin_key', next)
    setKey(next)
    setInputKey('')
  }

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      await api({ action: 'generate' })
      await load()
      setFilter('READY_FOR_REVIEW')
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  const update = async (item, patch) => {
    setLoading(true)
    setError('')
    try {
      await api({ action: 'update', id: item.id, ...patch })
      setEdits((prev) => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })
      await load()
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  const draftFor = (item) => ({
    title: edits[item.id]?.title ?? item.title,
    hook: edits[item.id]?.hook ?? item.hook,
    body: edits[item.id]?.body ?? item.body,
    cta: edits[item.id]?.cta ?? item.cta,
    graphic_brief: edits[item.id]?.graphic_brief ?? item.graphic_brief,
  })

  const setField = (id, field, value) => setEdits((prev) => ({
    ...prev,
    [id]: { ...(prev[id] || {}), [field]: value }
  }))

  if (!key) {
    return (
      <main style={styles.shell}>
        <section style={styles.loginCard}>
          <div style={styles.kicker}>REPBLAZE // OWNER OPS</div>
          <h1 style={styles.h1}>Content Approval Queue</h1>
          <p style={styles.muted}>Enter the owner key to open the private approval board.</p>
          <form onSubmit={login} style={{ display: 'grid', gap: 12 }}>
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Owner key"
              autoFocus
              style={styles.input}
            />
            <button style={styles.primary}>Open Queue</button>
          </form>
          <a href="/" style={styles.back}>← Back to RepBlaze</a>
        </section>
      </main>
    )
  }

  return (
    <main style={styles.shell}>
      <section style={styles.topbar}>
        <div>
          <div style={styles.kicker}>REPBLAZE // CONTENT ENGINE</div>
          <h1 style={styles.h1}>Approval Queue</h1>
          <p style={styles.muted}>Generate the week. Approve what ships. Reject what does not.</p>
        </div>
        <div style={styles.actions}>
          <button onClick={generate} disabled={loading} style={styles.primary}>
            {loading ? 'Working…' : 'Generate Next Batch'}
          </button>
          <button onClick={load} disabled={loading} style={styles.secondary}>Refresh</button>
          <button onClick={() => { sessionStorage.removeItem('repblaze_admin_key'); setKey('') }} style={styles.ghost}>Lock</button>
        </div>
      </section>

      {error && <div style={styles.error}>{error}</div>}

      <section style={styles.stats}>
        <Stat label="Needs Review" value={counts.READY_FOR_REVIEW || 0} />
        <Stat label="Approved" value={counts.APPROVED || 0} />
        <Stat label="Scheduled" value={counts.SCHEDULED || 0} />
        <Stat label="Published" value={counts.PUBLISHED || 0} />
      </section>

      <section style={styles.filters}>
        {['READY_FOR_REVIEW', 'APPROVED', 'REJECTED', 'SCHEDULED', 'PUBLISHED', 'ALL'].map((name) => (
          <button
            key={name}
            onClick={() => setFilter(name)}
            style={{ ...styles.filter, ...(filter === name ? styles.filterActive : {}) }}
          >
            {name.replaceAll('_', ' ')} {name !== 'ALL' ? `(${counts[name] || 0})` : `(${items.length})`}
          </button>
        ))}
      </section>

      <section style={{ display: 'grid', gap: 18 }}>
        {!visible.length && <div style={styles.empty}>No posts in this lane. Generate a batch or switch filters.</div>}
        {visible.map((item) => {
          const draft = draftFor(item)
          return (
            <article key={item.id} style={styles.card}>
              <div style={styles.cardHead}>
                <div>
                  <span style={styles.platform}>{item.platform}</span>
                  <span style={styles.status}>{item.status.replaceAll('_', ' ')}</span>
                </div>
                <span style={styles.date}>{fmt(item.scheduled_for)}</span>
              </div>

              <label style={styles.label}>Title</label>
              <input value={draft.title} onChange={(e) => setField(item.id, 'title', e.target.value)} style={styles.input} />

              <label style={styles.label}>Hook</label>
              <textarea value={draft.hook} onChange={(e) => setField(item.id, 'hook', e.target.value)} style={{ ...styles.input, minHeight: 72 }} />

              <label style={styles.label}>Post</label>
              <textarea value={draft.body} onChange={(e) => setField(item.id, 'body', e.target.value)} style={{ ...styles.input, minHeight: 160 }} />

              <label style={styles.label}>CTA</label>
              <textarea value={draft.cta} onChange={(e) => setField(item.id, 'cta', e.target.value)} style={{ ...styles.input, minHeight: 72 }} />

              <label style={styles.label}>Graphic Brief</label>
              <textarea value={draft.graphic_brief} onChange={(e) => setField(item.id, 'graphic_brief', e.target.value)} style={{ ...styles.input, minHeight: 100 }} />

              <div style={styles.cardActions}>
                <button onClick={() => update(item, draft)} style={styles.secondary}>Save Edit</button>
                <button onClick={() => update(item, { ...draft, status: 'APPROVED' })} style={styles.approve}>Approve</button>
                <button onClick={() => {
                  const note = window.prompt('Why reject this post?') || ''
                  update(item, { status: 'REJECTED', rejection_notes: note })
                }} style={styles.reject}>Reject</button>
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}

function Stat({ label, value }) {
  return <div style={styles.stat}><strong style={styles.statValue}>{value}</strong><span style={styles.statLabel}>{label}</span></div>
}

const styles = {
  shell: { minHeight: '100vh', background: '#090a0c', color: '#f4f4f5', padding: '28px clamp(16px, 4vw, 58px) 70px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  topbar: { display: 'flex', gap: 24, justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', maxWidth: 1180, margin: '0 auto 24px' },
  loginCard: { maxWidth: 520, margin: '12vh auto 0', background: 'linear-gradient(145deg,#17191d,#0e0f12)', border: '1px solid #34373d', borderRadius: 18, padding: 28, boxShadow: '0 24px 80px rgba(0,0,0,.45)' },
  kicker: { color: '#ff6a00', fontWeight: 800, letterSpacing: '.16em', fontSize: 12 },
  h1: { margin: '8px 0 6px', fontSize: 'clamp(30px,5vw,52px)', lineHeight: 1 },
  muted: { color: '#a7a9ad', margin: '0 0 18px' },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  primary: { background: '#ff6a00', color: '#0a0a0b', border: 0, borderRadius: 10, padding: '12px 16px', fontWeight: 900, cursor: 'pointer' },
  secondary: { background: '#26292f', color: '#f7f7f8', border: '1px solid #41454d', borderRadius: 10, padding: '11px 14px', fontWeight: 800, cursor: 'pointer' },
  ghost: { background: 'transparent', color: '#c7c9cc', border: '1px solid #34373d', borderRadius: 10, padding: '11px 14px', cursor: 'pointer' },
  back: { display: 'inline-block', marginTop: 18, color: '#a7a9ad', textDecoration: 'none' },
  error: { maxWidth: 1180, margin: '0 auto 18px', background: '#361417', color: '#ffb8be', border: '1px solid #7b2730', padding: 12, borderRadius: 10 },
  stats: { maxWidth: 1180, margin: '0 auto 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 },
  stat: { background: '#14161a', border: '1px solid #2e3137', borderRadius: 12, padding: 16, display: 'grid', gap: 3 },
  statValue: { fontSize: 28, color: '#ff6a00' },
  statLabel: { color: '#a7a9ad', fontSize: 13, fontWeight: 700 },
  filters: { maxWidth: 1180, margin: '0 auto 18px', display: 'flex', gap: 8, flexWrap: 'wrap' },
  filter: { background: '#15171b', color: '#aaadb3', border: '1px solid #2d3036', borderRadius: 999, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 800 },
  filterActive: { color: '#ff7a1a', borderColor: '#ff6a00', background: '#20150d' },
  card: { maxWidth: 1180, width: '100%', boxSizing: 'border-box', margin: '0 auto', background: 'linear-gradient(180deg,#15171b,#101114)', border: '1px solid #30333a', borderRadius: 16, padding: 'clamp(16px,3vw,24px)', boxShadow: '0 16px 50px rgba(0,0,0,.2)' },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 },
  platform: { display: 'inline-block', background: '#ff6a00', color: '#08090a', padding: '5px 8px', borderRadius: 6, fontSize: 11, fontWeight: 900, marginRight: 8 },
  status: { display: 'inline-block', color: '#b9bcc1', border: '1px solid #383c43', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800 },
  date: { color: '#777b82', fontSize: 12 },
  label: { display: 'block', color: '#9da0a6', fontWeight: 800, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', margin: '12px 0 6px' },
  input: { width: '100%', boxSizing: 'border-box', background: '#0b0c0e', color: '#f3f4f5', border: '1px solid #34373e', borderRadius: 9, padding: '11px 12px', font: 'inherit', lineHeight: 1.5, resize: 'vertical' },
  cardActions: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 },
  approve: { background: '#8cff3d', color: '#071005', border: 0, borderRadius: 10, padding: '11px 16px', fontWeight: 900, cursor: 'pointer' },
  reject: { background: '#3a171a', color: '#ffb1b7', border: '1px solid #7a252c', borderRadius: 10, padding: '11px 16px', fontWeight: 800, cursor: 'pointer' },
  empty: { maxWidth: 1180, margin: '0 auto', padding: 30, textAlign: 'center', color: '#8e9197', border: '1px dashed #34373d', borderRadius: 14 },
}
