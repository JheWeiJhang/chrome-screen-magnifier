const zoomSlider = document.getElementById('zoomSlider');
const radiusSlider = document.getElementById('radiusSlider');
const zoomVal = document.getElementById('zoomVal');
const radiusVal = document.getElementById('radiusVal');
const toggleBtn = document.getElementById('toggleBtn');
const toggleIcon = document.getElementById('toggleIcon');
const toggleText = document.getElementById('toggleText');

// ── 載入儲存的設定 ────────────────────────────────────
chrome.storage.sync.get(['zoom', 'radius'], (data) => {
  const zoom = data.zoom || 3;
  const radius = data.radius || 120;
  zoomSlider.value = zoom;
  radiusSlider.value = radius;
  zoomVal.textContent = zoom + 'x';
  radiusVal.textContent = radius + 'px';
  updateZoomPresets(zoom);
  updateRadiusPresets(radius);
});

// ── 滑桿事件 ──────────────────────────────────────────
zoomSlider.addEventListener('input', () => {
  const v = parseFloat(zoomSlider.value);
  zoomVal.textContent = v + 'x';
  chrome.storage.sync.set({ zoom: v });
  updateZoomPresets(v);
});

radiusSlider.addEventListener('input', () => {
  const v = parseInt(radiusSlider.value);
  radiusVal.textContent = v + 'px';
  chrome.storage.sync.set({ radius: v });
  updateRadiusPresets(v);
});

// ── 預設按鈕 ──────────────────────────────────────────
document.getElementById('zoomPresets').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-zoom]');
  if (!btn) return;
  const v = parseFloat(btn.dataset.zoom);
  zoomSlider.value = v;
  zoomVal.textContent = v + 'x';
  chrome.storage.sync.set({ zoom: v });
  updateZoomPresets(v);
});

document.getElementById('radiusPresets').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-radius]');
  if (!btn) return;
  const v = parseInt(btn.dataset.radius);
  radiusSlider.value = v;
  radiusVal.textContent = v + 'px';
  chrome.storage.sync.set({ radius: v });
  updateRadiusPresets(v);
});

function updateZoomPresets(current) {
  document.querySelectorAll('[data-zoom]').forEach(btn => {
    btn.classList.toggle('active', parseFloat(btn.dataset.zoom) === current);
  });
}

function updateRadiusPresets(current) {
  document.querySelectorAll('[data-radius]').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.radius) === current);
  });
}

// ── 切換按鈕 ──────────────────────────────────────────
toggleBtn.addEventListener('click', () => {
  // 交給 background 統一處理（含自動重試注入）
  chrome.runtime.sendMessage({ type: 'TOGGLE_FROM_POPUP' }, () => {
    window.close();
  });
});

// 取得目前頁面的放大鏡狀態（若有的話）
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0]) return;
  chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATUS' }, (resp) => {
    setToggleState(!!resp);
  });
});

document.getElementById('customizeLink').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

function setToggleState(isOn) {
  if (isOn) {
    toggleBtn.className = 'toggle-btn on';
    toggleIcon.textContent = '✅';
    toggleText.textContent = '放大鏡已啟用';
  } else {
    toggleBtn.className = 'toggle-btn off';
    toggleIcon.textContent = '⭕';
    toggleText.textContent = '放大鏡已關閉';
  }
}
