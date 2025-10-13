/*
idownload v1.1 (https://github.com/PCigales/WinSocketTB)
Copyright © 2025 PCigales
This program is licensed under the GNU GPLv3 copyleft license (see https://www.gnu.org/licenses)
*/

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
function install() {
  for (const name of ["SocketTB.py", "idownload_E.json", "idownload_F.json", "idownload.py", "downloader.py", "websocket.py", "idownload.bat"]) {
    fetch(browser.runtime.getURL(name)).then((r) => r.blob()).then(function (b) {const url = URL.createObjectURL(b); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);});
  }
}
document.getElementById("form").addEventListener("submit", save);
document.getElementById("form").addEventListener("reset", restore);
document.getElementById("link").addEventListener("click", install);
Array.prototype.forEach.call(document.getElementById("form").getElementsByTagName("input"), function (i) {i.addEventListener("invalid", show_msg.bind(`invalid "${i.labels[0]?.innerText.replace(/(.+?)(.*).+/, (m, p1, p2) => p1.toLowerCase() + p2) || i.id}"`));});
restore();