/* ============================================================
   Store — localStorage-backed state
   ============================================================ */
(function() {
  const STORAGE_KEY = 'hoppou_status_v1';

  const DEFAULT_PROFILE = {
    bio: '',                  // 自己紹介
    favoriteIsland: 'kunashiri', // 'etorofu' | 'kunashiri' | 'shikotan' | 'habomai'
    avatarFrame: 'coral',     // 'coral' | 'ocean' | 'gold' | 'cherry' | 'mint' | 'plum'
    avatarPattern: 'wave',    // 'wave' | 'dots' | 'shine' | 'plain'
    avatarImage: '',          // Data URL of user-uploaded image; falls back to default Erika
    islandThemeOn: false,     // 推しの島カラーをアプリ全体に適用するか
    region: '',               // 出身・在住地域
    birthday: ''              // YYYY-MM-DD（任意）
  };

  const DEFAULT_SETTINGS = {
    soundEffects: true,       // 効果音（コンフェッティ・トースト演出）
    confetti: true,           // 紙吹雪を表示するか
    haptics: true,            // バイブレーション（対応端末のみ）
    reduceMotion: false,      // モーション控えめ
    highContrast: false,      // 高コントラスト表示
    notifyDaily: true,        // ログインボーナスのモーダル表示
    autoFlipLicense: false    // ライセンス画面で自動的に裏面を覗き見
  };

  const DEFAULT_STATE = {
    userId: null,
    name: 'ゲスト',
    createdAt: null,
    points: 0,
    totalEarned: 0,
    quizResults: {},        // { quizId: { bestScore, timesPlayed, lastPlayedAt } }
    usedQrCodes: [],        // list of one-time QR code strings already redeemed
    owned: [],              // list of shop item ids purchased
    history: [],            // array of { type, label, points, at }
    lastLoginDate: null,    // YYYY-MM-DD — for daily bonus
    loginStreak: 0,         // consecutive login days
    longestStreak: 0,       // best streak ever
    loginTotal: 0,          // total unique-day logins
    achievements: [],       // earned achievement ids
    stamps: {},             // { stampId: earnedAtISO } — スタンプラリー
    social: {               // ローカルデモ・ソーシャル（外部送信なし）
      following: [],        // followed rival ids
      dms: {},              // { rivalId: [{ me: bool, text, at }] }
      dmSeenAt: ''          // メッセージタブを最後に見た時刻（未読バッジ用）
    },
    flags: {},              // misc one-time flags (e.g. tutorialSeen)
    profile: { ...DEFAULT_PROFILE },
    settings: { ...DEFAULT_SETTINGS }
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Deep-merge nested objects so older saves still get default fields.
      return {
        ...DEFAULT_STATE,
        ...parsed,
        stamps: { ...(parsed.stamps || {}) },
        social: {
          following: [...((parsed.social && parsed.social.following) || [])],
          dms: { ...((parsed.social && parsed.social.dms) || {}) },
          dmSeenAt: (parsed.social && parsed.social.dmSeenAt) || ''
        },
        flags: { ...(parsed.flags || {}) },
        profile: { ...DEFAULT_PROFILE, ...(parsed.profile || {}) },
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) }
      };
    } catch (e) {
      console.warn('[store] load failed', e);
      return null;
    }
  }

  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // 容量超過時は、最も重いアバター画像を捨てて1回だけリトライ
      const quota = e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22);
      if (quota && state.profile && state.profile.avatarImage) {
        state.profile.avatarImage = '';
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          if (window.UI && UI.toast) UI.toast('保存容量が上限のため、プロフィール画像を解除しました', 'bad', 3200);
          return;
        } catch (e2) { /* fall through */ }
      }
      if (quota && window.UI && UI.toast) UI.toast('保存容量が上限に達しました', 'bad', 3000);
      console.warn('[store] save failed', e);
    }
  }

  function generateUserId() {
    // short human-readable id
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id.slice(0, 4) + '-' + id.slice(4);
  }

  function todayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function daysBetween(aStr, bStr) {
    if (!aStr || !bStr) return Infinity;
    const a = new Date(aStr + 'T00:00:00');
    const b = new Date(bStr + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }

  const Store = {
    state: null,

    init() {
      let state = load();
      if (!state) {
        state = {
          ...DEFAULT_STATE,
          userId: generateUserId(),
          createdAt: new Date().toISOString()
        };
      }
      if (!state.userId) state.userId = generateUserId();
      if (!state.createdAt) state.createdAt = new Date().toISOString();
      this.state = state;
      save(state);
      return state;
    },

    get() { return this.state; },

    /** Save + notify listeners. */
    commit() {
      save(this.state);
      this._emit('change', this.state);
    },

    /** Persist without firing 'change' (for low-importance updates like dmSeenAt). */
    saveOnly() {
      save(this.state);
    },

    /** Try to grant daily-login bonus; returns { points, streak, firstLogin } or null if already claimed today. */
    claimDailyLogin() {
      const today = todayString();
      if (this.state.lastLoginDate === today) return null;

      const gap = daysBetween(this.state.lastLoginDate, today);
      // 端末時計の巻き戻り対策：過去日付なら付与も更新もしない
      if (gap <= 0 && this.state.lastLoginDate) return null;
      const firstLogin = !this.state.lastLoginDate;

      let streak;
      if (firstLogin || gap > 1) streak = 1;
      else if (gap === 1) streak = (this.state.loginStreak || 0) + 1;
      else streak = this.state.loginStreak || 1; // shouldn't happen

      const pts = 5 + Math.min(streak - 1, 5) * 2; // 5, 7, 9, 11, 13, 15 cap
      this.state.lastLoginDate = today;
      this.state.loginStreak = streak;
      this.state.longestStreak = Math.max(this.state.longestStreak || 0, streak);
      this.state.loginTotal = (this.state.loginTotal || 0) + 1;

      this.addPoints(pts, { type: 'daily', label: `ログインボーナス（${streak}日連続）` }, { silent: true });
      return { points: pts, streak, longestStreak: this.state.longestStreak, firstLogin };
    },

    /** Award an achievement once. Returns the achievement record if newly earned, else null. */
    grantAchievement(id) {
      if (!id) return null;
      if (this.state.achievements.includes(id)) return null;
      this.state.achievements.push(id);
      this.commit();
      return id;
    },

    /** Add points and push a history entry. */
    addPoints(points, info, options = {}) {
      if (!points) return;
      this.state.points += points;
      if (points > 0) this.state.totalEarned += points;
      this.state.history.unshift({
        type: info.type || 'earn',
        label: info.label || 'ポイント獲得',
        points,
        at: new Date().toISOString()
      });
      if (this.state.history.length > 50) this.state.history.length = 50;
      this.commit();
      if (!options.silent) this._emit('points', { points, info });
    },

    /** Spend points (returns boolean success). */
    spendPoints(points, info) {
      if (this.state.points < points) return false;
      this.state.points -= points;
      this.state.history.unshift({
        type: info.type || 'spend',
        label: info.label || 'こうかん',
        points: -points,
        at: new Date().toISOString()
      });
      if (this.state.history.length > 50) this.state.history.length = 50;
      this.commit();
      return true;
    },

    recordQuizResult(quizId, score, total) {
      const prev = this.state.quizResults[quizId] || { bestScore: 0, timesPlayed: 0 };
      this.state.quizResults[quizId] = {
        bestScore: Math.max(prev.bestScore, score),
        timesPlayed: prev.timesPlayed + 1,
        lastPlayedAt: new Date().toISOString(),
        total
      };
      this.commit();
    },

    isQrUsed(code) { return this.state.usedQrCodes.includes(code); },

    markQrUsed(code) {
      if (!this.state.usedQrCodes.includes(code)) {
        this.state.usedQrCodes.push(code);
        this.commit();
      }
    },

    ownItem(itemId) {
      if (!this.state.owned.includes(itemId)) {
        this.state.owned.push(itemId);
        this.commit();
      }
    },

    ownsItem(itemId) { return this.state.owned.includes(itemId); },

    setName(name) {
      this.state.name = (name || '').trim().slice(0, 12) || 'ゲスト';
      this.commit();
    },

    /** Patch profile fields. Pass any subset of profile keys. */
    updateProfile(patch) {
      if (!patch || typeof patch !== 'object') return;
      const next = { ...this.state.profile, ...patch };
      // Sanitize string fields
      if (typeof next.bio === 'string') next.bio = next.bio.slice(0, 80);
      if (typeof next.region === 'string') next.region = next.region.slice(0, 24);
      this.state.profile = next;
      this.commit();
    },

    /** Patch settings fields. Pass any subset of settings keys. */
    updateSettings(patch) {
      if (!patch || typeof patch !== 'object') return;
      this.state.settings = { ...this.state.settings, ...patch };
      this.commit();
    },

    /** Convenience getters. */
    getProfile() { return { ...this.state.profile }; },
    getSettings() { return { ...this.state.settings }; },

    /* ---------------- Stamps (スタンプラリー) ---------------- */

    hasStamp(id) { return !!this.state.stamps[id]; },

    stampCount() { return Object.keys(this.state.stamps).length; },

    /** Earn a stamp. Returns false if already earned. */
    earnStamp(id) {
      if (this.state.stamps[id]) return false;
      this.state.stamps[id] = new Date().toISOString();
      this.commit();
      this._emit('stamp', id);
      return true;
    },

    /* ---------------- Social (ローカルデモ) ---------------- */

    isFollowing(id) { return this.state.social.following.includes(id); },

    follow(id) {
      if (!this.state.social.following.includes(id)) {
        this.state.social.following.push(id);
        this.commit();
      }
    },

    unfollow(id) {
      this.state.social.following = this.state.social.following.filter(x => x !== id);
      this.commit();
    },

    getDms(id) { return (this.state.social.dms[id] || []).slice(); },

    addDm(id, message) {
      (this.state.social.dms[id] = this.state.social.dms[id] || []).push(message);
      // Keep each thread bounded
      if (this.state.social.dms[id].length > 100) {
        this.state.social.dms[id] = this.state.social.dms[id].slice(-100);
      }
      this.commit();
      this._emit('dm', { id, message });
    },

    /* ---------------- Flags ---------------- */

    getFlag(key) { return !!this.state.flags[key]; },

    setFlag(key, value = true) {
      this.state.flags[key] = !!value;
      this.commit();
    },

    reset() {
      localStorage.removeItem(STORAGE_KEY);
      this.init();
      this._emit('change', this.state);
      this._emit('reset');
    },

    /* simple event emitter */
    _listeners: {},
    on(event, cb) {
      (this._listeners[event] = this._listeners[event] || []).push(cb);
    },
    _emit(event, payload) {
      (this._listeners[event] || []).forEach(cb => { try { cb(payload); } catch(e) { console.warn(e); } });
    }
  };

  window.Store = Store;
})();
