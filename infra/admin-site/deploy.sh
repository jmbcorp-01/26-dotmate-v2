#!/usr/bin/env bash
# 관리자 화면 빌드 후 admin.dotmate.co.kr 에 올리기
set -euo pipefail
cd "$(dirname "$0")/../../admin"
BUCKET=dotmate-admin-web
npm ci && npm run build
aws s3 sync out/_next s3://$BUCKET/_next --delete --cache-control "public,max-age=31536000,immutable"
aws s3 sync out s3://$BUCKET --delete --exclude "_next/*" --cache-control "no-cache"
DIST=$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[0]=='admin.dotmate.co.kr'].Id | [0]" --output text)
aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/*" --query Invalidation.Id --output text
