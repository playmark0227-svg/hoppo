/* ============================================================
   LINE 連携（LIFF v2）
   ------------------------------------------------------------
   ・LINEアプリ内で開かれた場合は、タップ不要で自動的にログイン状態になる
     （LIFFブラウザでは liff.isLoggedIn() が常に true）
   ・通常のブラウザで開いた場合は「勝手にLINEへ飛ばさない」。
     設定画面のボタンを押したときだけ liff.login() を呼ぶ。
   ・config.liffId が空、SDKが落ちている、LINE側が失敗した——
     どの場合でもアプリは従来どおり動く（連携は任意機能）。
   ============================================================ */
(function () {
  const SDK_URL = 'https://static.line-scdn.net/liff/edge/2/sdk.js';

  /* 連携の状態。UI はこれを見て表示を切り替える。 */
  const state = {
    configured: false,   // liffId が設定されているか
    ready: false,        // liff.init() が成功したか
    inClient: false,     // LINEアプリ内で開かれているか
    loggedIn: false,     // LINEログイン済みか
    profile: null,       // { userId, displayName, pictureUrl }
    error: ''            // 失敗理由（UI表示用の短い識別子）
  };

  let initPromise = null;
  let sdkPromise = null;

  function cfg() {
    return window.HOPPO_CONFIG || {};
  }

  function liffId() {
    return String(cfg().liffId || '').trim();
  }

  /* ---------------- SDK の遅延読み込み ----------------
     liffId が未設定なら一度も呼ばれない = 外部通信ゼロ。 */
  function loadSdk() {
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      if (window.liff) { resolve(window.liff); return; }
      const s = document.createElement('script');
      s.src = SDK_URL;
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.referrerPolicy = 'no-referrer';
      s.onload = () => (window.liff ? resolve(window.liff) : reject(new Error('sdk-missing')));
      s.onerror = () => reject(new Error('sdk-load-failed'));
      document.head.appendChild(s);
    });
    return sdkPromise;
  }

  /* ---------------- 初期化 ----------------
     アプリ起動をブロックしないよう、呼び出し側は await しなくてよい。 */
  function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (!liffId()) {
        state.error = 'not-configured';
        return state;
      }
      state.configured = true;
      try {
        const liff = await loadSdk();
        await liff.init({ liffId: liffId() });
        state.ready = true;
        state.inClient = !!liff.isInClient();
        state.loggedIn = !!liff.isLoggedIn();
        if (state.loggedIn) await syncProfile();
      } catch (e) {
        // 失敗しても致命的ではない。理由だけ残してアプリは通常動作。
        state.error = (e && e.message) || 'init-failed';
        console.warn('[LIFF] init failed:', e);
      }
      emit();
      return state;
    })();
    return initPromise;
  }

  /* ---------------- プロフィール取得 ---------------- */
  async function syncProfile() {
    const liff = window.liff;
    if (!liff || !liff.isLoggedIn()) return null;
    try {
      const p = await liff.getProfile();
      state.profile = {
        userId: p.userId || '',
        displayName: p.displayName || '',
        pictureUrl: p.pictureUrl || ''
      };
      if (window.Store && Store.setLine) {
        Store.setLine({
          userId: state.profile.userId,
          displayName: state.profile.displayName,
          pictureUrl: state.profile.pictureUrl,
          linkedAt: new Date().toISOString()
        });
        // ニックネーム未設定（＝'ゲスト'のまま）の人だけ、LINEの表示名を初期値として採用する。
        // 自分で名前を決めている人の設定を上書きしてはいけない。
        const s = Store.get();
        if ((!s.name || s.name === 'ゲスト') && state.profile.displayName) {
          Store.setName(state.profile.displayName);
        }
      }
      return state.profile;
    } catch (e) {
      console.warn('[LIFF] getProfile failed:', e);
      return null;
    }
  }

  /* ---------------- ログイン / ログアウト ----------------
     login() は必ずユーザー操作起点でのみ呼ぶこと。
     起動時に自動で呼ぶと、LINE外のブラウザで開いた人が
     何もしていないのにLINEへリダイレクトされてしまう。 */
  function login() {
    if (!state.ready || !window.liff) return false;
    try {
      window.liff.login({ redirectUri: location.href });
      return true;
    } catch (e) {
      console.warn('[LIFF] login failed:', e);
      return false;
    }
  }

  function logout() {
    try {
      if (state.ready && window.liff && window.liff.isLoggedIn()) window.liff.logout();
    } catch (e) { /* ignore */ }
    state.loggedIn = false;
    state.profile = null;
    if (window.Store && Store.clearLine) Store.clearLine();
    emit();
  }

  /* ---------------- LINEのアイコンをプロフィール画像に取り込む ----------------
     ライセンス証はプロフィール画像を canvas に描いてPNG保存する。
     外部URLのまま渡すと canvas が汚染されて保存が壊れるため、
     必ず data URL に変換してから保存する。CORSで変換できない場合は
     取り込みを諦める（表示用のURLはそのまま使える）。 */
  function importPictureAsAvatar() {
    return new Promise((resolve) => {
      const url = state.profile && state.profile.pictureUrl;
      if (!url) { resolve({ ok: false, reason: 'no-picture' }); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.onload = () => {
        try {
          const size = Math.min(512, img.naturalWidth || 512);
          const c = document.createElement('canvas');
          c.width = c.height = size;
          const ctx = c.getContext('2d');
          // 正方形に中央トリミング
          const side = Math.min(img.naturalWidth, img.naturalHeight);
          ctx.drawImage(img,
            (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side,
            0, 0, size, size);
          const data = c.toDataURL('image/png');
          if (!data.startsWith('data:image/png;base64,') || data.length > 200000) {
            resolve({ ok: false, reason: 'too-large' });
            return;
          }
          Store.setProfile({ avatarImage: data });
          resolve({ ok: true });
        } catch (e) {
          // toDataURL が SecurityError → CORSヘッダーが無く変換できない
          resolve({ ok: false, reason: 'cors' });
        }
      };
      img.onerror = () => resolve({ ok: false, reason: 'load-failed' });
      img.src = url;
    });
  }

  /* ---------------- LINE内蔵のQRリーダー ----------------
     LINEのアプリ内ブラウザは getUserMedia が使えないことがあるため、
     LINE内では純正リーダーを使う。使えない場合は false を返して
     従来の jsQR 経路にフォールバックさせる。 */
  function canScan() {
    return !!(state.ready && state.inClient && window.liff &&
              typeof window.liff.scanCodeV2 === 'function');
  }

  async function scan() {
    if (!canScan()) return null;
    try {
      const res = await window.liff.scanCodeV2();
      return (res && res.value) ? res.value : null;
    } catch (e) {
      console.warn('[LIFF] scanCodeV2 failed:', e);
      return null;
    }
  }

  /* LIFFアプリを閉じる（LINE内のみ意味がある） */
  function closeWindow() {
    if (state.ready && state.inClient && window.liff) {
      try { window.liff.closeWindow(); } catch (e) { /* ignore */ }
    }
  }

  /* ---------------- 変更通知 ---------------- */
  const listeners = [];
  function on(cb) { listeners.push(cb); }
  function emit() {
    listeners.forEach(cb => { try { cb(getState()); } catch (e) { console.warn(e); } });
  }

  function getState() { return { ...state, profile: state.profile ? { ...state.profile } : null }; }

  window.Line = {
    init, getState, login, logout, syncProfile,
    importPictureAsAvatar, canScan, scan, closeWindow, on,
    get isConfigured() { return !!liffId(); },
    get addFriendUrl() { return String(cfg().lineAddFriendUrl || '').trim(); }
  };
})();
