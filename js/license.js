/* ============================================================
   License page — premium card + rank ladder + profile
   ============================================================ */
(function() {
  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
  }

  function render() {
    const s = Store.get();
    const rank = window.getRankByPoints(s.points);
    const rankIdx = window.getRankIndex(rank.id);
    const totalTiers = window.RANKS.length;

    // License card — top
    const serialEl = document.getElementById('licenseSerialTop');
    if (serialEl) serialEl.textContent = `NO. ${s.userId || '----'}`;

    // License card — rank zone
    document.getElementById('licenseRankBadge').textContent = rank.emoji;
    document.getElementById('licenseRankName').textContent = rank.name;
    document.getElementById('licenseRankEn').textContent = rank.en;
    const tierEl = document.getElementById('licenseRankTier');
    if (tierEl) {
      tierEl.textContent = `TIER ${String(rankIdx + 1).padStart(2, '0')} / ${String(totalTiers).padStart(2, '0')}`;
    }

    // Meta
    document.getElementById('licenseName').textContent = s.name || 'ゲスト';
    document.getElementById('licenseId').textContent = s.userId || '—';
    document.getElementById('licensePoints').textContent = s.points.toLocaleString();
    document.getElementById('licenseIssued').textContent = formatDate(s.createdAt);

    // Signature
    const sigEl = document.getElementById('licenseSigName');
    if (sigEl) sigEl.textContent = `— ${s.name || 'ゲスト'} —`;

    // Watermark map is rendered via CSS + background-image; no JS needed.
    // Colorize license header ring based on current rank
    const card = document.getElementById('licenseCard');
    if (card) {
      card.dataset.rank = rank.id;
    }

    // Rank ladder
    const list = document.getElementById('rankList');
    list.innerHTML = window.RANKS.map((r, i) => {
      const achieved = s.points >= r.min;
      const isCurrent = rank.id === r.id;
      const next = window.RANKS[i + 1];
      const range = next ? `${r.min}〜${next.min - 1}pt` : `${r.min}pt 〜`;
      const imgStyle = r.image
        ? `style="background-image: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.85)), url('${r.image}');"`
        : '';
      return `
        <div class="rank-item ${isCurrent ? 'current' : ''} ${achieved ? '' : 'locked'}" data-rank="${r.id}">
          <div class="rank-item-badge" ${imgStyle}>
            <span class="rank-item-emoji">${r.emoji}</span>
          </div>
          <div class="rank-item-meta">
            <div class="rank-item-name">${r.name} <small>${r.sub}</small></div>
            <div class="rank-item-range"><b>${range}</b>｜${r.blurb}</div>
          </div>
          ${achieved ? '<div class="rank-item-check">✓</div>' : ''}
        </div>
      `;
    }).join('');

    // Achievements grid
    renderAchievements();

    // Profile shortcut name
    const shortcut = document.getElementById('profileShortcutName');
    if (shortcut) shortcut.textContent = s.name || 'ゲスト';
    const shortcutSub = document.getElementById('profileShortcutSub');
    if (shortcutSub) {
      const bio = s.profile?.bio;
      shortcutSub.textContent = bio || 'ニックネーム・アバター・自己紹介を設定';
    }
  }

  function renderAchievements() {
    const grid = document.getElementById('achieveGrid');
    const counter = document.getElementById('achieveCounter');
    if (!grid || !window.Achievements) return;
    const defs = window.Achievements.getDefs();
    const earnedSet = new Set(window.Achievements.getEarned().map(d => d.id));
    if (counter) {
      counter.textContent = `${earnedSet.size} / ${defs.length}`;
    }
    grid.innerHTML = defs.map(def => {
      const earned = earnedSet.has(def.id);
      return `
        <button type="button" class="achieve-tile ${earned ? 'earned' : 'locked'}" data-id="${def.id}" aria-label="${earned ? def.name : '未獲得バッジ'}">
          <div class="achieve-tile-icon">${earned ? def.icon : '🔒'}</div>
          <div class="achieve-tile-name">${earned ? def.name : '？？？'}</div>
          <div class="achieve-tile-desc">${earned ? def.desc : 'タップで詳細を表示'}</div>
        </button>
      `;
    }).join('');
  }

  function shareLicense() {
    const s = Store.get();
    const rank = window.getRankByPoints(s.points);
    const txt = `【北方領土ステータス】
${s.name || 'ゲスト'} さんは ${rank.emoji} ${rank.name}（${rank.sub}）です！
現在 ${s.points} pt 獲得中✨
#北方領土 #北方領土ステータス`;

    if (navigator.share) {
      navigator.share({
        title: '北方領土ステータス',
        text: txt,
      }).catch(() => {});
      return;
    }
    // fallback: copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt).then(() => {
        UI.toast('ライセンス情報をコピーしたよ！', 'good');
      }).catch(() => {
        UI.toast('シェアできませんでした', 'bad');
      });
    } else {
      UI.toast('このブラウザではシェアできません', 'bad');
    }
  }

  function flipLicense() {
    const card = document.getElementById('licenseCard');
    if (!card) return;
    card.classList.toggle('flipped');
  }

  /**
   * Render the license front to a PNG image (Canvas-based, no external libs).
   * Uses the SVG <foreignObject> bridge so that any arbitrary DOM + CSS
   * can be painted into an image the browser will download.
   */
  async function saveAsImage() {
    const btn = document.getElementById('licenseSaveBtn');
    const s = Store.get();
    const rank = window.getRankByPoints(s.points);
    const rankIdx = window.getRankIndex(rank.id);
    const totalTiers = window.RANKS.length;

    if (btn) { btn.disabled = true; btn.textContent = '書き出し中…'; }

    try {
      const { blob, filename } = await renderLicenseToBlob(s, rank, rankIdx, totalTiers);
      // Try to share as file first (mobile)
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
        try {
          await navigator.share({
            files: [new File([blob], filename, { type: 'image/png' })],
            title: '北方領土ステータス'
          });
          UI.toast('共有したよ！', 'good');
          return;
        } catch (e) { /* fall through to download */ }
      }
      // Fallback: download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      UI.toast('画像を保存しました！', 'points');
    } catch (e) {
      console.error(e);
      UI.toast('画像の書き出しに失敗しました', 'bad');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 画像に保存'; }
    }
  }

  async function loadAsDataURL(src) {
    const res = await fetch(src);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  function formatDateParts(iso) {
    const d = iso ? new Date(iso) : new Date();
    return {
      full: `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
    };
  }

  /**
   * Build a self-contained PNG of the license card.
   * We draw directly to canvas (clean, reliable, no external library).
   */
  async function renderLicenseToBlob(s, rank, rankIdx, totalTiers) {
    const W = 1080;
    const H = 1400;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // ---- Background ----
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#fff5ec');
    bg.addColorStop(0.5, '#ffe3cc');
    bg.addColorStop(1, '#ffd5bd');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // subtle dot grid
    ctx.fillStyle = 'rgba(43, 36, 53, 0.05)';
    for (let y = 30; y < H; y += 28) {
      for (let x = 30; x < W; x += 28) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // ---- Card shell ----
    const cardX = 60, cardY = 120, cardW = W - 120, cardH = H - 200;
    roundRect(ctx, cardX, cardY, cardW, cardH, 44);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(26,25,48,0.2)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 16;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // watermark map (faded)
    try {
      const mapImg = await loadImage('assets/images/hoppou/four-islands-map.jpg');
      ctx.save();
      roundClip(ctx, cardX, cardY, cardW, cardH, 44);
      ctx.globalAlpha = 0.08;
      const ratio = mapImg.width / mapImg.height;
      const mapH = cardH * 0.8;
      const mapW = mapH * ratio;
      ctx.drawImage(mapImg, cardX + (cardW - mapW) / 2, cardY + 180, mapW, mapH);
      ctx.restore();
    } catch (e) { /* ignore */ }

    // ---- Header band ----
    const headH = 160;
    ctx.save();
    roundClip(ctx, cardX, cardY, cardW, headH, 44);
    const headGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + headH);
    headGrad.addColorStop(0, '#2f7fab');
    headGrad.addColorStop(1, '#ff8752');
    ctx.fillStyle = headGrad;
    ctx.fillRect(cardX, cardY, cardW, headH);
    // header subtle sheen
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(cardX, cardY, cardW, headH / 2);
    ctx.restore();

    // Emblem
    ctx.save();
    ctx.translate(cardX + 60, cardY + headH / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f7fab';
    ctx.font = '700 32px "Zen Maru Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('北', 0, 2);
    ctx.restore();

    // Title + subtitle
    ctx.fillStyle = '#fff';
    ctx.font = '900 42px "Zen Maru Gothic", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('北方領土ステータス', cardX + 120, cardY + 70);
    ctx.font = '700 22px "M PLUS Rounded 1c", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('HOPPOU STATUS · OFFICIAL LICENSE', cardX + 120, cardY + 105);

    // Serial pill (top-right)
    const serial = `NO. ${s.userId || '----'}`;
    ctx.font = '800 22px "SFMono-Regular", ui-monospace, monospace';
    const serialTextW = ctx.measureText(serial).width;
    const serialPillW = serialTextW + 40;
    const serialPillX = cardX + cardW - serialPillW - 40;
    const serialPillY = cardY + 50;
    roundRect(ctx, serialPillX, serialPillY, serialPillW, 44, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(serial, serialPillX + serialPillW / 2, serialPillY + 30);

    // ---- Portrait ----
    const portraitCX = cardX + 160;
    const portraitCY = cardY + headH + 180;
    const portraitR = 130;

    // Dashed ring
    ctx.save();
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = '#ff8752';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(portraitCX, portraitCY, portraitR + 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Portrait bg
    ctx.save();
    ctx.beginPath();
    ctx.arc(portraitCX, portraitCY, portraitR, 0, Math.PI * 2);
    ctx.fillStyle = '#fff5ec';
    ctx.fill();
    ctx.clip();
    try {
      const profile = Store.getProfile ? Store.getProfile() : {};
      const customImg = profile.avatarImage;
      if (customImg) {
        // Use user-uploaded avatar — draw as a circular fit (no offset)
        const img = await loadImage(customImg);
        const size = portraitR * 2;
        ctx.drawImage(img, portraitCX - size / 2, portraitCY - size / 2, size, size);
      } else {
        const erikaImg = await loadImage('assets/characters/placeholder.png');
        const size = portraitR * 2 + 10;
        ctx.drawImage(erikaImg, portraitCX - size / 2, portraitCY - size / 2 + 10, size, size);
      }
    } catch (e) { /* ignore */ }
    ctx.restore();

    // Gold star badge
    ctx.save();
    ctx.translate(portraitCX + portraitR - 8, portraitCY - portraitR + 12);
    ctx.fillStyle = '#ffcf57';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '900 28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 0, 2);
    ctx.restore();

    // ---- Rank zone (right of portrait) ----
    const rankX = cardX + 330;
    const rankTopY = cardY + headH + 60;

    ctx.fillStyle = '#' + ((rank.color || '#2f7fab').replace('#', ''));
    ctx.font = '900 60px "Zen Maru Gothic", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${rank.emoji} ${rank.name}`, rankX, rankTopY + 50);

    ctx.fillStyle = '#ff8752';
    ctx.font = '800 22px "M PLUS Rounded 1c", sans-serif';
    ctx.fillText((rank.en || '').toUpperCase(), rankX, rankTopY + 88);

    // Tier pill
    const tierStr = `TIER ${String(rankIdx + 1).padStart(2, '0')} / ${String(totalTiers).padStart(2, '0')}`;
    ctx.font = '900 22px "SFMono-Regular", ui-monospace, monospace';
    const tierTextW = ctx.measureText(tierStr).width;
    const tierPillW = tierTextW + 32;
    roundRect(ctx, rankX, rankTopY + 110, tierPillW, 40, 20);
    ctx.fillStyle = 'rgba(47,127,171,0.1)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(47,127,171,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#2f7fab';
    ctx.textAlign = 'center';
    ctx.fillText(tierStr, rankX + tierPillW / 2, rankTopY + 137);

    // ---- Meta grid ----
    const metaY = cardY + headH + 360;
    const metaGap = 30;
    const metaColW = (cardW - 80 - metaGap) / 2;
    drawMetaCell(ctx, cardX + 40, metaY, metaColW, 'NAME', s.name || 'ゲスト');
    drawMetaCell(ctx, cardX + 40 + metaColW + metaGap, metaY, metaColW, 'LICENSE ID', s.userId || '—');
    drawMetaCell(ctx, cardX + 40, metaY + 100, metaColW, 'POINTS', s.points.toLocaleString());
    drawMetaCell(ctx, cardX + 40 + metaColW + metaGap, metaY + 100, metaColW, 'ISSUED', formatDateParts(s.createdAt).full);

    // ---- Signature + stamp ----
    const sigY = cardY + cardH - 180;
    // dashed separator
    ctx.save();
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = 'rgba(43, 36, 53, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cardX + 40, sigY - 30);
    ctx.lineTo(cardX + cardW - 40, sigY - 30);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#8a7e96';
    ctx.font = '700 20px "M PLUS Rounded 1c", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SIGNATURE', cardX + 60, sigY);
    ctx.fillStyle = '#2b2435';
    ctx.font = 'italic 900 50px "Yuji Syuku", serif';
    ctx.fillText(`— ${s.name || 'ゲスト'} —`, cardX + 80, sigY + 60);

    // Round stamp
    const stampCX = cardX + cardW - 130;
    const stampCY = sigY + 30;
    ctx.save();
    ctx.translate(stampCX, stampCY);
    ctx.rotate(-0.12);
    ctx.strokeStyle = '#d8462b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 64, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#d8462b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 22px "Zen Maru Gothic", serif';
    ctx.fillText('四島', 0, -14);
    ctx.fillText('公認', 0, 16);
    ctx.restore();

    // Micro text band
    ctx.fillStyle = 'rgba(43, 36, 53, 0.3)';
    ctx.font = '700 12px "SFMono-Regular", ui-monospace, monospace';
    ctx.textAlign = 'left';
    const micro = 'HOPPOU·STATUS·OFFICIAL·LICENSE·'.repeat(10);
    ctx.fillText(micro, cardX + 40, cardY + cardH - 30);

    // Footer attribution
    ctx.fillStyle = 'rgba(43, 36, 53, 0.45)';
    ctx.font = '700 18px "M PLUS Rounded 1c", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('#北方領土 #北方領土ステータス', W / 2, H - 44);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve({ blob, filename: `hoppou-license-${s.userId || 'guest'}.png` });
      }, 'image/png', 0.95);
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
  function roundClip(ctx, x, y, w, h, r) {
    roundRect(ctx, x, y, w, h, r);
    ctx.clip();
  }
  function drawMetaCell(ctx, x, y, w, label, value) {
    roundRect(ctx, x, y, w, 80, 16);
    ctx.fillStyle = 'rgba(47, 127, 171, 0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(47, 127, 171, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#8a7e96';
    ctx.font = '700 15px "M PLUS Rounded 1c", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, x + 18, y + 28);
    ctx.fillStyle = '#2b2435';
    ctx.font = '900 28px "Zen Maru Gothic", sans-serif';
    ctx.fillText(value, x + 18, y + 64);
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function bind() {
    const shareBtn = document.getElementById('licenseShareBtn');
    if (shareBtn) shareBtn.addEventListener('click', shareLicense);
    const flipBtn = document.getElementById('licenseFlipBtn');
    if (flipBtn) flipBtn.addEventListener('click', flipLicense);
    const saveBtn = document.getElementById('licenseSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveAsImage);

    // Tap on the license card itself flips it
    const card = document.getElementById('licenseCard');
    if (card) {
      card.addEventListener('click', (e) => {
        // Avoid double-firing if the user actually clicked an action button
        if (e.target.closest('.license-actions')) return;
        flipLicense();
      });
    }
  }

  window.License = { init() { bind(); render(); }, refresh: render };
})();
