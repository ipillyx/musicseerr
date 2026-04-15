import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL || ''

export default function Register() {
  const [form, setForm] = useState({ username: '', password: '', confirm: '', invite_code: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) return setError('Passwords do not match')
    if (form.password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, password: form.password, invite_code: form.invite_code })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Registration failed')
      login(data.token, { username: data.username, is_admin: data.is_admin })
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', background: 'var(--bg-2)',
    border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text)', fontSize: 14, fontFamily: 'DM Mono',
    transition: 'border-color 0.15s'
  }
  const labelStyle = {
    display: 'block', fontSize: 11, fontFamily: 'DM Mono',
    color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(30,215,96,0.04) 0%, transparent 60%)'
    }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 24px', animation: 'fadeUp 0.4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎵</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px' }}>Create Account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'DM Mono', marginTop: 4 }}>invite code required</p>
        </div>

        <form onSubmit={submit}>
          {[
            { key: 'username', label: 'Username', type: 'text' },
            { key: 'password', label: 'Password', type: 'password' },
            { key: 'confirm', label: 'Confirm Password', type: 'password' },
            { key: 'invite_code', label: 'Invite Code', type: 'text' },
          ].map(({ key, label, type }) => (
            <div key={key} style={{ marginBottom: 16 }}>
              <label style={labelStyle}>{label}</label>
              <input
                type={type} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                required autoFocus={key === 'username'}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--green)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          ))}

          {error && (
            <div style={{ background: 'rgba(233,68,68,0.1)', border: '1px solid rgba(233,68,68,0.3)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--red)' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px', background: 'var(--green)',
            color: '#000', fontSize: 14, fontWeight: 700, borderRadius: 8,
            transition: 'all 0.15s', marginTop: 8,
            opacity: loading ? 0.7 : 1
          }}
            onMouseEnter={e => !loading && (e.currentTarget.style.background = '#22f06a')}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--green)'}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--green)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
