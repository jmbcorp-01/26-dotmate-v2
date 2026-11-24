#!/usr/bin/env bash
# 영업 관리 API 배포 (처음 실행하면 저장소·로그인·함수를 만들고, 다음부터는 코드만 갱신)
# 필요한 권한: deploy-user-policy.json (dotmate-deploy 사용자), 역할 dotmate-sales-api-role (role-policy.json)
# 사용: ADMIN_EMAIL=you@example.com ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"
REGION=ap-northeast-2
ACCOUNT=242126391246
TABLE=dotmate-sales
FN=dotmate-sales-api
ROLE=arn:aws:iam::$ACCOUNT:role/dotmate-sales-api-role
POOL_NAME=dotmate-admin
ORIGINS='["https://admin.dotmate.co.kr","http://localhost:3001"]'
ADMIN_EMAIL="${ADMIN_EMAIL:?ADMIN_EMAIL 환경 변수에 관리자 이메일을 넣어 주세요}"
aws_() { aws --region $REGION "$@"; }

# 1) 저장소 (DynamoDB, 사용한 만큼 과금, 35일 시점 복구)
if ! aws_ dynamodb describe-table --table-name $TABLE >/dev/null 2>&1; then
  echo "테이블 생성: $TABLE"
  aws_ dynamodb create-table --table-name $TABLE --billing-mode PAY_PER_REQUEST \
    --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
    --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
    --tags Key=project,Value=dotmate-admin >/dev/null
  aws_ dynamodb wait table-exists --table-name $TABLE
  aws_ dynamodb update-continuous-backups --table-name $TABLE \
    --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true >/dev/null
fi

# 2) 로그인 (Cognito 사용자 풀: 관리자가 만든 계정만, 비밀번호 + 인증 앱 2단계)
POOL_ID=$(aws_ cognito-idp list-user-pools --max-results 60 --query "UserPools[?Name=='$POOL_NAME'].Id | [0]" --output text)
if [ "$POOL_ID" = "None" ] || [ -z "$POOL_ID" ]; then
  echo "로그인 풀 생성: $POOL_NAME"
  POOL_ID=$(aws_ cognito-idp create-user-pool --pool-name $POOL_NAME \
    --username-attributes email --auto-verified-attributes email \
    --admin-create-user-config AllowAdminCreateUserOnly=true \
    --policies 'PasswordPolicy={MinimumLength=12,RequireUppercase=false,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false,TemporaryPasswordValidityDays=7}' \
    --mfa-configuration OFF --deletion-protection ACTIVE \
    --user-pool-tags project=dotmate-admin --query UserPool.Id --output text)
  aws_ cognito-idp set-user-pool-mfa-config --user-pool-id "$POOL_ID" \
    --software-token-mfa-configuration Enabled=true --mfa-configuration ON >/dev/null
fi
CLIENT_ID=$(aws_ cognito-idp list-user-pool-clients --user-pool-id "$POOL_ID" --query "UserPoolClients[?ClientName=='admin-web'].ClientId | [0]" --output text)
if [ "$CLIENT_ID" = "None" ] || [ -z "$CLIENT_ID" ]; then
  CLIENT_ID=$(aws_ cognito-idp create-user-pool-client --user-pool-id "$POOL_ID" --client-name admin-web --no-generate-secret \
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --prevent-user-existence-errors ENABLED \
    --id-token-validity 60 --access-token-validity 60 --refresh-token-validity 7 \
    --token-validity-units IdToken=minutes,AccessToken=minutes,RefreshToken=days \
    --query UserPoolClient.ClientId --output text)
fi
if ! aws_ cognito-idp admin-get-user --user-pool-id "$POOL_ID" --username "$ADMIN_EMAIL" >/dev/null 2>&1; then
  echo "관리자 계정 생성: $ADMIN_EMAIL (임시 비밀번호가 이 주소로 발송됩니다)"
  aws_ cognito-idp admin-create-user --user-pool-id "$POOL_ID" --username "$ADMIN_EMAIL" \
    --user-attributes Name=email,Value="$ADMIN_EMAIL" Name=email_verified,Value=true \
    --desired-delivery-mediums EMAIL >/dev/null
fi

