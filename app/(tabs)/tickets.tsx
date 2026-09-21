import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { queryClient } from "@/lib/query-client";
import Colors, { Fonts, FontSize, Radius, Spacing } from "@/constants/colors";
import { Header, StatusBadge, EmptyState, NavRow } from "@/components/ui";
import DrawBanner, { type CurrentDraw } from "@/components/DrawBanner";
import type { Ticket } from "@shared/schema";

const c = Colors.light;

/** قسيمة سحب — بطاقة بيضاء بحدود متقطعة ورقم كحلي */
function ChanceCard({ ticket, drawTitle }: { ticket: Ticket; drawTitle: string }) {
  return (
    <View style={[s.chanceCard, ticket.isWinner && s.chanceCardWinner]}>
      <View style={s.chanceTop}>
        <StatusBadge
          kind={ticket.isWinner ? "success" : "success"}
          label={ticket.isWinner ? "فائزة" : "مؤكدة"}
          icon={ticket.isWinner ? "trophy" : "checkmark-circle"}
        />
        <Text style={s.chanceNumber}>{ticket.ticketNumber}</Text>
      </View>
      <View style={s.chanceDivider} />
      <Text style={s.chanceDraw}>{drawTitle}</Text>
    </View>
  );
}

export default function TicketsScreen() {
  const { user } = useAuth();

  const { data: draw } = useQuery<CurrentDraw | null>({
    queryKey: ["/api/draws/current"],
    refetchInterval: 15000,
    staleTime: 5000,
  });

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
    queryClient.invalidateQueries({ queryKey: ["/api/draws/current"] });
    refetch();
  }, [refetch]);

  if (!user) {
    return (
      <View style={s.root}>
        <Header title="قسائمي" />
        <EmptyState
          icon="ticket-outline"
          title="سجّل الدخول لعرض قسائمك"
          body="بتظهر هنا فرصك بالسحب"
          action={{ label: "تسجيل الدخول", onPress: () => router.push("/auth") }}
        />
      </View>
    );
  }

  const currentTickets = (tickets ?? []).filter((t) => draw && t.drawId === draw.id);
  const pendingTickets = (tickets ?? []).filter((t) => t.drawId === null);

  return (
    <View style={s.root}>
      <Header title="قسائمي" />

      {isLoading ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={c.primary} />
          }
        >
          {draw && <DrawBanner draw={draw} onPress={() => router.push("/draw" as any)} />}

          {currentTickets.length === 0 && pendingTickets.length === 0 ? (
            <EmptyState
              icon="ticket-outline"
              title="ما عندك فرص بعد"
              body="اشترِ من المتجر وكل مبلغ محدّد من مشترياتك بيعطيك فرصة"
              action={{
                label: "تصفّح المتجر",
                onPress: () => router.push("/(tabs)/products" as any),
              }}
            />
          ) : (
            <>
              {currentTickets.map((t) => (
                <ChanceCard key={t.id} ticket={t} drawTitle={draw?.title ?? "السحب الحالي"} />
              ))}

              {pendingTickets.length > 0 && (
                <>
                  <Text style={s.groupTitle}>بانتظار السحب القادم</Text>
                  {pendingTickets.map((t) => (
                    <ChanceCard key={t.id} ticket={t} drawTitle="لم يُحدَّد بعد" />
                  ))}
                </>
              )}
            </>
          )}

          <NavRow
            icon="information-circle-outline"
            title="شروط السحب"
            subtitle="اطّلع على جميع تفاصيل وآلية السحب والمعايير المعتمدة."
            onPress={() => router.push({ pathname: "/info", params: { type: "terms" } } as any)}
          />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },


  content: {
    padding: Spacing.screen,
    paddingBottom: Platform.OS === "web" ? 110 : 120,
    gap: Spacing.md,
  },
  groupTitle: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.caption,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: Spacing.sm,
  },

  chanceCard: {
    backgroundColor: c.surface,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: c.border,
  },
  chanceCardWinner: { borderColor: c.gold, backgroundColor: c.goldSoft },
  chanceTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chanceNumber: {
    fontFamily: Fonts.bold,
    fontSize: FontSize.h3,
    color: c.navy,
    /** ثابت الاتجاه حتى ما ينعكس ضمن النص العربي */
    writingDirection: "ltr",
  },
  chanceDivider: { height: StyleSheet.hairlineWidth, backgroundColor: c.borderSubtle },
  chanceDraw: {
    fontFamily: Fonts.regular,
    fontSize: FontSize.label,
    color: c.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },

});
