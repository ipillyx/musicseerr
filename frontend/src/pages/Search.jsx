import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const SOURCES = [
  { id: 'spotify', label: 'Spotify', icon: '🎵', color: 'var(--green)', border: 'var(--green-dark)', bg: 'rgba(30,215,96,0.12)' },
  { id: 'ytmusic', label: 'YT Music', icon: '▶️', color: '#ff4444', border: 'rgba(255,68,68,0.4)', bg: 'rgba(255,0,0,0.08)' },
  { id: 'soundcloud', label: 'SoundCloud', icon: '☁️', color: '#ff5500', border: 'rgba(255,85,0,0.4)', bg: 'rgba(255,85,0,0.08)' },
  { id: 'playlist', label: 'Playlist', icon: '📋', color: '#4a9fff', border: 'rgba(74,159,255,0.4)', bg: 'rgba(74,159,255,0.08)' },
]

function PlaylistImport({ authFetch }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [savedPlaylists, setSavedPlaylists] = useState([])
  const [view, setView] = useState('saved')
  const [syncing, setSyncing] = useState({})

  const fetchSaved = async () => {
    try {
      const r = await authFetch('/api/playlists')
      const d = await r.json()
      setSavedPlaylists(d.playlists || [])
    } catch {}
  }

  useEffect(() => { fetchSaved() }, [])

  const detectSource = (u) => {
    if (u.includes('spotify.com/playlist')) return { label: 'Spotify Playlist', color: 'var(--green)', icon: '🎵' }
    if (u.includes('youtube.com/playlist') || (u.includes('youtube.com') && u.includes('list='))) return { label: 'YouTube Playlist', color: '#ff4444', icon: '▶️' }
    return null
  }

  const source = detectSource(url)

  const handleFetch = async () => {
    if (!url.trim()) return
    setFetching(true)
    setError('')
    setPreview(null)
    setResult(null)
    try {
      const r = await authFetch('/api/playlists/fetch', { method: 'POST', body: JSON.stringify({ url }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Failed to fetch')
      setPreview(d)
    } catch (e) { setError(e.message) }
    finally { setFetching(false) }
  }

  const handleDownloadAll = async () => {
    setLoading(true)
    setError('')
    try {
      const r = await authFetch('/api/playlists/download', { method: 'POST', body: JSON.stringify({ url }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.detail || 'Failed')
      setResult(d)
      setPreview(null)
      fetchSaved()
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleSync = async (id) => {
    setSyncing(s => ({ ...s, [id]: true }))
    try {
      await authFetch(`/api/playlists/${id}/sync`, { method: 'POST' })
      setTimeout(() => { fetchSaved(); setSyncing(s => ({ ...s, [id]: false })) }, 2000)
    } catch { setSyncing(s => ({ ...s, [id]: false })) }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return
    await authFetch(`/api/playlists/${id}`, { method: 'DELETE' })
    fetchSaved()
  }

  const timeAgo = (dateStr) => {
    if (!dateStr) return 'Never'
    const diff = Date.now() - new Date(dateStr + 'Z').getTime()
    const h = Math.floor(diff / 3600000)
    if (h < 1) return 'Just now'
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setView('saved')} style={{
          flex: 1, padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 700,
          background: view === 'saved' ? 'rgba(74,159,255,0.12)' : 'var(--bg-1)',
          color: view === 'saved' ? '#4a9fff' : 'var(--text-muted)',
          border: `1px solid ${view === 'saved' ? 'rgba(74,159,255,0.4)' : 'var(--border)'}`,
          cursor: 'pointer'
        }}>📋 Saved ({savedPlaylists.length})</button>
        <button onClick={() => { setView('import'); setResult(null); setPreview(null); setError('') }} style={{
          flex: 1, padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 700,
          background: view === 'import' ? 'rgba(74,159,255,0.12)' : 'var(--bg-1)',
          color: view === 'import' ? '#4a9fff' : 'var(--text-muted)',
          border: `1px solid ${view === 'import' ? 'rgba(74,159,255,0.4)' : 'var(--border)'}`,
          cursor: 'pointer'
        }}>➕ Import New</button>
      </div>

      {view === 'saved' && (
        <div>
          {savedPlaylists.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>No saved playlists</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Import a playlist to start monitoring it</div>
              <button onClick={() => setView('import')} style={{
                padding: '10px 24px', borderRadius: 20, fontSize: 14, fontWeight: 700,
                background: '#4a9fff', color: '#fff', border: 'none', cursor: 'pointer'
              }}>Import Playlist</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {savedPlaylists.map(pl => (
                <div key={pl.id} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                      background: pl.source === 'spotify' ? 'rgba(30,215,96,0.12)' : 'rgba(255,68,68,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
                    }}>{pl.source === 'spotify' ? '🎵' : '▶️'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 3 }}>{pl.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono' }}>
                        {pl.track_count} tracks · Synced {timeAgo(pl.last_synced)}
                      </div>
                      <div style={{ fontSize: 10, color: '#4a9fff', marginTop: 2, fontFamily: 'DM Mono' }}>🔄 Auto-syncs every 6 hours</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={() => handleSync(pl.id)} disabled={syncing[pl.id]} style={{
                      flex: 1, padding: '9px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                      background: 'rgba(30,215,96,0.1)', color: 'var(--green)',
                      border: '1px solid var(--green-dark)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                    }}>
                      {syncing[pl.id] ? <><div className="spinner" style={{ width: 12, height: 12 }} /> Syncing...</> : '🔄 Sync Now'}
                    </button>
                    <button onClick={() => handleDelete(pl.id, pl.name)} style={{
                      width: 40, height: 38, borderRadius: 10, fontSize: 16,
                      background: 'rgba(233,68,68,0.1)', color: 'var(--red)',
                      border: '1px solid rgba(233,68,68,0.3)', cursor: 'pointer'
                    }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'import' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>Import Playlist</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Download and monitor a Spotify or YouTube playlist</p>
          </div>

          <div style={{ position: 'relative', marginBottom: 10 }}>
            <input
              value={url}
              onChange={e => { setUrl(e.target.value); setPreview(null); setResult(null); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleFetch()}
              placeholder="Paste Spotify or YouTube playlist URL..."
              style={{
                width: '100%', padding: '14px 40px 14px 16px',
                background: 'var(--bg-1)', border: '1px solid var(--border)',
                borderRadius: 14, color: 'var(--text)', fontSize: 14,
                outline: 'none', fontFamily: 'DM Sans', WebkitAppearance: 'none'
              }}
              onFocus={e => e.target.style.borderColor = '#4a9fff'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            {url && (
              <button onClick={() => { setUrl(''); setPreview(null); setResult(null) }} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                width: 22, height: 22, borderRadius: 11, background: 'var(--bg-3)',
                border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>✕</button>
            )}
          </div>

          {source && (
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12 }}>{source.icon}</span>
              <span style={{ fontSize: 12, color: source.color, fontFamily: 'DM Mono', fontWeight: 600 }}>{source.label} detected</span>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(233,68,68,0.1)', border: '1px solid rgba(233,68,68,0.3)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>
              {error}
            </div>
          )}

          {result && (
            <div style={{ background: 'rgba(30,215,96,0.08)', border: '1px solid var(--green-dark)', borderRadius: 14, padding: 20, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)', marginBottom: 4 }}>{result.playlist_name}</div>
              <div style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 8 }}>
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>{result.queued}</span> tracks queued
                {result.skipped > 0 && <span style={{ color: 'var(--text-muted)' }}> · {result.skipped} already in library</span>}
              </div>
              <div style={{ fontSize: 12, color: '#4a9fff', marginBottom: 16 }}>🔄 Saved — auto-syncs every 6 hours</div>
              <button onClick={() => { setUrl(''); setResult(null); setView('saved') }} style={{
                padding: '10px 24px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                background: 'var(--green)', color: '#000', border: 'none', cursor: 'pointer'
              }}>View Saved Playlists</button>
            </div>
          )}

          {!preview && !result && (
            <button onClick={handleFetch} disabled={fetching || !url.trim() || !source} style={{
              width: '100%', padding: '14px', borderRadius: 14, fontSize: 14, fontWeight: 700,
              background: source ? 'rgba(74,159,255,0.12)' : 'var(--bg-2)',
              color: source ? '#4a9fff' : 'var(--text-muted)',
              border: `1px solid ${source ? 'rgba(74,159,255,0.4)' : 'var(--border)'}`,
              cursor: source ? 'pointer' : 'not-allowed', marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}>
              {fetching ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Fetching...</> : '🔍 Preview Playlist'}
            </button>
          )}

          {preview && (
            <div>
              <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{preview.playlist_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{preview.tracks.length} tracks</div>
                  </div>
                  <div style={{
                    fontSize: 10, padding: '3px 10px', borderRadius: 20, fontFamily: 'DM Mono', fontWeight: 600,
                    background: preview.source === 'spotify' ? 'rgba(30,215,96,0.12)' : 'rgba(255,68,68,0.1)',
                    color: preview.source === 'spotify' ? 'var(--green)' : '#ff4444'
                  }}>{preview.source === 'spotify' ? '🎵 Spotify' : '▶️ YouTube'}</div>
                </div>
                <div style={{ fontSize: 11, color: '#4a9fff', marginTop: 8, fontFamily: 'DM Mono' }}>🔄 Will be saved and monitored</div>
              </div>
              <button onClick={handleDownloadAll} disabled={loading} style={{
                width: '100%', padding: '14px', borderRadius: 14, fontSize: 15, fontWeight: 800,
                background: 'var(--green)', color: '#000', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14
              }}>
                {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Queueing...</> : `⬇️ Download All ${preview.tracks.length} Tracks`}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {preview.tracks.slice(0, 50).map((t, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 10,
                    background: 'var(--bg-1)', border: '1px solid var(--border)'
                  }}>
                    <div style={{ width: 38, height: 38, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-3)', flexShrink: 0 }}>
                      {t.album_art && <img src={t.album_art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.artist}</div>
                    </div>
                  </div>
                ))}
                {preview.tracks.length > 50 && (
                  <div style={{ textAlign: 'center', padding: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                    +{preview.tracks.length - 50} more tracks
                  </div>
                )}
              </div>
            </div>
          )}

          {!url && !preview && !result && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Supported</div>
              {[
                { icon: '🎵', label: 'Spotify Playlists', example: 'open.spotify.com/playlist/...', color: 'var(--green)' },
                { icon: '▶️', label: 'YouTube Playlists', example: 'youtube.com/playlist?list=...', color: '#ff4444' },
              ].map(({ icon, label, example, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono', marginTop: 2 }}>{example}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Search() {
  const { authFetch } = useAuth()
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('spotify')
  const [type, setType] = useState('track')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [queued, setQueued] = useState({})
  const [artistView, setArtistView] = useState(null)
  const [artistAlbums, setArtistAlbums] = useState([])

  const currentSource = SOURCES.find(s => s.id === source)

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setArtistView(null)
    setResults([])
    try {
      let r
      if (source === 'spotify') r = await authFetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}`)
      else if (source === 'ytmusic') r = await authFetch(`/api/search/ytmusic?q=${encodeURIComponent(query)}`)
      else if (source === 'soundcloud') r = await authFetch(`/api/search/soundcloud?q=${encodeURIComponent(query)}`)
      const d = await r.json()
      setResults(d.results || [])
    } catch {}
    finally { setLoading(false) }
  }

  const loadArtist = async (item) => {
    setArtistView(item)
    setArtistAlbums([])
    try {
      const r = await authFetch(`/api/artist-albums?uri=${encodeURIComponent(item.uri)}`)
      const d = await r.json()
      setArtistAlbums(d.albums || [])
    } catch {}
  }

  const download = async (item, dlType) => {
    const key = item.uri
    setQueued(q => ({ ...q, [key]: 'loading' }))
    try {
      const r = await authFetch('/api/downloads', {
        method: 'POST',
        body: JSON.stringify({ uri: item.uri, track_name: item.name, artist: item.artist, album: item.album, album_art: item.album_art, type: dlType || item.type || 'track' })
      })
      const d = await r.json()
      setQueued(q => ({ ...q, [key]: d.status || 'queued' }))
    } catch { setQueued(q => ({ ...q, [item.uri]: 'error' })) }
  }

  const isDone = (uri) => queued[uri] && queued[uri] !== 'loading' && queued[uri] !== 'error'

  const sourceLabel = (t) => {
    if (t === 'ytmusic') return { text: '▶ YouTube Music', color: '#ff4444' }
    if (t === 'soundcloud') return { text: '☁ SoundCloud', color: '#ff5500' }
    return null
  }

  if (source === 'playlist') {
    return (
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {SOURCES.map(s => (
            <button key={s.id} onClick={() => { setSource(s.id); setResults([]) }} style={{
              flexShrink: 0, padding: '9px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700,
              background: source === s.id ? s.bg : 'var(--bg-1)',
              color: source === s.id ? s.color : 'var(--text-muted)',
              border: `1px solid ${source === s.id ? s.border : 'var(--border)'}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
            }}>
              <span style={{ fontSize: 13 }}>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>
        <PlaylistImport authFetch={authFetch} />
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 16px 0' }}>
      {artistView ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button onClick={() => setArtistView(null)} style={{
              width: 36, height: 36, borderRadius: 18, background: 'var(--bg-2)',
              border: '1px solid var(--border)', color: 'var(--text)', fontSize: 18,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>←</button>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{artistView.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{artistAlbums.length} releases</div>
            </div>
          </div>
          {artistAlbums.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {artistAlbums.map(a => (
                <div key={a.uri} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ position: 'relative', paddingTop: '100%', background: 'var(--bg-3)' }}>
                    {a.album_art && <img src={a.album_art} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ padding: '10px 10px 12px' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3, marginBottom: 2 }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>{a.year} · {a.track_count} tracks</div>
                    <button onClick={() => download(a, 'album')} disabled={queued[a.uri] === 'loading' || isDone(a.uri)} style={{
                      width: '100%', padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: isDone(a.uri) ? 'rgba(30,215,96,0.12)' : 'var(--bg-3)',
                      color: isDone(a.uri) ? 'var(--green)' : 'var(--text)',
                      border: `1px solid ${isDone(a.uri) ? 'var(--green-dark)' : 'var(--border)'}`,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
                    }}>
                      {queued[a.uri] === 'loading' ? <div className="spinner" style={{ width: 12, height: 12 }} /> : isDone(a.uri) ? '✓ Queued' : '↓ Download'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-1px', color: 'var(--text)', marginBottom: 2 }}>Find Music</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Search and request downloads</p>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {SOURCES.map(s => (
              <button key={s.id} onClick={() => { setSource(s.id); setResults([]) }} style={{
                flexShrink: 0, padding: '9px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                background: source === s.id ? s.bg : 'var(--bg-1)',
                color: source === s.id ? s.color : 'var(--text-muted)',
                border: `1px solid ${source === s.id ? s.border : 'var(--border)'}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
              }}>
                <span style={{ fontSize: 13 }}>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', marginBottom: 10 }}>
            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder={source === 'spotify' ? 'Songs, albums, artists...' : source === 'ytmusic' ? 'Search YouTube Music...' : 'Search SoundCloud...'}
              style={{
                width: '100%', padding: '14px 44px 14px 44px',
                background: 'var(--bg-1)', border: '1px solid var(--border)',
                borderRadius: 14, color: 'var(--text)', fontSize: 15,
                outline: 'none', fontFamily: 'DM Sans', WebkitAppearance: 'none'
              }}
              onFocus={e => e.target.style.borderColor = currentSource.color}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]) }} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                width: 22, height: 22, borderRadius: 11, background: 'var(--bg-3)',
                border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>✕</button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {source === 'spotify' && [['track', 'Tracks'], ['album', 'Albums'], ['artist', 'Artists']].map(([val, label]) => (
              <button key={val} onClick={() => setType(val)} style={{
                padding: '9px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: type === val ? 'var(--green)' : 'var(--bg-2)',
                color: type === val ? '#000' : 'var(--text-dim)',
                border: '1px solid', borderColor: type === val ? 'var(--green)' : 'var(--border)',
                cursor: 'pointer'
              }}>{label}</button>
            ))}
            {source !== 'spotify' && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', fontFamily: 'DM Mono' }}>
                {source === 'ytmusic' ? 'Lives, covers, remixes...' : 'Tracks, mixes, podcasts...'}
              </div>
            )}
            <button onClick={search} disabled={loading || !query.trim()} style={{
              marginLeft: 'auto', padding: '9px 20px', borderRadius: 20, fontSize: 13, fontWeight: 700,
              background: currentSource.color, color: source === 'spotify' ? '#000' : '#fff',
              border: 'none', cursor: 'pointer', opacity: loading || !query.trim() ? 0.5 : 1
            }}>
              {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Search'}
            </button>
          </div>

          {results.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>{currentSource.icon}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                {source === 'spotify' ? 'Find your music' : source === 'ytmusic' ? 'Search YouTube Music' : 'Search SoundCloud'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {source === 'spotify' ? 'Search tracks, albums or artists' : source === 'ytmusic' ? 'Live versions, covers, remixes and more' : 'Tracks, DJ mixes, podcasts and more'}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((item, i) => {
              const label = sourceLabel(item.type)
              return (
                <div key={item.uri + i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 14,
                  background: 'var(--bg-1)', border: '1px solid var(--border)',
                  animation: 'fadeUp 0.25s ease both', animationDelay: `${i * 0.04}s`
                }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', background: 'var(--bg-3)', flexShrink: 0 }}>
                    {item.album_art && <img src={item.album_art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }} onClick={() => item.type === 'artist' && loadArtist(item)}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.artist}{item.album ? ` · ${item.album}` : ''}{item.duration ? ` · ${item.duration}` : ''}
                    </div>
                    {label && <div style={{ fontSize: 10, color: label.color, fontFamily: 'DM Mono', marginTop: 2 }}>{label.text}</div>}
                  </div>
                  {item.type === 'artist' ? (
                    <button onClick={() => loadArtist(item)} style={{
                      padding: '8px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      background: 'var(--bg-2)', color: 'var(--text-dim)', border: '1px solid var(--border)', cursor: 'pointer'
                    }}>View →</button>
                  ) : (
                    <button onClick={() => download(item)} disabled={queued[item.uri] === 'loading' || isDone(item.uri)} style={{
                      width: 42, height: 42, borderRadius: 21, flexShrink: 0,
                      background: isDone(item.uri) ? 'rgba(30,215,96,0.12)' : 'var(--bg-2)',
                      color: isDone(item.uri) ? 'var(--green)' : 'var(--text-dim)',
                      border: `1px solid ${isDone(item.uri) ? 'var(--green-dark)' : 'var(--border)'}`,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
                    }}>
                      {queued[item.uri] === 'loading' ? <div className="spinner" style={{ width: 14, height: 14 }} /> : isDone(item.uri) ? '✓' : '↓'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
