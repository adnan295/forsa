import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { I18nManager, View, Text, StyleSheet, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient, getApiUrl } from "@/lib/query-client";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { FavoritesProvider } from "@/lib/favorites-context";
import { ThemeProvider } from "@/lib/theme-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

SplashScreen.preventAutoHideAsync();

function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      if (typeof window !== "undefined") {
        setIsOffline(!navigator.onLine);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
          window.removeEventListener("online", handleOnline);
          window.removeEventListener("offline", handleOffline);
        };
      }
    } else {
      let mounted = true;
      const checkConnection = async () => {
        try {
          const baseUrl = getApiUrl();
          const url = new URL("/api/recent-purchases", baseUrl).toString();
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const resp = await globalThis.fetch(url, { signal: controller.signal });
          clearTimeout(timeout);
          if (mounted) setIsOffline(!resp.ok);
        } catch (e: any) {
          if (e?.name === "AbortError" || e?.message?.includes("network")) {
            if (mounted) setIsOffline(true);
          }
        }
      };
      checkConnection();
      const interval = setInterval(checkConnection, 15000);
      return () => { mounted = false; clearInterval(interval); };
    }
  }, []);

  if (!isOffline) return null;

  return (
    <View style={[offlineStyles.container, { paddingTop: insets.top + 4 }]}>
      <Ionicons name="cloud-offline" size={16} color="#fff" />
      <Text style={offlineStyles.text}>لا يوجد اتصال بالإنترنت</Text>
    </View>
  );
}

const offlineStyles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 8,
    zIndex: 9999,
  },
  text: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="campaign/[id]"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="auth"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="admin/index"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="cart"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="checkout"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="order/[id]"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="info"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="winners"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="favorites"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="referral"
        options={{ headerShown: false, presentation: "card" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <FavoritesProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <RootLayoutNav />
                    <OfflineBanner />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </FavoritesProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
