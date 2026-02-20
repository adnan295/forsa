import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/query-client";
import type { Campaign } from "@shared/schema";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: stats } = useQuery<{
    totalCampaigns: number;
    activeCampaigns: number;
    completedCampaigns: number;
    totalRevenue: string;
  }>({
    queryKey: ["/api/admin/stats"],
    enabled: isAdmin,
  });

  const drawMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const res = await apiRequest("POST", `/api/admin/draw/${campaignId}`);
      return res.json();
    },
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Winner Drawn!", data.message);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Draw failed");
    },
  });

  function handleDraw(campaign: Campaign) {
    Alert.alert(
      "Draw Winner",
      `Are you sure you want to draw a winner for "${campaign.title}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Draw",
          style: "destructive",
          onPress: () => drawMutation.mutate(campaign.id),
        },
      ]
    );
  }

  async function handleLogout() {
    await logout();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={{ paddingTop: Platform.OS === "web" ? 67 : insets.top, alignItems: "center" }}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={40} color={Colors.light.tabIconDefault} />
          </View>
          <Text style={styles.emptyTitle}>Sign in to your account</Text>
          <Text style={styles.emptyText}>
            Manage your profile and view your activity
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

  const soldOutCampaigns =
    campaigns?.filter(
      (c) => c.status === "sold_out" || c.status === "drawing"
    ) || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: Platform.OS === "web" ? 67 + 16 : insets.top + 16,
        paddingBottom: Platform.OS === "web" ? 84 + 20 : 100,
        paddingHorizontal: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileCard}>
        <LinearGradient
          colors={["#0A1628", "#1A2D4A"]}
          style={styles.profileGradient}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileName}>{user.username}</Text>
          <Text style={styles.profileEmail}>{user.email}</Text>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#FFD700" />
              <Text style={styles.adminText}>Admin</Text>
            </View>
          )}
        </LinearGradient>
      </View>

      {isAdmin && stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admin Dashboard</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="bar-chart"
              label="Total Campaigns"
              value={stats.totalCampaigns.toString()}
              color="#3498DB"
            />
            <StatCard
              icon="flame"
              label="Active"
              value={stats.activeCampaigns.toString()}
              color={Colors.light.accent}
            />
            <StatCard
              icon="checkmark-circle"
              label="Completed"
              value={stats.completedCampaigns.toString()}
              color={Colors.light.success}
            />
            <StatCard
              icon="cash"
              label="Revenue"
              value={`$${stats.totalRevenue}`}
              color="#9B59B6"
            />
          </View>
        </View>
      )}

      {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Campaign Management</Text>

          <Pressable
            onPress={() => setShowCreateModal(true)}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons name="add-circle" size={22} color={Colors.light.accent} />
            <Text style={styles.actionButtonText}>Create New Campaign</Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={Colors.light.textSecondary}
            />
          </Pressable>

          {soldOutCampaigns.length > 0 && (
            <View style={styles.drawSection}>
              <Text style={styles.drawTitle}>Ready for Draw</Text>
              {soldOutCampaigns.map((c) => (
                <View key={c.id} style={styles.drawItem}>
                  <View style={styles.drawInfo}>
                    <Text style={styles.drawItemTitle}>{c.title}</Text>
                    <Text style={styles.drawItemSub}>
                      {c.soldQuantity} tickets sold
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleDraw(c)}
                    disabled={drawMutation.isPending}
                    style={({ pressed }) => [
                      styles.drawButton,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    {drawMutation.isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="dice" size={16} color="#fff" />
                        <Text style={styles.drawButtonText}>Draw</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="log-out-outline" size={22} color={Colors.light.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
      </View>

      <CreateCampaignModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </ScrollView>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={statStyles.card}>
      <View style={[statStyles.iconWrap, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function CreateCampaignModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [prizeName, setPrizeName] = useState("");
  const [prizeDesc, setPrizeDesc] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/campaigns", data);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      onClose();
      setTitle("");
      setDescription("");
      setPrice("");
      setQuantity("");
      setPrizeName("");
      setPrizeDesc("");
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Failed to create campaign");
    },
  });

  function handleCreate() {
    if (!title || !description || !price || !quantity || !prizeName) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    createMutation.mutate({
      title,
      description,
      productPrice: price,
      totalQuantity: parseInt(quantity),
      prizeName,
      prizeDescription: prizeDesc || undefined,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>New Campaign</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={modalStyles.scrollContent}
          >
            <ModalInput label="Title *" value={title} onChangeText={setTitle} placeholder="Campaign name" />
            <ModalInput label="Description *" value={description} onChangeText={setDescription} placeholder="Describe the product" multiline />
            <ModalInput label="Price per item ($) *" value={price} onChangeText={setPrice} placeholder="29.99" keyboardType="decimal-pad" />
            <ModalInput label="Total Quantity *" value={quantity} onChangeText={setQuantity} placeholder="4000" keyboardType="number-pad" />
            <ModalInput label="Prize Name *" value={prizeName} onChangeText={setPrizeName} placeholder="iPhone 15 Pro Max" />
            <ModalInput label="Prize Description" value={prizeDesc} onChangeText={setPrizeDesc} placeholder="Optional details" multiline />

            <Pressable
              onPress={handleCreate}
              disabled={createMutation.isPending}
              style={({ pressed }) => [
                modalStyles.createBtn,
                pressed && { opacity: 0.9 },
                createMutation.isPending && { opacity: 0.6 },
              ]}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={modalStyles.createBtnText}>Create Campaign</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ModalInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: any;
}) {
  return (
    <View style={modalStyles.inputGroup}>
      <Text style={modalStyles.inputLabel}>{label}</Text>
      <TextInput
        style={[modalStyles.input, multiline && { height: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.light.tabIconDefault}
        multiline={multiline}
        keyboardType={keyboardType}
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
  profileCard: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 24,
  },
  profileGradient: {
    padding: 24,
    alignItems: "center",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(212, 168, 83, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.light.accent,
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: Colors.light.accent,
  },
  profileName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  profileEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 12,
  },
  adminText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#FFD700",
    letterSpacing: 0.5,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.progressBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  signInButton: {
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  signInButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
  },
  drawSection: {
    marginTop: 16,
  },
  drawTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginBottom: 10,
  },
  drawItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  drawInfo: {
    flex: 1,
  },
  drawItemTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.text,
  },
  drawItemSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  drawButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  drawButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.danger,
  },
});

const statStyles = StyleSheet.create({
  card: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  value: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.light.text,
    marginBottom: 2,
  },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.light.text,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  createBtn: {
    backgroundColor: Colors.light.accent,
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  createBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
});
