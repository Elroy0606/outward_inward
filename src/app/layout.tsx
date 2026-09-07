import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inward Outward Shipment Tracker",
  description: "Track inbound and outbound shipments in one dynamic, visual dashboard.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div aria-hidden className="atmosphere fixed inset-0 -z-20" />
        <div
          aria-hidden
          className="bg-grid fixed inset-0 -z-10 opacity-60 [mask-image:radial-gradient(ellipse_65%_55%_at_50%_0%,black,transparent)]"
        />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
