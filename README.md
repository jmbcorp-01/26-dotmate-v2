# 26-dotmate-v2

닷메이트 리뉴얼 웹사이트. "낡은 시스템을 AI 시스템으로." 메시지로 중소기업 AX 전환 서비스(.AX 커머스, .AX ERP, .AX 앱, .AX 웹)를 소개합니다.

## 구성

- Next.js 16 (App Router), 정적 사이트로 빌드 (`output: "export"`)
- 서체: Pretendard (npm 패키지로 직접 호스팅)
- 서버가 없는 정적 파일이라 AWS S3 + CloudFront에 그대로 올릴 수 있습니다.

| 경로 | 내용 |
| --- | --- |
| `/` | 메인 (히어로, 왜 지금, 서비스 4종, 진행 과정) |
| `/services/{commerce,erp,app,web}/` | .AX 서비스별 상세 |
| `/diagnosis/` | 무료 .AX 진단 신청 폼 |
| `/privacy/` | 개인정보 처리방침 |

서비스 문구는 `lib/services.ts` 한 곳에서 고칩니다. 브랜드 색상과 여백은 `app/globals.css` 맨 위 토큰에 있습니다.

## 개발

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # out/ 폴더에 정적 파일 생성
```

## 진단 신청 폼 연결

폼은 `NEXT_PUBLIC_FORM_ENDPOINT` 주소(AWS Lambda Function URL)로 JSON을 POST하고, Lambda가 Amazon SES로 dotmate@dotmate.co.kr 에 메일을 보냅니다. 신청 정보는 서버에 저장하지 않고 메일로만 전달됩니다. 코드와 권한 정책은 `infra/diagnosis-form/`, 함수 생성/갱신은 `infra/diagnosis-form/deploy.sh`.

개인정보 처리방침은 `/privacy/` 이고, 보호책임자·보관 기간 등은 `lib/privacy.ts` 한 곳에서 고칩니다(폼 동의 안내에도 같이 반영).

```bash
NEXT_PUBLIC_FORM_ENDPOINT=https://example.execute-api.ap-northeast-2.amazonaws.com/diagnosis npm run build
```

## 검색 노출 (SEO / GEO)

- 회사 정보, 검색엔진 소유 확인 코드: `lib/site.ts` (`verification.google`, `verification.naver`에 코드만 넣고 배포)
- 페이지별 제목·설명·대표 주소·공유 카드: 각 페이지의 `pageMeta()` 호출, 서비스는 `lib/services.ts`의 `seoTitle`, `seoDescription`
- 자주 묻는 질문: `lib/faq.ts` (메인 화면, FAQ 구조화 데이터, `/llms.txt`에 함께 쓰임)
- 자동 생성: `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`, `/llms.txt` (AI 검색용 회사 요약)
- 파비콘·앱 아이콘: `public/icon.svg`, `brand/*.svg` 수정 후 `node scripts/make-icons.mjs` (favicon.ico는 brand/out의 16·32·48 PNG로 만듦)
- 공유 이미지: 문구 수정 후 `node scripts/make-og.mjs` → `public/og/*.png`

## 배포 (예정)

1. `npm run build`
2. `out/` 폴더를 S3 버킷에 업로드
3. CloudFront로 배포, ACM 인증서 연결
4. dotmate.co.kr DNS를 CloudFront로 변경
