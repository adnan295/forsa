import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { I18nManager } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { FavoritesProvider } from "@/lib/favorites-context";
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
        <AuthProvider>
          <CartProvider>
            <FavoritesProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </FavoritesProvider>
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
