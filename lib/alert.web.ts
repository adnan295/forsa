import type { AlertButton, AlertOptions } from "react-native";

// React Native's Alert is a no-op on web. Preserve the callbacks used by checkout.
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], _options?: AlertOptions) {
    if (typeof window === "undefined") return;
    const text = [title, message].filter(Boolean).join("\n\n");
    const actions = buttons || [];
    if (actions.length <= 1) {
      window.alert(text);
      actions[0]?.onPress?.();
      return;
    }
    const cancel = actions.find(button => button.style === "cancel");
    const action = actions.find(button => button.style !== "cancel");
    if (window.confirm(text)) action?.onPress?.();
    else cancel?.onPress?.();
  },
};
