import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Admin() {
  const { authFetch } = useAuth()
  const [users, setUsers] = useState([])
  const [settings, setSettings] = useState({ invite_code: '' })
  const [blacklist, setBlacklist] = useState([])
  const [newCode, setNewCode] = useState('')
  const [newBlacklist, setNewBlacklist] = useState({ type: 'artist', value: '' })
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  const fetchData = async () => {
    try {
      const [uRes, sRes, bRes] = await Promise.all([
        authFetch('/api/admin/users'),
        authFetch('/api/admin/settings'),
        authFetch('/api/admin/blacklist')
      ])
      const [u, s, b] = await Promise.all([uRes.json(), sRes.json(), bRes.json()])
      setUsers(u.users || [])
      setSettings(s)
      setNewCode(s.invite_code)
      setBlacklist(b.blacklist || [])
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
    await authFetch(`/api/admin/users/${id}/limit`, {
      method: 'PUT',
      body: JSON.stringify({ daily_limit: parseInt(limit) })
    })
    fetchData()
  }

  const saveSettings = async () => {
    await authFetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ invite_code: newCode }) })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    fetchData()
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

  const inputStyle = {
    padding: '10px 14px', background: 'var(--bg-2)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)', fontSize: 14, fontFamily: 'DM Mono'
  }
  const labelStyle = {
    display: 'block', fontSize: 11, fontFamily: 'DM Mono',
    color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>

  return (
    <div style={{ padding: '40px 40px', maxWidth: 800 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', marginBottom: 6 }}>Admin</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage users, settings and blacklist</p>
      </div>

      {/* Settings */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Settings</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Invite Code</label>
            <input value={newCode} onChange={e => setNewCode(e.target.value)} style={{ ...inputStyle, width: '100%' }}
              onFocus={e => e.target.style.borderColor = 'var(--green)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </div>
          <button onClick={saveSettings} style={{
            padding: '10px 20px', background: saved ? 'var(--green-dark)' : 'var(--green)',
            color: '#000', borderRadius: 8, fontWeight: 700, fontSize: 13
          }}>
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
        <button onClick={triggerScan} style={{
          padding: '10px 20px', background: 'rgba(30,215,96,0.1)', color: 'var(--green)',
          borderRadius: 8, fontWeight: 700, fontSize: 13, border: '1px solid var(--green-dark)'
        }}>
          🔄 Trigger Navidrome Scan
        </button>
      </div>

      {/* Users */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Users ({users.length})</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map(u => (
            <div key={u.id} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 16px', background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--border)'
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: u.is_admin ? 'linear-gradient(135deg, var(--green-dark), var(--green))' : 'var(--bg-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: u.is_admin ? '#000' : 'var(--text-dim)', flexShrink: 0
              }}>
                {u.username[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{u.username}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono' }}>
                  joined {new Date(u.created_at).toLocaleDateString()}
                </div>
              </div>
              {u.is_admin && (
                <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'rgba(30,215,96,0.1)', color: 'var(--green)', fontFamily: 'DM Mono', fontWeight: 600 }}>admin</span>
              )}
              {!u.is_admin && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono' }}>Daily limit:</span>
                    <input
                      type="number" defaultValue={u.daily_limit} min="1" max="500"
                      onBlur={e => updateLimit(u.id, e.target.value)}
                      style={{ ...inputStyle, width: 70, padding: '4px 8px', fontSize: 12 }}
                    />
                  </div>
                  <button onClick={() => deleteUser(u.id)} style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: 'rgba(233,68,68,0.1)', color: 'var(--red)'
                  }}>Remove</button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Blacklist */}
      <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Blacklist</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <select value={newBlacklist.type} onChange={e => setNewBlacklist({ ...newBlacklist, type: e.target.value })}
            style={{ ...inputStyle, width: 120 }}>
            <option value="artist">Artist</option>
            <option value="track">Track</option>
          </select>
          <input placeholder="Name to blacklist..." value={newBlacklist.value}
            onChange={e => setNewBlacklist({ ...newBlacklist, value: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && addBlacklist()}
            style={{ ...inputStyle, flex: 1 }}
            onFocus={e => e.target.style.borderColor = 'var(--green)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          <button onClick={addBlacklist} style={{
            padding: '10px 20px', background: 'var(--green)', color: '#000', borderRadius: 8, fontWeight: 700, fontSize: 13
          }}>Add</button>
        </div>
        {blacklist.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No blacklisted items</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {blacklist.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 8
              }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(233,68,68,0.1)', color: 'var(--red)', fontFamily: 'DM Mono' }}>
                  {item.type}
                </span>
                <span style={{ flex: 1, fontSize: 14 }}>{item.value}</span>
                <button onClick={() => removeBlacklist(item.id)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: 'rgba(233,68,68,0.1)', color: 'var(--red)'
                }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
