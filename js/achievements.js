/* ============================================================
   Achievements — hidden badges earned through activity
   ============================================================ */
(function() {
  // Each achievement: { id, icon, name, desc, test(state) => bool }
  const DEFS = [
    {
      id: 'first-steps',
      icon: '🐚',
      name: 'はじめの一歩',
      desc: 'アプリを はじめて 起動したよ',
      test: (s) => (s.loginTotal || 0) >= 1
    },
    {
      id: 'streak-3',
      icon: '🔥',
      name: '三日坊主じゃない',
      desc: '3日 連続で ログインしたよ',
      test: (s) => (s.longestStreak || 0) >= 3
    },
    {
      id: 'streak-7',
      icon: '🔥🔥',
      name: 'いっしゅうかん皆勤',
      desc: '7日 連続で ログインしたよ',
      test: (s) => (s.longestStreak || 0) >= 7
    },
    {
      id: 'quiz-perfect',
      icon: '🎯',
      name: 'パーフェクトこぶし',
      desc: 'クイズで 全問せいかいしたよ',
      test: (s) => Object.values(s.quizResults || {}).some(
        (r) => r && r.bestScore > 0 && r.bestScore === r.total
      )
    },
    {
      id: 'quiz-all-perfect',
      icon: '🏆',
      name: 'クイズマスター',
      desc: 'すべてのクイズを 全問せいかい！',
      test: (s) => {
        const quizzes = window.QUIZZES || [];
        if (!quizzes.length) return false;
        return quizzes.every((q) => {
          const r = (s.quizResults || {})[q.id];
          return r && r.bestScore === q.questions.length;
        });
      }
    },
    {
      id: 'qr-first',
      icon: '📷',
      name: 'イベントデビュー',
      desc: 'QRコードを はじめて 読んだよ',
      test: (s) => (s.usedQrCodes || []).length >= 1
    },
    {
      id: 'points-100',
      icon: '💯',
      name: 'ひゃくポイント！',
      desc: 'ポイントを 100pt ためたよ',
      test: (s) => (s.totalEarned || 0) >= 100
    },
    {
      id: 'points-500',
      icon: '💠',
      name: 'ごひゃくポイント',
      desc: 'ポイントを 500pt ためたよ',
      test: (s) => (s.totalEarned || 0) >= 500
    },
    {
      id: 'points-1000',
      icon: '💎',
      name: 'せんポイントクラブ',
      desc: 'ポイントを 1,000pt ためたよ',
      test: (s) => (s.totalEarned || 0) >= 1000
    },
    {
      id: 'rank-clione',
      icon: '🌊',
      name: '流氷の仲間入り',
      desc: '「流氷の守り手」に なったよ',
      test: (s) => {
        const r = window.getRankByPoints && window.getRankByPoints(s.points);
        if (!r) return false;
        const idx = window.getRankIndex ? window.getRankIndex(r.id) : -1;
        return idx >= 3;
      }
    },
    {
      id: 'rank-prime',
      icon: '👑',
      name: '最高位到達',
      desc: '「北方領土総理」に なったよ！',
      test: (s) => {
        const r = window.getRankByPoints && window.getRankByPoints(s.points);
        return r && r.id === 'prime';
      }
    },
    {
      id: 'shop-first',
      icon: '🎁',
      name: 'はじめてのお買物',
      desc: 'ショップで アイテムを 交換したよ',
      test: (s) => (s.owned || []).length >= 1
    }
  ];

  function evaluateAll() {
    if (!window.Store || !window.Store.state) return [];
    const state = window.Store.state;
    const unlocked = [];
    DEFS.forEach((def) => {
      if (state.achievements.includes(def.id)) return;
      try {
        if (def.test(state)) {
          const granted = window.Store.grantAchievement(def.id);
          if (granted) unlocked.push(def);
        }
      } catch (e) { console.warn('[achievements] test failed', def.id, e); }
    });
    if (unlocked.length) announce(unlocked);
    return unlocked;
  }

  function announce(list) {
    list.forEach((def, i) => {
      setTimeout(() => {
        if (window.UI && UI.showAchievement) UI.showAchievement(def);
      }, i * 1400);
    });
  }

  function getDefs() { return DEFS.slice(); }

  function getEarned() {
    const state = window.Store && window.Store.state;
    if (!state) return [];
    return DEFS.filter((d) => state.achievements.includes(d.id));
  }

  function countEarned() {
    return getEarned().length;
  }

  function total() { return DEFS.length; }

  window.Achievements = {
    evaluateAll,
    getDefs,
    getEarned,
    countEarned,
    total
  };

  // Evaluate on any state change
  if (window.Store && window.Store.on) {
    window.Store.on('change', () => {
      // small debounce
      clearTimeout(window.Achievements._t);
      window.Achievements._t = setTimeout(evaluateAll, 80);
    });
  }
})();
