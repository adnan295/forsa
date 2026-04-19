import admin from "firebase-admin";

let initialized = false;

function initFirebase() {
  if (initialized || admin.apps.length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("[Firebase] Missing credentials — FCM disabled. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.");
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  initialized = true;
  console.log("[Firebase] Admin SDK initialized for project:", projectId);
}

initFirebase();

export type FcmResult = { success: number; failure: number; errors: string[] };

export async function sendFcmNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<FcmResult> {
  const result: FcmResult = { success: 0, failure: 0, errors: [] };

  if (!initialized && admin.apps.length === 0) {
    result.errors.push("Firebase not initialized");
    result.failure = tokens.length;
    return result;
  }

  const validTokens = tokens.filter((t) => typeof t === "string" && t.length > 10);
  if (validTokens.length === 0) return result;

  const CHUNK = 500;
  for (let i = 0; i < validTokens.length; i += CHUNK) {
    const chunk = validTokens.slice(i, i + CHUNK);
    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data: data || {},
        android: {
          priority: "high",
          notification: { channelId: "default", sound: "default" },
        },
        apns: {
          payload: { aps: { sound: "default", badge: 1 } },
        },
      });
      result.success += response.successCount;
      result.failure += response.failureCount;
      response.responses.forEach((r, idx) => {
        if (!r.success && r.error) {
          result.errors.push(`Token[${i + idx}]: ${r.error.message}`);
        }
      });
    } catch (err: any) {
      result.failure += chunk.length;
      result.errors.push(err.message || "Unknown error");
    }
  }

  return result;
}

export async function sendFcmToUser(
  userId: string,
  fcmToken: string | null,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<FcmResult> {
  const tokens = [fcmToken].filter((t): t is string => !!t && t.length > 10);
  return sendFcmNotification(tokens, title, body, data);
}
