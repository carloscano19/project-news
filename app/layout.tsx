import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Project News · Señal entre Ruido · SEO, GEO e IA Search",
  description: "Curación semanal de alta señal sobre SEO, GEO e Inteligencia Artificial en Búsqueda.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="antialiased bg-[#0F1115] text-[#F5F3EE] font-sans selection:bg-[#FF4D2E] selection:text-white">
        {children}
      </body>
    </html>
  );
}
