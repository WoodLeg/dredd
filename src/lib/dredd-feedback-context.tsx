"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DreddFeedback } from "@/components/ui/dredd-feedback";

type DreddVariant = "error" | "success";

interface DreddMessage {
  message: string | string[];
  variant: DreddVariant;
  autoDismissMs?: number;
}

interface DreddFeedbackContextType {
  showDredd: (msg: DreddMessage) => void;
  dismiss: () => void;
}

const DreddFeedbackContext = createContext<DreddFeedbackContextType | null>(null);

export function useDreddFeedback(): DreddFeedbackContextType {
  const ctx = useContext(DreddFeedbackContext);
  if (!ctx) {
    throw new Error("useDreddFeedback must be used within DreddFeedbackProvider");
  }
  return ctx;
}

export function DreddFeedbackProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<DreddMessage | null>(null);

  const dismiss = useCallback(() => setCurrent(null), []);

  const showDredd = useCallback((msg: DreddMessage) => {
    setCurrent(msg);
  }, []);

  const value = useMemo(() => ({ showDredd, dismiss }), [showDredd, dismiss]);

  return (
    <DreddFeedbackContext.Provider value={value}>
      {children}
      <DreddFeedback
        message={current?.message ?? ""}
        variant={current?.variant ?? "error"}
        visible={current !== null}
        autoDismissMs={current?.autoDismissMs}
        onDismiss={dismiss}
      />
    </DreddFeedbackContext.Provider>
  );
}
