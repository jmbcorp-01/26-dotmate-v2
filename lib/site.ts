// 회사 정보와 검색 노출(SEO/GEO) 설정을 한곳에 모읍니다.
import type { Metadata } from "next";

export const site = {
  url: "https://dotmate.co.kr",
  name: "닷메이트",
  nameEn: "dotmate",
  slogan: "낡은 시스템을 AI 시스템으로",
  defaultTitle: "닷메이트 | 낡은 시스템을 AI 시스템으로, 중소기업 AX 전환",
  description:
    "닷메이트는 2017년부터 웹, 앱, 쇼핑몰, 사내 시스템을 만들어 온 개발 회사입니다. 중소기업의 쇼핑몰, ERP, 앱, 홈페이지를 AI 중심 시스템으로 다시 만드는 AX 전환을 합니다.",
  businessNumber: "328-31-00498",
  foundingYear: "2017",
  email: "dotmate@dotmate.co.kr",
};

// 검색엔진 소유 확인 코드. 네이버 서치어드바이저, 구글 서치 콘솔에서 받은 "content" 값만 넣으세요.
// 비워 두면 태그가 나가지 않습니다.
export const verification = {
  google: "",
  naver: "",
};

type PageMetaInput = {
  title?: string; // 비우면 기본 제목
  description: string;
  path: string; // "/services/erp/" 처럼 끝에 / 포함
  image?: string; // public/og/ 아래 파일 이름 (확장자 제외)
};

/** 페이지별 메타: 제목, 설명, 대표 주소(canonical), 공유 카드(OG/Twitter) */
export function pageMeta({ title, description, path, image = "home" }: PageMetaInput): Metadata {
  const ogImage = { url: `/og/${image}.png`, width: 1200, height: 630, alt: title ?? site.slogan };
  const fullTitle = title ? `${title} | ${site.name}` : site.defaultTitle;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: site.name,
      url: path,
      title: fullTitle,
      description,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage.url],
    },
  };
}

export const orgId = `${site.url}/#organization`;
