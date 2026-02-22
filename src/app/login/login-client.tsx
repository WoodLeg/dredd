"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLayout } from "@/components/page-layout";
import { useDreddFeedback } from "@/lib/dredd-feedback-context";

interface LoginClientProps {
  callbackUrl: string;
  enableTestAuth: boolean;
  error?: string;
}

export function LoginClient({ callbackUrl, enableTestAuth, error }: LoginClientProps) {
  const { showDredd } = useDreddFeedback();
  const [isLoading, setIsLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testPassword, setTestPassword] = useState("");
  const [testName, setTestName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    if (error === "access_denied") {
      showDredd({ message: "Authentification refusée par le citoyen.", variant: "error" });
    }
  }, [error, showDredd]);

  async function handleGoogleSignIn() {
    setIsLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
      });
    } catch {
      showDredd({ message: "Connexion Google échouée", variant: "error" });
      setIsLoading(false);
    }
  }

  async function handleTestAuth(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const result = await authClient.signUp.email({
          email: testEmail,
          password: testPassword,
          name: testName || "Juge Test",
        });
        if (result.error) {
          showDredd({ message: result.error.message ?? "Erreur d'inscription", variant: "error" });
          setIsLoading(false);
          return;
        }
      }

      const result = await authClient.signIn.email({
        email: testEmail,
        password: testPassword,
      });
      if (result.error) {
        showDredd({ message: result.error.message ?? "Identifiants invalides", variant: "error" });
        setIsLoading(false);
        return;
      }

      window.location.href = callbackUrl;
    } catch {
      showDredd({ message: "Erreur de connexion", variant: "error" });
      setIsLoading(false);
    }
  }

  return (
    <PageLayout>
      <main className="w-full max-w-sm flex flex-col gap-8 animate-fade-in-up">
        <div className="text-center">
          <h1 className="text-2xl font-heading font-bold uppercase tracking-wider crt-flicker">
            Identification requise
          </h1>
          <p className="text-muted text-sm mt-2">
            Authentifiez-vous pour accéder au Tribunal, citoyen.
          </p>
        </div>

        <Button
          size="lg"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Connexion en cours..." : "Se connecter avec Google"}
        </Button>

        {enableTestAuth && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted uppercase">Test Mode</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleTestAuth} className="flex flex-col gap-3">
              {isSignUp && (
                <Input
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="Nom (ex: Juge Test)"
                  maxLength={100}
                />
              )}
              <Input
                type="email"
                name="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Email"
                required
              />
              <Input
                type="password"
                name="password"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                placeholder="Mot de passe"
                required
                minLength={6}
              />
              <Button type="submit" variant="secondary" disabled={isLoading}>
                {isSignUp ? "Créer un compte test" : "Connexion test"}
              </Button>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                {isSignUp ? "Déjà un compte ? Se connecter" : "Créer un compte test"}
              </button>
            </form>
          </>
        )}
      </main>
    </PageLayout>
  );
}
