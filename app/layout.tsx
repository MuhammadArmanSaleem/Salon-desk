import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "MUSK by Lubna Arif — Salon & Bridal Studio",
  description:
    "A salon website concept with appointment requests and a secure staff management portal.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
