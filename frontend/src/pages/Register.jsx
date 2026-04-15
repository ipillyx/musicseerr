import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '', confirm: '', invite_code: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.username || !form.password || !form.invite_code) return setError('Please fill in all fields')
    if (form.password !== form.confirm) return setError('Passwords do not match')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, password: form.password, invite_code: form.invite_code })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Registration failed')
      login(data.token, { username: data.username, is_admin: data.is_admin })
      navigate('/')
    } catch (e) {
      setError(e.message || 'Registration failed')
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
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 22,
          background: 'rgba(30,215,96,0.12)', border: '1px solid rgba(30,215,96,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, margin: '0 auto 16px'
        }}>🎵</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)', letterSpacing: '-1px' }}>Create Account</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>You'll need an invite code</div>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && (
          <div style={{ background: 'rgba(233,68,68,0.1)', border: '1px solid rgba(233,68,68,0.3)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--red)', textAlign: 'center' }}>
            {error}
          </div>
        )}
        {[
          { key: 'username', placeholder: 'Username', type: 'text' },
          { key: 'password', placeholder: 'Password', type: 'password' },
          { key: 'confirm', placeholder: 'Confirm Password', type: 'password' },
          { key: 'invite_code', placeholder: 'Invite Code', type: 'text' },
        ].map(({ key, placeholder, type }) => (
          <input
            key={key}
            type={type}
            placeholder={placeholder}
            value={form[key]}
            onChange={e => setForm({ ...form, [key]: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--green)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
            autoCapitalize="none"
          />
        ))}
        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: '16px',
          background: 'var(--green)', color: '#000',
          borderRadius: 14, fontSize: 16, fontWeight: 800,
          border: 'none', cursor: 'pointer', marginTop: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : 'Create Account'}
        </button>
      </div>

      <div style={{ marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
      </div>
    </div>
  )
}
