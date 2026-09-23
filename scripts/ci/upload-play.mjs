// Upload a signed .aab to Google Play through the Android Publisher API.
// Needs a service account JSON (Play Console → Users and permissions → release
// rights for this app) in GOOGLE_PLAY_SERVICE_ACCOUNT_JSON. No third-party action.
import fs from "node:fs";
import jwt from "jsonwebtoken";

const PACKAGE = "today.forsa";
const API = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;
const UPLOAD_API = `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE}`;

const [bundlePath, track = "production"] = process.argv.slice(2);
const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

if (!bundlePath || !fs.existsSync(bundlePath)) fail(`Bundle not found: ${bundlePath}`);
if (!["production", "beta", "alpha", "internal"].includes(track)) fail(`Unknown track ${track}`);
if (!raw) fail("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON secret is missing");

let account;
try {
  account = JSON.parse(raw);
} catch {
  fail("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not valid JSON; paste the whole downloaded key file");
}
if (!account.client_email || !account.private_key) fail("The service account JSON has no client_email/private_key");

async function call(method, url, { body, headers = {}, token } = {}) {
  const res = await fetch(url, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    // Google's error message says exactly which permission or setting is missing
    let detail = text;
    try {
      detail = JSON.parse(text).error?.message ?? text;
    } catch {}
    fail(`${method} ${url.replace(/\?.*/, "")} → ${res.status}: ${detail}`);
  }
  return text ? JSON.parse(text) : {};
}

const now = Math.floor(Date.now() / 1000);
const assertion = jwt.sign(
  {
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  },
  account.private_key,
  { algorithm: "RS256" },
);

const { access_token: token } = await call("POST", "https://oauth2.googleapis.com/token", {
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString(),
});
console.log(`Authenticated as ${account.client_email}`);

const edit = await call("POST", `${API}/edits`, { token, headers: { "content-type": "application/json" }, body: "{}" });
const bundle = await call("POST", `${UPLOAD_API}/edits/${edit.id}/bundles?uploadType=media`, {
  token,
  headers: { "content-type": "application/octet-stream" },
  body: fs.readFileSync(bundlePath),
});
console.log(`Uploaded bundle versionCode ${bundle.versionCode} (sha256 ${bundle.sha256})`);

await call("PUT", `${API}/edits/${edit.id}/tracks/${track}`, {
  token,
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ track, releases: [{ versionCodes: [String(bundle.versionCode)], status: "completed" }] }),
});
await call("POST", `${API}/edits/${edit.id}:commit`, { token });
console.log(`versionCode ${bundle.versionCode} committed to the ${track} track; Google Play review follows.`);
