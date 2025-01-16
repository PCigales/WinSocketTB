const url_rid = new Map();
const rid_url = new Map();
const rid_headers = new Map();
browser.downloads.onCreated.addListener(
  function (item) {
    const rid = url_rid.get(item.url);
    if (! rid) {return;}
    browser.runtime.sendNativeMessage("httpidownload", {did: item.id, url: rid_url.get(rid), file: item.filename, headers: rid_headers.get(rid)}).then(
      function (response) {if (response) {browser.downloads.cancel(item.id).catch(() => null);}},
      function (error) {() => null}
    );
  }
);
browser.webRequest.onSendHeaders.addListener(
  function (details) {
    url_rid.set(details.url, details.requestId);
    rid_url.set(details.requestId, details.url);
    rid_headers.set(details.requestId, details.requestHeaders);
  },
  {urls: ["<all_urls>"], types: ["main_frame", "sub_frame", "xmlhttprequest", "other"]},
  ["requestHeaders"]
);
browser.action.onClicked.addListener(
  function (tab, click) {
    browser.tabs.query({windowId: tab.windowId, url: browser.runtime.getURL("httpidownload.html")}).then(function (tabs) {if (tabs.length) {browser.tabs.update(tabs[0].id, {active: true});} else {browser.tabs.create({url: "httpidownload.html"});}});
  }
);