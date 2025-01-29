"use strict";
if (! ("browser" in globalThis)) {globalThis.browser = globalThis.chrome;}
function show_msg() {
  const m = document.createElement("span");
  m.innerText = this;
  document.getElementById("message").prepend(m);
  setTimeout(HTMLSpanElement.prototype.remove.bind(m), 1000);
}
function save(event) {
  event?.preventDefault();
  browser.storage.local.set(Object.fromEntries(Array.prototype.map.call(document.getElementById("form").getElementsByTagName("input"), (i) => [i.id, (i.type.toLowerCase() == "checkbox" ? i.checked : i.valueAsNumber)]))).then(show_msg.bind("saved"), show_msg.bind("not saved"));
}
function restore(event) {
  event?.preventDefault();
  browser.storage.local.get(Object.fromEntries(Array.prototype.map.call(document.getElementById("form").getElementsByTagName("input"), (i) => [i.id, (i.type.toLowerCase() == "checkbox" ? i.defaultChecked : parseInt(i.defaultValue))]))).then(
    function (results) {
      Array.prototype.forEach.call(document.getElementById("form").getElementsByTagName("input"), function (i) {i[i.type.toLowerCase() == "checkbox" ? "checked": "value"] = results[i.id];});
      if (event) {show_msg.call("restored");}
    },
    function () {
      Array.prototype.forEach.call(document.getElementById("form").getElementsByTagName("input"), function (i) {i[i.type.toLowerCase() == "checkbox" ? "checked" : "value"] = i.type.toLowerCase() == "checkbox" ? i.defaultChecked : parseInt(i.defaultValue);});
      if (event) {show_msg.call("restored");}
    }
  );
}
document.getElementById("form").addEventListener("submit", save);
document.getElementById("form").addEventListener("reset", restore);
Array.prototype.forEach.call(document.getElementById("form").getElementsByTagName("input"), function (i) {i.addEventListener("invalid", show_msg.bind(`invalid "${i.labels[0]?.innerText.replace(/(.+?)(.*).+/, (m, p1, p2) => p1.toLowerCase() + p2) || i.id}"`));});
restore();