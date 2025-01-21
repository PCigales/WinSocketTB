"use strict";
const sid = (new URLSearchParams(location.search)).get("sid");
const num_form = Intl.NumberFormat();
const progresses = new Map();
const updating = [new Set(), -1000];
const creating = new Set();
var port;
var socket;
function set_progress(sdid) {
  const progress = progresses.get(sdid);
  const download = document.getElementById("download_" + sdid);
  download.className = progress.status.split(" ")[0];
  download.getElementsByClassName("size")[0].innerText = (progress.status == "completed" || progress.size) ? num_form.format(progress.size) : "";
  download.getElementsByClassName("status")[0].innerText = progress.status;
  download.getElementsByClassName("downloaded")[0].innerText = num_form.format(progress.downloaded);
  download.getElementsByClassName("bar")[0].innerHTML = progress.sections ? progress.sections.reduce((a, c) => `${a}<progress max="${c.size}" value="${c.downloaded}" style="flex: ${c.size} 1 ${c.size}px"></progress>`, "") : ((progress.status != "aborted" && progress.size) ? `<progress max="${progress.size}" value="${progress.downloaded}" style="flex: 1 1 1px"></progress>` : "");
  download.getElementsByClassName("percent")[0].innerText = (progress.status == "completed" || progress.size) ? progress.percent.toString() : "";
}
async function create() {
  while (creating.size) {
    const sdid = creating.values().next().value;
    const dinf = (await browser.storage.session.get(sdid))[sdid];
    const download = document.getElementById("download_pattern").cloneNode(true);
    download.id = "download_" + sdid;
    download.getElementsByClassName("url")[0].innerText = dinf.url;
    download.getElementsByClassName("file")[0].innerText = dinf.file;
    Array.prototype.forEach.call(download.getElementsByTagName("button"), function (b) {b.addEventListener("click", send_command);});
    document.getElementById("downloads").prepend(download);
    set_progress(sdid);
    creating.delete(sdid);
  }
}
function update() {
  for (const sdid of updating[0]) {
    set_progress(sdid);
  }
  updating[0].clear();
  updating[1] = performance.now();
}
function new_socket() {
  if (socket) {socket.onerror = socket.onclose = null; document.getElementById("connected").classList.add("not");}
  socket = new WebSocket(`ws://localhost:${port}/monitor`);
  socket.onopen = function () {document.getElementById("connected").classList.remove("not");};
  socket.onerror = socket.onclose = new_socket;
  socket.onmessage = function(event) {
    const progression = JSON.parse(event.data);
    const sdid = progression.sdid;
    if (sdid.split("_")[0] != sid) {return;}
    const ex = progresses.has(sdid) && ! creating.has(sdid);
    progresses.set(sdid, progression.progress);
    if (ex) {
      updating[0].add(sdid);
      if (updating[1] != null) {
        updating[1] = null;
        setTimeout(update, Math.max(0, updating[1] + 1000 - performance.now()));
      }
    } else {
      const em = creating.size;
      creating.add(sdid);
      if (em == 0) {setTimeout(create, 1);}
    }
  };
  window.onbeforeunload = function () {
    socket.onerror = socket.onclose = null;
    socket.close();
  };
  return socket;
}
function send_command() {
  if (getComputedStyle(this).display == "none") {return;}
  const download = this.parentNode;
  const sdid = download.id.substring(9);
  switch (this.className) {
    case "explorer":
      browser.runtime.sendMessage({"explorer": download.getElementsByClassName("file")[0].innerText + (download.className != "completed" ? ".idownload" : "")}).finally(Boolean);
      break;
    case "discard":
    case "suspend":
      if (download.className != "working") {return;}
      socket.send(`${this.className} ${sdid}`);
      break;
    case "restart":
      if (download.className != "aborted") {return;}
      delete progresses.get(sdid).sections;
    case "resume":
      if (download.className != "aborted") {return;}
      download.className = "";
      browser.runtime.sendMessage({"sdid": sdid, "progress": progresses.get(sdid)}).then(function (response) {if (! response) {download.className = "aborted";}}, function () {download.className = "aborted";});
      break;
  }
}
Promise.all([browser.tabs.query({url: browser.runtime.getURL(location.href)}), browser.storage.session.get("sid")]).then(
  function ([tabs, results]) {
    if (tabs.length > 1 || results.sid?.toString() != sid) {
      browser.tabs.getCurrent().then(function (tab) {browser.tabs.remove(tab.id);});
    } else {
      browser.storage.local.get({port: 9009}).then(
        function (results) {port = results.port;},
        function () {port = 9009;}
      ).then(new_socket);
    }
  }
);