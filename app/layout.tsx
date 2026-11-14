import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Motion from "@/components/Motion";
import JsonLd from "@/components/JsonLd";
import { site, verification, orgId } from "@/lib/site";

const verificationMeta: Metadata["verification"] = {
  ...(verification.google ? { google: verification.google } : {}),
  ...(verification.naver ? { other: { "naver-site-verification": verification.naver } } : {}),
};

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.defaultTitle,
    template: "%s | 닷메이트",
  },
  description:
    "쇼핑몰, ERP, 앱, 홈페이지. 2017년부터 시스템을 만들어 온 닷메이트가 중소기업의 낡은 시스템을 AI 시스템으로 다시 만듭니다. 무료 .AX 진단으로 시작하세요.",
  applicationName: site.name,
  keywords: ["AX 전환", "AI 전환", "중소기업 AI 도입", "AI 쇼핑몰", "AI ERP", "AI 앱 개발", "AI 홈페이지", "AI 검색 최적화", "닷메이트", "dotmate"],
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  publisher: site.name,
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  verification: verificationMeta,
  // 페이지마다 pageMeta()로 덮어씁니다. 여기에는 대표 주소(canonical)를 두지 않습니다.
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: site.name,
    images: [{ url: "/og/home.png", width: 1200, height: 630, alt: site.slogan }],
  },
  twitter: { card: "summary_large_image", images: ["/og/home.png"] },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

const orgLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": orgId,
      name: site.name,
      alternateName: [site.nameEn, ".mate", "닷메이트(dotmate)"],
      url: `${site.url}/`,
      logo: { "@type": "ImageObject", url: `${site.url}/icon-512.png`, width: 512, height: 512 },
      image: `${site.url}/og/home.png`,
      description: site.description,
      slogan: site.slogan,
      foundingDate: site.foundingYear,
      taxID: site.businessNumber,
      email: site.email,
      areaServed: { "@type": "Country", name: "대한민국" },
      knowsAbout: ["AX 전환", "AI 시스템 구축", "쇼핑몰 구축", "ERP 구축", "앱 개발", "홈페이지 제작", "AI 검색 최적화"],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: site.email,
        availableLanguage: ["ko"],
        url: `${site.url}/diagnosis/`,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      url: `${site.url}/`,
      name: site.name,
      alternateName: site.nameEn,
      inLanguage: "ko-KR",
      publisher: { "@id": orgId },
    },
  ],
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
        <JsonLd data={orgLd} />
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
