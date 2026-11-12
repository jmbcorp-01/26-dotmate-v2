// 포트폴리오 데이터. 항목을 추가하면 /portfolio 페이지와 메인에 자동으로 보입니다.
// image는 public/portfolio/ 아래 파일 경로 (예: "/portfolio/brand-a.jpg").
export type ServiceSlug = "commerce" | "erp" | "app" | "web";

export type Project = {
  client: string; // 고객사 이름 (공개 동의 받은 경우만)
  title: string; // 프로젝트 한 줄 제목
  summary: string; // 무엇을 만들었고 무엇이 달라졌는지
  service: ServiceSlug; // 해당 .AX 서비스
  industry: string; // 업종 (예: 패션, 제조)
  year: number;
  image?: string;
  ax?: boolean; // AX 전환 사례 여부 (기존 구축 사례는 false)
};

export const projects: Project[] = [];
