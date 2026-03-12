import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Campaign, CampaignProduct } from "@shared/schema";

export interface CartItem {
  campaignId: string;
  productId?: string;
  productName?: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  prizeName: string;
  maxQuantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (campaign: Campaign, quantity: number, product?: CampaignProduct) => void;
  removeItem: (campaignId: string, productId?: string) => void;
  updateQuantity: (campaignId: string, quantity: number, productId?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | null>(null);
const CART_STORAGE_KEY = "forsa_cart";

function itemKey(item: { campaignId: string; productId?: string }) {
  return item.productId ? `${item.campaignId}:${item.productId}` : item.campaignId;
}

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

  const addItem = useCallback((campaign: Campaign, quantity: number, product?: CampaignProduct) => {
    setItems((prev) => {
      const matchKey = product ? `${campaign.id}:${product.id}` : campaign.id;
      const existing = prev.find((i) => itemKey(i) === matchKey);

      let remaining: number;
      let unitPrice: number;

      if (product) {
        remaining = product.quantity - product.soldQuantity;
        unitPrice = parseFloat(product.price);
      } else {
        remaining = campaign.totalQuantity - campaign.soldQuantity;
        unitPrice = parseFloat(campaign.productPrice);
      }

      const maxQty = Math.min(remaining, 10);

      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, maxQty);
        return prev.map((i) =>
          itemKey(i) === matchKey ? { ...i, quantity: newQty, maxQuantity: maxQty, price: unitPrice } : i
        );
      }
      return [
        ...prev,
        {
          campaignId: campaign.id,
          productId: product?.id,
          productName: product?.nameAr || product?.name,
          title: campaign.title,
          price: unitPrice,
          quantity: Math.min(quantity, maxQty),
          imageUrl: product?.imageUrl || campaign.imageUrl,
          prizeName: campaign.prizeName,
          maxQuantity: maxQty,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((campaignId: string, productId?: string) => {
    const matchKey = productId ? `${campaignId}:${productId}` : campaignId;
    setItems((prev) => prev.filter((i) => itemKey(i) !== matchKey));
  }, []);

  const updateQuantity = useCallback((campaignId: string, quantity: number, productId?: string) => {
    const matchKey = productId ? `${campaignId}:${productId}` : campaignId;
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => itemKey(i) !== matchKey));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        itemKey(i) === matchKey
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
