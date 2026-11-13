# Rides from Strava

Rides recorded on Strava can be brought into the workbench in two ways. Each ride's **moving time** adds to the bike's hour meter, and every component's service status is calculated from that meter.

| | File import (default) | API sync (optional) |
| --- | --- | --- |
| Cost | Free | Strava subscription ($11.99/mo or $79.99/yr US) |
| After each ride | Export GPX on strava.com, then drop it in | Click **Sync rides** |
| Strava API policy | Doesn't apply: it's your own export | Data may be kept at most 7 days (Policy 6.2) |
| Numbers | Calculated from the track (see below) | Strava's own figures |

The two can be used together. A ride that starts within 2 minutes of one already recorded is treated as the same ride, so it is never counted twice.

## File import

1. On strava.com, open the ride, click **⋯**, then **Export GPX**.
2. In the app, open **Details**, then under **Rides** click **Import ride files**, or drag the files onto the panel. You can import several files at once, and TCX files work too.

FIT files (Garmin "Export Original") are not supported yet. Use Export GPX instead.

How the numbers are calculated (`src/domain/rideFiles.ts`):
- **Moving time:** time spent going at least 0.5 m/s (1.8 km/h). This leaves out stops, so it is close to Strava's figure but not identical.
- **Distance:** the sum of distances between GPS points, or the device's own distance in TCX files.
- **Climbing:** total ascent, ignoring changes under 3 m (GPS altitude noise). Strava corrects elevation with map data, so its number may differ.
- **Date:** the ride's date in your computer's time zone.

# Strava API sync (optional)

Rides can also be pulled automatically from Strava's API, which needs a subscription.

## How it fits together

```
Strava app (phone/GPS) ──► Strava ──► local dev server (/api/strava/*) ──► browser app
                                       holds client secret + tokens         stores rides in localStorage
```

- `server/stravaPlugin.ts` adds `/api/strava/*` routes to the Vite dev and preview servers. These routes handle the OAuth code exchange, token refresh and Strava API calls. The client secret and tokens never reach the browser.
- Tokens are kept in `.strava/tokens.json`, which is gitignored, so you stay connected across restarts. Strava access tokens last about 6 hours, and the server refreshes them automatically.
- `src/domain/rides.ts` turns Strava activities into `Ride` records, skips duplicates, and computes the effective meter.
- `src/app/persistence.ts` saves rides, service history and the starting meter in this browser's `localStorage`.

## One-time setup

0. You need an active Strava subscription. Strava requires one to create an API app; there is no separate API fee.
1. Go to <https://www.strava.com/settings/api> and create an API application:
   - **Application Name:** anything, for example `Hightower workbench`
   - **Category:** for example `Data Importer`
   - **Website:** `http://localhost`
   - **Authorization Callback Domain:** `localhost`
2. Copy `.env.example` to `.env.local` and fill in the **Client ID** and **Client Secret** from that page:

   ```sh
   STRAVA_CLIENT_ID=12345
   STRAVA_CLIENT_SECRET=your-secret
   ```

3. Restart `npm run dev`, then open the app.
4. Open **Details**. In the **Rides · Strava** section, click **Connect Strava** and approve access on Strava's page. The app requests `read`, `activity:read_all` (to include private rides) and `profile:read_all` (to list your Strava bikes).
5. Choose which **Strava bike** is this Hightower. Only activities with that gear are imported, and runs or rides on other bikes are skipped. You can also choose "Any bike" to import every ride.

## After each ride

1. Record the ride on Strava as usual, and make sure the Hightower is selected as the activity's bike.
2. Open the app, go to **Details**, and click **Sync rides**.

Each sync asks Strava only for activities after the newest ride already imported. The first sync starts from the starting meter's date.

## Starting meter

The seeded meter (153 h on 2026-09-30) is mock data. Use **Set starting meter** to enter the bike's real hours as of a date, for example `0` on the day you start tracking. Rides dated **after** that day add to it. Rides on or before that day stay in the list, but they are dimmed and not counted.

## Notes and limits

- New Strava API apps are limited to the owner's account, which is all this app needs.
- Strava rate-limits API calls. If you hit the limit, the app shows a message; wait 15 minutes before syncing again.
- **Disconnect Strava** revokes the app's access and deletes the stored tokens. Rides that were already imported are kept.
- To start over, use **Reset to demo data**. It clears saved rides and service records from this browser.
