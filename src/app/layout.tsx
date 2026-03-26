import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "フェリアホーム 管理システム",
  description: "物件・顧客・契約・売上の一元管理",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
