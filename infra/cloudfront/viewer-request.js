// CloudFront Function (viewer-request): dotmate-web-index-rewrite
// 1) www → 루트 도메인, 2) 예전 사이트 주소 → 새 페이지 301, 3) /foo/ → /foo/index.html, /foo → /foo/
// 수정 후: aws cloudfront update-function → publish-function (README 참고)

// 예전 사이트(2026년 11월 이전) 주소 중 검색 노출이 있던 것. 앞부분이 같으면 연결됩니다.
var EXACT = {
  '/solutions/web': '/services/web/',
  '/solutions/app': '/services/app/',
  '/solutions/mvp': '/services/app/',
  '/agents/accounting-automation': '/services/erp/',
  '/agents/inventory-check-automation': '/services/erp/',
  '/agents/financial-expense-calculation': '/services/erp/',
  '/agents/report-creation-automation': '/services/erp/',
  '/agents/document-creation': '/services/erp/',
  '/agents/document-creation-automation': '/services/erp/',
  '/agents/real-time-data-insight': '/services/erp/',
  '/contact': '/diagnosis/',
};
var PREFIX_HOME = ['/agents', '/insights', '/industries', '/solutions', '/demos', '/technology', '/marketplace', '/testimonials', '/about', '/terms'];

function moved(location) {
  return { statusCode: 301, statusDescription: 'Moved Permanently', headers: { location: { value: location }, 'cache-control': { value: 'max-age=86400' } } };
}

function legacy(uri) {
  var path = uri.length > 1 && uri.endsWith('/') ? uri.slice(0, -1) : uri;
  if (EXACT[path]) return EXACT[path];
  for (var i = 0; i < PREFIX_HOME.length; i++) {
    var p = PREFIX_HOME[i];
    if (path === p || path.indexOf(p + '/') === 0) return '/';
  }
  return null;
}

function handler(event) {
  var req = event.request;
  var uri = req.uri;
  var host = req.headers.host ? req.headers.host.value : '';
  if (host === 'www.dotmate.co.kr') {
    var qs = Object.keys(req.querystring).length ? '?' + Object.keys(req.querystring).map(function (k) { return k + '=' + req.querystring[k].value; }).join('&') : '';
    return moved('https://dotmate.co.kr' + uri + qs);
  }
  var to = legacy(uri);
  if (to) return moved('https://dotmate.co.kr' + to);
  if (uri.endsWith('/')) {
    req.uri = uri + 'index.html';
  } else if (uri.split('/').pop().indexOf('.') === -1) {
    return moved(uri + '/');
  }
  return req;
}
