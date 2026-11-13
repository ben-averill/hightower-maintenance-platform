/**
 * Local Strava bridge for the Vite dev/preview server.
 *
 * The browser never sees the client secret or tokens: OAuth code exchange,
 * token refresh and API calls happen here, and tokens are kept in
 * `.strava/tokens.json` (gitignored) so a dev-server restart stays connected.
 *
 * Routes:
 *   GET  /api/strava/status      -> configured / connected / athlete / bikes
 *   GET  /api/strava/connect     -> redirect to Strava's consent page
 *   GET  /api/strava/callback    -> code exchange, then redirect back to the app
 *   GET  /api/strava/activities  -> activity summaries (?after=<unix seconds>)
 *   POST /api/strava/disconnect  -> revoke access and delete stored tokens
 */
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import type { Connect, Plugin } from "vite";

const stravaOAuth = "https://www.strava.com/oauth";
const stravaApi = "https://www.strava.com/api/v3";
const scopes = "read,activity:read_all,profile:read_all";
const perPage = 200;
const maxPages = 10;

export interface StravaCredentials {
  clientId: string | undefined;
  clientSecret: string | undefined;
}

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
  athlete: { id: number; name: string } | null;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number; firstname?: string; lastname?: string };
}

class StravaError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function redirect(res: ServerResponse, location: string) {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.end();
}

function requestUrl(req: IncomingMessage) {
  return new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
}

