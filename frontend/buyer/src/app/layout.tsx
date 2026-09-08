import type { Metadata } from "next";
import "./globals.css";
import { CustomerAuthProvider } from "@/context/CustomerAuthContext";

export const metadata: Metadata = {
  title: "ShilpSetu | Handcrafted, meaningfully made",
  description: "Discover authentic handmade products and the artisans who make them.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CustomerAuthProvider>{children}</CustomerAuthProvider>
      </body>
    </html>
  );
}
