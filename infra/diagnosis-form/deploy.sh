#!/usr/bin/env bash
# 진단 신청 접수 Lambda 생성/갱신. 필요한 권한: deploy-user-policy.json (dotmate-deploy 사용자)
set -euo pipefail
cd "$(dirname "$0")"
REGION=ap-northeast-2
FN=dotmate-diagnosis-form
ROLE=arn:aws:iam::242126391246:role/dotmate-diagnosis-form-role
rm -f /tmp/$FN.zip && zip -q /tmp/$FN.zip index.mjs
if aws lambda get-function --function-name $FN --region $REGION >/dev/null 2>&1; then
  aws lambda update-function-code --function-name $FN --zip-file fileb:///tmp/$FN.zip --region $REGION >/dev/null
else
  aws lambda create-function --function-name $FN --runtime nodejs22.x --handler index.handler \
    --role $ROLE --zip-file fileb:///tmp/$FN.zip --timeout 10 --memory-size 128 --region $REGION >/dev/null
  aws lambda wait function-active-v2 --function-name $FN --region $REGION
  aws lambda create-function-url-config --function-name $FN --auth-type NONE --region $REGION \
    --cors '{"AllowOrigins":["https://dotmate.co.kr","https://www.dotmate.co.kr"],"AllowMethods":["POST"],"AllowHeaders":["content-type"],"MaxAge":86400}' >/dev/null
  aws lambda add-permission --function-name $FN --statement-id public-url --action lambda:InvokeFunctionUrl \
    --principal '*' --function-url-auth-type NONE --region $REGION >/dev/null
  aws lambda add-permission --function-name $FN --statement-id public-invoke --action lambda:InvokeFunction \
    --principal '*' --invoked-via-function-url --region $REGION >/dev/null 2>&1 || true
fi
aws lambda get-function-url-config --function-name $FN --region $REGION --query FunctionUrl --output text
