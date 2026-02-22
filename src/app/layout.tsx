import type { Metadata, Viewport } from "next";
import { Geist, Orbitron } from "next/font/google";
import { DreddFeedbackProvider } from "@/lib/dredd-feedback-context";
import { UserBadge } from "@/components/user-badge";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3999"),
  title: "Dredd — Tribunal de Mega-City One",
  description: "Système judiciaire de Mega-City One. Soumettez vos litiges au Jugement Majoritaire — la mention médiane fait loi.",
};

export const viewport: Viewport = {
  themeColor: "#00f0ff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${orbitron.variable} antialiased`}>
        <DreddFeedbackProvider>
          <UserBadge />
          {children}
        </DreddFeedbackProvider>
      </body>
    </html>
  );
}
