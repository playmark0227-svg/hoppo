/* ============================================================
   Settings — profile + app preferences page
   ============================================================ */
(function() {

  const FRAMES = [
    { id: 'coral',  label: '珊瑚オレンジ', color: '#f47a5a' },
    { id: 'ocean',  label: 'オホーツク',   color: '#5aa7d1' },
    { id: 'gold',   label: 'ゴールド',     color: '#f6b93b' },
    { id: 'cherry', label: '桜ピンク',     color: '#ff87a9' },
    { id: 'mint',   label: '流氷ミント',   color: '#6fd1a4' },
    { id: 'plum',   label: '夜明けプラム', color: '#544668' }
  ];

  const PATTERNS = [
    { id: 'wave',  label: '波',     emoji: '🌊' },
    { id: 'dots',  label: '水玉',   emoji: '⚪' },
    { id: 'shine', label: 'きらめき', emoji: '✨' },
    { id: 'plain', label: 'シンプル', emoji: '◯' }
  ];

  /* ---------------- Render helpers ---------------- */

  function applyAvatarStyle(el, frame, pattern) {
    if (!el) return;
    el.dataset.frame = frame || 'coral';
    el.dataset.pattern = pattern || 'wave';
  }

  function refreshAllAvatars(frame, pattern) {
    [
      document.getElementById('topbarAvatar'),
      document.getElementById('settingsPreviewAvatar'),
      document.getElementById('profileShortcutAvatar')
    ].forEach(el => applyAvatarStyle(el, frame, pattern));
  }

  function renderFramePicker() {
    const wrap = document.getElementById('framePicker');
    if (!wrap) return;
    const profile = Store.getProfile();
    wrap.innerHTML = FRAMES.map(f => `
      <button type="button" class="frame-chip ${profile.avatarFrame === f.id ? 'active' : ''}"
              data-frame="${f.id}" role="radio" aria-checked="${profile.avatarFrame === f.id}"
              aria-label="${f.label}">
        <span class="frame-chip-color" style="background: ${f.color};"></span>
        <span class="frame-chip-label">${f.label}</span>
      </button>
    `).join('');
    wrap.querySelectorAll('[data-frame]').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.updateProfile({ avatarFrame: btn.dataset.frame });
        renderFramePicker();
        const p = Store.getProfile();
        refreshAllAvatars(p.avatarFrame, p.avatarPattern);
        UI.toast('フレームを変更しました', 'good');
      });
    });
  }

  function renderPatternPicker() {
    const wrap = document.getElementById('patternPicker');
    if (!wrap) return;
    const profile = Store.getProfile();
    wrap.innerHTML = PATTERNS.map(p => `
      <button type="button" class="pattern-chip ${profile.avatarPattern === p.id ? 'active' : ''}"
              data-pattern="${p.id}" role="radio" aria-checked="${profile.avatarPattern === p.id}"
              aria-label="${p.label}">
        <span class="pattern-chip-preview" data-pattern="${p.id}">${p.emoji}</span>
        <span class="pattern-chip-label">${p.label}</span>
      </button>
    `).join('');
    wrap.querySelectorAll('[data-pattern]').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.updateProfile({ avatarPattern: btn.dataset.pattern });
        renderPatternPicker();
        const p = Store.getProfile();
        refreshAllAvatars(p.avatarFrame, p.avatarPattern);
        UI.toast('背景パターンを変更しました', 'good');
      });
    });
  }

  function renderIslandPicker() {
    const wrap = document.getElementById('islandPicker');
    if (!wrap) return;
    const profile = Store.getProfile();
    wrap.innerHTML = (window.ISLANDS || []).map(island => `
      <button type="button" class="island-chip ${profile.favoriteIsland === island.id ? 'active' : ''}"
              data-island="${island.id}" role="radio" aria-checked="${profile.favoriteIsland === island.id}">
        <span class="island-chip-photo" style="background-image: url('${island.image}');"></span>
        <span class="island-chip-meta">
          <span class="island-chip-en">${island.en}</span>
          <span class="island-chip-name">${island.name}</span>
          <span class="island-chip-desc">${island.desc}</span>
        </span>
        <span class="island-chip-check" aria-hidden="true">✓</span>
      </button>
    `).join('');
    wrap.querySelectorAll('[data-island]').forEach(btn => {
      btn.addEventListener('click', () => {
        // 島を選んだら着せ替えテーマも自動でON
        Store.updateProfile({ favoriteIsland: btn.dataset.island, islandThemeOn: true });
        renderIslandPicker();
        renderPreview();
        syncIslandThemeToggle();
        UI.toast('推しの島カラーに着せ替えました！', 'good');
      });
    });
  }

  function syncIslandThemeToggle() {
    const el = document.getElementById('setIslandTheme');
    if (el) el.checked = !!Store.getProfile().islandThemeOn;
  }

  function bindIslandTheme() {
    const el = document.getElementById('setIslandTheme');
    if (!el) return;
    el.addEventListener('change', () => {
      Store.updateProfile({ islandThemeOn: el.checked });
      UI.toast(el.checked ? '島カラーを適用しました' : '標準カラーに戻しました', 'good', 1600);
    });
    syncIslandThemeToggle();
  }

  function renderPreview() {
    const s = Store.get();
    const profile = s.profile;
    const rank = window.getRankByPoints(s.points);

    const previewName = document.getElementById('settingsPreviewName');
    if (previewName) previewName.textContent = s.name || 'ゲスト';

    const previewRank = document.getElementById('settingsPreviewRank');
    if (previewRank) previewRank.textContent = `${rank.emoji} ${rank.name}`;

    const previewBio = document.getElementById('settingsPreviewBio');
    if (previewBio) {
      previewBio.textContent = profile.bio
        || (profile.region ? `${profile.region} から学んでいます` : 'よろしくお願いします！');
    }

    refreshAllAvatars(profile.avatarFrame, profile.avatarPattern);

    // License page shortcut
    const shortcutName = document.getElementById('profileShortcutName');
    if (shortcutName) shortcutName.textContent = s.name || 'ゲスト';
    const shortcutSub = document.getElementById('profileShortcutSub');
    if (shortcutSub) {
      shortcutSub.textContent = profile.bio
        ? profile.bio
        : 'ニックネーム・アバター・自己紹介を設定';
    }
  }

  function renderInfo() {
    const s = Store.get();
    const idEl = document.getElementById('settingsUserId');
    if (idEl) idEl.textContent = s.userId || '—';
    const createdEl = document.getElementById('settingsCreatedAt');
    if (createdEl) {
      if (s.createdAt) {
        const d = new Date(s.createdAt);
        createdEl.textContent = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
      } else {
        createdEl.textContent = '—';
      }
    }
  }

  /* ---------------- Form bindings ---------------- */

  function bindBasicFields() {
    const nameInput = document.getElementById('settingsName');
    const bioInput = document.getElementById('settingsBio');
    const bioCount = document.getElementById('settingsBioCount');
    const regionInput = document.getElementById('settingsRegion');
    const birthdayInput = document.getElementById('settingsBirthday');

    function syncFromState() {
      const s = Store.get();
      const p = s.profile;
      if (nameInput && document.activeElement !== nameInput) {
        nameInput.value = s.name === 'ゲスト' ? '' : s.name;
      }
      if (bioInput && document.activeElement !== bioInput) {
        bioInput.value = p.bio || '';
      }
      if (bioCount) bioCount.textContent = (bioInput?.value || '').length;
      if (regionInput && document.activeElement !== regionInput) {
        regionInput.value = p.region || '';
      }
      if (birthdayInput && document.activeElement !== birthdayInput) {
        birthdayInput.value = p.birthday || '';
      }
    }

    // タイピング中は state を直接更新＋軽量プレビューのみ。重い保存（JSON.stringify＋
    // localStorage＋'change'連鎖）は入力が止まった時／フォーカスを外した時に1回だけ。
    let commitTimer = null;
    function scheduleCommit() {
      if (commitTimer) clearTimeout(commitTimer);
      commitTimer = setTimeout(() => { commitTimer = null; Store.commit(); }, 450);
    }
    function flushCommit() {
      if (commitTimer) { clearTimeout(commitTimer); commitTimer = null; }
      Store.commit();
    }

    if (nameInput) {
      nameInput.addEventListener('input', () => {
        Store.state.name = nameInput.value.trim().slice(0, 12) || 'ゲスト';
        UI.refreshHeader();
        renderPreview();
        scheduleCommit();
      });
      nameInput.addEventListener('blur', flushCommit);
    }
    if (bioInput) {
      bioInput.addEventListener('input', () => {
        Store.state.profile.bio = bioInput.value.slice(0, 80);
        if (bioCount) bioCount.textContent = bioInput.value.length;
        renderPreview();
        scheduleCommit();
      });
      bioInput.addEventListener('blur', flushCommit);
    }
    if (regionInput) {
      regionInput.addEventListener('input', () => {
        Store.state.profile.region = regionInput.value.slice(0, 24);
        renderPreview();
        scheduleCommit();
      });
      regionInput.addEventListener('blur', flushCommit);
    }
    if (birthdayInput) {
      birthdayInput.addEventListener('change', () => {
        Store.updateProfile({ birthday: birthdayInput.value });
      });
    }

    // Re-sync inputs whenever the page is opened
    UI.on && UI.on('page', (page) => {
      if (page === 'settings') syncFromState();
    });
    // Initial sync
    syncFromState();
  }

  function bindToggles() {
    const map = [
      { id: 'setSoundEffects', key: 'soundEffects' },
      { id: 'setConfetti',     key: 'confetti' },
      { id: 'setHaptics',      key: 'haptics' },
      { id: 'setReduceMotion', key: 'reduceMotion' },
      { id: 'setHighContrast', key: 'highContrast' },
      { id: 'setNotifyDaily',  key: 'notifyDaily' }
    ];
    function syncFromState() {
      const settings = Store.getSettings();
      map.forEach(m => {
        const el = document.getElementById(m.id);
        if (el) el.checked = !!settings[m.key];
      });
      applyVisualPrefs(settings);
    }
    map.forEach(m => {
      const el = document.getElementById(m.id);
      if (!el) return;
      el.addEventListener('change', () => {
        Store.updateSettings({ [m.key]: el.checked });
        applyVisualPrefs(Store.getSettings());
        UI.toast(el.checked ? 'オンにしました' : 'オフにしました', 'good', 1600);
      });
    });
    syncFromState();
  }

  function applyVisualPrefs(settings) {
    document.documentElement.classList.toggle('reduce-motion', !!settings.reduceMotion);
    document.documentElement.classList.toggle('high-contrast', !!settings.highContrast);
  }

  /* ---------------- Data buttons ---------------- */

  function bindDataButtons() {
    const exportBtn = document.getElementById('settingsExportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        try {
          // LINE連携の情報はバックアップに含めない。他人に渡ったファイルから
          // LINEのユーザーIDが読めてしまうし、連携はログインし直せば復元できる。
          const { line, ...s } = Store.get();
          const json = JSON.stringify(s, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          const date = new Date().toISOString().slice(0, 10);
          a.href = url;
          a.download = `hoppou-status-${s.userId || 'guest'}-${date}.json`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          UI.toast('データをエクスポートしました', 'good');
        } catch (e) {
          console.error(e);
          UI.toast('エクスポートに失敗しました', 'bad');
        }
      });
    }

    const importBtn = document.getElementById('settingsImportBtn');
    const importFile = document.getElementById('settingsImportFile');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', () => {
        const file = importFile.files && importFile.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result);
            if (typeof data !== 'object' || !data) throw new Error('invalid');
            if (!confirm('現在のデータを上書きしてインポートしますか？')) return;
            // 既知キーのみ取り込む（未知キー・巨大画像の混入を防ぐ）
            // 'line' は意図的に除外：細工したファイルで他人のLINE IDを
            // 埋め込まれないようにする。連携はLINEでログインし直して復元する。
            const ALLOWED = ['userId','name','createdAt','points','totalEarned','quizResults',
              'usedQrCodes','owned','history','lastLoginDate','loginStreak','longestStreak',
              'loginTotal','achievements','stamps','social','flags','profile','settings'];
            const clean = {};
            ALLOWED.forEach(k => { if (k in data) clean[k] = data[k]; });

            // --- サニタイズ（不正・悪意あるデータの取り込みを防ぐ多層防御） ---
            const toInt = (v) => {
              const n = Math.floor(Number(v));
              return Number.isFinite(n) && n >= 0 ? n : 0;
            };
            // 名前は12文字に制限
            if ('name' in clean) {
              clean.name = (typeof clean.name === 'string' && clean.name.trim().slice(0, 12)) || 'ゲスト';
            }
            // ポイント類は非負整数に強制
            ['points','totalEarned','loginStreak','longestStreak','loginTotal'].forEach(k => {
              if (k in clean) clean[k] = toInt(clean[k]);
            });
            // 配列であるべき項目が配列でなければ取り込まない
            ['usedQrCodes','owned','history','achievements'].forEach(k => {
              if (k in clean && !Array.isArray(clean[k])) delete clean[k];
            });
            // プロフィール：フレーム/背景/島は既知IDのみ、文字列は長さ制限、
            // アバター画像は安全な画像 data URL（SVGはスクリプト混入の恐れがあり除外）のみ
            if (clean.profile && typeof clean.profile === 'object') {
              const p = clean.profile;
              const frameIds = FRAMES.map(f => f.id);
              const patternIds = PATTERNS.map(f => f.id);
              const islandIds = (window.ISLANDS || []).map(i => i.id);
              if (!frameIds.includes(p.avatarFrame)) p.avatarFrame = 'coral';
              if (!patternIds.includes(p.avatarPattern)) p.avatarPattern = 'wave';
              if (islandIds.length && !islandIds.includes(p.favoriteIsland)) p.favoriteIsland = islandIds[0];
              p.bio = (typeof p.bio === 'string') ? p.bio.slice(0, 80) : '';
              p.region = (typeof p.region === 'string') ? p.region.slice(0, 24) : '';
              const img = p.avatarImage;
              if (typeof img !== 'string' ||
                  !/^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(img) ||
                  img.length > 200000) {
                p.avatarImage = '';
              }
            }
            Object.assign(Store.state, clean);
            Store.commit();
            UI.toast('データをインポートしました', 'good');
            // Re-render everything
            UI.refreshHeader();
            UI.refreshHome();
            renderPreview();
            renderInfo();
            renderFramePicker();
            renderPatternPicker();
            renderIslandPicker();
            if (window.Quiz) Quiz.refresh();
            if (window.Shop) Shop.refresh();
            if (window.License) License.refresh();
          } catch (e) {
            console.error(e);
            UI.toast('読み込みに失敗しました', 'bad');
          } finally {
            importFile.value = '';
          }
        };
        reader.readAsText(file);
      });
    }

    const resetBtn = document.getElementById('settingsResetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (!confirm('全てのデータをリセットします。よろしいですか？\nこの操作は元に戻せません。')) return;
        Store.reset();
        UI.toast('データをリセットしました', 'good');
        UI.refreshHeader();
        UI.refreshHome();
        renderPreview();
        renderInfo();
        renderFramePicker();
        renderPatternPicker();
        renderIslandPicker();
        if (window.Quiz) Quiz.refresh();
        if (window.Shop) Shop.refresh();
        if (window.License) License.refresh();
      });
    }

    const creditsBtn = document.getElementById('settingsCreditsBtn');
    if (creditsBtn) {
      creditsBtn.addEventListener('click', () => {
        if (window.UI && UI.openModal) UI.openModal('creditsModal');
      });
    }

    const tutorialBtn = document.getElementById('settingsTutorialBtn');
    if (tutorialBtn) {
      tutorialBtn.addEventListener('click', () => {
        if (window.Tutorial) Tutorial.show(true);
      });
    }
  }

  /* ---------------- Avatar image upload ---------------- */

  const AVATAR_MAX_PX = 320;   // Resize target (square)
  const AVATAR_JPEG_QUALITY = 0.86;
  const AVATAR_MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB pre-resize limit

  function showAvatarNote(text, kind) {
    const note = document.getElementById('avatarUploadNote');
    if (!note) return;
    note.textContent = text || '';
    note.classList.remove('is-good', 'is-bad');
    if (kind === 'good') note.classList.add('is-good');
    if (kind === 'bad')  note.classList.add('is-bad');
  }

  let _lastAvatarSrc = null;
  function renderAvatarImage() {
    const src = UI.avatarSrc();
    // 画像が変わっていない commit（タイピング・ポイント加算等）では何もしない
    if (src === _lastAvatarSrc) return;
    _lastAvatarSrc = src;
    // Update preview chip in settings page
    const preview = document.getElementById('avatarUploadPreviewImg');
    if (preview) preview.src = src;
    // Update all avatar instances throughout the app
    document.querySelectorAll('[data-avatar-img] img, .avatar .avatar-img, .ds-profile-avatar img, .settings-preview-avatar img, .profile-shortcut-avatar img, .avatar-upload-img').forEach(img => {
      if (img.id === 'heroChar') return; // keep hero character separate
      img.src = src;
    });
    // Toggle a "has custom image" data flag for CSS hooks
    // （マスコット既定画像以外なら「独自アイコンあり」扱い）
    const isDefault = src === 'assets/characters/mascot-face.png';
    document.documentElement.dataset.hasAvatar = isDefault ? '0' : '1';
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('読み込みに失敗しました'));
      r.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('画像を解析できませんでした'));
      img.src = src;
    });
  }

  // Center-crop to square, then resize to AVATAR_MAX_PX × AVATAR_MAX_PX
  function squareCropResize(img) {
    const minSide = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth  - minSide) / 2;
    const sy = (img.naturalHeight - minSide) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_MAX_PX;
    canvas.height = AVATAR_MAX_PX;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, AVATAR_MAX_PX, AVATAR_MAX_PX);
    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, AVATAR_MAX_PX, AVATAR_MAX_PX);
    return canvas.toDataURL('image/jpeg', AVATAR_JPEG_QUALITY);
  }

  async function handleAvatarFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      showAvatarNote('画像ファイルを選択してください', 'bad');
      return;
    }
    if (file.size > AVATAR_MAX_FILE_BYTES) {
      showAvatarNote('ファイルが大きすぎます（最大8MB）', 'bad');
      return;
    }
    showAvatarNote('画像を処理しています…');
    try {
      const dataUrl = await readFileAsDataURL(file);
      const img = await loadImage(dataUrl);
      const cropped = squareCropResize(img);
      Store.updateProfile({ avatarImage: cropped });
      renderAvatarImage();
      const sizeKb = Math.round(cropped.length * 3 / 4 / 1024);
      showAvatarNote(`画像を保存しました（約 ${sizeKb} KB、端末内のみ）`, 'good');
      if (window.UI && UI.toast) UI.toast('プロフィール画像を更新しました', 'good', 1800);
    } catch (e) {
      console.error(e);
      showAvatarNote(e.message || '処理に失敗しました', 'bad');
    }
  }

  function bindAvatarUpload() {
    const input  = document.getElementById('avatarUploadInput');
    const resetBtn = document.getElementById('avatarUploadResetBtn');
    if (input) {
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (file) handleAvatarFile(file);
        input.value = ''; // allow re-selecting same file later
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (!Store.getProfile().avatarImage) {
          showAvatarNote('現在はデフォルト画像です', 'good');
          return;
        }
        if (!confirm('プロフィール画像をデフォルト（しろくまくん）に戻しますか？')) return;
        Store.updateProfile({ avatarImage: '' });
        renderAvatarImage();
        showAvatarNote('デフォルト画像に戻しました', 'good');
        if (window.UI && UI.toast) UI.toast('画像をリセットしました', 'good', 1600);
      });
    }
    renderAvatarImage();
  }

  /* ---------------- Init ---------------- */

  /* ---------------- LINE連携カード ----------------
     js/config.js に liffId を入れていない場合はセクションごと非表示にする。 */
  function renderLine() {
    const section = document.getElementById('lineSection');
    if (!section) return;
    if (!window.Line || !Line.isConfigured) { section.hidden = true; return; }
    section.hidden = false;

    const st = Line.getState();
    const saved = Store.getLine();
    const linked = !!saved.userId;

    const avatarEl = document.getElementById('lineStatusAvatar');
    const stateEl = document.getElementById('lineStatusState');
    const nameEl = document.getElementById('lineStatusName');
    const actions = document.getElementById('lineActions');
    const note = document.getElementById('lineNote');
    if (!actions) return;

    if (avatarEl) {
      avatarEl.src = saved.pictureUrl || UI.avatarSrc();
      // LINEのアイコンが読めなかったらマスコットに戻す（壊れ画像を出さない）
      avatarEl.onerror = () => { avatarEl.onerror = null; avatarEl.src = 'assets/characters/mascot-face.png'; };
    }

    actions.innerHTML = '';
    const addBtn = (label, cls, onClick) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + cls;
      b.textContent = label;
      b.addEventListener('click', onClick);
      actions.appendChild(b);
      return b;
    };

    if (linked) {
      stateEl.textContent = st.inClient ? 'LINEアプリ内で連携中' : '連携済み';
      nameEl.textContent = saved.displayName || '(名前を取得できませんでした)';
      addBtn('LINEの名前を使う', 'btn-outline', () => {
        if (!saved.displayName) { UI.toast('LINEの名前を取得できていません', 'bad'); return; }
        Store.setName(saved.displayName.slice(0, 12));
        UI.refreshHeader(); UI.refreshHome(); refresh();
        UI.toast('ニックネームをLINEの名前にしました', 'good');
      });
      addBtn('LINEのアイコンを使う', 'btn-outline', async () => {
        UI.toast('アイコンを取り込んでいます…');
        const r = await Line.importPictureAsAvatar();
        if (r.ok) {
          renderAvatarImage(); renderPreview(); refresh();
          UI.toast('プロフィール画像をLINEのアイコンにしました', 'good');
        } else if (r.reason === 'cors') {
          UI.toast('このアイコンは取り込めませんでした（表示のみ利用します）', 'bad', 3200);
        } else {
          UI.toast('アイコンを取り込めませんでした', 'bad');
        }
      });
      addBtn('連携を解除', 'btn-ghost', () => {
        if (!confirm('LINE連携を解除しますか？\nポイントや履歴はこの端末に残ります。')) return;
        Line.logout();
        refresh(); UI.refreshHeader(); UI.refreshHome();
        UI.toast('LINE連携を解除しました', 'good');
      });
      if (note) {
        note.textContent = 'ポイントや履歴はこの端末の中だけに保存されます。'
          + '別の端末で開くと引き継がれない点にご注意ください。';
      }
      return;
    }

    // ---- 未連携 ----
    if (!st.ready) {
      stateEl.textContent = 'LINE連携を準備できませんでした';
      nameEl.textContent = st.error === 'not-configured'
        ? 'LIFF ID が設定されていません'
        : 'しばらくしてから、もう一度お試しください';
      if (note) note.textContent = 'LINE連携が使えなくても、アプリは通常どおりご利用いただけます。';
      return;
    }

    stateEl.textContent = '未連携';
    nameEl.textContent = 'LINEでログインすると、名前とアイコンが自動で入ります';
    // 分岐ごとに必ず文言を書き戻す。初回描画は LIFF 初期化前（ready=false）を通るため、
    // ここで戻さないと「準備できませんでした」の文言が残ってしまう。
    if (note) {
      note.textContent = '連携してもポイントや履歴はこの端末の中だけに保存されます。'
        + 'LINEへ送信されることはありません。';
    }
    addBtn('LINEでログイン', 'btn-primary', () => {
      // ユーザー操作起点でのみログインへ遷移する（自動リダイレクトはしない）
      if (!Line.login()) UI.toast('LINEログインを開始できませんでした', 'bad');
    });
    if (Line.addFriendUrl) {
      const a = document.createElement('a');
      a.className = 'btn btn-outline';
      a.href = Line.addFriendUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = '公式アカウントを友だち追加';
      actions.appendChild(a);
    }
  }

  function init() {
    renderFramePicker();
    renderPatternPicker();
    renderIslandPicker();
    renderPreview();
    renderInfo();
    renderLine();
    if (window.Line) Line.on(renderLine);
    bindBasicFields();
    bindToggles();
    bindDataButtons();
    bindAvatarUpload();
    bindIslandTheme();

    // Apply initial visual prefs immediately
    applyVisualPrefs(Store.getSettings());

    // Apply avatar style on first paint
    const p = Store.getProfile();
    refreshAllAvatars(p.avatarFrame, p.avatarPattern);
    renderAvatarImage();

    // Re-render preview on any state change
    Store.on('change', () => {
      renderPreview();
      renderInfo();
      renderAvatarImage();
    });
  }

  function refresh() {
    renderFramePicker();
    renderPatternPicker();
    renderIslandPicker();
    renderPreview();
    renderInfo();
    renderLine();
    renderAvatarImage();
  }

  window.Settings = { init, refresh, renderAvatarImage };
})();
