import { useState, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
)
const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconBack = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6"/>
  </svg>
)
const IconDisc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
  </svg>
)

function msToTime(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// --- Album Card for Artist View ---
function AlbumCard({ album, onDownload }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(null)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const result = await onDownload(album)
      setStatus('queued')
      if (result.queued) setCount(result.queued)
    } catch {
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const isDone = status === 'queued'

  return (
    <div style={{
      background: 'var(--bg-1)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden', transition: 'all 0.15s',
      display: 'flex', flexDirection: 'column'
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green-dark)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Album art */}
      <div style={{ position: 'relative', paddingTop: '100%', background: 'var(--bg-3)' }}>
        {album.album_art && (
          <img src={album.album_art} alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'
          }} />
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3, marginBottom: 3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {album.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono' }}>
            {album.year} · {album.track_count} tracks
          </div>
        </div>

        {count && (
          <div style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'DM Mono' }}>
            ✓ {count} tracks queued
          </div>
        )}

        <button onClick={handleDownload} disabled={loading || isDone} style={{
          padding: '8px', borderRadius: 6, fontSize: 12, fontWeight: 700,
          background: isDone ? 'var(--green-dark)' : 'var(--bg-3)',
          color: isDone ? 'var(--green)' : 'var(--text)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all 0.15s', marginTop: 'auto', border: '1px solid transparent'
        }}
          onMouseEnter={e => { if (!loading && !isDone) { e.currentTarget.style.background = 'var(--green)'; e.currentTarget.style.color = '#000' } }}
          onMouseLeave={e => { e.currentTarget.style.background = isDone ? 'var(--green-dark)' : 'var(--bg-3)'; e.currentTarget.style.color = isDone ? 'var(--green)' : 'var(--text)' }}
        >
          {loading ? <div className="spinner" style={{ width: 14, height: 14 }} /> :
            isDone ? <><IconCheck /> Queued</> :
            <><IconDownload /> Download Album</>}
        </button>
      </div>
    </div>
  )
}

// --- Artist View ---
function ArtistView({ artist, onBack, authFetch }) {
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState({})

  useState(() => {
    authFetch(`/api/artist-albums?uri=${encodeURIComponent(artist.uri)}`)
      .then(r => r.json())
      .then(d => setAlbums(d.albums || []))
      .catch(() => setAlbums([]))
      .finally(() => setLoading(false))
  }, [artist.uri])

  const handleDownload = async (album) => {
    const res = await authFetch('/api/downloads', {
      method: 'POST',
      body: JSON.stringify({
        uri: album.uri,
        track_name: album.name,
        artist: artist.name,
        album: album.name,
        album_art: album.album_art,
        type: 'album'
      })
    })
    return await res.json()
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: 8, background: 'var(--bg-2)',
          border: '1px solid var(--border)', color: 'var(--text-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', flexShrink: 0
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-3)'; e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-2)'; e.currentTarget.style.color = 'var(--text-dim)' }}
        >
          <IconBack />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {artist.album_art && (
            <img src={artist.album_art} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
          )}
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>{artist.name}</h1>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{albums.length} albums</div>
          </div>
        </div>
      </div>

      {/* Albums grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
          {albums.map(album => (
            <AlbumCard key={album.uri} album={album} onDownload={handleDownload} />
          ))}
        </div>
      )}
    </div>
  )
}

// --- Track / Search Result Card ---
function TrackCard({ item, onDownload, downloadedUris, onArtistClick }) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [queuedCount, setQueuedCount] = useState(null)
  const isDownloaded = downloadedUris.has(item.uri)
  const isAlbum = item.type === 'album'
  const isArtist = item.type === 'artist'

  const handleDownload = async () => {
    setLoading(true)
    try {
      const result = await onDownload(item)
      setStatus(result.status || 'queued')
      if (result.queued) setQueuedCount(result.queued)
    } catch {
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  const isDone = isDownloaded || status === 'completed' || status === 'queued' || status === 'downloading'
  const btnColor = isDone ? 'var(--green-dark)' : status === 'error' ? 'var(--red)' : 'var(--bg-3)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 16px', borderRadius: 8,
      background: 'var(--bg-1)', border: '1px solid var(--border)',
      transition: 'all 0.15s', animation: 'fadeUp 0.3s ease',
      cursor: isArtist ? 'pointer' : 'default'
    }}
      onClick={() => isArtist && onArtistClick(item)}
      onMouseEnter={e => { e.currentTarget.style.borderColor = isArtist ? 'var(--green)' : 'var(--bg-3)'; e.currentTarget.style.background = 'var(--bg-2)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-1)' }}
    >
      {/* Art */}
      <div style={{
        width: 48, height: 48, flexShrink: 0, background: 'var(--bg-3)',
        borderRadius: isArtist ? '50%' : isAlbum ? 4 : 6, overflow: 'hidden'
      }}>
        {item.album_art && <img src={item.album_art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.name}
        </div>
        <div style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 2 }}>
          {isArtist ? (
            <span style={{ color: 'var(--green)', fontSize: 11, fontFamily: 'DM Mono' }}>Click to browse albums →</span>
          ) : (
            <>
              {item.artist}
              {item.album && item.type === 'track' ? ` · ${item.album}` : ''}
              {isAlbum && item.track_count ? ` · ${item.track_count} tracks` : ''}
            </>
          )}
        </div>
        {queuedCount && (
          <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 3, fontFamily: 'DM Mono' }}>
            ✓ {queuedCount} tracks queued
          </div>
        )}
      </div>

      {item.duration_ms && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono', flexShrink: 0 }}>
          {msToTime(item.duration_ms)}
        </div>
      )}

      {/* Type badge */}
      <div style={{
        fontSize: 10, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
        background: isAlbum ? 'rgba(30,215,96,0.1)' : isArtist ? 'rgba(30,215,96,0.05)' : 'var(--bg-3)',
        color: isAlbum || isArtist ? 'var(--green)' : 'var(--text-muted)',
        fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: 0.5,
        display: 'flex', alignItems: 'center', gap: 4
      }}>
        {isAlbum && <IconDisc />}
        {item.type}
      </div>

      {/* Download button - not shown for artists */}
      {!isArtist && (
        <button onClick={e => { e.stopPropagation(); handleDownload() }} disabled={loading || isDone} style={{
          width: isAlbum ? 'auto' : 36, height: 36,
          padding: isAlbum ? '0 12px' : '0',
          borderRadius: 8, flexShrink: 0,
          background: btnColor,
          color: isDone ? 'var(--green)' : 'var(--text)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all 0.15s', fontSize: 12, fontWeight: 600
        }}
          onMouseEnter={e => { if (!loading && !isDone) { e.currentTarget.style.background = 'var(--green)'; e.currentTarget.style.color = '#000' } }}
          onMouseLeave={e => { e.currentTarget.style.background = btnColor; e.currentTarget.style.color = isDone ? 'var(--green)' : 'var(--text)' }}
        >
          {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> :
            isDone ? <IconCheck /> :
            isAlbum ? <><IconDownload /> Album</> :
            <IconDownload />}
        </button>
      )}
    </div>
  )
}

