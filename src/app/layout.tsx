import type { Metadata } from "next";
import localFont from "next/font/local";
import { AccessibleToaster } from "@/components/providers/AccessibleToaster";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  // Title template lets per-route layouts override only the page label
  // (e.g. `<title>Inventory · Bakaloo Admin Dashboard</title>`) while
  // keeping a consistent suffix across the app (Req 13.7, 16.5).
  title: {
    default: "Bakaloo Admin Dashboard",
    template: "%s · Bakaloo Admin Dashboard",
  },
  description: "Grocery store admin panel — manage orders, products, riders, analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Leaflet CSS — loaded globally so the map component has styles regardless of mount order */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-[var(--surface-bg)]`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <AccessibleToaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{ duration: 4000 }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
