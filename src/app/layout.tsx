import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "HotBowl Surveys",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>{children}</body>
    </html>
  );
}
