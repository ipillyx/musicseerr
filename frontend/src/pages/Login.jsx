import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL || ''

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Login failed')
      login(data.token, { username: data.username, is_admin: data.is_admin })
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(30,215,96,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(30,215,96,0.03) 0%, transparent 50%)'
    }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 24px', animation: 'fadeUp 0.4s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎵</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px' }}>MusicSeerr</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'DM Mono', marginTop: 4 }}>pilly.uk music requests</p>
        </div>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Username</label>
            <input
              type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
              required autoFocus
              style={{
                width: '100%', padding: '12px 16px', background: 'var(--bg-2)',
                border: '1px solid var(--border)', borderRadius: 8,
                color: 'var(--text)', fontSize: 14, fontFamily: 'DM Mono',
                transition: 'border-color 0.15s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--green)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, fontFamily: 'DM Mono', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Password</label>
            <input
              type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              required
              style={{
                width: '100%', padding: '12px 16px', background: 'var(--bg-2)',
                border: '1px solid var(--border)', borderRadius: 8,
                color: 'var(--text)', fontSize: 14, fontFamily: 'DM Mono',
                transition: 'border-color 0.15s'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--green)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(233,68,68,0.1)', border: '1px solid rgba(233,68,68,0.3)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px', background: 'var(--green)',
            color: '#000', fontSize: 14, fontWeight: 700, borderRadius: 8,
            transition: 'all 0.15s', letterSpacing: 0.5,
            opacity: loading ? 0.7 : 1
          }}
            onMouseEnter={e => !loading && (e.currentTarget.style.background = '#22f06a')}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--green)'}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          No account?{' '}
          <Link to="/register" style={{ color: 'var(--green)', fontWeight: 600 }}>Register with invite code</Link>
        </p>
      </div>
    </div>
  )
}
