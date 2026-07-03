(() => {
  if (window.__magnifierLoaded__) return;
  window.__magnifierLoaded__ = true;

  let active = false;
  let mouseX = 0, mouseY = 0;
  let screenshotImg = null;
  let captureInProgress = false;
  let animFrameId = null;

  const defaults = { zoom: 3, radius: 120 };
  let settings = { ...defaults };

  // ── DOM ───────────────────────────────────────────────
  const container = document.createElement('div');
  container.id = '__magnifier_root__';
  container.style.cssText = `
    all: initial;
    position: fixed !important;
    top: 0 !important; left: 0 !important;
    will-change: transform;
    pointer-events: none !important;
    z-index: 2147483647 !important;
    display: none !important;
  `;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  container.appendChild(canvas);

  const attach = () => {
    if (!document.documentElement.contains(container))
      document.documentElement.appendChild(container);
  };
  attach();

  // ── 設定 ──────────────────────────────────────────────
  chrome.storage.sync.get(['zoom', 'radius'], (d) => {
    settings.zoom   = d.zoom   || defaults.zoom;
    settings.radius = d.radius || defaults.radius;
  });
  chrome.storage.onChanged.addListener((c) => {
    if (c.zoom)   settings.zoom   = c.zoom.newValue;
    if (c.radius) settings.radius = c.radius.newValue;
  });

  // ── 乾淨截圖（確保 canvas 不在畫面上才截）───────────
  // 截圖與繪製完全分離：繪製永遠用快取的 screenshotImg，
  // 截圖只在必要時（啟動、捲動）執行一次，不影響繪製流暢度
  function takeCleanScreenshot(onDone) {
    if (captureInProgress) return;
    captureInProgress = true;

    // 確保 canvas 完全從合成器移除後再截圖
    canvas.style.display = 'none';

    // 等兩個 rAF：第一個讓 style 生效，第二個讓 GPU 合成完成
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        chrome.runtime.sendMessage({ type: 'CAPTURE_TAB' }, (resp) => {
          canvas.style.display = 'block';
          captureInProgress = false;

          if (resp && resp.dataUrl) {
            const img = new Image();
            img.onload = () => {
              screenshotImg = img;
              if (onDone) onDone();
            };
            img.src = resp.dataUrl;
          } else {
            if (onDone) onDone();
          }
        });
      });
    });
  }

  // ── 繪製（只用快取截圖 + 當前滑鼠座標，零 async）────
  function draw() {
    if (!active) return;
    animFrameId = requestAnimationFrame(draw);

    const r      = settings.radius;
    const zoom   = settings.zoom;
    const pad    = 4;
    const total  = r * 2 + pad * 2;
    const dpr    = window.devicePixelRatio || 1;

    const px = Math.round(total * dpr);
    if (canvas.width !== px) {
      canvas.width  = px;
      canvas.height = px;
      canvas.style.width  = total + 'px';
      canvas.style.height = total + 'px';
    }

    // GPU 加速定位（圓心對齊滑鼠）
    const cx = pad + r, cy = pad + r;
    const tx = Math.max(0, Math.min(mouseX - cx, window.innerWidth  - total));
    const ty = Math.max(0, Math.min(mouseY - cy, window.innerHeight - total));
    container.style.transform = `translate(${tx}px,${ty}px)`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, total, total);

    // 圓形剪切
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, total, total);

    if (screenshotImg) {
      // 以滑鼠座標為中心，從快取截圖取出對應區域並放大
      const sx = screenshotImg.naturalWidth  / window.innerWidth;
      const sy = screenshotImg.naturalHeight / window.innerHeight;
      const hw = r / zoom;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        screenshotImg,
        (mouseX - hw) * sx, (mouseY - hw) * sy,
        hw * 2 * sx, hw * 2 * sy,
        0, 0, total, total
      );
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('載入中...', cx, cy);
    }

    ctx.restore();

    // 外框
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur  = 10;
    ctx.stroke();
    ctx.restore();

    // 倍率標籤
    ctx.save();
    ctx.font = 'bold 10px monospace';
    const label = `${zoom}x`;
    const lw = ctx.measureText(label).width + 10;
    const lh = 16;
    const lx = cx - lw / 2;
    const ly = cy + r - lh - 6;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath(); ctx.roundRect(lx, ly, lw, lh, 3); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, ly + lh / 2);
    ctx.restore();
  }

  // ── 捲動時更新截圖（debounce）────────────────────────
  let scrollTimer = null;
  function onScroll() {
    if (!active) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => takeCleanScreenshot(), 250);
  }

  // ── 滑鼠 ──────────────────────────────────────────────
  function onMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }

  function onWheel(e) {
    if (!active) return;
    e.preventDefault();
    const d = e.deltaY < 0 ? 1 : -1;
    if (e.shiftKey) {
      settings.radius = Math.max(40, Math.min(300, settings.radius + d * 10));
      chrome.storage.sync.set({ radius: settings.radius });
    } else {
      settings.zoom = parseFloat(
        Math.max(1.5, Math.min(10, settings.zoom + d * 0.5)).toFixed(1)
      );
      chrome.storage.sync.set({ zoom: settings.zoom });
    }
  }

  // ── 開關 ──────────────────────────────────────────────
  function enable() {
    attach();
    active = true;
    container.style.setProperty('display', 'block', 'important');
    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('wheel',     onWheel, { passive: false, capture: true });
    document.addEventListener('scroll',    onScroll, true);
    document.documentElement.style.setProperty('cursor', 'none', 'important');

    draw(); // 立刻開始繪製（先顯示「載入中」）

    // 乾淨截圖取回後畫面自動更新（screenshotImg 一有值 draw() 就會使用）
    takeCleanScreenshot();
  }

  function disable() {
    active = false;
    container.style.setProperty('display', 'none', 'important');
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('wheel',     onWheel, { capture: true });
    document.removeEventListener('scroll',    onScroll, true);
    clearTimeout(scrollTimer);
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    document.documentElement.style.removeProperty('cursor');
    screenshotImg = null;
  }

  // ── 訊息 ──────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (msg.type === 'TOGGLE_MAGNIFIER') {
      active ? disable() : enable();
      sendResponse({ active });
    }
    if (msg.type === 'GET_STATUS') {
      sendResponse(active);
    }
    return true;
  });

  window.addEventListener('unload', disable);
})();
