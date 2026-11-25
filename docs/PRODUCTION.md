# Arka Works: demo and production

The same code runs two completely separate systems. Nothing is shared between them:
not the database, not the photo storage, not the secrets.

|                     | Demo                                   | Production                                   |
|---------------------|----------------------------------------|----------------------------------------------|
| Vercel project      | `solar-tracker`                        | `arka-works`                                 |
| Updates from branch | `main` (every push)                    | `production` (only when released, see below) |
| Server region       | US East (`iad1`)                       | Singapore (`sin1`)                           |
| Neon project        | `solar` (US East)                      | `arka-works-production` (Singapore)          |
| Photo bucket        | `images` in `solar`                    | `photos` in `arka-works-production`          |
| Data                | Sample data; "Reset demo" puts it back | Real data; starts empty; no reset            |
| Mode setting        | `NEXT_PUBLIC_APP_MODE=demo`            | `NEXT_PUBLIC_APP_MODE=production`            |
| Backup              | None                                   | Nightly, to Neon project `arka-works-backup` |

`NEXT_PUBLIC_APP_MODE` not set counts as production, so a missing setting can never
put sample data into the live system.

## Releasing to production

1. Push to `main`. The demo updates; check the change there.
2. When it is right, release it:
   ```
   git checkout production && git merge --ff-only main && git push origin production && git checkout main
   ```
   The `arka-works` project builds and goes live in about a minute.
3. To undo a release: Vercel → `arka-works` → Deployments → the previous one → "Promote to Production".

## Signing in on production

- First account: username `admin` (Head Office), PIN from `BOOTSTRAP_ADMIN_PIN`, used once when the
  database is first created. After signing in, set a new PIN for `admin` on the Users screen, then
  remove `BOOTSTRAP_ADMIN_PIN` from the Vercel settings.
- Head office adds everyone else on **Users → Add person**, then **Set PIN**. Installers also need
  villages on **Villages & Access**.
- 5 wrong PINs lock a username for 15 minutes. Setting a new PIN clears the lock.
- Switched-off people are signed out at once and cannot sign in.
- `DEMO_PIN` works only on the demo.

## Backups (production only)

Every night at 2:00 AM India time (Vercel Cron → `/api/cron/backup`):

1. The `arka-works-backup` database becomes an exact copy of production (replaced each night).
2. A dated file of every record is saved in the backup bucket: `backups/database/YYYY-MM-DD.json.gz`,
   kept 35 days.
3. Photos not yet copied go to `backups/photos/…` (about 35 seconds of copying per night;
   anything left over is copied the next night).

Neon itself can also rewind production by up to 6 hours (free plan) from the Neon console.

### Restoring

Restore into a new, empty Neon branch first, check it, then point `DATABASE_URL` at it:

```
RESTORE_FROM_URL=<backup database url> RESTORE_TO_URL=<target database url> \
  node scripts/restore-from-backup.mjs --yes-replace-everything
```

For an older day, download `database/YYYY-MM-DD.json.gz` and pass `FROM_FILE=<path>` instead of
`RESTORE_FROM_URL`. The target must already have the tables (open the app against it once).

## Settings (Vercel → project → Settings → Environment Variables)

Production needs: `NEXT_PUBLIC_APP_MODE`, `DATABASE_URL`, `AUTH_SECRET`, `PHOTO_SIGNING_SECRET`,
`AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`,
`CRON_SECRET`, `BACKUP_DATABASE_URL`, `BACKUP_S3_ENDPOINT`, `BACKUP_S3_REGION`, `BACKUP_S3_BUCKET`,
`BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`, and `BOOTSTRAP_ADMIN_PIN` until first sign-in.

Changing `PHOTO_SIGNING_SECRET` marks every earlier photo as unverified. Changing `AUTH_SECRET`
signs everyone out.

### Switches

| Setting | Values | What it does |
|---|---|---|
| `SURVEY_VILLAGE_CHECK` | `true` (or not set) / `false` | `true`: survey photos must be taken inside the installer's approved villages. `false`: **on hold**. Installers can survey anywhere and don't need villages from the office; on **New survey** they type the village, mandal and district. Every photo still needs a fresh, precise GPS location, printed on it and kept in its signed record. Installation photos are always checked. |
| `INSTALLER_NEW_SURVEY` | `true` (or not set) / `false` | `true`: installers see **+ New survey** and can survey any home without the office assigning it. `false`: the button is gone and the server refuses self-started surveys; only homes the office assigns are surveyed. Homes installers already took keep their surveys; the office can reassign them as usual. |

To go back to how it was before installers could start surveys: `INSTALLER_NEW_SURVEY=false` and `SURVEY_VILLAGE_CHECK=true`.

A changed setting takes effect after a redeploy: Vercel → project → Deployments → latest → Redeploy.
Phones pick it up the next time the app is opened or comes back to the front.
