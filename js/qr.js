/* ============================================================
   QR — camera scan + manual entry
   Uses jsQR, loaded lazily on first use.
   ============================================================ */
(function() {
  let stream = null;
  let scanning = false;
  let rafId = null;
  let jsQRReady = null;

  function loadJsQR() {
    if (jsQRReady) return jsQRReady;
    jsQRReady = new Promise((resolve, reject) => {
      if (window.jsQR) { resolve(window.jsQR); return; }
      const s = document.createElement('script');
      // セキュリティ: 参照元を送らず CORS で取得する。CSP で script-src は
      // 'self' と cdn.jsdelivr.net のみ許可し、connect-src は 'self' に限定して
      // いるため、万一このスクリプトが改ざんされても端末内データを外部へ送信
      // できない。（理想は jsQR を同梱して script-src を 'self' のみに絞ること）
      s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
      s.crossOrigin = 'anonymous';
      s.referrerPolicy = 'no-referrer';
      s.onload = () => resolve(window.jsQR);
      s.onerror = () => reject(new Error('jsQR load failed'));
      document.head.appendChild(s);
    });
    return jsQRReady;
  }

  async function startScan() {
    // 連打・多重起動を防ぐ（CDN読込待ちの間に再タップされるとカメラがリークする）
    if (scanning || stream) return;
    const video = document.getElementById('qrVideo');
    const placeholder = document.getElementById('qrPlaceholder');
    const startBtn = document.getElementById('qrStartBtn');
    const stopBtn = document.getElementById('qrStopBtn');
    startBtn.disabled = true;

    try {
      await loadJsQR();
    } catch (e) {
      startBtn.disabled = false;
      UI.toast('スキャナの読み込みに失敗。手入力をお使いください', 'bad', 3000);
      return;
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
    } catch (e) {
      console.warn(e);
      UI.toast('カメラが使えませんでした', 'bad', 3000);
      stream = null;
      startBtn.disabled = false;
      return;
    }

    video.srcObject = stream;
    video.setAttribute('playsinline', 'true');
    await video.play();
    placeholder.hidden = true;
    startBtn.hidden = true;
    startBtn.disabled = false;
    stopBtn.hidden = false;
    scanning = true;
    lastDecode = 0;
    tick();
  }

  let lastDecode = 0;
  const SCAN_MAX_W = 480;   // デコード用に縮小する最大幅
  const SCAN_INTERVAL = 160; // デコード間隔(ms) — フレーム毎の重い処理を間引く

  function tick() {
    if (!scanning) return;
    rafId = requestAnimationFrame(tick);

    const now = (window.performance && performance.now) ? performance.now() : Date.now();
    if (now - lastDecode < SCAN_INTERVAL) return;
    lastDecode = now;

    const video = document.getElementById('qrVideo');
    const canvas = document.getElementById('qrCanvas');
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // フル解像度フレームを縮小してデコード（コストを数分の1に）
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return;
    const scale = Math.min(1, SCAN_MAX_W / vw);
    const w = Math.round(vw * scale), h = Math.round(vh * scale);
    if (canvas.width !== w) { canvas.width = w; canvas.height = h; }

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const code = window.jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
    if (code && code.data) {
      handleCode(code.data.trim());
    }
  }

  function stopScan() {
    scanning = false;
    if (rafId) cancelAnimationFrame(rafId);
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    document.getElementById('qrPlaceholder').hidden = false;
    document.getElementById('qrStartBtn').hidden = false;
    document.getElementById('qrStopBtn').hidden = true;
  }

  function handleCode(raw) {
    stopScan();
    redeem(raw);
  }

  function redeem(code) {
    const normalized = (code || '').toUpperCase().trim();

    // ----- スタンプラリーコード -----
    const stampId = (window.STAMP_CODES || {})[normalized];
    if (stampId) {
      redeemStamp(stampId);
      return;
    }

    const entry = window.QR_CODES[normalized];
    if (!entry) {
      UI.toast('このコードは使えません…', 'bad');
      return;
    }
    if (Store.isQrUsed(normalized)) {
      UI.toast('このコードは既に使用済みです', 'bad', 2600);
      return;
    }
    Store.markQrUsed(normalized);
    Store.addPoints(entry.points, { type: 'qr', label: entry.label }, { silent: true });
    UI.flashPoints();
    UI.confetti();
    UI.toast(`${entry.label} +${entry.points}pt !`, 'points', 2800);
    UI.refreshHeader();
    UI.refreshHome();
  }

  function bind() {
    document.getElementById('qrStartBtn').addEventListener('click', startScan);
    document.getElementById('qrStopBtn').addEventListener('click', stopScan);
    document.getElementById('qrManualBtn').addEventListener('click', () => {
      const input = document.getElementById('qrManualInput');
      const val = input.value.trim();
      if (!val) return;
      redeem(val);
      input.value = '';
    });
    document.getElementById('qrManualInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('qrManualBtn').click();
    });

    // Tap-to-copy demo codes
    document.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.dataset.copy;
        try {
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(code);
            UI.toast(`「${code}」をコピーしました`, 'good', 1800);
          } else {
            // Fallback: paste into manual input directly
            const input = document.getElementById('qrManualInput');
            if (input) {
              input.value = code;
              input.focus();
              UI.toast('入力欄に貼り付けました', 'good', 1800);
            }
          }
        } catch (e) {
          // Final fallback: just paste into input
          const input = document.getElementById('qrManualInput');
          if (input) input.value = code;
          UI.toast('コードを入力欄に貼り付けました', 'good', 1800);
        }
      });
    });

    // "Use a demo code" shortcut button — picks the first unused code
    const demoBtn = document.getElementById('qrShowDemo');
    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        const codes = Object.keys(window.QR_CODES || {});
        const next = codes.find(c => !Store.isQrUsed(c));
        if (!next) {
          UI.toast('全てのデモコードが使用済みです', 'bad');
          return;
        }
        if (confirm(`デモコード「${next}」を使用しますか？`)) {
          redeem(next);
        }
      });
    }

    // Stop camera when leaving QR page
    UI.on('page', (page) => {
      if (page !== 'qr' && scanning) stopScan();
    });
  }

  function redeemStamp(stampId) {
    const stamp = window.getStampById ? window.getStampById(stampId) : null;
    if (!stamp) {
      UI.toast('このコードは使えません…', 'bad');
      return;
    }
    if (Store.hasStamp(stampId)) {
      UI.toast(`「${stamp.name}」のスタンプは取得済みです`, 'bad', 2400);
      return;
    }
    Store.earnStamp(stampId);
    const pts = window.STAMP_POINTS || 30;
    Store.addPoints(pts, { type: 'stamp', label: `スタンプ：${stamp.name}` }, { silent: true });
    UI.flashPoints();
    UI.confetti();
    UI.toast(`${stamp.emoji} スタンプ獲得！「${stamp.name}」 +${pts}pt`, 'points', 3000);
    UI.refreshHeader();
    UI.refreshHome();
    if (window.Stamps) Stamps.refresh();
    // 獲得したスタンプの詳細を見せる
    if (window.UI && UI.showStamp) {
      setTimeout(() => UI.showStamp(stampId), 650);
    }
  }

  window.QR = { init: bind, stop: stopScan, redeem };
})();
