import type { Metadata } from "next";
import "./globals.css";
import "./trading.css";
import { GameSessionProvider } from "@/components/GameSessionProvider";

export const metadata: Metadata = {
  title: "Chart Battle — バズの波を、つかめ。",
  description:
    "Xトレンド仮想トレードゲーム。10,000コインで、モック市場の24時間の波を売買するプロトタイプ。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <GameSessionProvider>{children}</GameSessionProvider>
      </body>
    </html>
  );
}
