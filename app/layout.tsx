import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniApp",
  description: "Single-user local-first AI command layer"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
