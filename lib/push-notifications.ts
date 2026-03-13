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

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenData.data;

    await apiRequest("PUT", "/api/auth/push-token", { pushToken: token });

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#10B981",
      });
    }

    return token;
  } catch (error) {
    console.error("Error registering for push notifications:", error);
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
