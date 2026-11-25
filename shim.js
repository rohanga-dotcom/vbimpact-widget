(function () {
  var nativeFetch = window.fetch.bind(window);
  function jsonResponse(body) {
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  function openEmail(subject, data) {
    var body = Object.keys(data).map(function (k) { return k + ': ' + data[k]; }).join('\n');
    window.location.href = 'mailto:info@vbimpact.org?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }
  window.fetch = function (url, opts) {
    if (url === '/api/opportunities') return Promise.resolve(jsonResponse(window.VBI_DATA));
    if (url === '/api/match-requests') {
      openEmail('VBImpact match request', JSON.parse(opts.body));
      return Promise.resolve(jsonResponse({ ok: true }));
    }
    if (url === '/api/organization-applications') {
      openEmail('VBImpact organization request', JSON.parse(opts.body));
      return Promise.resolve(jsonResponse({ ok: true }));
    }
    return nativeFetch(url, opts);
  };
})();
(function () {
  if (window.self !== window.top) {
    var hide = document.createElement('style');
    hide.textContent = 'header.nav{display:none !important}';
    document.head.appendChild(hide);
  }
})();
