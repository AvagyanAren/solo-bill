import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { RouteProvider } from "@/providers/route-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { ToastProvider } from "@/providers/toast-provider";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SoloBill",
  description:
    "Local-first invoicing for freelancers with AI draft, PDF export, mock reminders, and manual payment tracking",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full scroll-smooth`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-primary text-primary antialiased">
        <RouteProvider>
          <ThemeProvider>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </RouteProvider>
      </body>
    </html>
  );
}