# 3) API 함수
# 공공데이터포털 인증키: DATA_GO_KR_KEY 로 넘기면 바꾸고, 없으면 지금 함수에 있는 값을 그대로 둡니다. 저장소에는 넣지 않습니다.
if [ -z "${DATA_GO_KR_KEY:-}" ]; then
  DATA_GO_KR_KEY=$(aws_ lambda get-function-configuration --function-name $FN --query "Environment.Variables.DATA_GO_KR_KEY" --output text 2>/dev/null || true)
  [ "$DATA_GO_KR_KEY" = "None" ] && DATA_GO_KR_KEY=""
fi
# Claude API 키(AI 점수 초안)도 같은 방식입니다: AI_API_KEY 로 넘기면 바꾸고, 없으면 그대로 둡니다.
if [ -z "${AI_API_KEY:-}" ]; then
  AI_API_KEY=$(aws_ lambda get-function-configuration --function-name $FN --query "Environment.Variables.ANTHROPIC_API_KEY" --output text 2>/dev/null || true)
  [ "$AI_API_KEY" = "None" ] && AI_API_KEY=""
fi
ENV="Variables={TABLE_NAME=$TABLE,USER_POOL_ID=$POOL_ID,USER_POOL_CLIENT_ID=$CLIENT_ID,ALLOWED_EMAILS=$ADMIN_EMAIL,AI_MONTHLY_USD=${AI_MONTHLY_USD:-30}${DATA_GO_KR_KEY:+,DATA_GO_KR_KEY=$DATA_GO_KR_KEY}${AI_API_KEY:+,ANTHROPIC_API_KEY=$AI_API_KEY}}"
# 배포 묶음: 코드 + 운영 의존성(@anthropic-ai/sdk). AWS SDK는 Lambda 런타임에 들어 있어 넣지 않습니다.
BUILD=$(mktemp -d)
cp index.mjs ai-score.mjs ai-proposal.mjs proposals.mjs package.json package-lock.json "$BUILD"/
(cd "$BUILD" && npm ci --omit=dev --no-audit --no-fund --silent)
rm -f /tmp/$FN.zip && (cd "$BUILD" && zip -qr /tmp/$FN.zip .)
rm -rf "$BUILD"
if aws_ lambda get-function --function-name $FN >/dev/null 2>&1; then
  aws_ lambda update-function-code --function-name $FN --zip-file fileb:///tmp/$FN.zip >/dev/null
  aws_ lambda wait function-updated-v2 --function-name $FN
  aws_ lambda update-function-configuration --function-name $FN --timeout 90 --memory-size 1024 --environment "$ENV" >/dev/null
else
  aws_ lambda create-function --function-name $FN --runtime nodejs22.x --handler index.handler \
    --role $ROLE --zip-file fileb:///tmp/$FN.zip --timeout 90 --memory-size 1024 --environment "$ENV" >/dev/null
  aws_ lambda wait function-active-v2 --function-name $FN
  aws_ lambda create-function-url-config --function-name $FN --auth-type NONE \
    --cors "{\"AllowOrigins\":$ORIGINS,\"AllowMethods\":[\"GET\",\"POST\",\"PUT\",\"DELETE\"],\"AllowHeaders\":[\"authorization\",\"content-type\"],\"MaxAge\":86400}" >/dev/null
  aws_ lambda add-permission --function-name $FN --statement-id public-url --action lambda:InvokeFunctionUrl \
    --principal '*' --function-url-auth-type NONE >/dev/null
  aws_ lambda add-permission --function-name $FN --statement-id public-invoke --action lambda:InvokeFunction \
    --principal '*' --invoked-via-function-url >/dev/null 2>&1 || true
fi
API_URL=$(aws_ lambda get-function-url-config --function-name $FN --query FunctionUrl --output text)

# 관리자 화면 빌드 설정 (공개해도 되는 값만)
cat > ../../admin/.env.production <<ENVFILE
# infra/sales-api/deploy.sh 가 만든 값. 공개 주소·식별자라 커밋해도 됩니다.
NEXT_PUBLIC_API_URL=${API_URL%/}
NEXT_PUBLIC_COGNITO_REGION=$REGION
NEXT_PUBLIC_COGNITO_CLIENT_ID=$CLIENT_ID
ENVFILE
echo "API: $API_URL"
echo "로그인 풀: $POOL_ID / 클라이언트: $CLIENT_ID"
