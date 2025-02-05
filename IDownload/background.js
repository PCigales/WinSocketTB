"use strict";
if (! ("browser" in globalThis)) {globalThis.browser = globalThis.chrome;}
browser.webRequest.onSendHeaders.addListener(
  function (details) {
    url_rid.set(details.url, details.requestId);
    rid_inf.set(details.requestId, [details.url, details.requestHeaders]);
  },
  {urls: ["<all_urls>"], types: ["main_frame", "sub_frame", "xmlhttprequest", "image", "imageset", "media", "other"].filter(function (e) {return this.includes(e);}, Object.values(browser.webRequest.ResourceType))},
  ["requestHeaders", "extraHeaders"].filter(function (e) {return this.includes(e);}, Object.values(browser.webRequest.OnSendHeadersOptions))
);
browser.downloads.onCreated.addListener(
  function (item) {
    if (! item.filename || item.state != "in_progress") {return;}
    const url = item.finalUrl ?? item.url;
    const inf = url_rid.has(url) ? rid_inf.get(url_rid.get(url)) : [url, []];
    const did = item.id;
    const dinf = {url: inf[0], file: item.filename, headers: inf[1]};
    Promise.all([get_sid(), get_histopts()]).then(
      function ([sid, histopts]) {
        const sdid = `${sid}_${did}`;
        Promise.all([browser.storage.local.get({port: 9009, maxsecs: 8, secmin: 1, sparse: false}), browser.storage.session.set({[sdid]: dinf}), ((histopts[0] > 0) && (histopts[1] || ! item.incognito) ? browser.storage.local.set({[`i${item.incognito ? 0 : 1}_${sdid}`]: dinf}) : null)]).then(([results]) => browser.runtime.sendNativeMessage("idownload", {...results, sdid, ...dinf})).then((response) => response ? browser.downloads.cancel(did): null).catch(Boolean);
      }
    );
  }
);
browser.downloads.onChanged.addListener(
  function (delta) {
    if (! Object.hasOwn(delta, "filename")) {return;}
    Promise.all([get_sid(), get_histopts(), browser.downloads.search({id: delta.id})]).then(
      function ([sid, histopts, results]) {
        if (results.length != 1) {return;}
        const item = results[0];
        const url = item.finalUrl ?? item.url;
        const inf = url_rid.has(url) ? rid_inf.get(url_rid.get(url)) : [url, []];
        const did = item.id;
        const dinf = {url: inf[0], file: delta.filename.current, headers: inf[1]};
        const sdid = `${sid}_${did}`;
        Promise.all([browser.storage.local.get({port: 9009, maxsecs: 8, secmin: 1, sparse: false}), browser.storage.session.set({[sdid]: dinf}), ((histopts[0] > 0) && (histopts[1] || ! item.incognito) ? browser.storage.local.set({[`i${item.incognito ? 0 : 1}_${sdid}`]: dinf}) : null)]).then(([results]) => browser.runtime.sendNativeMessage("idownload", {...results, sdid, ...dinf})).then((response) => response ? browser.downloads.cancel(did): null).catch(Boolean);
      }
    );
  }
);
browser.action.onClicked.addListener(
  function (tab, click) {
    Promise.all([get_sid(), get_histopts()]).then(
      function ([sid]) {
        browser.tabs.query({url: browser.runtime.getURL(`center.html?sid=${sid}`)}).then((tabs) => tabs.length ? browser.windows.update(tabs[0].windowId, {focused: true}) : Promise.reject()).catch(() => browser.windows.create({type: "popup", url: `center.html?sid=${sid}`}));
      }
    );
  }
);
browser.runtime.onMessage.addListener(
  function (message, sender, respond) {
    get_sid().then(
      function (sid) {
        if (sender.url != browser.runtime.getURL(`center.html?sid=${sid}`)) {throw null;}
        if (Object.hasOwn(message, "explorer")) {return browser.runtime.sendNativeMessage("idownload", message);}
        const sdid = message.sdid;
        return Promise.all([browser.storage.local.get({port: 9009, maxsecs: 8, secmin: 1, sparse: false}), browser.storage.session.get(sdid)]).then(([results1, results2]) => browser.runtime.sendNativeMessage("idownload", {...results1, sdid, ...results2[sdid], progress: (Object.hasOwn(message.progress, "sections") ? message.progress : null)}));
      }
    ).catch(() => false).then(respond);
    return true;
  }
);
const url_rid = new Map();
const rid_inf = new Map();
function get_sid() {
  if (get_sid.sid === undefined) {
    get_sid.sid = browser.storage.session.get("sid").then(
      function (results) {
        if (Object.hasOwn(results, "sid")) {
          return results.sid;
        } else {
          const sid = Date.now();
          return browser.storage.session.set({sid}).then(() => sid);
        }
      }
    );
  }
  return get_sid.sid;
}
function get_histopts() {
  if (get_histopts.histopts === undefined) {
    get_histopts.histopts = Promise.all([get_sid(), browser.storage.session.get("histopts")]).then(
      function ([sid, results]) {
        if (Object.hasOwn(results, "histopts")) {
          return results.histopts;
        } else {
          return browser.storage.local.get().then(
            function (results) {
              const histopts = [(results.histper ?? 7) , (results.histinco ?? false)];
              const a = {histopts};
              const d = [];
              for (const r of Object.entries(results)) {
                if (r[0][2] == "_") {
                  const sdid = r[0].substring(3);
                  if ((! histopts[1] && r[0][1] == "0") || (sid - parseInt(sdid.split('_')) >= histopts[0] * 86400000)) {
                    d.push(r[0]);
                  } else if (r[0][0] == "i") {
                    a[sdid] = r[1];
                  }
                }
              }
              return Promise.all([browser.storage.local.remove(d), browser.storage.session.set(a)]).then(() => histopts);
            }
          );
        }
      }
    );
  }
  return get_histopts.histopts;
}