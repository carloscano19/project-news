import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project News · SEO/GEO/IA Search",
  description: "Newsletter semanal automatizada de SEO, GEO e IA Search",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
