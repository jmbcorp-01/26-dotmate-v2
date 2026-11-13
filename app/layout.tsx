import type { Metadata } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Motion from "@/components/Motion";

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
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 첫 화면이 그려지기 전에 모션 사용 여부를 정합니다. 스크립트가 3초 안에 준비되지 않으면 모션을 끄고 내용을 그대로 보여줍니다. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;var r=document.documentElement;r.classList.add('js-motion');setTimeout(function(){if(!window.__motionReady)r.classList.remove('js-motion')},3000)}catch(e){}})();",
          }}
        />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
        <Motion />
      </body>
    </html>
  );
}
