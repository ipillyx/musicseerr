# MusicSeerr

Self-hosted music request app for pilly.uk. Search Spotify, request downloads, get Discord notifications.

## Features
- Register with invite code
- Spotify search (tracks, albums, artists)
- One-click download requests via spotDL
- Live download queue with status
- Discord notifications on complete/fail
- Admin panel — manage users, change invite code
- First registered user becomes admin automatically

## Setup on NixOS

### 1. Copy files to NixOS host
Copy the entire `musicseerr` folder to `/home/shaun/docker/musicseerr/` via WinSCP.

### 2. Create your .env
```bash
cd /home/shaun/docker/musicseerr
cp .env.example .env
nano .env   # or edit via WinSCP/VS Code
```

Fill in:
- `SECRET_KEY` — any random string (e.g. run `openssl rand -hex 32`)
- `INVITE_CODE` — the code you give to family to register
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` — from developer.spotify.com
- `DISCORD_WEBHOOK` — from your Discord server webhooks

### 3. Build and start
```bash
cd /home/shaun/docker/musicseerr
docker compose up -d --build
```

First build takes ~5 minutes (installs ffmpeg, spotDL, Node modules).

### 4. NPM Proxy Host
In Nginx Proxy Manager, add:
- Domain: `music.pilly.uk`
- Forward Hostname: `10.1.1.161`
- Forward Port: `8810`
- WebSockets: enabled
- SSL: Let's Encrypt

### 5. First login
- Go to `https://music.pilly.uk/register`
- Register — first user is automatically admin
- Share your `INVITE_CODE` with family so they can register

## Updating
```bash
cd /home/shaun/docker/musicseerr
docker compose down
docker compose up -d --build
```

## Discord Webhook Setup
1. Open your Discord server
2. Go to a channel > Edit Channel > Integrations > Webhooks
3. Create Webhook, copy URL
4. Paste into `.env` as `DISCORD_WEBHOOK`

Notifications sent:
- 📥 New request queued
- ✅ Download completed
- ❌ Download failed
