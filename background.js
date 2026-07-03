// 注入並切換放大鏡（帶重試機制）
async function toggleMagnifier(tabId, windowId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_MAGNIFIER' });
  } catch (_e) {
    // Content script 沒有回應，重新注入後再試一次
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      await chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_MAGNIFIER' });
    } catch (e2) {
      console.warn('[Magnifier] 無法在此頁面啟用:', e2.message);
    }
  }
}

// 快捷鍵
chrome.commands.onCommand.addListener((command) => {
  if (command !== 'toggle-magnifier') return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) toggleMagnifier(tabs[0].id, tabs[0].windowId);
  });
});

// popup 發來的切換請求
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'TOGGLE_FROM_POPUP') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) toggleMagnifier(tabs[0].id, tabs[0].windowId);
    });
    sendResponse({ ok: true });
  }

  // content script 請求截圖
  if (msg.type === 'CAPTURE_TAB') {
    chrome.tabs.captureVisibleTab(
      sender.tab.windowId,
      { format: 'jpeg', quality: 85 },
      (dataUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ dataUrl });
        }
      }
    );
    return true;
  }
});
