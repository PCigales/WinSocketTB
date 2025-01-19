"use strict";
function show_msg() {
  const m = document.createElement("span");
  m.innerText = this;
  document.getElementById("message").prepend(m);
  setTimeout(HTMLSpanElement.prototype.remove.bind(m), 1000);
}
function save(event) {
  event.preventDefault();
  browser.storage.local.set(Object.fromEntries(Array.prototype.map.call(document.getElementById("form").getElementsByTagName("input"), (e) => [e.id, e.value]))).then(show_msg.bind("saved"), show_msg.bind("not saved"));
}
function reset(event) {
  event?.preventDefault();
  browser.storage.local.get(Object.fromEntries(Array.prototype.map.call(document.getElementById("form").getElementsByTagName("input"), (e) => [e.id, e.defaultValue]))).then(
    function (results) {
      Array.prototype.forEach.call(document.getElementById("form").getElementsByTagName("input"), function (i) {i.value = results[i.id];});
      if (event) {show_msg.call("reseted");}
    },
    function () {
      Array.prototype.forEach.call(document.getElementById("form").getElementsByTagName("input"), function (i) {i.value = i.defaultValue;});
      if (event) {show_msg.call("reseted to default");}
    }
  );
}
document.getElementById("form").addEventListener("submit", save);
document.getElementById("form").addEventListener("reset", reset);
Array.prototype.forEach.call(document.getElementById("form").getElementsByTagName("input"), function (i) {i.addEventListener("invalid", show_msg.bind("invalid " + i.id));});
reset();