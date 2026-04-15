import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const statusColor = { queued: 'var(--text-muted)', downloading: 'var(--green)', completed: 'var(--green)', failed: 'var(--red)' }
const statusBg = { queued: 'rgba(255,255,255,0.05)', downloading: 'rgba(30,215,96,0.1)', completed: 'rgba(30,215,96,0.08)', failed: 'rgba(233,68,68,0.1)' }
const statusIcon = { queued: '⏳', downloading: '⬇️', completed: '✅', failed: '❌' }

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr + 'Z').getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Queue() {
  const { authFetch, user } = useAuth()
  const [downloads, setDownloads] = useState([])
  const [stats, setStats] = useState(null)
  const [daily, setDaily] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [clearing, setClearing] = useState(false)

  const fetchData = async () => {
    try {
      const [dRes, sRes, dayRes] = await Promise.all([
        authFetch('/api/downloads'),
        authFetch('/api/stats'),
        authFetch('/api/downloads/daily')
      ])
      const [d, s, day] = await Promise.all([dRes.json(), sRes.json(), dayRes.json()])
      setDownloads(d.downloads || [])
      setStats(s)
      setDaily(day)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleRetry = async (id) => {
    await authFetch(`/api/downloads/${id}/retry`, { method: 'POST' })
    fetchData()
  }

  const handleClear = async () => {
    setClearing(true)
    await authFetch('/api/downloads', { method: 'DELETE' })
    await fetchData()
    setClearing(false)
  }

  const handleScan = async () => {
    await authFetch('/api/admin/scan', { method: 'POST' })
    alert('Navidrome scan triggered!')
  }

  const filtered = filter === 'all' ? downloads : downloads.filter(d => d.status === filter)

  return (
    <div style={{ padding: '40px 40px', maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', marginBottom: 6 }}>Downloads</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {user?.is_admin ? 'All user download requests' : 'Your download requests'}
          </p>
        </div>
        {user?.is_admin && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleScan} style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: 'rgba(30,215,96,0.1)', color: 'var(--green)', border: '1px solid var(--green-dark)'
            }}>
              🔄 Scan Navidrome
            </button>
            <button onClick={handleClear} disabled={clearing} style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: 'rgba(233,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(233,68,68,0.3)'
            }}>
              {clearing ? 'Clearing...' : '🗑️ Clear History'}
            </button>
          </div>
        )}
      </div>

      {/* Daily limit bar */}
      {daily && !user?.is_admin && (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Daily Requests</span>
            <span style={{ fontSize: 13, fontFamily: 'DM Mono', color: 'var(--text-muted)' }}>{daily.used} / {daily.limit}</span>
          </div>
          <div style={{ background: 'var(--bg-3)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4, transition: 'width 0.3s',
              background: daily.used >= daily.limit ? 'var(--red)' : 'var(--green)',
              width: `${Math.min(100, (daily.used / daily.limit) * 100)}%`
            }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'DM Mono' }}>
            {daily.remaining} requests remaining today
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Total', value: stats.total, color: 'var(--text)' },
            { label: 'Completed', value: stats.completed, color: 'var(--green)' },
            { label: 'In Queue', value: stats.queued, color: 'var(--yellow)' },
            { label: 'Failed', value: stats.failed, color: 'var(--red)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: 'DM Mono' }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* User stats for admin */}
      {user?.is_admin && stats?.user_stats && stats.user_stats.length > 0 && (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Requests by user</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {stats.user_stats.map(u => (
              <div key={u.username} style={{ fontSize: 12, fontFamily: 'DM Mono', color: 'var(--text-dim)' }}>
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>{u.username}</span>: {u.total}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', 'queued', 'downloading', 'completed', 'failed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: filter === f ? 'var(--green)' : 'var(--bg-2)',
            color: filter === f ? '#000' : 'var(--text-dim)',
            border: '1px solid', borderColor: filter === f ? 'var(--green)' : 'var(--border)',
            textTransform: 'capitalize', transition: 'all 0.15s'
          }}>
            {f}
          </button>
        ))}
      </div>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>No downloads yet</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(d => (
          <div key={d.id} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px', borderRadius: 10,
            background: 'var(--bg-1)', border: '1px solid var(--border)', animation: 'fadeUp 0.3s ease'
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-3)', flexShrink: 0 }}>
              {d.album_art && <img src={d.album_art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.track_name}</div>
              <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 2 }}>
                {d.artist}{d.album ? ` · ${d.album}` : ''}
                {user?.is_admin && d.username && <span style={{ color: 'var(--text-muted)' }}> · by {d.username}</span>}
              </div>
              {d.status === 'failed' && d.error_msg && (
                <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3, fontFamily: 'DM Mono' }}>{d.error_msg}</div>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono', flexShrink: 0 }}>{timeAgo(d.requested_at)}</div>
            {d.status === 'failed' && (
              <button onClick={() => handleRetry(d.id)} style={{
                padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                background: 'rgba(245,166,35,0.1)', color: 'var(--yellow)', flexShrink: 0
              }}>↺ Retry</button>
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 20, flexShrink: 0,
              background: statusBg[d.status], color: statusColor[d.status],
              fontSize: 11, fontFamily: 'DM Mono', fontWeight: 600
            }}>
              <span>{statusIcon[d.status]}</span>
              {d.status}
              {d.status === 'downloading' && <div className="spinner" style={{ width: 10, height: 10 }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
