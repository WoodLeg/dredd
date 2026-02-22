"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { usePress } from "@react-aria/interactions";
import { JudgeDredd } from "@/app/icons/dredd/judge";

interface DreddFeedbackProps {
  message: string | string[];
  variant: "error" | "success";
  visible: boolean;
  autoDismissMs?: number;
  onDismiss: () => void;
}

const DEFAULT_DISMISS_MS = {
  error: 5000,
  success: 3000,
} as const;

export function DreddFeedback({
  message,
  variant,
  visible,
  autoDismissMs,
  onDismiss,
}: DreddFeedbackProps) {
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  const dismissMs = autoDismissMs ?? DEFAULT_DISMISS_MS[variant];

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => onDismissRef.current(), dismissMs);
      return () => clearTimeout(timer);
    }
  }, [visible, dismissMs]);

  const { pressProps } = usePress({ onPress: onDismiss });

  const bubbleBorder =
    variant === "error"
      ? "border-[#ff0040]/60 shadow-[0_0_24px_rgba(255,0,64,0.4)]"
      : "border-neon-cyan/60 shadow-[0_0_24px_rgba(0,240,255,0.4)]";

  const tailColor =
    variant === "error"
      ? "border-t-[#ff0040]/60"
      : "border-t-neon-cyan/60";

  const messages = Array.isArray(message) ? message : [message];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{
            type: "spring",
            damping: 22,
            stiffness: 260,
          }}
          role="alert"
          aria-live="assertive"
          className="fixed bottom-0 left-0 right-0 z-50"
        >
          <div
            {...pressProps}
            className="relative flex items-end justify-center cursor-pointer max-w-2xl mx-auto"
          >
            {/* Speech bubble — positioned above the character */}
            <div className="absolute bottom-[200px] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-10">
              <div
                className={`relative rounded-2xl border-2 bg-surface/95 backdrop-blur-sm px-5 py-4 ${bubbleBorder}`}
              >
                {messages.map((msg, i) => (
                  <p
                    key={i}
                    className="text-sm font-bold text-foreground leading-relaxed"
                  >
                    {msg}
                  </p>
                ))}
                {/* Bubble tail pointing down */}
                <div
                  className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] ${tailColor}`}
                />
              </div>
            </div>

            {/* Judge Dredd character — slides up from below */}
            <div className="w-[300px] h-[240px] pointer-events-none [&_svg]:w-full [&_svg]:h-full">
              <JudgeDredd />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
