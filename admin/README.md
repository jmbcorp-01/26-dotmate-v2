# 닷메이트 영업 관리 (admin.dotmate.co.kr)

영업 관리 시스템 1단계: 관리자 로그인과 CRM. 기획·설계는 프로젝트의 "영업 관리 시스템 기획·설계서" 문서를 따릅니다.

| 화면 | 하는 일 |
| --- | --- |
| `/` 대시보드 | 이번 달 퍼널(목표: 발굴 100 → 계약 2), 다음 할 일, 예상 금액 |
| `/pipeline/` | 영업 건 칸반 (발굴 → 진단 → 미니 제안 → 미팅·데모 → PoC → 본계약·운영, 보류) |
| `/companies/` | 타겟 기업 목록, 산업·등급 필터, 기업 추가 |
| `/company/?id=` | 기업 정보, 100점 스코어링(A/B/C 자동), 영업 건, 담당자(수신 동의·거부), 활동 기록 |
| `/inquiry/` | 무료 진단 신청 메일 본문 붙여넣기 → 기업·담당자·영업 건 등록 |
| `/import/` | 엑셀·구글 시트 표 붙여넣기로 기업 일괄 등록 (중복 건너뜀) |

## 구성

- 화면: Next.js 정적 export → S3 `dotmate-admin-web` + CloudFront (검색 차단 헤더) — `infra/admin-site/`
- API: Lambda `dotmate-sales-api` (Function URL), DynamoDB `dotmate-sales` 한 테이블 — `infra/sales-api/`
- 로그인: Cognito 사용자 풀 `dotmate-admin`. 관리자가 만든 계정만, 비밀번호 + 인증 앱 2단계. API는 허용된 이메일만 받습니다.
- 홈페이지 진단 신청은 지금처럼 SES 메일로만 받습니다. 저장은 이 화면에 붙여넣을 때만 일어납니다.

## 로컬 개발

```bash
cd infra/sales-api && npm install && cd ../../admin && npm install
npm run mock                                   # 모의 API (메모리 저장) http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3002 NEXT_PUBLIC_DEV_FAKE_AUTH=1 npm run dev   # http://localhost:3001
```

`NEXT_PUBLIC_DEV_FAKE_AUTH`는 개발 서버에서만 로그인을 건너뜁니다. 운영 빌드에서는 무시됩니다.

## 처음 배포 (한 번)

1. AWS 콘솔(IAM)에서 준비 (사용자 작업)
   - 역할 `dotmate-sales-api-role` 만들기: 신뢰 정책 `infra/sales-api/role-trust.json`, 인라인 정책 `infra/sales-api/role-policy.json`
   - `dotmate-deploy` 사용자에 인라인 정책 추가: `infra/sales-api/deploy-user-policy.json`
2. `ADMIN_EMAIL=<관리자 이메일> infra/sales-api/deploy.sh` → 테이블, 로그인 풀, 관리자 계정(임시 비밀번호 메일 발송), API 생성. `admin/.env.production` 작성
3. `infra/admin-site/setup.sh` → 버킷, 인증서, CloudFront, `admin.dotmate.co.kr` DNS
4. `infra/admin-site/deploy.sh` → 화면 빌드·업로드

이후 화면 수정은 4번만, API 수정은 2번만 다시 실행합니다.
