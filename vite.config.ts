import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { stravaPlugin } from "./server/stravaPlugin";

export default defineConfig(({ mode }) => {
  // Empty prefix: read STRAVA_* server-side only. They are not VITE_-prefixed,
  // so they never reach the browser bundle.
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      stravaPlugin(
        {
          clientId: env.STRAVA_CLIENT_ID,
          clientSecret: env.STRAVA_CLIENT_SECRET,
        },
        process.cwd(),
      ),
    ],
    build: { chunkSizeWarningLimit: 1100 },
  };
});