// --- Main Search Page ---
export default function Search() {
  const { authFetch } = useAuth()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('track')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [downloadedUris, setDownloadedUris] = useState(new Set())
  const [selectedArtist, setSelectedArtist] = useState(null)
  const debounceRef = useRef(null)

  const doSearch = useCallback(async (q, t) => {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)
    setSelectedArtist(null)
    try {
      const res = await authFetch(`/api/search?q=${encodeURIComponent(q)}&type=${t}`)
      const data = await res.json()
      setResults(data.results || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  const handleInput = (e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(val, type), 500)
    }
  }

  const handleTypeChange = (t) => {
    setType(t)
    setSelectedArtist(null)
    if (query.trim()) doSearch(query, t)
  }

  const handleDownload = async (item) => {
    const res = await authFetch('/api/downloads', {
      method: 'POST',
      body: JSON.stringify({
        uri: item.uri,
        track_name: item.name,
        artist: item.artist,
        album: item.album || item.name,
        album_art: item.album_art,
        type: item.type
      })
    })
    const data = await res.json()
    setDownloadedUris(prev => new Set([...prev, item.uri]))
    return data
  }

  // If an artist is selected, show artist view
  if (selectedArtist) {
    return (
      <div style={{ padding: '40px 40px', maxWidth: 900 }}>
        <ArtistView
          artist={selectedArtist}
          onBack={() => setSelectedArtist(null)}
          authFetch={authFetch}
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '40px 40px', maxWidth: 800 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', marginBottom: 6 }}>Find Music</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Search Spotify and request downloads to your library</p>
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
          <IconSearch />
        </div>
        <input
          type="text" value={query} onChange={handleInput}
          placeholder="Search for songs, albums, artists..."
          onKeyDown={e => e.key === 'Enter' && doSearch(query, type)}
          style={{
            width: '100%', padding: '16px 16px 16px 48px',
            background: 'var(--bg-1)', border: '1px solid var(--border)',
            borderRadius: 12, color: 'var(--text)', fontSize: 15,
            fontFamily: 'DM Mono', transition: 'border-color 0.15s'
          }}
          onFocus={e => e.target.style.borderColor = 'var(--green)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        {loading && (
          <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
            <div className="spinner" />
          </div>
        )}
      </div>

      {/* Type filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {['track', 'album', 'artist'].map(t => (
          <button key={t} onClick={() => handleTypeChange(t)} style={{
            padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
            background: type === t ? 'var(--green)' : 'var(--bg-2)',
            color: type === t ? '#000' : 'var(--text-dim)',
            border: '1px solid', borderColor: type === t ? 'var(--green)' : 'var(--border)',
            textTransform: 'capitalize', transition: 'all 0.15s'
          }}>
            {t}s
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!searched && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Search for music</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Search tracks, albums or artists</div>
          </div>
        )}
        {searched && !loading && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No results found</div>
          </div>
        )}
        {results.map((item, i) => (
          <div key={item.uri} style={{ animationDelay: `${i * 0.03}s` }}>
            <TrackCard
              item={item}
              onDownload={handleDownload}
              downloadedUris={downloadedUris}
              onArtistClick={setSelectedArtist}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
