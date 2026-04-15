# 🎵 MusicSeerr

A self-hosted music request app — the Overseerr/Jellyseerr of music. Search Spotify, request downloads for your household, and stream via Navidrome or any Subsonic-compatible player.

> Built as a Spotify replacement for home use. Family members search for music, click download, and it automatically appears in your music library.

---

## Features

- 🔍 **Spotify Search** — search tracks, albums and artists by name
- 💿 **Full Album Downloads** — download entire albums in one click
- 🎨 **Artist Browse** — click any artist to browse their full discography
- ⬇️ **Auto Download** — uses yt-dlp with correct Spotify metadata and album art embedded
- 🔄 **Navidrome Auto-Scan** — library scan triggered automatically after each download
- 📊 **Discover Page** — personalised recommendations based on Last.fm listening history
- 🔐 **Invite Code Registration** — users need an invite code to register (like MAM)
- 👑 **Admin Panel** — manage users, daily limits, blacklist artists/tracks
- 🚫 **Blacklist** — block specific artists or tracks from being downloaded
- 📈 **Daily Request Limits** — per-user configurable download limits
- 🔁 **Retry Failed Downloads** — one-click retry on failed tracks
- 🔔 **Discord Notifications** — webhook alerts when downloads complete or fail
- 📱 **PWA Support** — installable on iOS and Android home screen
- 🌙 **Dark Green Theme** — clean dark UI

---

## Requirements

- Docker and Docker Compose
- A **Spotify Developer** account (free) — for searching music
- A music folder accessible to the container
- Optionally: Navidrome for streaming, Last.fm for recommendations

---

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/ipillyx/musicseerr.git
cd musicseerr
```

### 2. Create your `.env` file

```bash
cp .env.example .env
nano .env
```

### 3. Fill in your `.env`

```env
# Required
SECRET_KEY=your-random-secret-key
INVITE_CODE=YOURCODE
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
MUSICSEERR_PORT=8810

# Optional — Discord notifications
DISCORD_WEBHOOK=https://discord.com/api/webhooks/your/webhook

# Optional — Navidrome auto-scan after downloads
NAVIDROME_URL=http://your-navidrome-ip:4533
NAVIDROME_USER=admin
NAVIDROME_PASS=your-navidrome-password

# Optional — Last.fm personalised recommendations
LASTFM_API_KEY=your-lastfm-api-key
LASTFM_USER=your-lastfm-username

# Optional — daily request limit per user (default: 50)
MAX_DAILY_REQUESTS=50
```

### 4. Set your music folder path

Edit `docker-compose.yml` and update the music volume to point to your music folder:

```yaml
volumes:
  - musicseerr-data:/data
  - /path/to/your/music:/music    # ← change this
```

### 5. Build and start

```bash
docker compose up -d --build
```

First build takes around 5 minutes — it installs ffmpeg, yt-dlp and all dependencies.

### 6. Open in your browser

```
http://your-server-ip:8810
```

- Go to `/register` and create your account — **first registered user is automatically admin**
- Share your `INVITE_CODE` with family/household so they can register

---

## Spotify API Setup

MusicSeerr needs a Spotify API key to search for music. It is free and takes 2 minutes:

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Click **Create App**
3. Fill in any name, set the redirect URI to `http://localhost`
4. Copy your **Client ID** and **Client Secret** into `.env`

---

## Navidrome Integration

When `NAVIDROME_URL`, `NAVIDROME_USER` and `NAVIDROME_PASS` are set, MusicSeerr will automatically trigger a Navidrome library scan after each successful download so tracks appear in your player immediately without needing a manual scan.

---

## Last.fm Recommendations

Set `LASTFM_API_KEY` and `LASTFM_USER` to unlock the **Discover** page:

| Tab | Description |
|-----|-------------|
| ✨ For You | Tracks from similar artists based on your Last.fm listening history |
| 🎵 Recent Plays | Your recent scrobble history |
| 📊 Your Stats | Top tracks and artists by time period (7 days → all time) |
| 🆕 Library | Recently downloaded to your library |
| 🔥 Trending | Most requested tracks across all users |

Get a free Last.fm API key at [last.fm/api/account/create](https://www.last.fm/api/account/create).

---

## File Organisation

Downloads are saved as:

```
/music/Artist Name/Album Name/Track Name.mp3
```

Metadata (title, artist, album, artwork) is embedded using Spotify data so your library is correctly tagged.

---

## Admin Features

| Feature | Description |
|---------|-------------|
| User management | View and remove users |
| Daily limits | Set per-user daily download limits |
| Blacklist | Block artists or track names from being downloaded |
| Clear history | Bulk delete completed/failed download history |
| Navidrome scan | Manually trigger a library scan |
| Invite code | Change the registration invite code |

---

## Reverse Proxy

To expose MusicSeerr publicly (e.g. `music.yourdomain.com`), add a proxy host in Nginx Proxy Manager or Traefik pointing to port `8810`. Enable WebSocket support.

---

## Updating

```bash
git pull
docker compose down
docker compose up -d --build
```

---

## Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI + SQLite |
| Frontend | React + Vite |
| Downloads | yt-dlp |
| Metadata | Spotify API + mutagen |
| Recommendations | Last.fm API |
| Deployment | Docker Compose |

---

## Contributing

PRs and issues welcome!

---

## License

MIT
