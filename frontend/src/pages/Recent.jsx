import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr + 'Z').getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const IconDownload = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
const IconCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>

function DownloadBtn({ onDownload, small }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const isDone = status === 'queued' || status === 'completed' || status === 'downloading' || status === 'Already requested'

  const handle = async () => {
    setLoading(true)
    try { const r = await onDownload(); setStatus(r?.status || r?.message || 'queued') }
    catch { setStatus('error') }
    finally { setLoading(false) }
  }

  return (
    <button onClick={handle} disabled={loading || isDone} style={{
      width: small ? 28 : 'auto', height: small ? 28 : 32,
      padding: small ? 0 : '0 10px',
      borderRadius: 6, flexShrink: 0,
      background: isDone ? 'var(--green-dark)' : 'var(--bg-3)',
      color: isDone ? 'var(--green)' : 'var(--text-dim)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      transition: 'all 0.15s', fontSize: 11, fontWeight: 700
    }}
      onMouseEnter={e => { if (!isDone && !loading) { e.currentTarget.style.background = 'var(--green)'; e.currentTarget.style.color = '#000' } }}
      onMouseLeave={e => { e.currentTarget.style.background = isDone ? 'var(--green-dark)' : 'var(--bg-3)'; e.currentTarget.style.color = isDone ? 'var(--green)' : 'var(--text-dim)' }}
    >
      {loading ? <div className="spinner" style={{ width: 12, height: 12 }} /> : isDone ? <IconCheck /> : small ? <IconDownload /> : <><IconDownload /> Download</>}
    </button>
  )
}

