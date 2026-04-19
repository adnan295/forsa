import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { apiRequest } from "@/lib/query-client";
import { router } from "expo-router";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function getNotificationPermissionStatus(): Promise<"granted" | "denied" | "undetermined"> {
  if (Platform.OS === "web") return "denied";
  const { status } = await Notifications.getPermissionsAsync();
  return status as "granted" | "denied" | "undetermined";
}

async function getDevicePushTokenWithRetry(retries = 3, delayMs = 1500): Promise<Notifications.DevicePushToken | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const token = await Notifications.getDevicePushTokenAsync();
      return token;
    } catch (error) {
      console.warn(`[PushNotifications] getDevicePushTokenAsync attempt ${attempt}/${retries} failed:`, error);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  console.error("[PushNotifications] Failed to obtain device push token after all retries.");
  return null;
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[PushNotifications] Permission not granted, skipping token registration.");
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoToken = tokenData.data;

    await apiRequest("PUT", "/api/auth/push-token", { pushToken: expoToken });

    const deviceTokenData = await getDevicePushTokenWithRetry();
    if (deviceTokenData) {
      if (Platform.OS === "android") {
        await apiRequest("PUT", "/api/auth/device-tokens", {
          fcmToken: deviceTokenData.data,
        }).catch((err) => console.error("[PushNotifications] Failed to save FCM token:", err));
      } else if (Platform.OS === "ios") {
        await apiRequest("PUT", "/api/auth/device-tokens", {
          apnToken: deviceTokenData.data,
        }).catch((err) => console.error("[PushNotifications] Failed to save APN token:", err));
      }
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FFD000",
      });
    }

    return expoToken;
  } catch (error) {
    console.error("[PushNotifications] Error registering for push notifications:", error);
    return null;
  }
}

function handleNotificationData(data: Record<string, any> | undefined) {
  if (!data) return;
  if (data.campaignId) {
    router.push(`/campaign/${data.campaignId}`);
  } else if (data.orderId) {
    router.push(`/order/${data.orderId}`);
  }
}

export function setupNotificationHandlers() {
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) {
      handleNotificationData(response.notification.request.content.data);
    }
  });

  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      handleNotificationData(response.notification.request.content.data);
    }
  );

  return () => subscription.remove();
}
