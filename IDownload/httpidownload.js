"use strict";
const sid = parseInt((new URLSearchParams(location.search)).get("sid"));
const num_form = Intl.NumberFormat();
const progressions = new Map();      
const updating = [new Set(), 1];
let socket;
async function update(add=false) {
  if (add) {
    const downloads = (await browser.storage.session.get("downloads"))["downloads"] || [];
    const nd = document.getElementsByTagName("li").length - 1;
    downloads.splice(0, nd);
    downloads.forEach(function (e, i, a) {a[i] = "download" + e.toString();});
    const dinfs = await browser.storage.session.get(downloads);
    for (let d=document.getElementsByTagName("li").length-1-nd, l=downloads.length; d<l; d++) {
      const did = downloads[d];
      const dinf = dinfs[did];
      const download = document.getElementById("download_pattern").cloneNode(true);
      download.id = did;
      download.getElementsByClassName("url")[0].innerText = dinf.url;
      download.getElementsByClassName("file")[0].innerText = dinf.file;
      Array.prototype.forEach.call(download.getElementsByTagName("button"), function (b) {b.addEventListener("click", send_command);});
      document.getElementById("downloads").prepend(download);
    }
  }
  for (const did of updating[0]) {
    const progression = progressions.get(did);
    const download = document.getElementById(did);
    if (! download) {
      updating[1] = - setTimeout(update, 100, true);
      return;
    }
    const progress = progression.progress;
    download.className = progress.status.split(" ")[0];
    download.getElementsByClassName("size")[0].innerText = (progress.status == "completed" || progress.size) ? num_form.format(progress.size) : "";
    download.getElementsByClassName("status")[0].innerText = progress.status;
    download.getElementsByClassName("downloaded")[0].innerText = num_form.format(progress.downloaded);
    download.getElementsByClassName("bar")[0].innerHTML = progress.sections ? progress.sections.reduce((a, c) => `${a}<progress max="${c.size}" value="${c.downloaded}" style="flex: ${c.size} 1 ${c.size}px"></progress>`, "") : ((progress.status != "aborted" && progress.size) ? `<progress max="${progress.size}" value="${progress.downloaded}" style="flex: 1 1 1px"></progress>` : "");
    download.getElementsByClassName("percent")[0].innerText = (progress.status == "completed" || progress.size) ? progress.percent.toString() : "";
    updating[0].delete(did);
  }
  updating[1] = performance.now();
}
function new_socket() {
  if (socket) {socket.onerror = socket.onclose = null; document.getElementById("connected").classList.add("not");}
  socket = new WebSocket("ws://localhost:9009/monitor");
  socket.onopen = function () {document.getElementById("connected").classList.remove("not");};
  socket.onerror = socket.onclose = new_socket;
  socket.onmessage = function(event) {
    const progression = JSON.parse(event.data);
    console.log(progression);
    if (progression.sid != sid) {return;}
    const did = "download" + progression.did.toString();
    const to = progressions.has(did);
    progressions.set(did, progression);
    updating[0].add(did);
    if (to) {
      if (updating[1] > 0) {updating[1] = - setTimeout(update, Math.max(0, updating[1] - performance.now()));}
    } else {
      if (updating[1] <= 0) {clearTimeout(updating[1]);}
      updating[1] = - setTimeout(update, 1, true);
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
  switch (this.className) {
    case "discard":
    case "suspend":
      socket.send(`${this.className} ${this.parentNode.id.substring(8)}`);
      break;
    case "restart":
      delete progressions.get(this.parentNode.id).sections;
    case "resume":
      const download = this.parentNode;
      Array.prototype.forEach.call(download.getElementsByTagName("button"), function (b) {b.style.display = "none";});
      //browser.storage.session.set({[this.parentNode.id]: true});
      //browser.runtime.sendMessage(progressions.get(this.parentNode.id)).finally(function () {Array.prototype.forEach.call(download.getElementsByTagName("button"), function (b) {b.style.display = "";}); browser.storage.session.remove(this.parentNode.id);});
      browser.runtime.sendMessage(progressions.get(this.parentNode.id)).finally(function () {Array.prototype.forEach.call(download.getElementsByTagName("button"), function (b) {b.style.display = "";});});
      break;
  }
}
new_socket();