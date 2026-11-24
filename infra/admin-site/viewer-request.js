// CloudFront Function (viewer-request): dotmate-admin-index-rewrite
// /foo/ → /foo/index.html, /foo → /foo/ (관리자 화면은 정적 파일이라 폴더 주소를 index.html로 연결)
function handler(event) {
  var req = event.request;
  var uri = req.uri;
  if (uri.endsWith('/')) {
    req.uri = uri + 'index.html';
  } else if (uri.lastIndexOf('.') < uri.lastIndexOf('/') + 1) {
    var qs = Object.keys(req.querystring).length
      ? '?' + Object.keys(req.querystring).map(function (k) { return k + '=' + req.querystring[k].value; }).join('&')
      : '';
    return { statusCode: 301, statusDescription: 'Moved Permanently', headers: { location: { value: uri + '/' + qs } } };
  }
  return req;
}