export default function Recent() {
  const { authFetch } = useAuth()
  const [tab, setTab] = useState('recommended')
  const [period, setPeriod] = useState('overall')
  const [recent, setRecent] = useState([])
  const [trending, setTrending] = useState([])
  const [recommendations, setRecommendations] = useState(null)
  const [topTracks, setTopTracks] = useState([])
  const [topArtists, setTopArtists] = useState([])
  const [recentScrobbles, setRecentScrobbles] = useState([])
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const [recRes, trendRes, recsRes, recentScrobRes, tracksRes, artistsRes] = await Promise.all([
          authFetch('/api/recent').then(r => r.json()),
          authFetch('/api/trending').then(r => r.json()),
          authFetch('/api/recommendations').then(r => r.json()),
          authFetch('/api/lastfm/recent').then(r => r.json()),
          authFetch(`/api/lastfm/top-tracks?period=${period}`).then(r => r.json()),
          authFetch(`/api/lastfm/top-artists?period=${period}`).then(r => r.json()),
        ])
        setRecent(recRes.recent || [])
        setTrending(trendRes.trending || [])
        setRecommendations(recsRes)
        setRecentScrobbles(recentScrobRes.tracks || [])
        setTopTracks(tracksRes.tracks || [])
        setTopArtists(artistsRes.artists || [])
      } catch(e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchAll()
  }, [])

  useEffect(() => {
    if (tab !== 'top') return
    const fetchStats = async () => {
      setStatsLoading(true)
      try {
        const [tracksRes, artistsRes] = await Promise.all([
          authFetch(`/api/lastfm/top-tracks?period=${period}`).then(r => r.json()),
          authFetch(`/api/lastfm/top-artists?period=${period}`).then(r => r.json()),
        ])
        setTopTracks(tracksRes.tracks || [])
        setTopArtists(artistsRes.artists || [])
      } catch {}
      finally { setStatsLoading(false) }
    }
    fetchStats()
  }, [period, tab])

  const download = async (track) => {
    // Search Spotify first if no URI
    let uri = track.uri, name = track.name, artist = track.artist, album = track.album, art = track.album_art
    if (!uri) {
      const res = await authFetch(`/api/search?q=${encodeURIComponent((track.artist||'') + ' ' + (track.name||''))}&type=track`)
      const data = await res.json()
      if (!data.results?.length) throw new Error('Not found')
      const t = data.results[0]
      uri = t.uri; name = t.name; artist = t.artist; album = t.album; art = t.album_art
    }
    const res = await authFetch('/api/downloads', {
      method: 'POST',
      body: JSON.stringify({ uri, track_name: name, artist, album, album_art: art, type: 'track' })
    })
    return res.json()
  }

  const tabs = [
    { id: 'recommended', label: '✨ For You' },
    { id: 'scrobbles', label: '🎵 Recent Plays' },
    { id: 'top', label: '📊 Your Stats' },
    { id: 'library', label: '🆕 Library' },
    { id: 'trending', label: '🔥 Trending' },
  ]

  const periods = [
    { value: '7day', label: '7 days' },
    { value: '1month', label: '1 month' },
    { value: '3month', label: '3 months' },
    { value: '6month', label: '6 months' },
    { value: '12month', label: '12 months' },
    { value: 'overall', label: 'All time' },
  ]

  const cardStyle = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px', borderRadius: 8,
    background: 'var(--bg-1)', border: '1px solid var(--border)'
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  return (
    <div style={{ padding: '40px 40px', maxWidth: 950 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px', marginBottom: 6 }}>Discover</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Personalised from your Last.fm history
          {recommendations?.top_artists?.length > 0 && (
            <span style={{ color: 'var(--green)', marginLeft: 8, fontFamily: 'DM Mono', fontSize: 11 }}>
              based on: {recommendations.top_artists.slice(0, 3).join(', ')}
            </span>
          )}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
            background: tab === t.id ? 'var(--green)' : 'var(--bg-2)',
            color: tab === t.id ? '#000' : 'var(--text-dim)',
            border: '1px solid', borderColor: tab === t.id ? 'var(--green)' : 'var(--border)',
            transition: 'all 0.15s'
          }}>{t.label}</button>
        ))}
      </div>

      {/* FOR YOU */}
      {tab === 'recommended' && (
        <div>
          {recommendations?.similar_artists?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Artists similar to your taste:</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {recommendations.similar_artists.map(a => (
                  <span key={a} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(30,215,96,0.08)', color: 'var(--green)', border: '1px solid var(--green-dark)' }}>{a}</span>
                ))}
              </div>
            </div>
          )}
          {recommendations?.recommended?.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 14 }}>
              {recommendations.recommended.map((t, i) => (
                <div key={i} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green-dark)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <div style={{ position: 'relative', paddingTop: '100%', background: 'var(--bg-3)' }}>
                    {t.album_art && <img src={t.album_art} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 700, fontSize: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3, marginBottom: 3 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{t.artist}</div>
                    <DownloadBtn onDownload={() => download(t)} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>No recommendations yet</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Play more music to build your Last.fm history</div>
            </div>
          )}
        </div>
      )}

      {/* RECENT SCROBBLES */}
      {tab === 'scrobbles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {recentScrobbles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📻</div>
              <div>No recent scrobbles found for ipillyx</div>
            </div>
          ) : recentScrobbles.map((t, i) => (
            <div key={i} style={cardStyle}>
              {t.image ? <img src={t.image} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 36, height: 36, borderRadius: 4, background: 'var(--bg-3)', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.now_playing && <span style={{ color: 'var(--green)', fontSize: 10, fontFamily: 'DM Mono', marginRight: 6 }}>▶ NOW</span>}
                  {t.name}
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 2 }}>{t.artist}{t.album ? ` · ${t.album}` : ''}</div>
              </div>
              {t.date && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono', flexShrink: 0 }}>{t.date}</div>}
              <DownloadBtn onDownload={() => download(t)} small />
            </div>
          ))}
        </div>
      )}

      {/* TOP STATS */}
      {tab === 'top' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {periods.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)} style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: period === p.value ? 'var(--green)' : 'var(--bg-2)',
                color: period === p.value ? '#000' : 'var(--text-dim)',
                border: '1px solid', borderColor: period === p.value ? 'var(--green)' : 'var(--border)',
                transition: 'all 0.15s'
              }}>{p.label}</button>
            ))}
          </div>
          {statsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-dim)' }}>Top Tracks</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {topTracks.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data for this period</div> :
                    topTracks.map((t, i) => (
                      <div key={i} style={cardStyle}>
                        {t.image ? <img src={t.image} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 32, height: 32, borderRadius: 4, background: 'var(--bg-3)', flexShrink: 0 }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.artist} · {parseInt(t.playcount).toLocaleString()} plays</div>
                        </div>
                        <DownloadBtn onDownload={() => download(t)} small />
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-dim)' }}>Top Artists</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {topArtists.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No data for this period</div> :
                    topArtists.map((a, i) => (
                      <div key={i} style={cardStyle}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--green-dark), var(--green))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#000', flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono' }}>{parseInt(a.playcount).toLocaleString()} plays</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIBRARY */}
      {tab === 'library' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {recent.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div>
              <div>No downloads yet — request some music!</div>
            </div>
          ) : recent.map((t, i) => (
            <div key={i} style={cardStyle}>
              {t.album_art && <img src={t.album_art} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.track_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{t.artist}{t.album ? ` · ${t.album}` : ''}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono' }}>{timeAgo(t.completed_at)}</div>
                <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 2 }}>by {t.username}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TRENDING */}
      {tab === 'trending' && (
        <div>
          {trending.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔥</div>
              <div>No trending requests yet</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 14 }}>
              {trending.map((t, i) => (
                <div key={i} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ position: 'relative', paddingTop: '100%', background: 'var(--bg-3)' }}>
                    {t.album_art && <img src={t.album_art} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <div style={{ position: 'absolute', top: 8, left: 8, background: 'var(--green)', color: '#000', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 20, fontFamily: 'DM Mono' }}>#{i + 1}</div>
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>{t.track_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{t.artist}</div>
                    <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 4, fontFamily: 'DM Mono' }}>{t.request_count}x requested</div>
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
