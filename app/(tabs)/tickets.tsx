import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { queryClient } from "@/lib/query-client";
import type { Ticket } from "@shared/schema";

function TicketItem({ ticket }: { ticket: Ticket }) {
  return (
    <View style={[styles.ticketCard, ticket.isWinner && styles.winnerCard]}>
      <View style={styles.ticketLeft}>
        <View style={styles.ticketIconWrap}>
          <Ionicons
            name={ticket.isWinner ? "trophy" : "ticket"}
            size={24}
            color={ticket.isWinner ? "#FFD700" : Colors.light.accent}
          />
        </View>
      </View>
      <View style={styles.ticketMiddle}>
        <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
        <Text style={styles.ticketDate}>
          {new Date(ticket.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
        {ticket.isWinner && (
          <View style={styles.winnerBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.winnerText}>WINNER</Text>
          </View>
        )}
      </View>
      <View style={styles.ticketRight}>
        <View style={styles.dashedLine} />
      </View>
    </View>
  );
}

export default function TicketsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const {
    data: tickets,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
    enabled: !!user,
    staleTime: 5000,
  });

  const onRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    refetch();
  }, [refetch]);

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={{ paddingTop: Platform.OS === "web" ? 67 : insets.top }}>
          <Ionicons name="ticket-outline" size={56} color={Colors.light.tabIconDefault} />
          <Text style={styles.emptyTitle}>Sign in to view tickets</Text>
          <Text style={styles.emptyText}>
            Your raffle tickets will appear here after purchasing
          </Text>
          <Pressable
            onPress={() => router.push("/auth")}
            style={styles.signInButton}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TicketItem ticket={item} />}
        ListHeaderComponent={
          <View style={{ paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16 }}>
            <Text style={styles.screenTitle}>My Tickets</Text>
            <Text style={styles.screenSubtitle}>
              {tickets?.length || 0} total tickets
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="ticket-outline" size={48} color={Colors.light.tabIconDefault} />
            <Text style={styles.emptyTitle}>No tickets yet</Text>
            <Text style={styles.emptyText}>
              Purchase from a campaign to receive raffle tickets
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 84 + 20 : 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={Colors.light.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.light.text,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  screenSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  ticketCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  winnerCard: {
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  ticketLeft: {
    width: 70,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(212, 168, 83, 0.06)",
  },
  ticketIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(212, 168, 83, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  ticketMiddle: {
    flex: 1,
    padding: 16,
  },
  ticketNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: Colors.light.text,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ticketDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  winnerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  winnerText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#B8860B",
    letterSpacing: 1,
  },
  ticketRight: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  dashedLine: {
    width: 2,
    height: "70%",
    borderLeftWidth: 2,
    borderLeftColor: Colors.light.border,
    borderStyle: "dashed",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  signInButton: {
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    alignSelf: "center",
  },
  signInButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
});
