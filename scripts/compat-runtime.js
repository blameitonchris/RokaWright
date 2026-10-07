/* Browser fallbacks; no network storage, service worker, or offline cache. */
var force = /[?&]legacy=1(?:&|$)/.test(location.search);
var supports = window.CSS && typeof window.CSS.supports === "function";
var legacy =
  force ||
  !supports ||
  !CSS.supports("display", "grid") ||
  !CSS.supports("color", "var(--test)");
if (legacy) document.documentElement.className += " legacy-layout";
var gapTest = document.createElement("div");
gapTest.style.cssText =
  "display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden;";
var gapChild = document.createElement("div");
gapChild.style.height = "1px";
gapTest.appendChild(gapChild);
gapTest.appendChild(gapChild.cloneNode(true));
document.body.appendChild(gapTest);
if (gapTest.scrollHeight !== 3)
  document.documentElement.className += " no-flex-gap";
gapTest.parentNode.removeChild(gapTest);
var key = window.ROKA_STORAGE_KEY || "rokawright.v1";
window.ROKA_STORAGE_KEY = key;
if (!window.structuredClone)
  window.structuredClone = function (value) {
    return JSON.parse(JSON.stringify(value));
  };
if (window.Element && !Element.prototype.remove)
  Element.prototype.remove = function () {
    if (this.parentNode) this.parentNode.removeChild(this);
  };
var sequence = 0;
function uniqueId() {
  sequence++;
  return (
    "rw-" +
    Date.now().toString(36) +
    "-" +
    sequence.toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 12)
  );
}
function showDialog(el) {
  if (typeof el.showModal === "function" && !force) {
    el.showModal();
    return;
  }
  if (el.hasAttribute("open")) return;
  var overlay = document.createElement("div");
  overlay.className = "compat-dialog-backdrop";
  el._previousParent = el.parentNode;
  el._previousNext = el.nextSibling;
  el._previousFocus = document.activeElement;
  overlay.appendChild(el);
  document.body.appendChild(overlay);
  el.className += " compat-dialog";
  el.setAttribute("open", "");
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("tabindex", "-1");
  el.focus();
  overlay.onkeydown = function (event) {
    if (event.keyCode === 27) {
      var cancel = document.createEvent("Event");
      cancel.initEvent("cancel", true, true);
      el.dispatchEvent(cancel);
      if (!cancel.defaultPrevented) closeDialog(el);
    }
    if (event.keyCode === 9) {
      var items = el.querySelectorAll(
        "button:not([disabled]),input:not([disabled]),textarea,select,a[href]",
      );
      if (items.length) {
        var first = items[0],
          last = items[items.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === el)
        ) {
          last.focus();
          event.preventDefault();
        } else if (!event.shiftKey && document.activeElement === last) {
          first.focus();
          event.preventDefault();
        }
      }
    }
  };
}
function closeDialog(el) {
  if (!el) return;
  if (
    el.className.indexOf("compat-dialog") < 0 &&
    typeof el.close === "function"
  ) {
    el.close();
    return;
  }
  var overlay = el.parentNode;
  el.removeAttribute("open");
  el.className = el.className.replace(/\s*compat-dialog\b/g, "");
  if (el._previousParent) {
    if (el._previousNext && el._previousNext.parentNode === el._previousParent)
      el._previousParent.insertBefore(el, el._previousNext);
    else el._previousParent.appendChild(el);
  }
  if (
    overlay &&
    overlay.className === "compat-dialog-backdrop" &&
    overlay.parentNode
  )
    overlay.parentNode.removeChild(overlay);
  if (el._previousFocus && document.body.contains(el._previousFocus))
    el._previousFocus.focus();
}
function saveBlob(blob, name) {
  var a = document.createElement("a"),
    urls = window.URL || window.webkitURL;
  if (force || !("download" in a) || !urls || !urls.createObjectURL)
    return false;
  var url = urls.createObjectURL(blob);
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.parentNode.removeChild(a);
  setTimeout(function () {
    urls.revokeObjectURL(url);
  }, 30000);
  return true;
}
function textAlternative(text, title, instructions) {
  var d = document.createElement("dialog");
  d.className = "text-alternative";
  d.innerHTML =
    '<h2></h2><p></p><label>Text to copy<textarea rows="12" readonly></textarea></label><div class="actions"><button type="button" data-select>Select all text</button><button type="button" data-close>Close</button></div>';
  d.querySelector("h2").textContent = title;
  d.querySelector("p").textContent = instructions;
  d.querySelector("textarea").value = text;
  document.body.appendChild(d);
  showDialog(d);
  d.querySelector("[data-select]").onclick = function () {
    var area = d.querySelector("textarea");
    area.focus();
    area.select();
    if (area.setSelectionRange) area.setSelectionRange(0, area.value.length);
  };
  d.querySelector("[data-close]").onclick = function () {
    closeDialog(d);
    if (d.parentNode) d.parentNode.removeChild(d);
  };
}
function saveText(text, name, type) {
  try {
    if (
      typeof Blob !== "undefined" &&
      saveBlob(new Blob([text], { type: type }), name)
    )
      return true;
  } catch (e) {}
  textAlternative(
    text,
    "Copy your backup",
    "This browser cannot download this file directly. Select all text, long-press and copy it. Save it in a private text file or transfer it to your own newer device. Keep the complete text; restore it using Paste backup text.",
  );
  return false;
}
function readFile(file) {
  return new Promise(function (resolve, reject) {
    if (!window.FileReader) {
      reject(
        Error("File reading is unavailable. Use Paste backup text instead."),
      );
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      resolve(reader.result);
    };
    reader.onerror = function () {
      reject(Error("Could not read this file. Use Paste backup text instead."));
    };
    reader.readAsText(file);
  });
}
var pdfPromise;
function ensurePDF() {
  if (legacy)
    return Promise.reject(
      Error(
        "PDF generation is unavailable in this older-browser layout. View the full quote or copy its text, then print it from a newer device.",
      ),
    );
  if (window.RokaPDF) return Promise.resolve(window.RokaPDF);
  if (pdfPromise) return pdfPromise;
  pdfPromise = new Promise(function (resolve, reject) {
    var script = document.createElement("script");
    if (window.ROKA_PDF_SOURCE) {
      script.text = window.ROKA_PDF_SOURCE;
      document.head.appendChild(script);
      if (window.RokaPDF) resolve(window.RokaPDF);
      else reject(Error("PDF tools could not start."));
      return;
    }
    script.src = "pdf-library.js";
    script.onload = function () {
      if (window.RokaPDF) resolve(window.RokaPDF);
      else reject(Error("PDF library could not start."));
    };
    script.onerror = function () {
      pdfPromise = null;
      reject(
        Error(
          "PDF tools could not load. Check your internet connection, or view/copy the quote.",
        ),
      );
    };
    document.head.appendChild(script);
  });
  return pdfPromise;
}
window.RokaCompat = {
  legacy: legacy,
  forced: force,
  uniqueId: uniqueId,
  showDialog: showDialog,
  closeDialog: closeDialog,
  saveBlob: saveBlob,
  saveText: saveText,
  textAlternative: textAlternative,
  readFile: readFile,
  ensurePDF: ensurePDF,
};
