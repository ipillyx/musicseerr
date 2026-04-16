from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import sqlite3, os, jwt, bcrypt, subprocess, threading, queue, glob, httpx
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
try:
    from ytmusicapi import YTMusic
    ytmusic = YTMusic()
except:
    ytmusic = None

DB_PATH = "/data/musicseerr.db"
SECRET_KEY = os.getenv("SECRET_KEY", "changeme-secret-key")
ALGORITHM = "HS256"
INVITE_CODE = os.getenv("INVITE_CODE", "PILLY2025")
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")
DISCORD_WEBHOOK = os.getenv("DISCORD_WEBHOOK", "")
MUSIC_PATH = os.getenv("MUSIC_PATH", "/music")
NAVIDROME_URL = os.getenv("NAVIDROME_URL", "http://navidrome:4533")
NAVIDROME_USER = os.getenv("NAVIDROME_USER", "")
NAVIDROME_PASS = os.getenv("NAVIDROME_PASS", "")
MAX_DAILY_REQUESTS = int(os.getenv("MAX_DAILY_REQUESTS", "50"))

download_queue = queue.Queue()

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            daily_limit INTEGER DEFAULT 50,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS downloads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            spotify_uri TEXT NOT NULL,
            track_name TEXT NOT NULL,
            artist TEXT NOT NULL,
            album TEXT,
            album_art TEXT,
            status TEXT DEFAULT 'queued',
            error_msg TEXT,
            requested_at TEXT DEFAULT (datetime('now')),
            completed_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );
        CREATE TABLE IF NOT EXISTS blacklist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            value TEXT NOT NULL,
            added_by INTEGER,
            added_at TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('invite_code', ?)", (INVITE_CODE,))
    conn.commit()
    conn.close()

def get_spotify():
    return spotipy.Spotify(auth_manager=SpotifyClientCredentials(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET
    ))

def send_discord(message: str):
    if not DISCORD_WEBHOOK:
        return
    try:
        httpx.post(DISCORD_WEBHOOK, json={"content": message}, timeout=5)
    except:
        pass

def trigger_navidrome_scan():
    if not NAVIDROME_URL or not NAVIDROME_USER or not NAVIDROME_PASS:
        return
    try:
        import hashlib, secrets
        salt = secrets.token_hex(6)
        token = hashlib.md5((NAVIDROME_PASS + salt).encode()).hexdigest()
        url = f"{NAVIDROME_URL}/rest/startScan"
        params = {"u": NAVIDROME_USER, "t": token, "s": salt, "v": "1.8.0", "c": "MusicSeerr", "f": "json"}
        httpx.get(url, params=params, timeout=5)
        print("[NAVIDROME] Scan triggered", flush=True)
    except Exception as e:
        print(f"[NAVIDROME] Scan failed: {e}", flush=True)

def fix_metadata(filepath, title, artist, album, album_art_url=None):
    try:
        from mutagen.id3 import ID3, TIT2, TPE1, TALB, APIC
        from mutagen.mp3 import MP3
        import urllib.request
        audio = MP3(filepath, ID3=ID3)
        try:
            audio.add_tags()
        except:
            pass
        audio.tags["TIT2"] = TIT2(encoding=3, text=title)
        audio.tags["TPE1"] = TPE1(encoding=3, text=artist)
        audio.tags["TALB"] = TALB(encoding=3, text=album)
        if album_art_url:
            try:
                with urllib.request.urlopen(album_art_url, timeout=10) as r:
                    img_data = r.read()
                audio.tags["APIC"] = APIC(encoding=3, mime="image/jpeg", type=3, desc="Cover", data=img_data)
            except Exception as e:
                print(f"[META] Art failed: {e}", flush=True)
        audio.save()
        print(f"[META] Fixed: {title} - {artist} - {album}", flush=True)
    except Exception as e:
        print(f"[META] Failed: {e}", flush=True)

def get_daily_count(conn, user_id):
    row = conn.execute(
        "SELECT COUNT(*) as c FROM downloads WHERE user_id = ? AND date(requested_at) = date('now')",
        (user_id,)
    ).fetchone()
    return row["c"]

def is_blacklisted(conn, track_name, artist):
    rows = conn.execute("SELECT value, type FROM blacklist").fetchall()
    for row in rows:
        if row["type"] == "track" and row["value"].lower() in track_name.lower():
            return True
        if row["type"] == "artist" and row["value"].lower() in artist.lower():
            return True
    return False

