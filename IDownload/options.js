"use strict";
function show_msg() {
  const m = document.createElement("span");
  m.innerText = this;
  document.getElementById("message").prepend(m);
  setTimeout(HTMLSpanElement.prototype.remove.bind(m), 1000);
}
function save(event) {
  event?.preventDefault();
  browser.storage.local.set(Object.fromEntries(Array.prototype.map.call(document.getElementById("form").getElementsByTagName("input"), (i) => [i.id, i.valueAsNumber]))).then(show_msg.bind("saved"), show_msg.bind("not saved"));
}
function restore(event) {
  event?.preventDefault();
  browser.storage.local.get(Object.fromEntries(Array.prototype.map.call(document.getElementById("form").getElementsByTagName("input"), (i) => [i.id, parseInt(i.defaultValue)]))).then(
    function (results) {
      Array.prototype.forEach.call(document.getElementById("form").getElementsByTagName("input"), function (i) {i.value = results[i.id];});
      if (event) {show_msg.call("restored");}
    },
    function () {
      Array.prototype.forEach.call(document.getElementById("form").getElementsByTagName("input"), function (i) {i.value = parseInt(i.defaultValue);});
      if (event) {show_msg.call("restored");}
    }
  );
}
document.getElementById("form").addEventListener("submit", save);
document.getElementById("form").addEventListener("reset", restore);
Array.prototype.forEach.call(document.getElementById("form").getElementsByTagName("input"), function (i) {i.addEventListener("invalid", show_msg.bind(`invalid "${i.labels[0]?.innerText.replace(/(.+?)(.*).+/, (m, p1, p2) => p1.toLowerCase() + p2) || i.id}"`));});
restore();