import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Titre et description affichés dans l'onglet et dans l'aperçu des liens (Discord, réseaux...).
export const metadata: Metadata = {
  metadataBase: new URL("https://grand-line-chronicles.fr"),
  title: "Wiki AOP — Age of Piracy",
  description: "Le wiki du JDR One Piece Age of Piracy : personnages, fruits du démon, lames, îles, factions et journaux de bord.",
  openGraph: {
    title: "Wiki AOP — Age of Piracy",
    description: "Le wiki du JDR One Piece Age of Piracy : personnages, fruits du démon, lames, îles, factions et journaux de bord.",
    url: "/",
    siteName: "Wiki AOP",
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
