import type { Metadata } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://dotmate.co.kr"),
  title: {
    default: "닷메이트 | 낡은 시스템을 AI 시스템으로",
    template: "%s | 닷메이트",
  },
  description:
    "쇼핑몰, ERP, 앱, 홈페이지. 닷메이트가 중소기업의 낡은 시스템을 AI 시스템으로 다시 만듭니다. 무료 .AX 진단으로 시작하세요.",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "닷메이트",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
