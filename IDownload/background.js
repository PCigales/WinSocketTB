browser.webRequest.onSendHeaders.addListener(
  function (details) {
    url_rid.set(details.url, details.requestId);
    rid_inf.set(details.requestId, [details.url, details.requestHeaders]);
  },
  {urls: ["<all_urls>"], types: ["main_frame", "sub_frame", "xmlhttprequest", "other"]},
  ["requestHeaders"]
);
browser.downloads.onCreated.addListener(
  function (item) {
    const rid = url_rid.get(item.url);
    if (! rid) {return;}
    const inf = rid_inf.get(rid);
    const did = item.id;
    const dinf = {url: inf[0], file: item.filename, headers: inf[1]};
    Promise.all([get_sid(), get_histper()]).then(
      function ([sid, histper]) {
        const sdid = `${sid}_${did}`;
        Promise.all([browser.storage.local.get({port: 9009, maxsecs: 8, secmin: 1}), browser.storage.session.set({[sdid]: dinf}), (histper > 0 ? browser.storage.local.set({["i_" + sdid]: dinf}) : Promise.resolve())]).then(
          function ([results]) {
            browser.runtime.sendNativeMessage("idownload", {...results, sdid, ...dinf}).then(
              function (response) {if (response) {browser.downloads.cancel(did).catch(Boolean);}},
              function () {}
            );
          }
        );
      }
    );
  }
);
browser.action.onClicked.addListener(
  function (tab, click) {
    Promise.all([get_sid(), get_histper()]).then(
      function ([sid]) {
        browser.tabs.query({url: browser.runtime.getURL(`center.html?sid=${sid}`)}).then(
          function (tabs) {
            (tabs.length ? browser.windows.update(tabs[0].windowId, {focused: true}) : Promise.reject()).catch(function () {browser.windows.create({type: "popup", url: `center.html?sid=${sid}`});});
          }
        );
      }
    );
  }
);
browser.runtime.onMessage.addListener(
  function (message, sender, respond) {
    get_sid().then(
      function (sid) {
        if (sender.url != browser.runtime.getURL(`center.html?sid=${sid}`)) {return;}
        if (message.hasOwnProperty("explorer")) {
          browser.runtime.sendNativeMessage("idownload", message).then(
            function (response) {respond(response);},
            function () {respond(false);}
          );
          return
        }
        const sdid = message.sdid;
        Promise.all([browser.storage.local.get({port: 9009, maxsecs: 8, secmin: 1}), browser.storage.session.get(sdid)]).then(
          function ([results1, results2]) {
            browser.runtime.sendNativeMessage("idownload", {...results1, sdid, ...results2[sdid], progress: (message.progress.hasOwnProperty("sections") ? message.progress : null)}).then(
              function (response) {respond(response);},
              function () {respond(false);}
            );
          }
        );
      }
    );
    return true;
  }
);
const url_rid = new Map();
const rid_inf = new Map();
function get_sid() {
  if (get_sid.sid === undefined) {
    get_sid.sid = browser.storage.session.get("sid").then(
      function (results) {
        if (results.hasOwnProperty("sid")) {
          return results.sid;
        } else {
          const sid = Date.now();
          return browser.storage.session.set({"sid": sid}).then(() => sid);
        }
      }
    );
  }
  return get_sid.sid;
}
function get_histper() {
  if (get_histper.histper === undefined) {
    get_histper.histper = Promise.all([get_sid(), browser.storage.session.get("histper")]).then(
      function ([sid, results]) {
        if (results.hasOwnProperty("histper")) {
          return results.histper;
        } else {
          return browser.storage.local.get().then(
            function (results) {
              const histper = results.hasOwnProperty("histper") ? results.histper : 7;
              const a = {histper};
              const d = [];
              for (const r of Object.entries(results)) {
                if (r[0][1] == "_") {
                  const sdid = r[0].substring(2);
                  if (sid - parseInt(sdid.split('_')) >= histper * 86400000) {
                    d.push(r[0]);
                  } else if (r[0][0] == "i") {
                    a[sdid] = r[1];
                  }
                }
              }
              return Promise.all([browser.storage.local.remove(d), browser.storage.session.set(a)]).then(() => histper);
            }
          );
        }
      }
    );
  }
  return get_histper.histper;
}