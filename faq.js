/* Open the matching question when someone arrives from a search result. */
(function () {
  function openFromHash() {
    var id = location.hash.slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === "DETAILS") el.open = true;
    var d = el.closest ? el.closest("details") : null;
    if (d) d.open = true;
    setTimeout(function () { el.scrollIntoView({ block: "center" }); }, 0);
  }
  window.addEventListener("hashchange", openFromHash);
  document.addEventListener("DOMContentLoaded", openFromHash);
})();
