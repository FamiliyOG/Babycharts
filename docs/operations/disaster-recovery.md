# Disaster Recovery & Backup Runbook (BC-313)

This runbook guides system administrators and self-hosters through backing up, restoring, and recovering a BabyCharts deployment.

## 1. The 3-2-1 Backup Strategy

- **3 Copies:** Live production data, 1 local automated backup, 1 offsite encrypted copy.
- **2 Media:** Fast SSD/NVMe for live SQLite database + NAS/HDD for cold backup storage.
- **1 Offsite:** Remote S3/WebDAV/Borg repository with client-side encryption.

## 2. SQLite Live Backup Procedure

BabyCharts uses `better-sqlite3` which supports non-blocking live online backups without stopping the container:

```bash
# Inside the container or host
sqlite3 server/data/babycharts.sqlite ".backup 'server/data/backups/manual_backup_$(date +%Y%m%d_%H%M%S).sqlite'"
```

## 3. Server Migration & Restoration Steps

1. Stop the current BabyCharts container or process.
2. Copy the entire `server/data/` directory to the target server:
   - `server/data/babycharts.sqlite` (and `-wal` / `-shm` if present)
   - `server/data/media/` (encrypted media files and derivatives)
   - `server/data/keys/` (master encryption key files)
3. Set appropriate permissions on target host (`chown -R 1000:1000 server/data`).
4. Start the container on the target host.
5. The application will automatically verify schema integrity (`PRAGMA integrity_check`) and resume serving.

## 4. Recovering from a Corrupted SQLite Database

If the SQLite file is damaged:

1. Stop the application.
2. Check if a pre-migration backup exists in `server/data/backups/`.
3. If no recent backup exists, attempt SQLite recovery:
   ```bash
   sqlite3 server/data/babycharts.sqlite ".recover" | sqlite3 server/data/babycharts_recovered.sqlite
   mv server/data/babycharts_recovered.sqlite server/data/babycharts.sqlite
   ```
