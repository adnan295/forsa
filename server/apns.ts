import http2 from "http2";
import jwt from "jsonwebtoken";

const APN_HOST = "api.push.apple.com";
const BUNDLE_ID = process.env.APN_BUNDLE_ID || "app.replit.forsa";

let cachedToken: string | null = null;
let tokenGeneratedAt = 0;

function getJWT(): string {
  const now = Date.now();
  if (cachedToken && now - tokenGeneratedAt < 45 * 60 * 1000) {
    return cachedToken;
  }

  const key = process.env.APN_KEY?.replace(/\\n/g, "\n");
  const keyId = process.env.APN_KEY_ID;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!key || !keyId || !teamId) {
    throw new Error("[APNs] Missing credentials: APN_KEY, APN_KEY_ID, APPLE_TEAM_ID must be set");
  }

  cachedToken = jwt.sign({}, key, {
    algorithm: "ES256",
    keyid: keyId,
    issuer: teamId,
    expiresIn: "1h",
  });
  tokenGeneratedAt = now;
  return cachedToken;
}

export function isApnsConfigured(): boolean {
  return !!(process.env.APN_KEY && process.env.APN_KEY_ID && process.env.APPLE_TEAM_ID);
}

export async function sendApnsNotifications(
  deviceTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: number; failure: number }> {
  const result = { success: 0, failure: 0 };

  const validTokens = deviceTokens.filter((t) => typeof t === "string" && t.length > 20);
  if (validTokens.length === 0) return result;

  let token: string;
  try {
    token = getJWT();
  } catch (err) {
    console.error("[APNs]", err);
    result.failure = validTokens.length;
    return result;
  }

  const payload = JSON.stringify({
    aps: {
      alert: { title, body },
      sound: "default",
      badge: 1,
    },
    ...(data || {}),
  });

  return new Promise((resolve) => {
    let client: http2.ClientHttp2Session | null = null;
    let pending = validTokens.length;
    let closed = false;

    function done() {
      pending--;
      if (pending === 0 && !closed) {
        closed = true;
        try { client?.close(); } catch {}
        resolve(result);
      }
    }

    try {
      client = http2.connect(`https://${APN_HOST}`);

      client.on("error", (err) => {
        console.error("[APNs] Connection error:", err.message);
        if (!closed) {
          closed = true;
          result.failure += pending;
          resolve(result);
        }
      });

      for (const deviceToken of validTokens) {
        try {
          const req = client.request({
            ":method": "POST",
            ":path": `/3/device/${deviceToken}`,
            "authorization": `bearer ${token}`,
            "apns-topic": BUNDLE_ID,
            "apns-push-type": "alert",
            "apns-priority": "10",
            "apns-expiration": "0",
            "content-type": "application/json",
            "content-length": Buffer.byteLength(payload).toString(),
          });

          let statusCode = 0;
          let responseBody = "";

          req.on("response", (headers) => {
            statusCode = headers[":status"] as number;
          });

          req.on("data", (chunk) => { responseBody += chunk; });

          req.on("end", () => {
            if (statusCode === 200) {
              result.success++;
            } else {
              console.error(`[APNs] Failed for token ${deviceToken.slice(0, 8)}... status=${statusCode}:`, responseBody);
              result.failure++;
            }
            done();
          });

          req.on("error", (err) => {
            console.error("[APNs] Request error:", err.message);
            result.failure++;
            done();
          });

          req.end(payload);
        } catch (reqErr: any) {
          console.error("[APNs] Failed to create request:", reqErr.message);
          result.failure++;
          done();
        }
      }
    } catch (connErr: any) {
      console.error("[APNs] Failed to connect:", connErr.message);
      result.failure = validTokens.length;
      resolve(result);
    }
  });
}
