import Link from "next/link";
import type { ReactNode } from "react";

const BASE_CLASSES =
  "inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:not-disabled:scale-[0.97]";

const VARIANT_CLASSES = {
  primary: "bg-secondary text-background hover:bg-secondary-hover hover:shadow-[0_0_16px_rgba(196,148,30,0.4)] focus:ring-secondary/50",
  secondary:
    "bg-transparent text-neon-cyan border border-neon-cyan/40 hover:border-neon-cyan hover:shadow-[0_0_12px_rgba(0,240,255,0.3)] focus:ring-neon-cyan/40",
  ghost: "text-muted hover:text-neon-cyan hover:bg-surface-light focus:ring-neon-cyan/30",
} as const;

const SIZE_CLASSES = {
  sm: "text-sm px-3 py-1.5 gap-1.5",
  md: "text-sm px-5 py-2.5 gap-2",
  lg: "text-base px-6 py-3 gap-2.5",
} as const;

type ButtonBase = {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
};

type ButtonAsButton = ButtonBase & {
  href?: never;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

type ButtonAsLink = ButtonBase & {
  href: string;
  disabled?: never;
  type?: never;
  onClick?: never;
};

type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className = "", children } = props;
  const classes = `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;

  if (props.href) {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const { disabled, type = "button", onClick } = props;

  return (
    <button
      className={classes}
      disabled={disabled}
      type={type}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
