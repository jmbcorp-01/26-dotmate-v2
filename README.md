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

서비스 문구는 `lib/services.ts` 한 곳에서 고칩니다. 브랜드 색상과 여백은 `app/globals.css` 맨 위 토큰에 있습니다.

## 개발

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # out/ 폴더에 정적 파일 생성
```

## 진단 신청 폼 연결

폼은 `NEXT_PUBLIC_FORM_ENDPOINT` 주소로 JSON을 POST합니다. 값이 없으면 "접수 기능이 아직 연결되지 않았습니다"라고 안내합니다. 배포 단계에서 API Gateway + Lambda(메일 발송) 등으로 연결합니다.

```bash
NEXT_PUBLIC_FORM_ENDPOINT=https://example.execute-api.ap-northeast-2.amazonaws.com/diagnosis npm run build
```

## 배포 (예정)

1. `npm run build`
2. `out/` 폴더를 S3 버킷에 업로드
3. CloudFront로 배포, ACM 인증서 연결
4. dotmate.co.kr DNS를 CloudFront로 변경
