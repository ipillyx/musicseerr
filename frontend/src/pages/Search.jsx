import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Search() {
  const { authFetch } = useAuth()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('track')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [queued, setQueued] = useState({})
  const [artistView, setArtistView] = useState(null)
  const [artistAlbums, setArtistAlbums] = useState([])
  const inputRef = useRef()

  const search = async () => {
    if (!query.trim()) return
    setLoading(true)
    setArtistView(null)
    try {
      const r = await authFetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}`)
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

  const download = async (item, dlType = 'track') => {
    const key = item.uri
    setQueued(q => ({ ...q, [key]: 'loading' }))
    try {
      const r = await authFetch('/api/downloads', {
        method: 'POST',
        body: JSON.stringify({ uri: item.uri, track_name: item.name, artist: item.artist, album: item.album, album_art: item.album_art, type: dlType })
      })
      const d = await r.json()
      setQueued(q => ({ ...q, [key]: d.status || 'queued' }))
    } catch {
      setQueued(q => ({ ...q, [key]: 'error' }))
    }
  }

  const isDone = (uri) => queued[uri] && queued[uri] !== 'loading' && queued[uri] !== 'error'

  return (
    <div style={{ padding: '20px 16px 0' }}>
      {artistView ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button onClick={() => setArtistView(null)} style={{
              width: 36, height: 36, borderRadius: 18, background: 'var(--bg-2)',
              border: '1px solid var(--border)', color: 'var(--text)', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>←</button>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{artistView.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{artistAlbums.length} releases</div>
            </div>
          </div>
          {artistAlbums.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Search Spotify and request downloads</p>
          </div>

          {/* Search input */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="Songs, albums, artists..."
              style={{
                width: '100%', padding: '14px 14px 14px 44px',
                background: 'var(--bg-1)', border: '1px solid var(--border)',
                borderRadius: 14, color: 'var(--text)', fontSize: 15,
                outline: 'none', fontFamily: 'DM Sans',
                WebkitAppearance: 'none'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--green)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                width: 22, height: 22, borderRadius: 11, background: 'var(--bg-3)',
                border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>✕</button>
            )}
          </div>

          {/* Type + Search button */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[['track', 'Tracks'], ['album', 'Albums'], ['artist', 'Artists']].map(([val, label]) => (
              <button key={val} onClick={() => setType(val)} style={{
                padding: '9px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                background: type === val ? 'var(--green)' : 'var(--bg-2)',
                color: type === val ? '#000' : 'var(--text-dim)',
                border: '1px solid', borderColor: type === val ? 'var(--green)' : 'var(--border)',
                cursor: 'pointer', transition: 'all 0.15s'
              }}>{label}</button>
            ))}
            <button onClick={search} disabled={loading || !query.trim()} style={{
              marginLeft: 'auto', padding: '9px 20px', borderRadius: 20, fontSize: 13, fontWeight: 700,
              background: 'var(--green)', color: '#000', border: 'none', cursor: 'pointer'
            }}>
              {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Search'}
            </button>
          </div>

          {results.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>🎵</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Find your music</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Search tracks, albums or artists</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((item, i) => (
              <div key={item.uri} style={{
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
                    {item.artist}{item.album && item.type === 'track' ? ` · ${item.album}` : ''}
                    {item.type === 'album' && item.track_count ? ` · ${item.track_count} tracks` : ''}
                  </div>
                </div>
                {item.type === 'artist' ? (
                  <button onClick={() => loadArtist(item)} style={{
                    padding: '8px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: 'var(--bg-2)', color: 'var(--text-dim)', border: '1px solid var(--border)', cursor: 'pointer'
                  }}>View →</button>
                ) : (
                  <button onClick={() => download(item, item.type)} disabled={queued[item.uri] === 'loading' || isDone(item.uri)} style={{
                    width: 42, height: 42, borderRadius: 21, flexShrink: 0,
                    background: isDone(item.uri) ? 'rgba(30,215,96,0.12)' : 'var(--bg-2)',
                    color: isDone(item.uri) ? 'var(--green)' : 'var(--text-dim)',
                    border: `1px solid ${isDone(item.uri) ? 'var(--green-dark)' : 'var(--border)'}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                    transition: 'all 0.15s'
                  }}>
                    {queued[item.uri] === 'loading' ? <div className="spinner" style={{ width: 14, height: 14 }} /> : isDone(item.uri) ? '✓' : '↓'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
