# 🦹 Unraid & Reverse-Proxy Deployment Guide für BabyCharts

Dieser Leitfaden beschreibt die optimale Einrichtung von BabyCharts auf Unraid OS (inklusive Volume-Mounts, Berechtigungen und gängigen Reverse-Proxies).

---

## 💾 1. Unraid Volume-Pfade & Persistenz (#221 / BC-178)

BabyCharts speichert alle persistenten Daten (SQLite-Datenbank, WAL-Dateien, Snapshots, Backups sowie AES-256-GCM verschlüsselte Bilder und Videos) unter `/app/server/data`.

### Empfohlenes Unraid Path-Mapping:

| Unraid Host-Pfad                           | Container-Pfad     | Modus | Zweck                                                                       |
| :----------------------------------------- | :----------------- | :---: | :-------------------------------------------------------------------------- |
| `/mnt/user/appdata/Babycharts/server/data` | `/app/server/data` | `RW`  | SQLite-DB (`babycharts.sqlite`), Uploads (`/uploads`), Backups (`/backups`) |

> [!IMPORTANT]
> **Dateiberechtigungen auf Unraid:**  
> Der BabyCharts Docker-Container läuft aus Sicherheitsgründen als unprivilegierter Benutzer (`node`, UID: `1000`, GID: `1000`).  
> Stelle sicher, dass der Ordner auf Unraid beschreibbar ist:
>
> ```bash
> chown -R 1000:1000 /mnt/user/appdata/Babycharts/
> chmod -R 755 /mnt/user/appdata/Babycharts/
> ```

---

## 🔒 2. Reverse-Proxy Konfigurationen (#220 / BC-180)

BabyCharts unterstützt alle gängigen Reverse-Proxies. Damit IP-Rate-Limiting, Session-Cookies und WebSockets reibungslos funktionieren, müssen die Header `X-Forwarded-For`, `X-Forwarded-Proto` und `X-Forwarded-Host` korrekt weitergeleitet werden.

### Option A: Nginx Proxy Manager (NPM)

1. Erstelle einen neuen **Proxy Host**:
   - **Domain Names:** `babycharts.deine-domain.de`
   - **Scheme:** `http`
   - **Forward Hostname / IP:** `192.168.178.XX` (Deine Unraid IP)
   - **Forward Port:** `3001`
   - **Websockets Support:** ✅ Aktivieren
   - **Block Common Exploits:** ✅ Aktivieren
2. **SSL Tab:**
   - Zertifikat anfordern (Let's Encrypt).
   - **Force SSL:** ✅ Aktivieren
   - **HTTP/2 Support:** ✅ Aktivieren
   - **HSTS Enabled:** ✅ Aktivieren

---

### Option B: SWAG / Nginx (Standard-Konfiguration)

Erstelle die Konfigurationsdatei `/mnt/user/appdata/swag/nginx/proxy-confs/babycharts.subdomain.conf`:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name babycharts.*;

    include /config/nginx/ssl.conf;

    client_max_body_size 30M;

    location / {
        include /config/nginx/proxy.conf;
        include /config/nginx/resolver.conf;
        set $upstream_app babycharts;
        set $upstream_port 3001;
        set $upstream_proto http;
        proxy_pass $upstream_proto://$upstream_app:$upstream_port;

        # WebSocket & Header Forwarding
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

---

### Option C: Traefik (Docker Compose / Labels)

```yaml
services:
  babycharts:
    image: ghcr.io/familiyog/babycharts:latest
    container_name: babycharts
    restart: unless-stopped
    volumes:
      - /mnt/user/appdata/Babycharts/server/data:/app/server/data
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.babycharts.rule=Host(`babycharts.deine-domain.de`)'
      - 'traefik.http.routers.babycharts.entrypoints=websecure'
      - 'traefik.http.routers.babycharts.tls.certresolver=letsencrypt'
      - 'traefik.http.services.babycharts.loadbalancer.server.port=3001'
```

---

### Option D: Cloudflare Tunnel

Wenn du einen Cloudflare Tunnel (cloudflared) nutzt:

- **Service Type:** `HTTP`
- **URL:** `192.168.178.XX:3001` (oder interner Containername `babycharts:3001`)
- **No TLS Verify:** Nicht nötig bei HTTP.
- **Additional Settings:**
  - **HTTP Request Headers:**
    - `X-Forwarded-Proto` $\rightarrow$ `https`

---

## 🛠️ 3. Umgebungsvariablen (Environment)

| Variable               | Standard                | Beschreibung                                                                    |
| :--------------------- | :---------------------- | :------------------------------------------------------------------------------ |
| `PORT`                 | `3001`                  | Interner Port des Express-Servers                                               |
| `NODE_ENV`             | `production`            | Laufzeitumgebung                                                                |
| `APP_URL`              | `http://localhost:3001` | Vollständige öffentliche URL (wichtig für E-Mail-Reset-Links & PDF-Generierung) |
| `JWT_SECRET`           | _(automatisch)_         | Persistenter Schlüssel für Sessions                                             |
| `MEDIA_ENCRYPTION_KEY` | _(automatisch)_         | 32-Byte Master-Schlüssel für AES-256-GCM Medien                                 |
| `DEV_EMAIL`            | _(optional)_            | E-Mail-Adresse für den primären Systemverwalter                                 |
| `REGISTRATION_MODE`    | `open`                  | `open` (offen), `invite_only` (nur mit Einladungscode), `disabled`              |
