const url_rid = new Map();
const rid_inf = new Map();
const get_sid = browser.storage.session.get("sid").then(
  function (results) {
    if (results.hasOwnProperty("sid")) {
      return Promise.resolve(results.sid);
    } else {
      const sid = Date.now();
      return browser.storage.session.set({"sid": sid}).then(() => sid);
    }
  }
);
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
    get_sid.then(
      function (sid) {
        const sdid = `${sid}_${did}`
        Promise.all([browser.storage.local.get({port: 9009, maxsecs: 8, secmin: 1}), browser.storage.session.set({[sdid]: dinf})]).then(
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
    get_sid.then(
      function (sid) {
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
    get_sid.then(
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