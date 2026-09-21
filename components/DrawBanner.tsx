import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/lib/theme-context";
import { buildMediaUrl } from "@/lib/query-client";
import type { Draw } from "@shared/schema";

export type CurrentDraw = Draw & { participants?: number; myTickets?: number };

interface Props {
  draw: CurrentDraw;
  onPress?: () => void;
  compact?: boolean;
}

/** بانر الجولة الحالية: الجائزة، التقدّم نحو العدد المستهدف، وتذاكر المستخدم */
export default function DrawBanner({ draw, onPress, compact = false }: Props) {
  const { colors } = useTheme();

  const target = draw.targetTickets || 1;
  const sold = Math.min(draw.soldTickets, target);
  const progress = Math.min(1, sold / target);
  const remaining = Math.max(0, target - draw.soldTickets);
  const ticketPrice = parseFloat(draw.ticketPrice);
  const prizeImage = buildMediaUrl(draw.prizeImageUrl);

  const isReady = draw.status === "ready_to_draw";
  const isScheduled = draw.status === "scheduled";

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <LinearGradient
        colors={["#1A1A1A", "#2D2D2D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, compact && styles.compact]}
      >
        <View style={[styles.glow, { backgroundColor: `${colors.accent}1A` }]} />

        <View style={styles.header}>
          <View style={styles.headerText}>
            <View style={styles.labelRow}>
              <Ionicons
                name={isReady ? "hourglass" : isScheduled ? "time-outline" : "gift"}
                size={14}
                color={colors.accent}
              />
              <Text style={[styles.label, { color: colors.accent }]}>
                {isReady ? "اكتمل العدد — السحب قريباً" : isScheduled ? "الجولة القادمة" : "جولة السحب الحالية"}
              </Text>
            </View>
            <Text style={styles.prizeName} numberOfLines={2}>
              {draw.prizeName}
            </Text>
            <Text style={styles.drawTitle} numberOfLines={1}>
              {draw.title}
            </Text>
          </View>

          <View style={styles.prizeImageWrap}>
            {prizeImage ? (
              <Image
                source={{ uri: prizeImage }}
                style={styles.prizeImage}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.prizeImagePlaceholder, { backgroundColor: `${colors.accent}26` }]}>
                <Ionicons name="trophy" size={28} color={colors.accent} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressCount, { color: colors.accent }]}>
              {sold.toLocaleString("en-US")} / {target.toLocaleString("en-US")}
            </Text>
            <Text style={styles.progressLabel}>
              {isReady ? "تم بيع كل التذاكر" : `باقي ${remaining.toLocaleString("en-US")} تذكرة للسحب`}
            </Text>
          </View>

          <View style={styles.progressBar}>
            <LinearGradient
              colors={[colors.accent, colors.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.max(progress * 100, 2)}%` }]}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Ionicons name="cash-outline" size={14} color="rgba(255,255,255,0.6)" />
            <Text style={styles.footerText}>
              كل <Text style={styles.footerHighlight}>{ticketPrice.toFixed(0)}$</Text> = تذكرة
            </Text>
          </View>

          {typeof draw.participants === "number" && (
            <View style={styles.footerItem}>
              <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.6)" />
              <Text style={styles.footerText}>{draw.participants} مشارك</Text>
            </View>
          )}

          {typeof draw.myTickets === "number" && draw.myTickets > 0 && (
            <View style={[styles.myTicketsBadge, { backgroundColor: `${colors.accent}26` }]}>
              <Ionicons name="ticket" size={13} color={colors.accent} />
              <Text style={[styles.myTicketsText, { color: colors.accent }]}>
                عندك {draw.myTickets}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    padding: 18,
    gap: 16,
    overflow: "hidden",
  },
  compact: {
    padding: 14,
    gap: 12,
  },
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -80,
    end: -60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    writingDirection: "rtl",
  },
  prizeName: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 28,
  },
  drawTitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    textAlign: "right",
    writingDirection: "rtl",
  },
  prizeImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    overflow: "hidden",
  },
  prizeImage: {
    width: "100%",
    height: "100%",
  },
  prizeImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  progressSection: {
    gap: 7,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressCount: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  progressLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    writingDirection: "rtl",
  },
  progressBar: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    writingDirection: "rtl",
  },
  footerHighlight: {
    fontFamily: "Inter_700Bold",
    color: "#FFD000",
  },
  myTicketsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginStart: "auto",
  },
  myTicketsText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    writingDirection: "rtl",
  },
});
