"use strict";

/*
 * Minimal privacy-friendly visit counter.
 * Records at most one view per browser per day (approximating unique daily
 * visitors) by inserting a row into Supabase via the REST API. No cookies,
 * no third-party scripts. Silently does nothing if Supabase isn't configured.
 */
(function () {
  try {
    var cfg = window.MYGIR_SUPABASE;
    if (!cfg || !cfg.url || !cfg.anonKey || cfg.url.indexOf("YOUR_") !== -1) return;

    var today = new Date().toISOString().slice(0, 10);
    var KEY = "mygir_view_day";
    if (localStorage.getItem(KEY) === today) return; // already counted today
    localStorage.setItem(KEY, today);

    fetch(cfg.url + "/rest/v1/page_views", {
      method: "POST",
      headers: {
        "apikey": cfg.anonKey,
        "Authorization": "Bearer " + cfg.anonKey,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ path: location.pathname }),
      keepalive: true,
    }).catch(function () {});
  } catch (e) { /* never break the page over analytics */ }
})();
