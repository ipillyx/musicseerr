import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'

const IconSearch = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
const IconQueue = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
const IconDiscover = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
const IconAdmin = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
const IconLogout = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
const IconMusic = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>

export default function Layout() {
  const { user, logout, authFetch } = useAuth()
  const navigate = useNavigate()
  const [queueCount, setQueueCount] = useState(0)
  const [daily, setDaily] = useState(null)

  useEffect(() => {
    const fetchData = () => {
      authFetch('/api/downloads/queue').then(r => r.json()).then(d => setQueueCount(d.queue_size || 0)).catch(() => {})
      authFetch('/api/downloads/daily').then(r => r.json()).then(d => setDaily(d)).catch(() => {})
    }
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  const navItems = [
    { to: '/', label: 'Search', icon: <IconSearch />, exact: true },
    { to: '/queue', label: 'Downloads', icon: <IconQueue />, badge: queueCount },
    { to: '/discover', label: 'Discover', icon: <IconDiscover /> },
    ...(user?.is_admin ? [{ to: '/admin', label: 'Admin', icon: <IconAdmin /> }] : [])
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 240, background: 'var(--bg-1)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100
      }}>
        <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--green)' }}>
            <IconMusic />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>MusicSeerr</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono', marginTop: 2 }}>pilly.uk</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {navItems.map(({ to, label, icon, badge, exact }) => (
            <NavLink key={to} to={to} end={exact} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 8, marginBottom: 4,
              color: isActive ? 'var(--green)' : 'var(--text-dim)',
              background: isActive ? 'rgba(30, 215, 96, 0.08)' : 'transparent',
              fontWeight: isActive ? 600 : 400, fontSize: 14, transition: 'all 0.15s',
              textDecoration: 'none', position: 'relative'
            })}>
              {icon}
              {label}
              {badge > 0 && (
                <span style={{
                  marginLeft: 'auto', background: 'var(--green)', color: '#000',
                  fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, fontFamily: 'DM Mono'
                }}>{badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Daily limit indicator */}
        {daily && !user?.is_admin && (
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Daily requests</span>
                <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--text-muted)' }}>{daily.used}/{daily.limit}</span>
              </div>
              <div style={{ background: 'var(--bg-3)', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: daily.used >= daily.limit ? 'var(--red)' : 'var(--green)',
                  width: `${Math.min(100, (daily.used / daily.limit) * 100)}%`,
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--green-dark), var(--green))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#000'
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.username}</div>
              {user?.is_admin && <div style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'DM Mono' }}>admin</div>}
            </div>
          </div>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '8px 12px', borderRadius: 6,
            background: 'transparent', color: 'var(--text-muted)', fontSize: 13, transition: 'all 0.15s'
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'rgba(233,68,68,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
          >
            <IconLogout /> Sign out
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: 240, flex: 1, minHeight: '100vh', background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  )
}