export function stravaPlugin(
  credentials: StravaCredentials,
  root: string,
): Plugin {
  const tokenFile = path.join(root, ".strava", "tokens.json");
  const pendingStates = new Set<string>();
  const configured = Boolean(
    credentials.clientId && credentials.clientSecret,
  );

  async function readTokens(): Promise<StoredTokens | null> {
    try {
      return JSON.parse(await readFile(tokenFile, "utf8")) as StoredTokens;
    } catch {
      return null;
    }
  }

  async function writeTokens(tokens: StoredTokens) {
    await mkdir(path.dirname(tokenFile), { recursive: true });
    await writeFile(tokenFile, JSON.stringify(tokens, null, 2), "utf8");
  }

  async function tokenRequest(params: Record<string, string>) {
    const response = await fetch(`${stravaOAuth}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: credentials.clientId!,
        client_secret: credentials.clientSecret!,
        ...params,
      }),
    });
    if (!response.ok)
      throw new StravaError(
        `Strava token request failed (${response.status}). Try reconnecting.`,
        response.status === 400 || response.status === 401 ? 401 : 502,
      );
    return (await response.json()) as TokenResponse;
  }

  /** Returns a valid access token, refreshing it when it is about to expire. */
  async function accessToken(): Promise<string> {
    const tokens = await readTokens();
    if (!tokens) throw new StravaError("Strava is not connected.", 401);
    if (tokens.expiresAt - 120 > Date.now() / 1000) return tokens.accessToken;
    const refreshed = await tokenRequest({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    });
    await writeTokens({
      ...tokens,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token,
      expiresAt: refreshed.expires_at,
    });
    return refreshed.access_token;
  }

  async function api<T>(pathname: string, query: Record<string, string> = {}) {
    const url = new URL(`${stravaApi}${pathname}`);
    for (const [key, value] of Object.entries(query))
      url.searchParams.set(key, value);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${await accessToken()}` },
    });
    if (response.status === 429)
      throw new StravaError(
        "Strava rate limit reached. Wait 15 minutes and sync again.",
        429,
      );
    if (response.status === 401)
      throw new StravaError(
        "Strava rejected the stored access. Disconnect and connect again.",
        401,
      );
    if (!response.ok)
      throw new StravaError(`Strava API error (${response.status}).`);
    return (await response.json()) as T;
  }

  async function status() {
    if (!configured) return { configured: false, connected: false };
    const tokens = await readTokens();
    if (!tokens) return { configured: true, connected: false };
    const athlete = await api<{
      firstname?: string;
      lastname?: string;
      bikes?: { id: string; name: string; primary: boolean; retired?: boolean }[];
    }>("/athlete");
    return {
      configured: true,
      connected: true,
      athlete: {
        name: [athlete.firstname, athlete.lastname].filter(Boolean).join(" "),
      },
      canReadPrivate: tokens.scope.includes("activity:read_all"),
      bikes: (athlete.bikes ?? []).map((bike) => ({
        id: bike.id,
        name: bike.name,
        primary: bike.primary,
        retired: bike.retired ?? false,
      })),
    };
  }

  async function activities(after: number) {
    const all: unknown[] = [];
    for (let page = 1; page <= maxPages; page += 1) {
      const batch = await api<unknown[]>("/athlete/activities", {
        after: String(after),
        per_page: String(perPage),
        page: String(page),
      });
      all.push(...batch);
      if (batch.length < perPage) break;
    }
    // Pass through only the fields the importer reads.
    return all.map((raw) => {
      const a = raw as Record<string, unknown>;
      return {
        id: a.id,
        name: a.name,
        sport_type: a.sport_type ?? a.type,
        start_date: a.start_date,
        start_date_local: a.start_date_local,
        elapsed_time: a.elapsed_time,
        moving_time: a.moving_time ?? null,
        distance: a.distance ?? null,
        total_elevation_gain: a.total_elevation_gain ?? null,
        gear_id: a.gear_id ?? null,
      };
    });
  }

  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const url = requestUrl(req);
    if (!url.pathname.startsWith("/api/strava/")) return next();
    const route = `${req.method ?? "GET"} ${url.pathname}`;
    void (async () => {
      try {
        if (route === "GET /api/strava/status") {
          return sendJson(res, 200, await status());
        }
        if (!configured)
          throw new StravaError(
            "Add STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET to .env.local and restart the dev server.",
            503,
          );
        if (route === "GET /api/strava/connect") {
          const state = randomBytes(16).toString("hex");
          pendingStates.add(state);
          const authorize = new URL(`${stravaOAuth}/authorize`);
          authorize.search = new URLSearchParams({
            client_id: credentials.clientId!,
            redirect_uri: `${url.origin}/api/strava/callback`,
            response_type: "code",
            approval_prompt: "auto",
            scope: scopes,
            state,
          }).toString();
          return redirect(res, authorize.toString());
        }
        if (route === "GET /api/strava/callback") {
          const state = url.searchParams.get("state") ?? "";
          const code = url.searchParams.get("code");
          if (!pendingStates.delete(state))
            return redirect(res, "/?strava=error&reason=state");
          if (!code) return redirect(res, "/?strava=denied");
          const granted = url.searchParams.get("scope") ?? "";
          const token = await tokenRequest({
            code,
            grant_type: "authorization_code",
          });
          await writeTokens({
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: token.expires_at,
            scope: granted,
            athlete: token.athlete
              ? {
                  id: token.athlete.id,
                  name: [token.athlete.firstname, token.athlete.lastname]
                    .filter(Boolean)
                    .join(" "),
                }
              : null,
          });
          return redirect(res, "/?strava=connected");
        }
        if (route === "GET /api/strava/activities") {
          const after = Number(url.searchParams.get("after") ?? 0);
          if (!Number.isFinite(after) || after < 0)
            throw new StravaError("Invalid `after` value.", 400);
          return sendJson(res, 200, {
            activities: await activities(Math.floor(after)),
          });
        }
        if (route === "POST /api/strava/disconnect") {
          const tokens = await readTokens();
          if (tokens) {
            await fetch(`${stravaOAuth}/deauthorize`, {
              method: "POST",
              headers: { Authorization: `Bearer ${tokens.accessToken}` },
            }).catch(() => undefined);
          }
          await rm(tokenFile, { force: true });
          return sendJson(res, 200, { connected: false });
        }
        sendJson(res, 404, { error: "Unknown Strava route." });
      } catch (error) {
        const status = error instanceof StravaError ? error.status : 500;
        const message =
          error instanceof Error ? error.message : "Strava request failed.";
        sendJson(res, status, { error: message });
      }
    })();
  };

  return {
    name: "hightower-strava",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
