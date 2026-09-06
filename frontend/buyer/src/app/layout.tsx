import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShilpSetu | Handcrafted, meaningfully made",
  description: "Discover authentic handmade products and the artisans who make them.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
