import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string | null;
}

export function Input({ error, className = "", ...props }: InputProps) {
  return (
    <div className="w-full">
      <input
        className={`w-full border bg-surface px-4 py-2.5 text-foreground placeholder:text-muted outline-none transition-all duration-300 focus:border-neon-cyan/60 focus:shadow-[0_0_12px_rgba(0,240,255,0.3)] ${
          error
            ? "border-grade-a-rejeter shadow-[0_0_8px_rgba(255,0,64,0.3)]"
            : "border-border"
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-grade-a-rejeter">{error}</p>
      )}
    </div>
  );
}