def process_download_queue():
    while True:
        download_id = download_queue.get()
        conn = get_db()
        try:
            row = conn.execute("SELECT * FROM downloads WHERE id = ?", (download_id,)).fetchone()
            if not row:
                continue
            conn.execute("UPDATE downloads SET status = 'downloading' WHERE id = ?", (download_id,))
            conn.commit()

            artist_folder = row["artist"] if row["artist"] else "Unknown"
            album_folder = row["album"] if row["album"] else "Unknown"
            dest_dir = MUSIC_PATH + "/" + artist_folder + "/" + album_folder
            output_template = dest_dir + "/%(title)s.%(ext)s"
            # Use direct URL for YouTube Music results, search for Spotify results
            uri = row["spotify_uri"]
            if uri.startswith("https://www.youtube.com/") or uri.startswith("https://youtu.be/"):
                search_query = uri
            else:
                search_query = "ytsearch1:" + row["artist"] + " - " + row["track_name"]

            os.makedirs(dest_dir, exist_ok=True)

            cmd = [
                "yt-dlp", "-x", "--audio-format", "mp3", "--audio-quality", "0",
                "--output", output_template, "--no-embed-metadata", "--write-thumbnail",
                search_query
            ]
            print(f"[YTDLP] Downloading: {row['artist']} - {row['track_name']}", flush=True)

            result = subprocess.run(cmd, capture_output=False, text=True, timeout=300, cwd=MUSIC_PATH)
            print(f"[YTDLP] Return code: {result.returncode}", flush=True)

            if result.returncode == 0:
                mp3_files = glob.glob(dest_dir + "/*.mp3")
                if mp3_files:
                    latest_mp3 = max(mp3_files, key=os.path.getmtime)
                    clean_name = dest_dir + "/" + row["track_name"].replace("/", "-") + ".mp3"
                    if latest_mp3 != clean_name:
                        os.rename(latest_mp3, clean_name)
                    fix_metadata(clean_name, title=row["track_name"], artist=row["artist"],
                                album=row["album"] or row["track_name"], album_art_url=row["album_art"])
                    for thumb in glob.glob(dest_dir + "/*.webp") + glob.glob(dest_dir + "/*.jpg"):
                        try:
                            os.remove(thumb)
                        except:
                            pass

                conn.execute(
                    "UPDATE downloads SET status = 'completed', completed_at = datetime('now') WHERE id = ?",
                    (download_id,)
                )
                conn.commit()
                send_discord(f"🎵 **Downloaded:** {row['artist']} — {row['track_name']}\n> Requested by user #{row['user_id']}")
                # Trigger Navidrome rescan after successful download
                threading.Thread(target=trigger_navidrome_scan, daemon=True).start()
            else:
                error = f"yt-dlp exited with code {result.returncode}"
                conn.execute("UPDATE downloads SET status = 'failed', error_msg = ? WHERE id = ?", (error, download_id))
                conn.commit()
                send_discord(f"❌ **Failed:** {row['artist']} — {row['track_name']}\n> {error}")

        except subprocess.TimeoutExpired:
            conn.execute("UPDATE downloads SET status = 'failed', error_msg = 'Timeout' WHERE id = ?", (download_id,))
            conn.commit()
        except Exception as e:
            print(f"[YTDLP] Exception: {e}", flush=True)
            conn.execute("UPDATE downloads SET status = 'failed', error_msg = ? WHERE id = ?", (str(e)[:500], download_id))
            conn.commit()
        finally:
            conn.close()
            download_queue.task_done()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    # Recover any queued downloads from previous sessions
    conn = get_db()
    pending = conn.execute("SELECT id FROM downloads WHERE status = 'queued'").fetchall()
    conn.close()
    for row in pending:
        download_queue.put(row['id'])
    print(f'[STARTUP] Recovered {len(pending)} queued downloads', flush=True)
    worker = threading.Thread(target=process_download_queue, daemon=True)
    worker.start()
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
security = HTTPBearer()

class RegisterRequest(BaseModel):
    username: str
    password: str
    invite_code: str

class LoginRequest(BaseModel):
    username: str
    password: str

