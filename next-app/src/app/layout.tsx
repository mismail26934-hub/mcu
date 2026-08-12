import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCU PDF to Excel",
  description:
    "Upload massal PDF MCU Trakindo/Tirta, proses ke Excel, preview, dan download.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
