#!/usr/bin/env bash
# admin.dotmate.co.kr 정적 호스팅 1회 설정: S3(비공개) + CloudFront + 인증서 + Route 53
# 필요한 권한: 기존 dotmate-deploy 정책(CloudFront, ACM, Route 53) + ../sales-api/deploy-user-policy.json (AdminSiteBucket)
set -euo pipefail
cd "$(dirname "$0")"
REGION=ap-northeast-2
ACCOUNT=242126391246
BUCKET=dotmate-admin-web
DOMAIN=admin.dotmate.co.kr
ZONE=Z066464514XMJ93ON7SC9
FUNC=dotmate-admin-index-rewrite

# 1) 버킷
if ! aws s3api head-bucket --bucket $BUCKET 2>/dev/null; then
  aws s3api create-bucket --bucket $BUCKET --region $REGION --create-bucket-configuration LocationConstraint=$REGION >/dev/null
  aws s3api put-public-access-block --bucket $BUCKET --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
fi

# 2) 인증서 (us-east-1, DNS 검증)
CERT=$(aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?DomainName=='$DOMAIN'].CertificateArn | [0]" --output text)
if [ "$CERT" = "None" ] || [ -z "$CERT" ]; then
  CERT=$(aws acm request-certificate --region us-east-1 --domain-name $DOMAIN --validation-method DNS --query CertificateArn --output text)
  sleep 10
fi
read -r RNAME RVALUE < <(aws acm describe-certificate --region us-east-1 --certificate-arn "$CERT" \
  --query "Certificate.DomainValidationOptions[0].ResourceRecord.[Name,Value]" --output text)
aws route53 change-resource-record-sets --hosted-zone-id $ZONE --change-batch "{\"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"$RNAME\",\"Type\":\"CNAME\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"$RVALUE\"}]}}]}" >/dev/null
echo "인증서 발급 대기..."
aws acm wait certificate-validated --region us-east-1 --certificate-arn "$CERT"

# 3) 접근 제어(OAC), 주소 변환 함수, 응답 헤더(검색 차단·보안)
OAC=$(aws cloudfront list-origin-access-controls --query "OriginAccessControlList.Items[?Name=='dotmate-admin-oac'].Id | [0]" --output text)
if [ "$OAC" = "None" ] || [ -z "$OAC" ]; then
  OAC=$(aws cloudfront create-origin-access-control --origin-access-control-config \
    Name=dotmate-admin-oac,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3 --query OriginAccessControl.Id --output text)
fi
if ! aws cloudfront describe-function --name $FUNC >/dev/null 2>&1; then
  aws cloudfront create-function --name $FUNC --function-config Comment=dotmate-admin,Runtime=cloudfront-js-2.0 --function-code fileb://viewer-request.js >/dev/null
fi
ETAG=$(aws cloudfront describe-function --name $FUNC --query ETag --output text)
aws cloudfront publish-function --name $FUNC --if-match "$ETAG" >/dev/null
FUNC_ARN=$(aws cloudfront describe-function --name $FUNC --stage LIVE --query FunctionSummary.FunctionMetadata.FunctionARN --output text)
HDR=$(aws cloudfront list-response-headers-policies --type custom --query "ResponseHeadersPolicyList.Items[?ResponseHeadersPolicy.ResponseHeadersPolicyConfig.Name=='dotmate-admin-headers'].ResponseHeadersPolicy.Id | [0]" --output text)
if [ "$HDR" = "None" ] || [ -z "$HDR" ]; then
  HDR=$(aws cloudfront create-response-headers-policy --response-headers-policy-config '{
    "Name":"dotmate-admin-headers",
    "SecurityHeadersConfig":{
      "StrictTransportSecurity":{"Override":true,"AccessControlMaxAgeSec":31536000,"IncludeSubdomains":false},
      "ContentTypeOptions":{"Override":true},
      "FrameOptions":{"Override":true,"FrameOption":"DENY"},
      "ReferrerPolicy":{"Override":true,"ReferrerPolicy":"no-referrer"}
    },
    "CustomHeadersConfig":{"Quantity":1,"Items":[{"Header":"X-Robots-Tag","Value":"noindex, nofollow","Override":true}]}
  }' --query ResponseHeadersPolicy.Id --output text)
fi

# 4) 배포 (CachingOptimized 정책)
DIST=$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[0]=='$DOMAIN'].Id | [0]" --output text)
if [ "$DIST" = "None" ] || [ -z "$DIST" ]; then
  cat > /tmp/admin-dist.json <<JSON
{
  "CallerReference": "dotmate-admin-$(date +%s)",
  "Comment": "dotmate admin",
  "Enabled": true,
  "Aliases": {"Quantity": 1, "Items": ["$DOMAIN"]},
  "DefaultRootObject": "index.html",
  "Origins": {"Quantity": 1, "Items": [{
    "Id": "s3-admin", "DomainName": "$BUCKET.s3.$REGION.amazonaws.com",
    "OriginAccessControlId": "$OAC", "S3OriginConfig": {"OriginAccessIdentity": ""}
  }]},
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-admin", "ViewerProtocolPolicy": "redirect-to-https", "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "ResponseHeadersPolicyId": "$HDR",
    "FunctionAssociations": {"Quantity": 1, "Items": [{"EventType": "viewer-request", "FunctionARN": "$FUNC_ARN"}]}
  },
  "CustomErrorResponses": {"Quantity": 1, "Items": [{"ErrorCode": 403, "ResponsePagePath": "/404.html", "ResponseCode": "404", "ErrorCachingMinTTL": 10}]},
  "ViewerCertificate": {"ACMCertificateArn": "$CERT", "SSLSupportMethod": "sni-only", "MinimumProtocolVersion": "TLSv1.2_2021"},
  "PriceClass": "PriceClass_200",
  "HttpVersion": "http2and3"
}
JSON
  DIST=$(aws cloudfront create-distribution --distribution-config file:///tmp/admin-dist.json --query Distribution.Id --output text)
fi
DIST_DOMAIN=$(aws cloudfront get-distribution --id "$DIST" --query Distribution.DomainName --output text)

# 5) 버킷 정책 (이 배포만 읽기 허용)
aws s3api put-bucket-policy --bucket $BUCKET --policy "{
  \"Version\":\"2012-10-17\",
  \"Statement\":[{\"Sid\":\"CloudFrontRead\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"cloudfront.amazonaws.com\"},
    \"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::$BUCKET/*\",
    \"Condition\":{\"StringEquals\":{\"AWS:SourceArn\":\"arn:aws:cloudfront::$ACCOUNT:distribution/$DIST\"}}}]
}"

# 6) DNS
aws route53 change-resource-record-sets --hosted-zone-id $ZONE --change-batch "{\"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\"Name\":\"$DOMAIN\",\"Type\":\"A\",\"AliasTarget\":{\"HostedZoneId\":\"Z2FDTNDATAQYW2\",\"DNSName\":\"$DIST_DOMAIN\",\"EvaluateTargetHealth\":false}}}]}" >/dev/null
echo "배포 ID: $DIST ($DIST_DOMAIN)"
