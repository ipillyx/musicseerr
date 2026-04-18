import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Admin() {
  const { authFetch } = useAuth()
  const [users, setUsers] = useState([])
  const [settings, setSettings] = useState({ invite_code: '' })
  const [blacklist, setBlacklist] = useState([])
  const [storage, setStorage] = useState(null)
  const [quality, setQuality] = useState('0')
  const [newCode, setNewCode] = useState('')
  const [newBlacklist, setNewBlacklist] = useState({ type: 'artist', value: '' })
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [updatingYtdlp, setUpdatingYtdlp] = useState(false)
  const [ytdlpResult, setYtdlpResult] = useState('')
  const [exporting, setExporting] = useState(false)

  const fetchData = async () => {
    try {
      const [uRes, sRes, bRes, stRes, qRes] = await Promise.all([
        authFetch('/api/admin/users'),
        authFetch('/api/admin/settings'),
        authFetch('/api/admin/blacklist'),
        authFetch('/api/admin/storage'),
        authFetch('/api/admin/settings/quality'),
      ])
      const [u, s, b, st, q] = await Promise.all([uRes.json(), sRes.json(), bRes.json(), stRes.json(), qRes.json()])
      setUsers(u.users || [])
      setSettings(s)
      setNewCode(s.invite_code)
      setBlacklist(b.blacklist || [])
      setStorage(st)
      setQuality(q.quality || '0')
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const deleteUser = async (id) => {
    if (!confirm('Delete this user?')) return
    await authFetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const updateLimit = async (id, limit) => {
    await authFetch(`/api/admin/users/${id}/limit`, { method: 'PUT', body: JSON.stringify({ daily_limit: parseInt(limit) }) })
  }

  const saveSettings = async () => {
    await authFetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ invite_code: newCode }) })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    fetchData()
  }

  const saveQuality = async (q) => {
    setQuality(q)
    await authFetch('/api/admin/settings/quality', { method: 'PUT', body: JSON.stringify({ quality: q }) })
  }

  const addBlacklist = async () => {
    if (!newBlacklist.value.trim()) return
    await authFetch('/api/admin/blacklist', { method: 'POST', body: JSON.stringify(newBlacklist) })
    setNewBlacklist({ type: 'artist', value: '' })
    fetchData()
  }

  const removeBlacklist = async (id) => {
    await authFetch(`/api/admin/blacklist/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const triggerScan = async () => {
    await authFetch('/api/admin/scan', { method: 'POST' })
    alert('Navidrome scan triggered!')
  }

  const updateYtdlp = async () => {
    setUpdatingYtdlp(true)
    setYtdlpResult('')
    try {
      const r = await authFetch('/api/admin/update-ytdlp', { method: 'POST' })
      const d = await r.json()
      setYtdlpResult(d.version ? `✅ Updated to ${d.version}` : '✅ Updated')
    } catch { setYtdlpResult('❌ Update failed') }
    finally { setUpdatingYtdlp(false) }
  }

  const exportHistory = async () => {
    setExporting(true)
    try {
      const r = await authFetch('/api/downloads/export')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'musicseerr-history.csv'
      a.click()
    } catch {} finally { setExporting(false) }
  }

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B'
    const gb = bytes / (1024 ** 3)
    if (gb >= 1) return `${gb.toFixed(1)} GB`
    return `${(bytes / (1024 ** 2)).toFixed(0)} MB`
  }

  const inputStyle = {
    padding: '12px 14px', background: 'var(--bg-2)', border: '1px solid var(--border)',
    borderRadius: 10, color: 'var(--text)', fontSize: 14, fontFamily: 'DM Sans',
    outline: 'none', width: '100%'
  }

  const sectionStyle = {
    background: 'var(--bg-1)', border: '1px solid var(--border)',
    borderRadius: 14, padding: '18px 18px', marginBottom: 14
  }

  const labelStyle = {
    fontSize: 11, fontFamily: 'DM Mono', color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, display: 'block', fontWeight: 700
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  return (
    <div style={{ padding: '20px 16px 0' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-1px', color: 'var(--text)', marginBottom: 2 }}>Admin</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Manage users, settings and system</p>
      </div>

      {/* Storage Stats */}
      {storage && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Storage</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {[
              { label: 'Music Size', value: formatBytes(storage.music_size), color: 'var(--green)' },
              { label: 'MP3 Files', value: storage.mp3_count?.toLocaleString(), color: 'var(--text)' },
              { label: 'Disk Free', value: formatBytes(storage.disk_free), color: storage.disk_free < 10737418240 ? 'var(--red)' : 'var(--text)' },
              { label: 'Disk Total', value: formatBytes(storage.disk_total), color: 'var(--text-muted)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'var(--bg-2)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'DM Mono' }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
          {/* Disk usage bar */}
          <div style={{ background: 'var(--bg-3)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: storage.disk_used / storage.disk_total > 0.9 ? 'var(--red)' : 'var(--green)',
              width: `${Math.min(100, (storage.disk_used / storage.disk_total) * 100)}%`,
              transition: 'width 0.3s'
            }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono', marginTop: 6 }}>
            {formatBytes(storage.disk_used)} used of {formatBytes(storage.disk_total)}
          </div>
        </div>
      )}

      {/* Settings */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Settings</span>

        {/* Invite code */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>Invite Code</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newCode} onChange={e => setNewCode(e.target.value)} style={{ ...inputStyle, flex: 1 }}
              onFocus={e => e.target.style.borderColor = 'var(--green)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            <button onClick={saveSettings} style={{
              padding: '12px 18px', background: saved ? 'var(--green-dark)' : 'var(--green)',
              color: '#000', borderRadius: 10, fontWeight: 700, fontSize: 13, flexShrink: 0
            }}>{saved ? '✓' : 'Save'}</button>
          </div>
        </div>

        {/* Download quality */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Download Quality</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['0', 'Best'], ['320', '320k'], ['192', '192k'], ['128', '128k']].map(([val, label]) => (
              <button key={val} onClick={() => saveQuality(val)} style={{
                flex: 1, padding: '10px 6px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: quality === val ? 'var(--green)' : 'var(--bg-2)',
                color: quality === val ? '#000' : 'var(--text-dim)',
                border: '1px solid', borderColor: quality === val ? 'var(--green)' : 'var(--border)'
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={triggerScan} style={{
            width: '100%', padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: 'rgba(30,215,96,0.1)', color: 'var(--green)', border: '1px solid var(--green-dark)'
          }}>🔄 Scan Navidrome</button>

          <button onClick={updateYtdlp} disabled={updatingYtdlp} style={{
            width: '100%', padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: 'rgba(74,159,255,0.1)', color: '#4a9fff', border: '1px solid rgba(74,159,255,0.3)'
          }}>
            {updatingYtdlp ? <><div className="spinner" style={{ width: 14, height: 14, display: 'inline-block', marginRight: 6 }} />Updating...</> : '⬆️ Update yt-dlp'}
          </button>
          {ytdlpResult && <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono', textAlign: 'center' }}>{ytdlpResult}</div>}

          <button onClick={exportHistory} disabled={exporting} style={{
            width: '100%', padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            background: 'var(--bg-2)', color: 'var(--text-dim)', border: '1px solid var(--border)'
          }}>
            {exporting ? 'Exporting...' : '📥 Export History (CSV)'}
          </button>
        </div>
      </div>

      {/* Users */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Users ({users.length})</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map(u => (
            <div key={u.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--border)'
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: u.is_admin ? 'linear-gradient(135deg, var(--green-dark), var(--green))' : 'var(--bg-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: u.is_admin ? '#000' : 'var(--text-dim)', flexShrink: 0
              }}>{u.username[0].toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{u.username}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono' }}>
                  joined {new Date(u.created_at).toLocaleDateString()}
                </div>
              </div>
              {u.is_admin ? (
                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'rgba(30,215,96,0.1)', color: 'var(--green)', fontFamily: 'DM Mono' }}>admin</span>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Limit:</span>
                    <input type="number" defaultValue={u.daily_limit} min="1" max="500"
                      onBlur={e => updateLimit(u.id, e.target.value)}
                      style={{ width: 56, padding: '4px 8px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 12, fontFamily: 'DM Mono' }} />
                  </div>
                  <button onClick={() => deleteUser(u.id)} style={{
                    padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: 'rgba(233,68,68,0.1)', color: 'var(--red)', border: 'none', cursor: 'pointer'
                  }}>✕</button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Blacklist */}
      <div style={sectionStyle}>
        <span style={labelStyle}>Blacklist</span>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select value={newBlacklist.type} onChange={e => setNewBlacklist({ ...newBlacklist, type: e.target.value })}
            style={{ ...inputStyle, width: 110, flex: 'none' }}>
            <option value="artist">Artist</option>
            <option value="track">Track</option>
          </select>
          <input placeholder="Name..." value={newBlacklist.value}
            onChange={e => setNewBlacklist({ ...newBlacklist, value: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && addBlacklist()}
            style={{ ...inputStyle }}
            onFocus={e => e.target.style.borderColor = 'var(--green)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          <button onClick={addBlacklist} style={{
            padding: '12px 16px', background: 'var(--green)', color: '#000',
            borderRadius: 10, fontWeight: 700, fontSize: 13, flexShrink: 0
          }}>Add</button>
        </div>
        {blacklist.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No blacklisted items</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {blacklist.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 10
              }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(233,68,68,0.1)', color: 'var(--red)', fontFamily: 'DM Mono' }}>{item.type}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{item.value}</span>
                <button onClick={() => removeBlacklist(item.id)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, background: 'rgba(233,68,68,0.1)', color: 'var(--red)', border: 'none', cursor: 'pointer'
                }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
