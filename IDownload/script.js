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
    get_sid.then(
      function (sid) {
        const did = item.id;
        const dinf = {url: inf[0], file: item.filename, headers: inf[1]};
        browser.runtime.sendNativeMessage("httpidownload", {sid, did, ...dinf}).then(
          function (response) {
            if (response) {browser.downloads.cancel(did).catch(Boolean);}
            browser.storage.session.set({["download" + did.toString()]: dinf}).then(() => browser.storage.session.get("downloads")).then(
              function (results) {
                const downloads = results.hasOwnProperty("downloads") ? results.downloads : [];
                downloads.push(did);
                browser.storage.session.set({downloads});
              }
            );
          },
          function () {}
        );
      }
    );
  }
);
browser.action.onClicked.addListener(
  function (tab, click) {
    get_sid.then(
      function (sid) {
        browser.tabs.query({windowId: tab.windowId, url: browser.runtime.getURL("httpidownload.html?sid=" + sid.toString())}).then(
          function (tabs) {
            (tabs.length ? browser.tabs.update(tabs[0].id, {active: true}) : Promise.reject()).catch(function () {browser.tabs.create({url: "httpidownload.html?sid=" + sid.toString()});});
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
        if (sender.url != browser.runtime.getURL("httpidownload.html?sid=" + sid.toString())) {return;}
        browser.storage.session.get(message.did).then(
          function (results) {
            if (! results[message.did]) {
              browser.runtime.sendNativeMessage("httpidownload", {did: message.did, url: message.url, file: message.file, headers: message.headers, sections: message.sections}).then(
                function (response) {respond(response);},
                function (error) {respond(false);}
              );
            }
          },
          function (error) {}
        );
      }
    );
  }
);