def create_token(user_id: int, is_admin: bool):
    payload = {"sub": str(user_id), "admin": is_admin, "exp": datetime.utcnow() + timedelta(days=30)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return {"id": int(payload["sub"]), "is_admin": payload.get("admin", False)}
    except:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    conn = get_db()
    row = conn.execute("SELECT value FROM settings WHERE key = 'invite_code'").fetchone()
    if not row or row["value"] != req.invite_code:
        raise HTTPException(status_code=400, detail="Invalid invite code")
    hashed = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    try:
        count = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
        is_admin = 1 if count == 0 else 0
        conn.execute("INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)", (req.username, hashed, is_admin))
        conn.commit()
        user_id = conn.execute("SELECT id FROM users WHERE username = ?", (req.username,)).fetchone()["id"]
        return {"token": create_token(user_id, bool(is_admin)), "username": req.username, "is_admin": bool(is_admin)}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username already taken")
    finally:
        conn.close()

@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE username = ?", (req.username,)).fetchone()
    conn.close()
    if not user or not bcrypt.checkpw(req.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": create_token(user["id"], bool(user["is_admin"])), "username": user["username"], "is_admin": bool(user["is_admin"])}

@app.get("/api/auth/me")
def me(user=Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT username, is_admin, daily_limit, created_at FROM users WHERE id = ?", (user["id"],)).fetchone()
    conn.close()
    return dict(row)

@app.get("/api/search")
def search(q: str, type: str = "track", user=Depends(get_current_user)):
    sp = get_spotify()
    results = sp.search(q=q, type=type, limit=20)
    items = []
    if type == "track":
        for t in results["tracks"]["items"]:
            items.append({
                "uri": t["uri"], "name": t["name"],
                "artist": ", ".join(a["name"] for a in t["artists"]),
                "album": t["album"]["name"],
                "album_art": t["album"]["images"][0]["url"] if t["album"]["images"] else None,
                "duration_ms": t["duration_ms"], "type": "track"
            })
    elif type == "album":
        for a in results["albums"]["items"]:
            items.append({
                "uri": a["uri"], "name": a["name"],
                "artist": ", ".join(art["name"] for art in a["artists"]),
                "album": a["name"],
                "album_art": a["images"][0]["url"] if a["images"] else None,
                "track_count": a.get("total_tracks", 0), "type": "album"
            })
    elif type == "artist":
        for a in results["artists"]["items"]:
            items.append({
                "uri": a["uri"], "name": a["name"], "artist": a["name"], "album": None,
                "album_art": a["images"][0]["url"] if a["images"] else None, "type": "artist"
            })
    return {"results": items}

@app.get("/api/artist-albums")
def get_artist_albums(uri: str, user=Depends(get_current_user)):
    sp = get_spotify()
    artist_id = uri.split(":")[-1]
    albums = []
    results = sp.artist_albums(artist_id, album_type="album,single", limit=50)
    seen = set()
    for a in results["items"]:
        if a["name"] in seen:
            continue
        seen.add(a["name"])
        albums.append({
            "uri": a["uri"], "name": a["name"],
            "artist": ", ".join(art["name"] for art in a["artists"]),
            "album_art": a["images"][0]["url"] if a["images"] else None,
            "track_count": a.get("total_tracks", 0),
            "year": a.get("release_date", "")[:4], "type": "album"
        })
    albums.sort(key=lambda x: x["year"], reverse=True)
    return {"albums": albums}

class DownloadRequest(BaseModel):
    uri: str
    track_name: str
    artist: str
    album: Optional[str] = None
    album_art: Optional[str] = None
    type: Optional[str] = "track"

@app.post("/api/downloads")
def request_download(req: DownloadRequest, user=Depends(get_current_user)):
    conn = get_db()

    # Check blacklist
    if is_blacklisted(conn, req.track_name, req.artist):
        conn.close()
        raise HTTPException(status_code=403, detail="This track or artist has been blacklisted")

    # Album handling
    if req.type == "album" or req.uri.startswith("spotify:album:"):
        sp = get_spotify()
        try:
            album_id = req.uri.split(":")[-1]
            tracks = []
            results = sp.album_tracks(album_id, limit=50)
            tracks.extend(results["items"])
            while results["next"]:
                results = sp.next(results)
                tracks.extend(results["items"])

            queued_ids = []
            for track in tracks:
                if is_blacklisted(conn, track["name"], ", ".join(a["name"] for a in track["artists"])):
                    continue
                existing = conn.execute(
                    "SELECT id FROM downloads WHERE spotify_uri = ? AND status IN ('queued','downloading','completed')",
                    (track["uri"],)
                ).fetchone()
                if existing:
                    continue
                cursor = conn.execute(
                    "INSERT INTO downloads (user_id, spotify_uri, track_name, artist, album, album_art) VALUES (?, ?, ?, ?, ?, ?)",
                    (user["id"], track["uri"], track["name"], ", ".join(a["name"] for a in track["artists"]), req.album, req.album_art)
                )
                conn.commit()
                queued_ids.append(cursor.lastrowid)

            for did in queued_ids:
                download_queue.put(did)

            conn.close()
            send_discord(f"💿 **Album Requested:** {req.artist} — {req.album} ({len(queued_ids)} tracks)\n> Queued for download")
            return {"message": f"Queued {len(queued_ids)} tracks", "queued": len(queued_ids), "status": "queued"}
        except Exception as e:
            conn.close()
            raise HTTPException(status_code=500, detail=f"Failed to fetch album: {str(e)}")

    # Check daily limit
    daily_count = get_daily_count(conn, user["id"])
    user_row = conn.execute("SELECT daily_limit FROM users WHERE id = ?", (user["id"],)).fetchone()
    limit = user_row["daily_limit"] if user_row else MAX_DAILY_REQUESTS
    if daily_count >= limit and not user["is_admin"]:
        conn.close()
        raise HTTPException(status_code=429, detail=f"Daily limit of {limit} requests reached. Try again tomorrow.")

    # Check if already requested
    existing = conn.execute(
        "SELECT * FROM downloads WHERE spotify_uri = ? AND status IN ('queued', 'downloading', 'completed')",
        (req.uri,)
    ).fetchone()
    if existing:
        conn.close()
        return {"message": "Already requested", "id": existing["id"], "status": existing["status"]}

    cursor = conn.execute(
        "INSERT INTO downloads (user_id, spotify_uri, track_name, artist, album, album_art) VALUES (?, ?, ?, ?, ?, ?)",
        (user["id"], req.uri, req.track_name, req.artist, req.album, req.album_art)
    )
    conn.commit()
    download_id = cursor.lastrowid
    conn.close()
    download_queue.put(download_id)
    send_discord(f"📥 **New Request:** {req.artist} — {req.track_name}\n> Requested by {user['id']}")
    return {"message": "Queued", "id": download_id, "status": "queued"}

@app.post("/api/downloads/{download_id}/retry")
def retry_download(download_id: int, user=Depends(get_current_user)):
    conn = get_db()
    row = conn.execute("SELECT * FROM downloads WHERE id = ?", (download_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Download not found")
    if not user["is_admin"] and row["user_id"] != user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Not your download")
    if row["status"] != "failed":
        conn.close()
        raise HTTPException(status_code=400, detail="Can only retry failed downloads")
    conn.execute("UPDATE downloads SET status = 'queued', error_msg = NULL WHERE id = ?", (download_id,))
    conn.commit()
    conn.close()
    download_queue.put(download_id)
    return {"message": "Retrying", "id": download_id}

@app.get("/api/downloads")
def get_downloads(user=Depends(get_current_user)):
    conn = get_db()
    if user["is_admin"]:
        rows = conn.execute("""
            SELECT d.*, u.username FROM downloads d
            JOIN users u ON d.user_id = u.id
            ORDER BY d.requested_at DESC LIMIT 200
        """).fetchall()
    else:
        rows = conn.execute("""
            SELECT d.*, u.username FROM downloads d
            JOIN users u ON d.user_id = u.id
            WHERE d.user_id = ?
            ORDER BY d.requested_at DESC LIMIT 200
        """, (user["id"],)).fetchall()
    conn.close()
    return {"downloads": [dict(r) for r in rows]}

@app.delete("/api/downloads")
def clear_downloads(user=Depends(get_current_user)):
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    conn = get_db()
    conn.execute("DELETE FROM downloads WHERE status IN ('completed', 'failed')")
    conn.commit()
    conn.close()
    return {"message": "Cleared completed and failed downloads"}

@app.get("/api/downloads/queue")
def get_queue(user=Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute("SELECT COUNT(*) as c FROM downloads WHERE status IN ('queued', 'downloading')").fetchone()
    conn.close()
    return {"queue_size": rows["c"]}

@app.get("/api/downloads/daily")
def get_daily_usage(user=Depends(get_current_user)):
    conn = get_db()
    count = get_daily_count(conn, user["id"])
    user_row = conn.execute("SELECT daily_limit FROM users WHERE id = ?", (user["id"],)).fetchone()
    limit = user_row["daily_limit"] if user_row else MAX_DAILY_REQUESTS
    conn.close()
    return {"used": count, "limit": limit, "remaining": max(0, limit - count)}

@app.get("/api/recent")
def get_recent(user=Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute("""
        SELECT d.track_name, d.artist, d.album, d.album_art, d.completed_at, u.username
        FROM downloads d JOIN users u ON d.user_id = u.id
        WHERE d.status = 'completed'
        ORDER BY d.completed_at DESC LIMIT 20
    """).fetchall()
    conn.close()
    return {"recent": [dict(r) for r in rows]}

@app.get("/api/trending")
def get_trending(user=Depends(get_current_user)):
    conn = get_db()
    rows = conn.execute("""
        SELECT track_name, artist, album_art, COUNT(*) as request_count
        FROM downloads
        GROUP BY spotify_uri
        ORDER BY request_count DESC LIMIT 10
    """).fetchall()
    conn.close()
    return {"trending": [dict(r) for r in rows]}

@app.get("/api/stats")
def get_stats(user=Depends(get_current_user)):
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) as c FROM downloads").fetchone()["c"]
    completed = conn.execute("SELECT COUNT(*) as c FROM downloads WHERE status = 'completed'").fetchone()["c"]
    failed = conn.execute("SELECT COUNT(*) as c FROM downloads WHERE status = 'failed'").fetchone()["c"]
    queued = conn.execute("SELECT COUNT(*) as c FROM downloads WHERE status IN ('queued', 'downloading')").fetchone()["c"]
    user_stats = conn.execute("""
        SELECT u.username, COUNT(*) as total
        FROM downloads d JOIN users u ON d.user_id = u.id
        GROUP BY d.user_id ORDER BY total DESC
    """).fetchall()
    conn.close()
    return {"total": total, "completed": completed, "failed": failed, "queued": queued,
            "user_stats": [dict(r) for r in user_stats]}

# --- Admin ---
@app.get("/api/admin/users")
def get_users(user=Depends(get_current_user)):
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    conn = get_db()
    rows = conn.execute("SELECT id, username, is_admin, daily_limit, created_at FROM users").fetchall()
    conn.close()
    return {"users": [dict(r) for r in rows]}

@app.delete("/api/admin/users/{user_id}")
def delete_user(user_id: int, user=Depends(get_current_user)):
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    conn = get_db()
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "Deleted"}

class UserLimitRequest(BaseModel):
    daily_limit: int

@app.put("/api/admin/users/{user_id}/limit")
def set_user_limit(user_id: int, req: UserLimitRequest, user=Depends(get_current_user)):
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    conn = get_db()
    conn.execute("UPDATE users SET daily_limit = ? WHERE id = ?", (req.daily_limit, user_id))
    conn.commit()
    conn.close()
    return {"message": "Limit updated"}

@app.get("/api/admin/settings")
def get_settings(user=Depends(get_current_user)):
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    conn = get_db()
    row = conn.execute("SELECT value FROM settings WHERE key = 'invite_code'").fetchone()
    conn.close()
    return {"invite_code": row["value"] if row else INVITE_CODE}

class SettingsRequest(BaseModel):
    invite_code: str

@app.put("/api/admin/settings")
def update_settings(req: SettingsRequest, user=Depends(get_current_user)):
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    conn = get_db()
    conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('invite_code', ?)", (req.invite_code,))
    conn.commit()
    conn.close()
    return {"message": "Updated"}

# --- Blacklist ---
class BlacklistRequest(BaseModel):
    type: str  # 'track' or 'artist'
    value: str

@app.get("/api/admin/blacklist")
def get_blacklist(user=Depends(get_current_user)):
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    conn = get_db()
    rows = conn.execute("SELECT * FROM blacklist ORDER BY added_at DESC").fetchall()
    conn.close()
    return {"blacklist": [dict(r) for r in rows]}

@app.post("/api/admin/blacklist")
def add_blacklist(req: BlacklistRequest, user=Depends(get_current_user)):
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    conn = get_db()
    conn.execute("INSERT INTO blacklist (type, value, added_by) VALUES (?, ?, ?)", (req.type, req.value, user["id"]))
    conn.commit()
    conn.close()
    return {"message": "Added to blacklist"}

@app.delete("/api/admin/blacklist/{item_id}")
def remove_blacklist(item_id: int, user=Depends(get_current_user)):
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    conn = get_db()
    conn.execute("DELETE FROM blacklist WHERE id = ?", (item_id,))
    conn.commit()
    conn.close()
    return {"message": "Removed"}

@app.post("/api/admin/scan")
def manual_scan(user=Depends(get_current_user)):
    if not user["is_admin"]:
        raise HTTPException(status_code=403, detail="Admin only")
    threading.Thread(target=trigger_navidrome_scan, daemon=True).start()
    return {"message": "Navidrome scan triggered"}




# --- YouTube Music Search ---
@app.get("/api/search/ytmusic")
def search_ytmusic(q: str, user=Depends(get_current_user)):
    if not ytmusic:
        raise HTTPException(status_code=503, detail="YouTube Music not available")
    try:
        results = ytmusic.search(q, limit=20)
        items = []
        for r in results:
            if r.get("resultType") not in ("song", "video"):
                continue
            video_id = r.get("videoId")
            if not video_id:
                continue
            thumbnails = r.get("thumbnails", [])
            thumb = thumbnails[-1]["url"] if thumbnails else None
            artists = r.get("artists", [])
            artist = ", ".join(a["name"] for a in artists) if artists else "Unknown"
            album = r.get("album", {})
            album_name = album.get("name", "") if album else ""
            duration = r.get("duration", "")
            items.append({
                "uri": f"https://www.youtube.com/watch?v={video_id}",
                "video_id": video_id,
                "name": r.get("title", "Unknown"),
                "artist": artist,
                "album": album_name,
                "album_art": thumb,
                "duration": duration,
                "type": "ytmusic"
            })
        return {"results": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# --- SoundCloud Search ---
@app.get("/api/search/soundcloud")
def search_soundcloud(q: str, user=Depends(get_current_user)):
    try:
        # Use yt-dlp to search SoundCloud
        import subprocess, json
        cmd = [
            "yt-dlp", "--dump-json", "--no-download",
            "--flat-playlist", f"scsearch10:{q}"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        items = []
        for line in result.stdout.strip().split("\n"):
            if not line.strip():
                continue
            try:
                r = json.loads(line)
                items.append({
                    "uri": r.get("url") or r.get("webpage_url", ""),
                    "video_id": r.get("id", ""),
                    "name": r.get("title", "Unknown"),
                    "artist": r.get("uploader", "Unknown"),
                    "album": "",
                    "album_art": r.get("thumbnail", None),
                    "duration": str(int(r.get("duration", 0) or 0) // 60) + ":" + str(int(r.get("duration", 0) or 0) % 60).zfill(2) if r.get("duration") else "",
                    "type": "soundcloud"
                })
            except:
                continue
        return {"results": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# --- Playlist Import ---
class PlaylistImportRequest(BaseModel):
    url: str

@app.post("/api/playlists/fetch")
def fetch_playlist(req: PlaylistImportRequest, user=Depends(get_current_user)):
    """Fetch tracks from a Spotify or YouTube playlist URL without downloading."""
    url = req.url.strip()
    tracks = []

    # Detect Spotify playlist
    if "spotify.com/playlist/" in url:
        try:
            sp = get_spotify()
            playlist_id = url.split("playlist/")[1].split("?")[0]
            result = sp.playlist(playlist_id)
            playlist_name = result["name"]
            items = result["tracks"]["items"]
            next_url = result["tracks"]["next"]
            while next_url:
                more = sp.next(result["tracks"])
                items.extend(more["items"])
                next_url = more["next"]
                result["tracks"] = more
            for item in items:
                t = item.get("track")
                if not t or not t.get("uri"):
                    continue
                tracks.append({
                    "uri": t["uri"],
                    "name": t["name"],
                    "artist": ", ".join(a["name"] for a in t["artists"]),
                    "album": t["album"]["name"],
                    "album_art": t["album"]["images"][0]["url"] if t["album"]["images"] else None,
                    "source": "spotify"
                })
            return {"playlist_name": playlist_name, "tracks": tracks, "source": "spotify"}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Spotify error: {str(e)}")

    # Detect YouTube playlist
    elif "youtube.com/playlist" in url or "list=" in url:
        try:
            import subprocess, json
            cmd = ["yt-dlp", "--dump-json", "--no-download", "--flat-playlist", url]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            playlist_name = "YouTube Playlist"
            for line in result.stdout.strip().split("\n"):
                if not line.strip():
                    continue
                try:
                    r = json.loads(line)
                    if r.get("_type") == "playlist":
                        playlist_name = r.get("title", playlist_name)
                        continue
                    video_id = r.get("id", "")
                    thumbnails = r.get("thumbnails", [])
                    thumb = thumbnails[-1]["url"] if thumbnails else None
                    duration_secs = r.get("duration") or 0
                    duration = f"{int(duration_secs)//60}:{str(int(duration_secs)%60).zfill(2)}" if duration_secs else ""
                    tracks.append({
                        "uri": f"https://www.youtube.com/watch?v={video_id}",
                        "name": r.get("title", "Unknown"),
                        "artist": r.get("uploader", r.get("channel", "Unknown")),
                        "album": playlist_name,
                        "album_art": thumb,
                        "duration": duration,
                        "source": "youtube"
                    })
                except:
                    continue
            return {"playlist_name": playlist_name, "tracks": tracks, "source": "youtube"}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"YouTube error: {str(e)}")

    else:
        raise HTTPException(status_code=400, detail="Unsupported URL. Please use a Spotify or YouTube playlist URL.")

@app.post("/api/playlists/download")
def download_playlist(req: PlaylistImportRequest, user=Depends(get_current_user)):
    """Fetch and immediately queue all tracks from a playlist."""
    url = req.url.strip()
    conn = get_db()

    # Check daily limit
    if not user["is_admin"]:
        user_row = conn.execute("SELECT daily_limit FROM users WHERE id = ?", (user["id"],)).fetchone()
        limit = user_row["daily_limit"] if user_row else MAX_DAILY_REQUESTS
        daily_count = get_daily_count(conn, user["id"])
        if daily_count >= limit:
            conn.close()
            raise HTTPException(status_code=429, detail=f"Daily limit of {limit} reached.")

    queued = 0
    skipped = 0

    if "spotify.com/playlist/" in url:
        try:
            sp = get_spotify()
            playlist_id = url.split("playlist/")[1].split("?")[0]
            result = sp.playlist(playlist_id)
            playlist_name = result["name"]
            items = result["tracks"]["items"]
            next_url = result["tracks"]["next"]
            while next_url:
                more = sp.next(result["tracks"])
                items.extend(more["items"])
                next_url = more["next"]
                result["tracks"] = more
            for item in items:
                t = item.get("track")
                if not t or not t.get("uri"):
                    continue
                if is_blacklisted(conn, t["name"], ", ".join(a["name"] for a in t["artists"])):
                    continue
                existing = conn.execute(
                    "SELECT id FROM downloads WHERE spotify_uri = ? AND status IN ('queued','downloading','completed')",
                    (t["uri"],)
                ).fetchone()
                if existing:
                    skipped += 1
                    continue
                album_art = t["album"]["images"][0]["url"] if t["album"]["images"] else None
                cursor = conn.execute(
                    "INSERT INTO downloads (user_id, spotify_uri, track_name, artist, album, album_art) VALUES (?,?,?,?,?,?)",
                    (user["id"], t["uri"], t["name"], ", ".join(a["name"] for a in t["artists"]), t["album"]["name"], album_art)
                )
                conn.commit()
                download_queue.put(cursor.lastrowid)
                queued += 1
            conn.close()
            send_discord(f"📋 **Playlist Import:** {playlist_name} ({queued} tracks queued, {skipped} skipped)")
            return {"message": f"Queued {queued} tracks", "queued": queued, "skipped": skipped, "playlist_name": playlist_name}
        except Exception as e:
            conn.close()
            raise HTTPException(status_code=400, detail=str(e))

    elif "youtube.com/playlist" in url or "list=" in url:
        try:
            import subprocess, json
            cmd = ["yt-dlp", "--dump-json", "--no-download", "--flat-playlist", url]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            playlist_name = "YouTube Playlist"
            for line in result.stdout.strip().split("\n"):
                if not line.strip():
                    continue
                try:
                    r = json.loads(line)
                    if r.get("_type") == "playlist":
                        playlist_name = r.get("title", playlist_name)
                        continue
                    video_id = r.get("id", "")
                    yt_url = f"https://www.youtube.com/watch?v={video_id}"
                    existing = conn.execute(
                        "SELECT id FROM downloads WHERE spotify_uri = ? AND status IN ('queued','downloading','completed')",
                        (yt_url,)
                    ).fetchone()
                    if existing:
                        skipped += 1
                        continue
                    thumbnails = r.get("thumbnails", [])
                    thumb = thumbnails[-1]["url"] if thumbnails else None
                    title = r.get("title", "Unknown")
                    uploader = r.get("uploader", r.get("channel", "Unknown"))
                    cursor = conn.execute(
                        "INSERT INTO downloads (user_id, spotify_uri, track_name, artist, album, album_art) VALUES (?,?,?,?,?,?)",
                        (user["id"], yt_url, title, uploader, playlist_name, thumb)
                    )
                    conn.commit()
                    download_queue.put(cursor.lastrowid)
                    queued += 1
                except:
                    continue
            conn.close()
            send_discord(f"📋 **YouTube Playlist:** {playlist_name} ({queued} tracks queued, {skipped} skipped)")
            return {"message": f"Queued {queued} tracks", "queued": queued, "skipped": skipped, "playlist_name": playlist_name}
        except Exception as e:
            conn.close()
            raise HTTPException(status_code=400, detail=str(e))

    else:
        conn.close()
        raise HTTPException(status_code=400, detail="Unsupported URL.")

# --- Last.fm Recommendations ---
LASTFM_API_KEY = os.getenv("LASTFM_API_KEY", "")
LASTFM_USER = os.getenv("LASTFM_USER", "")
LASTFM_BASE = "http://ws.audioscrobbler.com/2.0/"

def lastfm_get(method, params={}):
    try:
        r = httpx.get(LASTFM_BASE, params={
            "method": method,
            "api_key": LASTFM_API_KEY,
            "format": "json",
            "limit": 10,
            **params
        }, timeout=10)
        return r.json()
    except Exception as e:
        print(f"[LASTFM] Error: {e}", flush=True)
        return {}

@app.get("/api/recommendations")
def get_recommendations(user=Depends(get_current_user)):
    if not LASTFM_API_KEY:
        raise HTTPException(status_code=400, detail="Last.fm API key not configured")

    sp = get_spotify()

    # 1. Get user's top artists from Last.fm
    top_artists_data = lastfm_get("user.getTopArtists", {"user": LASTFM_USER, "period": "1month", "limit": 5})
    top_artists = []
    try:
        top_artists = [a["name"] for a in top_artists_data["topartists"]["artist"]]
    except:
        pass

    # 2. Get similar artists for each top artist
    similar_artists = []
    seen = set(a.lower() for a in top_artists)
    for artist in top_artists[:3]:
        data = lastfm_get("artist.getSimilar", {"artist": artist, "limit": 5})
        try:
            for a in data["similarartists"]["artist"]:
                if a["name"].lower() not in seen:
                    similar_artists.append(a["name"])
                    seen.add(a["name"].lower())
        except:
            pass

    # 3. Get user's top tracks from Last.fm
    top_tracks_data = lastfm_get("user.getTopTracks", {"user": LASTFM_USER, "period": "1month", "limit": 10})
    top_tracks = []
    try:
        for t in top_tracks_data["toptracks"]["track"]:
            top_tracks.append({"name": t["name"], "artist": t["artist"]["name"]})
    except:
        pass

    # 4. Search Spotify for recommended tracks from similar artists
    recommended = []
    for artist in similar_artists[:6]:
        try:
            results = sp.search(q=f"artist:{artist}", type="track", limit=3)
            for t in results["tracks"]["items"]:
                recommended.append({
                    "uri": t["uri"],
                    "name": t["name"],
                    "artist": ", ".join(a["name"] for a in t["artists"]),
                    "album": t["album"]["name"],
                    "album_art": t["album"]["images"][0]["url"] if t["album"]["images"] else None,
                    "duration_ms": t["duration_ms"],
                    "type": "track",
                    "reason": f"Similar to {[a for a in top_artists if a.lower() in artist.lower() or True][0]}"
                })
        except:
            pass

    return {
        "top_artists": top_artists,
        "similar_artists": similar_artists[:8],
        "top_tracks": top_tracks[:10],
        "recommended": recommended[:12]
    }

@app.get("/api/lastfm/top-artists")
def get_lastfm_top_artists(period: str = "overall", user=Depends(get_current_user)):
    data = lastfm_get("user.getTopArtists", {"user": LASTFM_USER, "period": period, "limit": 20})
    artists = []
    try:
        for a in data["topartists"]["artist"]:
            artists.append({
                "name": a["name"],
                "playcount": a["playcount"],
                "url": a["url"],
                "image": next((i["#text"] for i in reversed(a.get("image", [])) if i["#text"]), None)
            })
    except:
        pass
    return {"artists": artists}

@app.get("/api/lastfm/top-tracks")
def get_lastfm_top_tracks(period: str = "overall", user=Depends(get_current_user)):
    data = lastfm_get("user.getTopTracks", {"user": LASTFM_USER, "period": period, "limit": 20})
    tracks = []
    try:
        for t in data["toptracks"]["track"]:
            tracks.append({
                "name": t["name"],
                "artist": t["artist"]["name"],
                "playcount": t["playcount"],
                "url": t["url"],
                "image": next((i["#text"] for i in reversed(t.get("image", [])) if i["#text"]), None)
            })
    except:
        pass
    return {"tracks": tracks}

@app.get("/api/lastfm/recent")
def get_lastfm_recent(user=Depends(get_current_user)):
    data = lastfm_get("user.getRecentTracks", {"user": LASTFM_USER, "limit": 20})
    tracks = []
    try:
        for t in data["recenttracks"]["track"]:
            tracks.append({
                "name": t["name"],
                "artist": t["artist"]["#text"],
                "album": t["album"]["#text"],
                "image": next((i["#text"] for i in reversed(t.get("image", [])) if i["#text"]), None),
                "now_playing": t.get("@attr", {}).get("nowplaying") == "true",
                "date": t.get("date", {}).get("#text", "")
            })
    except:
        pass
    return {"tracks": tracks}


# --- Public stats endpoint for Homepage widget ---
@app.get("/api/public/stats")
def public_stats():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) as c FROM downloads").fetchone()["c"]
    completed = conn.execute("SELECT COUNT(*) as c FROM downloads WHERE status = 'completed'").fetchone()["c"]
    queued = conn.execute("SELECT COUNT(*) as c FROM downloads WHERE status IN ('queued', 'downloading')").fetchone()["c"]
    failed = conn.execute("SELECT COUNT(*) as c FROM downloads WHERE status = 'failed'").fetchone()["c"]
    users = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    last = conn.execute("SELECT track_name, artist FROM downloads WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 1").fetchone()
    conn.close()
    return {
        "total": total,
        "completed": completed,
        "queued": queued,
        "failed": failed,
        "users": users,
        "last_download": f"{last['artist']} — {last['track_name']}" if last else "None"
    }
