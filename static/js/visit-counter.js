// Single silent client — all platforms.
// Client: absolute window.VISIT_API_URL (single Worker+D1 backend, e.g.
// https://mon-licenciement-visits.<account>.workers.dev/api/visit) when set,
// otherwise same-origin "/api/visit" fallback (Cloudflare Pages/D1, Vercel, Netlify).
// One report per session, silent, no cookie, no display.
(function () {
  "use strict";

  var OPT_OUT_KEY = "visit-opt-out";
  var SENT_KEY = "visit-sent";

  function isOptedOut() {
    try {
      if (window.localStorage && window.localStorage.getItem(OPT_OUT_KEY) === "1") return true;
    } catch (e) {}
    return navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  }

  window.visitOptOut = function () {
    try {
      window.localStorage.setItem(OPT_OUT_KEY, "1");
    } catch (e) {}
  };

  window.visitOptIn = function () {
    try {
      window.localStorage.removeItem(OPT_OUT_KEY);
    } catch (e) {}
  };

  function endpoint() {
    try {
      var u = window.VISIT_API_URL;
      if (typeof u === "string" && u.trim().length > 0) return u.trim();
    } catch (e) {}
    return "/api/visit";
  }

  function sendVisit() {
    if (isOptedOut()) return;
    try {
      if (window.sessionStorage && window.sessionStorage.getItem(SENT_KEY) === "1") return;
    } catch (e) {}
    var url = endpoint();
    var crossOrigin = /^https?:\/\//i.test(url);
    try {
      fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: window.location.pathname.slice(0, 200) }),
        keepalive: true,
        mode: crossOrigin ? "cors" : "same-origin",
        credentials: "omit",
        referrerPolicy: "no-referrer",
      })
        .then(function () {
          try {
            if (window.sessionStorage) window.sessionStorage.setItem(SENT_KEY, "1");
          } catch (e) {}
          return null;
        })
        .catch(function () {});
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sendVisit);
  } else {
    sendVisit();
  }
})();
