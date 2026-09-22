/**
 * إرسال إشعارات الأجهزة. مستخرجة من routes.ts لأن التذكيرات الدورية
 * تحتاجها أيضاً، ولا يصح أن تستورد وحدة الجدولة ملف المسارات كاملاً.
 */
import { db } from "./db";
import { users } from "@shared/schema";
import { storage } from "./storage";
import { sendApnsNotifications, isApnsConfigured } from "./apns";
import { inArray } from "drizzle-orm";

export async function sendPushNotifications(userIds: string[], title: string, body: string, data?: Record<string, string>) {
  try {
    const [expoTokens, apnTokens] = await Promise.all([
      storage.getUserPushTokensByIds(userIds),
      isApnsConfigured() ? storage.getUserApnTokensByIds(userIds) : Promise.resolve([] as string[]),
    ]);

    const uniqueExpoTokens = [...new Set(expoTokens)].filter(t => typeof t === "string" && t.length > 10);
    const uniqueApnTokens = [...new Set(apnTokens)].filter(t => typeof t === "string" && t.length > 20);

    const promises: Promise<any>[] = [];

    if (uniqueExpoTokens.length > 0) {
      const messages = uniqueExpoTokens.map(token => ({
        to: token,
        sound: "default" as const,
        title,
        body,
        data: data || {},
        priority: "high" as const,
        channelId: "default",
        _contentAvailable: true,
      }));

      const chunks: typeof messages[] = [];
      for (let i = 0; i < messages.length; i += 100) {
        chunks.push(messages.slice(i, i + 100));
      }

      for (const chunk of chunks) {
        promises.push(
          fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Accept-Encoding": "gzip, deflate",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(chunk),
          })
            .then(res => res.json())
            .then((json: any) => {
              if (json.data) {
                json.data.forEach((item: any, idx: number) => {
                  if (item.status === "error") {
                    console.error(`[Push/Expo] Error for token[${idx}]:`, item.message, item.details);
                  }
                });
              }
            })
            .catch(err => console.error("[Push/Expo] Chunk failed:", err))
        );
      }
    }

    if (uniqueApnTokens.length > 0) {
      promises.push(
        sendApnsNotifications(uniqueApnTokens, title, body, data).then(async (apnsResult) => {
          console.log(`[Push/APNs] Sent: ${apnsResult.success} success, ${apnsResult.failure} failure`);
          if (apnsResult.invalidTokens.length > 0) {
            console.warn(`[Push/APNs] Clearing ${apnsResult.invalidTokens.length} invalid APN token(s)`);
            await db.update(users)
              .set({ apnToken: null })
              .where(inArray(users.apnToken, apnsResult.invalidTokens))
              .catch(err => console.error("[Push/APNs] Failed to clear invalid tokens:", err));
          }
        })
      );
    }

    await Promise.all(promises);
  } catch (e) {
    console.error("[Push] sendPushNotifications error:", e);
  }
}
