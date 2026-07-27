/**
 * Materializes a .env file for react-native-dotenv during EAS builds.
 *
 * react-native-dotenv inlines values from a .env FILE at bundle time, but the
 * gitignored .env never reaches the EAS build server. This script (run from the
 * `eas-build-pre-install` hook) writes .env from the EAS environment variables
 * configured for the build's environment (development / preview / production).
 *
 * It only runs on EAS Build, so your local .env is never touched.
 *
 * NOTE: intentionally does NOT include SUPABASE_SERVICE_ROLE — that is a server
 * secret and must never be bundled into the client app.
 */
const fs = require('fs');

const KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'ASK_AI_DAILY_TOKEN_QUOTA',
  'ASK_AI_ESTIMATED_USD_PER_1K_TOKENS',
];

const missing = KEYS.filter(k => !process.env[k]);
if (missing.length) {
  console.warn(
    `[write-env] WARNING: missing EAS env vars: ${missing.join(', ')}. ` +
      `The app may not work. Create them with "eas env:create".`,
  );
}

const contents = KEYS.map(k => `${k}=${process.env[k] ?? ''}`).join('\n') + '\n';
fs.writeFileSync('.env', contents);
console.log(`[write-env] Wrote .env with ${KEYS.length} keys for the build.`);
