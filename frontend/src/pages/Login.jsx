import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.username || !form.password) return setError('Please fill in all fields')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, password: form.password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Login failed')
      login(data.token, { username: data.username, is_admin: data.is_admin })
      navigate('/')
    } catch (e) {
      setError(e.message || 'Invalid username or password')
    } finally { setLoading(false) }
  }

  const inputStyle = {
    width: '100%', padding: '15px 16px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
    borderRadius: 14, color: 'var(--text)', fontSize: 16,
    outline: 'none', fontFamily: 'DM Sans', WebkitAppearance: 'none',
    transition: 'border-color 0.2s'
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px 24px', maxWidth: 500, margin: '0 auto'
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 22,
          background: 'rgba(30,215,96,0.12)', border: '1px solid rgba(30,215,96,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', overflow: 'hidden', padding: 8
        }}>
          <img src="/icon-192x192.png" alt="MusicSeerr" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 14 }} />
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)', letterSpacing: '-1px' }}>MusicSeerr</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>pilly.uk music requests</div>
      </div>

      {/* Form */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && (
          <div style={{ background: 'rgba(233,68,68,0.1)', border: '1px solid rgba(233,68,68,0.3)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--red)', textAlign: 'center' }}>
            {error}
          </div>
        )}
        <input
          placeholder="Username"
          value={form.username}
          onChange={e => setForm({ ...form, username: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'var(--green)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
          autoCapitalize="none"
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'var(--green)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: '16px',
          background: 'var(--green)', color: '#000',
          borderRadius: 14, fontSize: 16, fontWeight: 800,
          border: 'none', cursor: 'pointer', marginTop: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}>
          {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : 'Sign In'}
        </button>
      </div>

      <div style={{ marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
        Need an account?{' '}
        <Link to="/register" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>Register</Link>
      </div>
    </div>
  )
}
