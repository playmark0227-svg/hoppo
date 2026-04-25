/* ============================================================
   Store — localStorage-backed state
   ============================================================ */
(function() {
  const STORAGE_KEY = 'hoppou_status_v1';

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
    achievements: []        // earned achievement ids
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch (e) {
      console.warn('[store] load failed', e);
      return null;
    }
  }

  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
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

    /** Try to grant daily-login bonus; returns { points, streak, firstLogin } or null if already claimed today. */
    claimDailyLogin() {
      const today = todayString();
      if (this.state.lastLoginDate === today) return null;

      const gap = daysBetween(this.state.lastLoginDate, today);
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
