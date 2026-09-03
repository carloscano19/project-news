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

const SITE_URL = "https://project-news-lac.vercel.app";
const TITLE = "Lo que importa esta semana en Search, IA, Data y Paid Media · Project News";
const DESCRIPTION =
  "Curación algorítmica y editorial con filtro estricto de relevancia: descartamos el ruido diario y extraemos solo los cambios con impacto práctico en Search, IA, Data y Paid Media.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Project News",
  },
  description: DESCRIPTION,
  applicationName: "Project News",
  authors: [{ name: "Project News Editorial" }],
  generator: "Next.js",
  keywords: [
    "Search",
    "SEO",
    "GEO",
    "Generative Engine Optimization",
    "AI Search",
    "Google Ads",
    "Meta Ads",
    "Paid Media",
    "Data & Analytics",
    "Google Analytics 4",
    "GA4",
    "Google Tag Manager",
    "GTM",
    "ChatGPT Search",
    "Google AI Overviews",
    "Search Console",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Project News",
    locale: "es_ES",
    alternateLocale: ["en_US"],
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Project News · Señal entre Ruido · Resumen Semanal Search, IA, Data y Paid Media",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
    creator: "@carloscano",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
