import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Campaign } from "@shared/schema";

export interface CartItem {
  campaignId: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  prizeName: string;
  maxQuantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (campaign: Campaign, quantity: number) => void;
  removeItem: (campaignId: string) => void;
  updateQuantity: (campaignId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | null>(null);
const CART_STORAGE_KEY = "luckydraw_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY).then((data) => {
      if (data) {
        try {
          setItems(JSON.parse(data));
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, loaded]);

  const addItem = useCallback((campaign: Campaign, quantity: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.campaignId === campaign.id);
      const remaining = campaign.totalQuantity - campaign.soldQuantity;
      const maxQty = Math.min(remaining, 10);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, maxQty);
        return prev.map((i) =>
          i.campaignId === campaign.id ? { ...i, quantity: newQty, maxQuantity: maxQty } : i
        );
      }
      return [
        ...prev,
        {
          campaignId: campaign.id,
          title: campaign.title,
          price: parseFloat(campaign.productPrice),
          quantity: Math.min(quantity, maxQty),
          imageUrl: campaign.imageUrl,
          prizeName: campaign.prizeName,
          maxQuantity: maxQty,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((campaignId: string) => {
    setItems((prev) => prev.filter((i) => i.campaignId !== campaignId));
  }, []);

  const updateQuantity = useCallback((campaignId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.campaignId !== campaignId));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.campaignId === campaignId
          ? { ...i, quantity: Math.min(quantity, i.maxQuantity) }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
