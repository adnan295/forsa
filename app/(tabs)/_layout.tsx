import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors, { Fonts, FontSize } from "@/constants/colors";
import { useDesignScale } from "@/lib/design-scale";

/**
 * شريط تنقّل أبيض — التبويب النشط أزرق والباقي رمادي.
 * الترتيب (يمين ← يسار): الرئيسية · قسائمي · المنتجات · حسابي
 */
export default function TabLayout() {
  const c = Colors.light;
  const insets = useSafeAreaInsets();
  const dp = useDesignScale();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: c.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.border,
          elevation: 0,
          // ارتفاع الشريط 125 من تصميم 832، ويُضاف تحته شريط الرجوع للمنزل في الآيفون
          height: dp(125) + insets.bottom,
          paddingTop: 4,
          paddingBottom: insets.bottom + 4,
          shadowColor: c.navy,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.medium,
          fontSize: FontSize.label,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: "قسائمي",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "ticket" : "ticket-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "المنتجات",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "حسابي",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="client" options={{ href: null }} />
    </Tabs>
  );
}
