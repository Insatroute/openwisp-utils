(function () {
  function closestRow(el) {
    return (
      el.closest(".form-row") ||
      el.closest(".form-group") ||
      el.closest(".row") ||
      el.closest(".field-box") ||
      el.closest("tr") ||
      el.parentElement
    );
  }

  // Find select that controls enable/disable
  function findEnableSelect() {
    // Most reliable: name contains enable_interval
    let sel = document.querySelector('select[name*="enable_interval"]');
    if (sel) return sel;

    // fallback: id contains enable_interval
    sel = document.querySelector('select[id*="enable_interval"]');
    if (sel) return sel;

    // fallback: any select that has options enable/disable
    const selects = Array.from(document.querySelectorAll("select"));
    return selects.find(s => {
      const values = Array.from(s.options).map(o => o.value);
      return values.includes("enable") && values.includes("disable");
    }) || null;
  }

  // Find interval input
  function findIntervalInput() {
    // Must contain "interval" but NOT "enable_interval"
    let inp = document.querySelector('input[name*="interval"]:not([name*="enable_interval"])');
    if (inp) return inp;

    inp = document.querySelector('input[id*="interval"]:not([id*="enable_interval"])');
    if (inp) return inp;

    return null;
  }

  function applyRule() {
    const enableSelect = findEnableSelect();
    const intervalInput = findIntervalInput();
    if (!enableSelect || !intervalInput) return;

    const intervalRow = closestRow(intervalInput);

    const isDisabled = enableSelect.value === "disable";

    if (isDisabled) {
    if (intervalRow) intervalRow.style.display = "none";
    intervalInput.disabled = true;
    intervalInput.value = "1";   // ✅ important
    intervalInput.dispatchEvent(new Event("input", { bubbles: true }));
    intervalInput.dispatchEvent(new Event("change", { bubbles: true }));
    intervalInput.dispatchEvent(new Event("blur", { bubbles: true }));
    } else {
    if (intervalRow) intervalRow.style.display = "";
    intervalInput.disabled = false;
    }

  }

  function bind() {
    const enableSelect = findEnableSelect();
    if (!enableSelect) return;

    if (enableSelect.dataset.tr069Bound === "1") return;
    enableSelect.addEventListener("change", applyRule);
    enableSelect.dataset.tr069Bound = "1";
  }

  function init() {
    // JSON form sometimes renders after page load -> retry a few times
    let tries = 0;
    const timer = setInterval(() => {
      bind();
      applyRule();
      tries += 1;
      if (tries >= 30) clearInterval(timer); // ~15 sec
    }, 500);

    // Also observe DOM changes
    const obs = new MutationObserver(() => {
      bind();
      applyRule();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
