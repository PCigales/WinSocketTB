"use strict";
if (! ("browser" in globalThis)) {globalThis.browser = globalThis.chrome;}
const sid = (new URLSearchParams(location.search)).get("sid");
const num_form = Intl.NumberFormat();
const progresses = new Map();
const updating = [new Set(), -500];
const creating = new Set();
var port;
var socket;
async function set_progress(sdid) {
  const progress = progresses.get(sdid);
  const download = document.getElementById("download_" + sdid);
  download.className = progress.status.split(" ")[0];
  download.getElementsByClassName("size")[1].innerText = (progress.status == "completed" || progress.size) ? num_form.format(progress.size) : "";
  download.getElementsByClassName("status")[1].innerText = `${progress.status}${(progress.status == "aborted" && (typeof progress.error) == "string") ? ` (${progress.error})` : ""}`;
  download.getElementsByClassName("downloaded")[1].innerText = num_form.format(progress.downloaded);
  download.getElementsByClassName("bar")[0].innerHTML = Object.hasOwn(progress, "sections") ? progress.sections.reduce(function (a, c) {const b = Math.round(c.size * 1000000 / progress.size); return `${a}<progress max="${b}" value="${Math.round(c.downloaded * 1000000 / progress.size)}" style="flex: ${b} 1 ${b}px"></progress>`;}, "") : ((progress.status != "aborted" && progress.size) ? `<progress class="no" max="1000000" value="${Math.round(progress.downloaded * 1000000 / progress.size)}" style="flex: 1 1 1px"></progress>` : "");
  download.getElementsByClassName("percent")[0].innerText = (progress.status == "completed" || progress.size) ? progress.percent.toString() : "";
  if (progress.status == "aborted" && Object.hasOwn(progress, "sections")) {
    await browser.storage.local.get(["i0_" + sdid, "i1_" + sdid]).then((results) => browser.storage.local.set(Object.fromEntries(Object.keys(results).map((r) => ["p" + r.substring(1), progress]))));
  }
}
async function create() {
  while (creating.size) {
    const sdid = creating.values().next().value;
    const results = await browser.storage.session.get(sdid);
    if (Object.hasOwn(results, sdid)) {
      const dinf = results[sdid];
      const download = document.getElementById("download_pattern").cloneNode(true);
      download.id = "download_" + sdid;
      download.getElementsByClassName("url")[1].innerText = dinf.url;
      download.getElementsByClassName("file")[1].innerText = dinf.file;
      Array.prototype.forEach.call(download.getElementsByTagName("button"), function (b) {b.addEventListener("click", send_command);});
      document.getElementById("downloads").prepend(download);
      creating.delete(sdid);
      await set_progress(sdid);
    } else {
      progresses.set(sdid, null);
      creating.delete(sdid);
    }
  }
}
async function update() {
  for (const sdid of updating[0].values()) {
    updating[0].delete(sdid);
    await set_progress(sdid);
  }
  if (updating[0].size) {setTimeout(update, 500);} else {updating[1] = performance.now();}
}
function new_socket() {
  if (socket) {socket.onerror = socket.onclose = null; document.getElementById("connected").classList.add("not");}
  socket = new WebSocket(`ws://localhost:${port}/monitor`);
  socket.onopen = function () {document.getElementById("connected").classList.remove("not");};
  socket.onerror = socket.onclose = new_socket;
  socket.onmessage = function(event) {
    const progression = JSON.parse(event.data);
    const sdid = progression.sdid;
    if (progresses.has(sdid)) {
      if (progresses.get(sdid) === null) {return;}
      progresses.set(sdid, progression.progress);
      if (! creating.has(sdid)) {
        updating[0].add(sdid);
        if (updating[1] != null) {
          setTimeout(update, Math.max(0, updating[1] + 500 - performance.now()));
          updating[1] = null;
        }
      }
    } else {
      progresses.set(sdid, progression.progress);
      creating.add(sdid);
      if (creating.size == 1) {setTimeout(create, 1);}
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
      browser.runtime.sendMessage({"explorer": download.getElementsByClassName("file")[1].innerText + (download.className != "completed" ? ".idownload" : "")}).finally(Boolean);
      break;
    case "discard":
      if (! window.confirm("Discard the download ?")) {break;}
    case "suspend":
      if (download.className != "working") {break;}
      socket.send(`${this.className} ${sdid}`);
      break;
    case "restart":
      if (download.className != "aborted" || (Object.hasOwn(progresses.get(sdid), "sections") && ! window.confirm("Restart the download ?"))) {break;}
      delete progresses.get(sdid).sections;
    case "resume":
      if (download.className != "aborted") {break;}
      download.className = "";
      browser.storage.local.get(["p0_" + sdid, "p1_" + sdid]).then((results) => browser.storage.local.remove(Object.keys(results)).then(() => browser.runtime.sendMessage({sdid, "progress": progresses.get(sdid)})).then(function (response) {if (! response) {throw null;}}).catch(() => browser.storage.local.set(Object.hasOwn(progresses.get(sdid), "sections") ? results : {}).then(function () {download.className = "aborted";})));
      break;
  }
}
Promise.all([browser.tabs.query({url: browser.runtime.getURL(location.href)}), browser.storage.session.get("sid")]).then(
  function ([tabs, results]) {
    if (tabs.length > 1 || results.sid?.toString() != sid) {
      browser.tabs.getCurrent().then((tab) => browser.tabs.remove(tab.id));
    } else {
      browser.storage.local.get().then(
        function (results) {
          port = results.port ?? 9009;
          for (const d of Object.entries(results).filter((r) => r[0][0] == "p" && r[0][2] == "_").map((r) => [r[0].substring(3).split('_'), r[1]]).sort((d1, d2) => (d1[0][0] - d2[0][0]) || (d1[0][1] - d2[0][1]))) {
            const sdid = d[0].join("_");
            progresses.set(sdid, d[1]);
            creating.add(sdid);
          }
          return create();
        },
        function () {port = 9009;}
      ).then(new_socket);
    }
  }
);