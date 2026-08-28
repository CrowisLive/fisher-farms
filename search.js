/* ============================================================
   Fisher Farms Shooting Ventures — site search
   No server, no library. Reads window.SITE_INDEX from
   search-data.js and filters it in the browser as you type.
   ============================================================ */
(function () {
  "use strict";

  var MAX_RESULTS = 7;
  var input, panel, list, items = [], active = -1, timer = null;

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  /* --- text helpers ------------------------------------------------ */

  function normalise(s) {
    return (s || "")
      .toLowerCase()
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[^a-z0-9'"\s.&/-]/g, " ");
  }

  function tokens(s) {
    return normalise(s).split(/\s+/).filter(function (t) { return t.length > 0; });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* --- scoring ------------------------------------------------------
     Each entry is one section of one page. A query token scores higher
     when it lands in the heading than in the body, and a whole-word hit
     beats a prefix hit. Every token must appear somewhere, so "20 gauge"
     does not match a section that only mentions gauge.
  ------------------------------------------------------------------- */

  function scoreEntry(entry, qTokens) {
    var title = entry._title || (entry._title = normalise(entry.title));
    var tags = entry._tags || (entry._tags = normalise((entry.tags || []).join(" ")));
    var text = entry._text || (entry._text = normalise(entry.text));
    var total = 0;

    for (var i = 0; i < qTokens.length; i++) {
      var t = qTokens[i];
      var s = 0;
      if (new RegExp("\\b" + escapeRe(t) + "\\b").test(title)) s = 60;
      else if (title.indexOf(t) !== -1) s = 40;
      else if (new RegExp("\\b" + escapeRe(t) + "\\b").test(tags)) s = 30;
      else if (tags.indexOf(t) !== -1) s = 20;
      else if (new RegExp("\\b" + escapeRe(t) + "\\b").test(text)) s = 12;
      else if (text.indexOf(t) !== -1) s = 6;
      if (s === 0) return 0;          // every token must hit somewhere
      total += s;
    }
    if (qTokens.length > 1) {
      var phrase = qTokens.join(" ");
      if (title.indexOf(phrase) !== -1) total += 40;
      else if (text.indexOf(phrase) !== -1) total += 20;
    }
    return total;
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&"); }

  /* --- snippet ----------------------------------------------------- */

  function snippet(entry, qTokens) {
    var text = entry.text || "";
    var lower = normalise(text);
    var at = -1, hit = "";
    for (var i = 0; i < qTokens.length && at === -1; i++) {
      at = lower.indexOf(qTokens[i]);
      if (at !== -1) hit = qTokens[i];
    }
    if (at === -1) return escapeHtml(text.slice(0, 120)) + (text.length > 120 ? "…" : "");

    var start = Math.max(0, at - 45);
    var end = Math.min(text.length, at + hit.length + 85);
    var cut = text.slice(start, end);
    if (start > 0) cut = "…" + cut;
    if (end < text.length) cut = cut + "…";

    var out = escapeHtml(cut);
    qTokens.forEach(function (t) {
      out = out.replace(new RegExp("(" + escapeRe(t) + ")", "gi"), "<mark>$1</mark>");
    });
    return out;
  }

  /* --- rendering --------------------------------------------------- */

  function render(results, q) {
    list.innerHTML = "";
    items = [];
    active = -1;

    if (!results.length) {
      list.innerHTML =
        '<li class="r-empty">No matches for <b>' + escapeHtml(q) + "</b>. " +
        'Try &ldquo;shells&rdquo;, &ldquo;gauge&rdquo;, &ldquo;hours&rdquo;, &ldquo;membership&rdquo; or &ldquo;first time&rdquo;.</li>';
      open();
      return;
    }

    var qTokens = tokens(q);
    results.forEach(function (entry, i) {
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      li.id = "search-result-" + i;
      li.setAttribute("aria-selected", "false");
      li.innerHTML =
        '<a href="' + entry.url + '">' +
        '<span class="r-page">' + escapeHtml(entry.page) + "</span>" +
        '<span class="r-title">' + escapeHtml(entry.title) + "</span>" +
        '<span class="r-snip">' + snippet(entry, qTokens) + "</span>" +
        "</a>";
      list.appendChild(li);
      items.push(li);
    });
    open();
  }

  function open() {
    panel.classList.add("open");
    input.setAttribute("aria-expanded", "true");
  }

  function close() {
    panel.classList.remove("open");
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  }

  function highlight(next) {
    if (!items.length) return;
    if (active > -1) {
      items[active].classList.remove("active");
      items[active].setAttribute("aria-selected", "false");
    }
    active = next;
    if (active < 0) active = items.length - 1;
    if (active >= items.length) active = 0;
    items[active].classList.add("active");
    items[active].setAttribute("aria-selected", "true");
    input.setAttribute("aria-activedescendant", items[active].id);
    items[active].scrollIntoView({ block: "nearest" });
  }

  /* --- search ------------------------------------------------------ */

  function run() {
    var q = input.value.trim();
    if (q.length < 2) { close(); return; }

    var index = window.SITE_INDEX || [];
    var qTokens = tokens(q);
    if (!qTokens.length) { close(); return; }

    var scored = [];
    for (var i = 0; i < index.length; i++) {
      var s = scoreEntry(index[i], qTokens);
      if (s > 0) scored.push({ e: index[i], s: s });
    }
    scored.sort(function (a, b) { return b.s - a.s; });
    render(scored.slice(0, MAX_RESULTS).map(function (x) { return x.e; }), q);
  }

  /* --- wiring ------------------------------------------------------ */

  ready(function () {
    input = document.getElementById("site-search");
    panel = document.getElementById("search-results");
    if (!input || !panel) return;
    list = panel.querySelector("ul");

    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(run, 110);
    });

    input.addEventListener("focus", function () {
      if (input.value.trim().length >= 2) run();
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); if (!panel.classList.contains("open")) run(); else highlight(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); highlight(active - 1); }
      else if (e.key === "Enter") {
        if (active > -1 && items[active]) { e.preventDefault(); items[active].querySelector("a").click(); }
      }
      else if (e.key === "Escape") { close(); input.blur(); }
    });

    document.addEventListener("click", function (e) {
      if (!panel.contains(e.target) && e.target !== input) close();
    });

    /* press / anywhere to jump to search */
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== input &&
          !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  });
})();
