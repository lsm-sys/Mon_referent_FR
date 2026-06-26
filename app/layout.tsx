import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mon referent FR",
  description: "Traitement pour les reseaux sociaux",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="font-sans">{children}</body>
    </html>
  );
}
