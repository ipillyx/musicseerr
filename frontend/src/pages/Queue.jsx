import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const statusColor = { queued: 'var(--text-muted)', downloading: 'var(--yellow)', completed: 'var(--green)', failed: 'var(--red)' }
const statusBg = { queued: 'rgba(255,255,255,0.03)', downloading: 'rgba(245,166,35,0.08)', completed: 'rgba(30,215,96,0.06)', failed: 'rgba(233,68,68,0.08)' }
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
    await authFetch('/api/downloads', { method: 'DELETE' })
    fetchData()
  }

  const handleScan = async () => {
    await authFetch('/api/admin/scan', { method: 'POST' })
  }

  const filtered = filter === 'all' ? downloads : downloads.filter(d => d.status === filter)

  return (
    <div style={{ padding: '20px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-1px', color: 'var(--text)', marginBottom: 2 }}>Downloads</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.is_admin ? 'All requests' : 'Your requests'}</p>
        </div>
        {user?.is_admin && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleScan} style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(30,215,96,0.1)', border: '1px solid var(--green-dark)', color: 'var(--green)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔄</button>
            <button onClick={handleClear} style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(233,68,68,0.1)', border: '1px solid rgba(233,68,68,0.3)', color: 'var(--red)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑️</button>
          </div>
        )}
      </div>

      {/* Daily limit bar */}
      {daily && !user?.is_admin && (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Daily limit</span>
            <span style={{ fontSize: 12, fontFamily: 'DM Mono', color: 'var(--text-muted)' }}>{daily.used}/{daily.limit}</span>
          </div>
          <div style={{ background: 'var(--bg-3)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 4, background: daily.used >= daily.limit ? 'var(--red)' : 'var(--green)', width: `${Math.min(100, (daily.used / daily.limit) * 100)}%`, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Total', value: stats.total, color: 'var(--text)' },
            { label: 'Done', value: stats.completed, color: 'var(--green)' },
            { label: 'Queue', value: stats.queued, color: 'var(--yellow)' },
            { label: 'Failed', value: stats.failed, color: 'var(--red)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'DM Mono' }}>{value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* User stats */}
      {user?.is_admin && stats?.user_stats?.length > 0 && (
        <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>By user</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {stats.user_stats.map(u => (
              <div key={u.username} style={{ fontSize: 12, fontFamily: 'DM Mono' }}>
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>{u.username}</span>
                <span style={{ color: 'var(--text-muted)' }}> {u.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {['all', 'queued', 'downloading', 'completed', 'failed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, flexShrink: 0,
            background: filter === f ? 'var(--green)' : 'var(--bg-2)',
            color: filter === f ? '#000' : 'var(--text-dim)',
            border: '1px solid', borderColor: filter === f ? 'var(--green)' : 'var(--border)',
            textTransform: 'capitalize', cursor: 'pointer'
          }}>{f}</button>
        ))}
      </div>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No downloads yet</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((d, i) => (
          <div key={d.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 14,
            background: statusBg[d.status], border: '1px solid var(--border)',
            animation: 'fadeUp 0.25s ease both', animationDelay: `${i * 0.03}s`
          }}>
            <div style={{ width: 46, height: 46, borderRadius: 10, overflow: 'hidden', background: 'var(--bg-3)', flexShrink: 0 }}>
              {d.album_art && <img src={d.album_art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>{d.track_name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {d.artist}
                {user?.is_admin && d.username && <span style={{ color: 'var(--text-muted)' }}> · {d.username}</span>}
              </div>
              {d.status === 'failed' && d.error_msg && (
                <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 2, fontFamily: 'DM Mono' }}>{d.error_msg.substring(0, 40)}</div>
              )}
            </div>
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
                color: statusColor[d.status], background: `${statusColor[d.status]}18`,
                fontFamily: 'DM Mono', display: 'flex', alignItems: 'center', gap: 3
              }}>
                {statusIcon[d.status]} {d.status}
                {d.status === 'downloading' && <div className="spinner" style={{ width: 8, height: 8 }} />}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono' }}>{timeAgo(d.requested_at)}</div>
              {d.status === 'failed' && (
                <button onClick={() => handleRetry(d.id)} style={{
                  padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                  background: 'rgba(245,166,35,0.1)', color: 'var(--yellow)', border: 'none', cursor: 'pointer'
                }}>↺ Retry</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
