/* ============================================================
   UI helpers — toast, confetti, navigation, shared DOM updates
   ============================================================ */
(function() {
  const UI = {
    /* ---------------- Toast ---------------- */
    _toastTimer: null,
    toast(message, kind = '', duration = 2400) {
      const el = document.getElementById('toast');
      if (!el) return;
      el.textContent = message;
      el.className = 'toast';
      if (kind) el.classList.add(kind);
      el.hidden = false;
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => { el.hidden = true; }, duration);
      // Optional haptic feedback for "good"/"bad"
      try {
        const settings = window.Store && Store.getSettings ? Store.getSettings() : {};
        if (settings.haptics && navigator.vibrate) {
          navigator.vibrate(kind === 'bad' ? [40, 30, 40] : 18);
        }
      } catch (e) { /* ignore */ }
    },

    /* ---------------- Generic modal helpers ---------------- */
    openModal(id) {
      const modal = typeof id === 'string' ? document.getElementById(id) : id;
      if (!modal) return;
      // 直前のclose非表示タイマーが残っていれば取り消す（連続開閉で消える不具合を防止）
      if (modal._hideTimer) { clearTimeout(modal._hideTimer); modal._hideTimer = null; }
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => modal.classList.add('show'));
      // Wire up close handlers (idempotent)
      if (!modal._wired) {
        modal.querySelectorAll('[data-close]').forEach(btn => {
          btn.addEventListener('click', () => UI.closeModal(modal));
        });
        modal.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') UI.closeModal(modal);
        });
        modal._wired = true;
      }
      document.body.classList.add('no-scroll');
    },
    closeModal(id) {
      const modal = typeof id === 'string' ? document.getElementById(id) : id;
      if (!modal) return;
      modal.classList.remove('show');
      if (modal._hideTimer) clearTimeout(modal._hideTimer);
      modal._hideTimer = setTimeout(() => {
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
        modal._hideTimer = null;
        // 他に開いているモーダル/オーバーレイが無ければスクロール解除
        if (!document.querySelector('.modal-layer:not([hidden]), .tut-overlay:not([hidden])')) {
          document.body.classList.remove('no-scroll');
        }
      }, 240);
    },

    /* ---------------- Navigation ---------------- */
    go(page) {
      document.querySelectorAll('.page').forEach(p => {
        p.hidden = p.dataset.page !== page;
      });
      document.querySelectorAll('.nav-btn, .ds-nav-link').forEach(b => {
        b.classList.toggle('active', b.dataset.goto === page);
      });
      window.scrollTo({ top: 0, behavior: 'instant' });
      UI._emit('page', page);
      location.hash = '#' + page;
    },

    /* ---------------- Top bar / rank ---------------- */
    refreshHeader() {
      const s = Store.get();
      const rank = window.getRankByPoints(s.points);
      const pointsTxt = s.points.toLocaleString();
      const pointsEl = document.getElementById('pointsValue');
      if (pointsEl) pointsEl.textContent = pointsTxt;

      const rankLabelEl = document.getElementById('userRankLabel');
      if (rankLabelEl) rankLabelEl.textContent = `${rank.emoji} ${rank.name}`;

      const nameEl = document.getElementById('userName');
      if (nameEl) nameEl.textContent = s.name || 'ゲスト';

      /* Desktop sidebar mirrors */
      const dsName = document.getElementById('dsProfileName');
      if (dsName) dsName.textContent = s.name || 'ゲスト';
      const dsRank = document.getElementById('dsProfileRank');
      if (dsRank) dsRank.innerHTML = `<span class="ds-profile-rank-pip">${rank.emoji}</span> ${rank.name}`;
      const dsPoints = document.getElementById('dsPointsValue');
      if (dsPoints) dsPoints.textContent = pointsTxt;
    },

    refreshHome() {
      const s = Store.get();
      const rank = window.getRankByPoints(s.points);
      const next = window.getNextRank(s.points);

      const badgeBig = document.getElementById('rankBadgeBig');
      if (badgeBig) badgeBig.textContent = rank.emoji;
      const rankName = document.getElementById('rankName');
      if (rankName) rankName.textContent = rank.name;
      const rankSub = document.getElementById('rankSub');
      if (rankSub) rankSub.textContent = rank.sub;

      const fill = document.getElementById('rankProgressFill');
      const text = document.getElementById('rankProgressText');
      if (next) {
        const span = next.min - rank.min;
        const done = s.points - rank.min;
        const pct = Math.max(6, Math.min(100, (done / span) * 100));
        if (fill) fill.style.width = pct + '%';
        if (text) text.textContent = `あと ${next.min - s.points} pt で ${next.emoji} ${next.name}`;
      } else {
        if (fill) fill.style.width = '100%';
        if (text) text.textContent = '最高位に到達！🎉';
      }

      const bubble = document.getElementById('heroBubble');
      if (bubble) {
        const namePart = s.name !== 'ゲスト' ? s.name + 'さん、' : '';
        const msgs = [
          `今日は何する？<br>${namePart}頑張ろう！`,
          'クイズに挑戦してポイント獲得！',
          'イベントのQRコード、もう読んだ？',
          next ? `あと ${next.min - s.points}pt で昇格だよ！` : 'あなたは北方領土総理！すごい！',
          'タップで違うメッセージに切り替えできるよ'
        ];
        bubble.innerHTML = `<span>${msgs[Math.floor(Math.random() * msgs.length)]}</span>`;
      }

      // Stats strip
      const statQuizzes = document.getElementById('statQuizzes');
      const statEvents = document.getElementById('statEvents');
      const statTotal = document.getElementById('statTotal');
      if (statQuizzes) {
        const totalPlays = Object.values(s.quizResults || {}).reduce((sum, r) => sum + (r.timesPlayed || 0), 0);
        statQuizzes.textContent = totalPlays.toLocaleString();
      }
      if (statEvents) {
        statEvents.textContent = (s.usedQrCodes || []).length.toLocaleString();
      }
      if (statTotal) {
        statTotal.textContent = (s.totalEarned || 0).toLocaleString();
      }
      const statStreak = document.getElementById('statStreak');
      if (statStreak) {
        const v = (s.loginStreak || 0).toLocaleString();
        statStreak.innerHTML = `${v}<span class="stat-unit">日</span>`;
      }
    },

    /* ---------------- Island detail modal ---------------- */
    showIsland(islandId) {
      const island = window.getIslandById ? window.getIslandById(islandId) : null;
      if (!island) return;
      const photo = document.getElementById('islandPhoto');
      if (photo) photo.style.backgroundImage = `url('${island.image}')`;
      document.getElementById('islandKicker').textContent = island.en;
      document.getElementById('islandModalTitle').textContent = `${island.name}（${island.kana}）`;
      document.getElementById('islandSub').textContent = island.desc;
      const facts = document.getElementById('islandFacts');
      if (facts) {
        facts.innerHTML = (island.facts || []).map(f =>
          `<li><span>${f.k}</span><b>${f.v}</b></li>`
        ).join('');
      }
      const body = document.getElementById('islandBody');
      if (body) body.innerHTML = `<p>${island.body}</p>`;
      this.openModal('islandModal');
    },

    /* ---------------- Achievement detail modal ---------------- */
    showAchieveDetail(def, earned) {
      if (!def) return;
      const iconEl = document.getElementById('achieveModalIcon');
      if (iconEl) iconEl.textContent = earned ? def.icon : '🔒';
      const stateEl = document.getElementById('achieveModalState');
      if (stateEl) stateEl.textContent = earned ? '獲得済み' : '未獲得';
      document.getElementById('achieveModalTitle').textContent = earned ? def.name : '？？？';
      document.getElementById('achieveModalDesc').textContent = earned
        ? def.desc
        : 'まずはアプリで遊んで、いろいろなことに挑戦してみよう！';
      const meta = document.getElementById('achieveModalMeta');
      if (meta) {
        if (earned) {
          meta.innerHTML = `<span class="achieve-modal-pill">🏅 ${def.id}</span>`;
        } else {
          meta.innerHTML = '<span class="achieve-modal-pill achieve-modal-pill-locked">条件は獲得時に判明します</span>';
        }
      }
      this.openModal('achieveModal');
    },

    /* ---------------- History modal ---------------- */
    showHistory() {
      const list = document.getElementById('historyList');
      if (!list) return;
      const s = Store.get();
      const items = (s.history || []).slice(0, 50);
      if (items.length === 0) {
        list.innerHTML = `<li class="history-empty">まだ履歴がありません。クイズやQRに挑戦してみよう！</li>`;
      } else {
        list.innerHTML = items.map(h => {
          const d = new Date(h.at);
          const date = `${d.getMonth() + 1}/${d.getDate()}`;
          const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
          const sign = h.points >= 0 ? '+' : '';
          const cls = h.points >= 0 ? 'history-pos' : 'history-neg';
          return `<li class="history-item">
            <span class="history-when">${date}<small>${time}</small></span>
            <span class="history-label">${h.label || ''}</span>
            <span class="history-points ${cls}">${sign}${h.points}<small>pt</small></span>
          </li>`;
        }).join('');
      }
      this.openModal('historyModal');
    },

    /* ---------------- Daily welcome modal ---------------- */
    showDailyWelcome(daily) {
      // Honor user setting
      try {
        const settings = window.Store && Store.getSettings ? Store.getSettings() : {};
        if (settings.notifyDaily === false) return;
      } catch (e) { /* ignore */ }
      const modal = document.getElementById('welcomeModal');
      if (!modal) return;
      const titleEl = document.getElementById('welcomeTitle');
      const streakEl = document.getElementById('welcomeStreak');
      const pointsEl = document.getElementById('welcomePoints');
      const subEl = document.getElementById('welcomeSub');
      const kickerEl = document.getElementById('welcomeKicker');

      if (kickerEl) {
        kickerEl.textContent = daily.firstLogin
          ? 'はじめまして！ようこそ！'
          : '今日も来てくれてありがとう！';
      }
      if (titleEl) titleEl.textContent = daily.firstLogin ? 'ウェルカムボーナス' : 'ログインボーナス';
      if (streakEl) {
        const flame = daily.streak >= 7 ? '🔥🔥🔥' : daily.streak >= 3 ? '🔥🔥' : '🔥';
        streakEl.textContent = `${flame} ${daily.streak}日 連続`;
      }
      if (pointsEl) pointsEl.textContent = `+${daily.points} pt`;
      if (subEl) {
        if (daily.streak < 5) subEl.textContent = '明日も来ると さらに +2pt アップ！';
        else subEl.textContent = `連続ログイン最高記録：${daily.longestStreak}日！`;
      }

      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      // enter animation handled by CSS
      requestAnimationFrame(() => modal.classList.add('show'));

      const closeBtn = document.getElementById('welcomeCloseBtn');
      const close = () => {
        modal.classList.remove('show');
        setTimeout(() => {
          modal.hidden = true;
          modal.setAttribute('aria-hidden', 'true');
        }, 260);
        // small confetti
        this.confetti({ count: 40 });
        this.flashPoints();
      };
      if (closeBtn) {
        const handler = () => { closeBtn.removeEventListener('click', handler); close(); };
        closeBtn.addEventListener('click', handler);
      }
      // backdrop dismiss
      const backdrop = modal.querySelector('.modal-backdrop');
      if (backdrop) backdrop.addEventListener('click', close, { once: true });
    },

    /* ---------------- Achievement popup ---------------- */
    showAchievement(ach) {
      const pop = document.getElementById('achievePop');
      if (!pop || !ach) return;
      document.getElementById('achievePopIcon').textContent = ach.icon || '🏅';
      document.getElementById('achievePopTitle').textContent = ach.name || '';
      document.getElementById('achievePopDesc').textContent = ach.desc || '';
      pop.hidden = false;
      requestAnimationFrame(() => pop.classList.add('show'));
      clearTimeout(this._achieveTimer);
      this._achieveTimer = setTimeout(() => {
        pop.classList.remove('show');
        setTimeout(() => { pop.hidden = true; }, 300);
      }, 3600);
    },

    /* ---------------- Points animation ---------------- */
    flashPoints() {
      const chip = document.getElementById('pointsChip');
      if (!chip) return;
      chip.classList.remove('pulse');
      void chip.offsetWidth;
      chip.classList.add('pulse');
    },

    /* ---------------- Confetti ---------------- */
    confetti(options = {}) {
      // Respect user's "no confetti" / "reduce motion" preferences
      try {
        const settings = window.Store && Store.getSettings ? Store.getSettings() : {};
        if (settings.confetti === false || settings.reduceMotion) return;
      } catch (e) { /* ignore */ }
      const canvas = document.getElementById('confetti');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.width = window.innerWidth * dpr;
      const H = canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';

      const count = options.count || 80;
      const colors = ['#ff87a9', '#ffcf57', '#88c9f2', '#a7e4c9', '#c4b3ff', '#ff9d7a'];
      const pieces = [];
      for (let i = 0; i < count; i++) {
        pieces.push({
          x: W / 2 + (Math.random() - 0.5) * 100 * dpr,
          y: H / 3 + (Math.random() - 0.5) * 40 * dpr,
          vx: (Math.random() - 0.5) * 14 * dpr,
          vy: (Math.random() * -10 - 4) * dpr,
          g: 0.35 * dpr,
          size: (Math.random() * 6 + 4) * dpr,
          color: colors[Math.floor(Math.random() * colors.length)],
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          life: 90 + Math.random() * 40
        });
      }
      let frame = 0;
      const maxFrames = 140;
      function tick() {
        ctx.clearRect(0, 0, W, H);
        pieces.forEach(p => {
          p.vy += p.g;
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vr;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        });
        frame++;
        if (frame < maxFrames) requestAnimationFrame(tick);
        else ctx.clearRect(0, 0, W, H);
      }
      requestAnimationFrame(tick);
    },

    /* simple event bus for UI */
    _listeners: {},
    on(event, cb) { (this._listeners[event] = this._listeners[event] || []).push(cb); },
    _emit(event, payload) {
      (this._listeners[event] || []).forEach(cb => { try { cb(payload); } catch(e) { console.warn(e); } });
    }
  };

  window.UI = UI;
})();
