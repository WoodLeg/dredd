"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { authClient } from "@/lib/auth-client";

export function UserBadge() {
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [imgError, setImgError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const signingOutRef = useRef(false);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Hidden on login page
  if (pathname === "/login") return null;

  // Loading skeleton
  if (isPending) {
    return (
      <div className="fixed top-4 right-4 z-40">
        <div className="h-9 w-24 rounded-full bg-surface-light/60 animate-pulse" />
      </div>
    );
  }

  // Not authenticated
  if (!session?.user) return null;

  const { user } = session;
  const initials = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();

  async function handleSignOut() {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    setSigningOut(true);
    try {
      await authClient.signOut();
      router.push("/login");
    } catch {
      signingOutRef.current = false;
      setSigningOut(false);
    }
  }

  return (
    <div ref={containerRef} className="fixed top-4 right-4 z-40">
      {/* Collapsed badge */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Identité du Juge"
        aria-expanded={open}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/90 backdrop-blur-sm border border-neon-cyan/20 hover:border-neon-cyan/40 transition-all cursor-pointer active:scale-[0.95]"
      >
        {user.image && !imgError ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Google avatar needs referrerPolicy="no-referrer" */
          <img
            src={user.image}
            alt=""
            width={28}
            height={28}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-7 h-7 rounded-full ring-1 ring-neon-cyan/40 object-cover"
          />
        ) : (
          <span className="w-7 h-7 rounded-full bg-neon-cyan/20 text-neon-cyan flex items-center justify-center text-xs font-heading font-bold">
            {initials}
          </span>
        )}
        <span className="font-heading text-xs uppercase tracking-wider text-neon-cyan max-w-[120px] truncate hidden sm:inline">
          {user.name ?? "Juge"}
        </span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="absolute right-0 top-full mt-2 w-64 rounded-lg bg-surface/95 backdrop-blur-md border border-neon-cyan/20 shadow-[0_0_24px_rgba(0,240,255,0.08)] overflow-hidden"
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                {user.image && !imgError ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- Google avatar needs referrerPolicy="no-referrer" */
                  <img
                    src={user.image}
                    alt=""
                    width={36}
                    height={36}
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="w-9 h-9 rounded-full ring-1 ring-neon-cyan/40 object-cover"
                  />
                ) : (
                  <span className="w-9 h-9 rounded-full bg-neon-cyan/20 text-neon-cyan flex items-center justify-center text-sm font-heading font-bold">
                    {initials}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-heading font-bold text-foreground uppercase tracking-wider truncate">
                    {user.name ?? "Juge"}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Dashboard link */}
            <div className="px-2 py-2 border-b border-border">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neon-cyan hover:bg-neon-cyan/10 rounded-md transition-colors"
              >
                Mes Dossiers
              </Link>
            </div>

            {/* Sign out */}
            <div className="px-2 py-2">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full text-left px-3 py-2 text-sm text-neon-magenta hover:bg-neon-magenta/10 rounded-md transition-colors cursor-pointer disabled:opacity-40"
              >
                {signingOut ? "Déconnexion..." : "Quitter le Tribunal"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
