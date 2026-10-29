const SITE = "https://laczekstream.lovable.app";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "laczek-search",
      title: 'Search "%s" on LACZEK STREAM',
      contexts: ["selection"],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  const text = (info.selectionText || "").trim();
  if (!text) return;
  if (info.menuItemId === "laczek-search") {
    chrome.tabs.create({ url: `${SITE}/?q=${encodeURIComponent(text)}` });
  }
});
