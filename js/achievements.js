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
      desc: 'アプリを初めて起動した',
      test: (s) => (s.loginTotal || 0) >= 1
    },
    {
      id: 'streak-3',
      icon: '🔥',
      name: '三日坊主じゃない',
      desc: '3日連続でログインした',
      test: (s) => (s.longestStreak || 0) >= 3
    },
    {
      id: 'streak-7',
      icon: '🔥🔥',
      name: '一週間皆勤賞',
      desc: '7日連続でログインした',
      test: (s) => (s.longestStreak || 0) >= 7
    },
    {
      id: 'quiz-perfect',
      icon: '🎯',
      name: 'パーフェクト達成',
      desc: 'クイズで全問正解した',
      test: (s) => Object.values(s.quizResults || {}).some(
        (r) => r && r.bestScore > 0 && r.bestScore === r.total
      )
    },
    {
      id: 'quiz-all-perfect',
      icon: '🏆',
      name: 'クイズマスター',
      desc: '全てのクイズで全問正解した',
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
      desc: 'QRコードを初めて読み取った',
      test: (s) => (s.usedQrCodes || []).length >= 1
    },
    {
      id: 'points-100',
      icon: '💯',
      name: '100ポイント突破',
      desc: '累計100ptを獲得した',
      test: (s) => (s.totalEarned || 0) >= 100
    },
    {
      id: 'points-500',
      icon: '💠',
      name: '500ポイントクラブ',
      desc: '累計500ptを獲得した',
      test: (s) => (s.totalEarned || 0) >= 500
    },
    {
      id: 'points-1000',
      icon: '💎',
      name: '1000ポイントクラブ',
      desc: '累計1,000ptを獲得した',
      test: (s) => (s.totalEarned || 0) >= 1000
    },
    {
      id: 'rank-clione',
      icon: '🌊',
      name: '流氷の仲間入り',
      desc: '「流氷の守り手」に昇格した',
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
      desc: '「北方領土総理」に到達した',
      test: (s) => {
        const r = window.getRankByPoints && window.getRankByPoints(s.points);
        return r && r.id === 'prime';
      }
    },
    {
      id: 'shop-first',
      icon: '🎁',
      name: '初めてのお買い物',
      desc: 'ショップでアイテムを交換した',
      test: (s) => (s.owned || []).length >= 1
    },
    {
      id: 'stamp-first',
      icon: '📍',
      name: 'スタンプデビュー',
      desc: '初めてご当地スタンプを取得した',
      test: (s) => Object.keys(s.stamps || {}).length >= 1
    },
    {
      id: 'stamp-complete',
      icon: '🗾',
      name: 'スタンプコンプリート',
      desc: '全てのご当地スタンプを集めた',
      test: (s) => {
        const total = (window.STAMPS || []).length;
        return total > 0 && Object.keys(s.stamps || {}).length >= total;
      }
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
