/* Authenticated content console. Authorization is enforced again by every server operation. */
(function () {
  const groups = { quizzes: 'クイズ', stamps: 'スタンプ', events: 'イベントQR', shop: '商品', furusato: 'ふるさと納税', notices: 'お知らせ', islands: '四島紹介', ranks: 'ライセンス' };
  const colors = ['coral', 'ocean', 'gold', 'cherry', 'mint', 'plum', 'silver'];
  const fields = {
    quizzes: [['title', 'タイトル', 'text', true], ['level', '難易度', ['入門', '初級', '中級', '上級', '超難問'], true], ['desc', '一覧の説明', 'textarea'], ['icon', '見出し記号（例：基本）', 'text'], ['image', '画像URL・素材パス', 'text']],
    stamps: [['name', 'タイトル', 'text', true], ['no', '図鑑番号', 'number', true], ['area', '場所・エリア', 'text', true], ['kana', '読み方', 'text'], ['address', '所在地', 'text'], ['hint', '未取得時のヒント', 'textarea', true], ['desc', '短い紹介', 'text'], ['body', '取得後に表示する説明', 'textarea', true], ['lat', '緯度（任意）', 'decimal'], ['lng', '経度（任意）', 'decimal'], ['image', '画像URL・素材パス', 'text'], ['color', 'スタンプの色', colors], ['emoji', '印の記号', 'text'], ['facts', '補足情報', 'facts']],
    shop: [['name', '商品名', 'text', true], ['price', '交換ポイント', 'number', true], ['desc', '商品説明', 'textarea'], ['image', '画像URL・素材パス', 'text'], ['emoji', '表示記号', 'text'], ['accent', '色', colors]],
    furusato: [['name', '返礼品名', 'text', true], ['category', '分類', 'text', true], ['amount', '寄附金額の目安（円）', 'number', true], ['desc', '説明', 'textarea'], ['url', '案内先URL（HTTPS）', 'url'], ['image', '画像URL・素材パス', 'text'], ['emoji', '表示記号', 'text'], ['accent', '色', colors]],
    notices: [['name', '管理用タイトル', 'text', true], ['body', '本文', 'textarea', true], ['url', '詳細URL（任意）', 'url']],
    islands: [['name', '島名', 'text', true], ['en', '英字表記', 'text'], ['kana', '読み方', 'text'], ['desc', '短い紹介', 'text'], ['body', '説明', 'textarea', true], ['image', '画像URL・素材パス', 'text'], ['facts', '補足情報', 'facts']],
    ranks: [['name', '階級名', 'text', true], ['sub', 'ライセンス名', 'text', true], ['en', '英字表記', 'text', true], ['min', '必要な累計ポイント', 'number', true], ['blurb', '説明', 'textarea'], ['emoji', '表示記号', 'text'], ['image', '画像URL・素材パス', 'text'], ['color', 'テーマ色', 'color']]
  };
  const colorNames = { coral: '朱色', ocean: '青', gold: '金', cherry: '桜色', mint: '緑', plum: '紫', silver: '銀' };
  let tools, data = null, authorized = false, checkedUid = '', group = 'quizzes', selected = null, dirty = false, busy = false, generation = 0, qrStamp = '';
  const root = () => document.getElementById('adminRoot');
  const el = (tag, text, className) => { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; };
  function button(text, icon, action, style = '') {
    const node = el('button', null, `admin-btn ${style}`); node.type = 'button';
    if (tools) node.append(tools.icon(icon)); node.append(document.createTextNode(text));
    node.addEventListener('click', action); return node;
  }
  function status(text, error = false) {
    const node = document.getElementById('adminStatus');
    if (node) { node.textContent = text; node.dataset.error = String(error); }
  }
  function discard() { return !dirty || confirm('未保存の変更を破棄して移動しますか？'); }
  function setBusy(value) {
    busy = value; root().setAttribute('aria-busy', String(value));
    root().querySelectorAll('.admin-workspace, .admin-toolbar, .admin-events, .admin-qr-layout').forEach(node => { node.inert = value; });
  }
  async function call(payload) {
    const uid = Cloud.user?.uid;
    const result = await Cloud.call('manageContent', payload);
    if (!uid || Cloud.user?.uid !== uid) throw new Error('ログイン状態が変わりました。');
    return result;
  }
  function errorText(error) {
    return ['functions/invalid-argument', 'functions/failed-precondition', 'functions/aborted', 'functions/not-found', 'functions/resource-exhausted'].includes(error?.code)
      ? error.message : Cloud.errorMessage(error);
  }
  async function operation(fn) {
    if (busy) return;
    setBusy(true); status('処理中です…');
    try { await fn(); }
    catch (error) { status(errorText(error), true); }
    finally { setBusy(false); }
  }
  function gate() {
    root().replaceChildren();
    root().append(el('p', Cloud.user ? 'このアカウントには管理者権限がありません。' : '管理者アカウントでログインしてください。', 'admin-gate'));
    if (!Cloud.user) root().append(button('ログイン', 'lock', () => Cloud.open()));
  }
  async function checkAccess(force = false) {
    const uid = Cloud.account && Cloud.user?.uid || '';
    if (uid === checkedUid && force !== true) return;
    checkedUid = uid; authorized = false; data = null; selected = null; dirty = false; qrStamp = ''; generation++;
    document.getElementById('adminEntry').hidden = true; gate();
    if (!uid) return;
    try {
      const result = await call({ action: 'status' });
      if (checkedUid !== uid) return;
      authorized = result.authorized === true;
      document.getElementById('adminEntry').hidden = !authorized;
      if (authorized && location.hash === '#admin') await load();
    } catch {
      if (checkedUid === uid) {
        root().replaceChildren(el('p', '管理者権限を確認できませんでした。接続を確認して再試行してください。', 'admin-gate'));
        root().append(button('再試行', 'refresh', () => checkAccess(true)));
      }
    }
  }
  async function load() {
    if (!authorized) { gate(); return; }
    if (busy || !discard()) return;
    const epoch = generation;
    root().replaceChildren(el('p', '管理データを読み込んでいます…', 'admin-gate'));
    try {
      if (!tools) tools = await import('./vendor/admin-tools.js?v=59');
      const result = await call({ action: 'load' });
      if (epoch !== generation || !authorized) return;
      data = result; dirty = false;
      if (selected) selected = data.draft.items[group]?.[selected.id] || null;
      render(); status('最新の管理データを読み込みました。');
    } catch (error) { if (epoch === generation) { gate(); root().append(el('p', errorText(error), 'admin-note')); root().append(button('再試行', 'refresh', load)); } }
  }
  function render() {
    if (!authorized || !data) return gate();
    const host = root(); host.replaceChildren();
    const toolbar = el('div', null, 'admin-toolbar'), tabs = el('div', null, 'admin-tabs');
    tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', '管理項目');
    for (const [key, label] of Object.entries(groups)) {
      const tab = el('button', label); tab.type = 'button'; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(key === group));
      tab.addEventListener('click', () => { if (discard()) { group = key; selected = null; dirty = false; render(); } }); tabs.append(tab);
    }
    toolbar.append(tabs, button('再読み込み', 'refresh', load)); host.append(toolbar);
    const message = el('p', '', 'admin-status'); message.id = 'adminStatus'; message.setAttribute('role', 'status'); host.append(message);
    if (group === 'events') renderEvents(host); else renderItems(host);
    const audit = el('details', null, 'admin-audit'); audit.append(el('summary', '最近の変更履歴'));
    const list = el('ul');
    const verbs = { save: '下書き保存', publish: '公開', archive: '公開停止', restore: '復元', qrIssue: 'QR発行', qrDisable: 'QR無効化' };
    for (const item of data.audit || []) {
      const row = el('li'); row.append(el('time', new Date(item.at).toLocaleString('ja-JP')), el('span', `${verbs[item.action] || item.action}：${item.label || item.itemId}`)); list.append(row);
    }
    audit.append(list); host.append(audit);
  }
  function stateLabel(item) {
    return item._state === 'published' ? '公開中' : item._state === 'archived' ? '公開停止・削除済み' : item._publishedRevision ? '変更の下書き（旧版は公開中）' : '未公開の下書き';
  }
  function renderItems(host) {
    const workspace = el('div', null, 'admin-workspace'); workspace.dataset.editing = String(!!selected); host.append(workspace);
    const sidebar = el('aside', null, 'admin-list'), controls = el('div', null, 'admin-list-tools');
    const search = el('input', null, 'admin-search'); search.type = 'search'; search.placeholder = 'タイトルで検索'; search.setAttribute('aria-label', '管理項目を検索');
    const archiveLabel = el('label'), archive = el('input'); archive.type = 'checkbox'; archiveLabel.append(archive, document.createTextNode('公開停止・削除済みも表示'));
    controls.append(search, archiveLabel);
    if (!['islands', 'ranks'].includes(group)) controls.append(button('新規追加', 'plus', () => {
      if (!discard()) return;
      selected = { id: `${group.slice(0, 3)}-${crypto.randomUUID().slice(0, 12)}`, _revision: 0, order: Object.keys(data.draft.items[group]).length,
        no: Math.max(0, ...Object.values(data.draft.items.stamps).map(s => s.no)) + 1,
        level: '入門', color: 'coral', accent: 'coral', questions: [], facts: [] };
      dirty = true; render();
    }));
    const rows = el('div'); sidebar.append(controls, rows); workspace.append(sidebar);
    function listing() {
      rows.replaceChildren();
      const items = Object.values(data.draft.items[group]).filter(item => (archive.checked || item._state !== 'archived') && (item.title || item.name || '').includes(search.value));
      items.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach(item => {
        const row = el('button', null, 'admin-item'); row.type = 'button'; row.setAttribute('aria-current', String(selected?.id === item.id));
        const state = el('span', stateLabel(item), 'admin-item-state'); state.dataset.state = item._state;
        row.append(el('strong', item.title || item.name), state, el('small', item.id));
        row.addEventListener('click', () => { if (discard()) { selected = structuredClone(item); dirty = false; render(); } }); rows.append(row);
      });
      if (!items.length) rows.append(el('p', '該当する項目はありません。', 'admin-empty'));
    }
    search.addEventListener('input', listing); archive.addEventListener('change', listing); listing();
    const editor = el('div', null, 'admin-editor'); workspace.append(editor);
    if (!selected) { editor.append(el('p', '編集する項目を選択してください。', 'admin-empty')); return; }
    editor.append(button('一覧へ戻る', 'back', () => { if (discard()) { selected = null; dirty = false; render(); } }, 'admin-back-list'));
    editor.append(el('h3', selected.title || selected.name || `${groups[group]}を追加`));
    editor.append(el('p', `${stateLabel(selected)}｜変更は下書き保存後、公開操作でアプリへ反映されます。`, 'admin-note'));
    const form = el('form'), grid = el('div', null, 'admin-form-grid'); form.id = 'adminEditForm';
    addField(grid, ['id', '管理ID', 'text', true], selected.id, true);
    addField(grid, ['order', '表示順', 'number', true], selected.order ?? 0);
    for (const descriptor of fields[group]) addField(grid, descriptor, selected[descriptor[0]]);
    form.append(grid);
    if (group === 'quizzes') renderQuestions(form, selected.questions || []);
    if (group === 'shop') form.append(el('p', '掲載内容のみ変更します。実物グッズの交換・配送・送料決済は引き続き準備中です。', 'admin-note'));
    const actions = el('div', null, 'admin-actions');
    const save = button('下書き保存', 'save', () => {}); save.type = 'submit'; actions.append(save);
    actions.append(button('公開', 'publish', () => mutate('publish'), 'admin-btn-primary'));
    if (selected._revision && !['islands', 'ranks'].includes(group)) actions.append(button(selected._state === 'archived' ? '下書きに復元' : '公開停止・削除', selected._state === 'archived' ? 'restore' : 'archive', () => mutate(selected._state === 'archived' ? 'restore' : 'archive'), 'admin-btn-danger'));
    if (group === 'stamps' && data.published.stamps.some(stamp => stamp.id === selected.id && !stamp.archived)) {
      actions.append(button('このスタンプのQRを発行', 'qr', () => {
        if (!discard()) return;
        qrStamp = selected.id; group = 'events'; selected = null; dirty = false; render();
      }));
    }
    form.append(actions);
    form.addEventListener('input', event => { if (event.target.id !== 'adminQuizReviewed') { dirty = true; status('未保存の変更があります。'); } });
    form.addEventListener('submit', event => { event.preventDefault(); saveItem(form); }); editor.append(form);
  }
  function addField(container, [key, label, type, required], value, readOnly = false) {
    const wrap = el('label', null, `admin-field ${['textarea', 'facts'].includes(type) ? 'admin-field-wide' : ''}`); wrap.append(el('span', label));
    let input;
    if (Array.isArray(type)) {
      input = el('select'); type.forEach(option => { const node = el('option', colors.includes(option) ? colorNames[option] : option); node.value = option; input.append(node); });
      input.value = value || type[0];
    } else {
      input = el(['textarea', 'facts'].includes(type) ? 'textarea' : 'input');
      if (input.tagName === 'INPUT') { input.type = type === 'decimal' ? 'number' : type; if (type === 'decimal') input.step = 'any'; if (type === 'number') { input.min = 0; input.step = '1'; } }
      input.value = type === 'facts' ? (value || []).map(f => `${f.k}｜${f.v}`).join('\n') : value ?? '';
      if (type === 'color' && !/^#[a-f0-9]{6}$/i.test(input.value)) input.value = '#5aa7d1';
    }
    input.name = key; input.required = !!required; input.readOnly = readOnly;
    if (type === 'facts') { input.dataset.facts = 'true'; wrap.append(el('small', '1行に「見出し｜内容」の形式で入力します。最大8行。')); }
    wrap.append(input);
    if (key === 'image') {
      const options = el('datalist'); options.id = 'adminImageOptions'; input.setAttribute('list', options.id);
      const images = new Map();
      Object.values(data.published).filter(Array.isArray).flat().forEach(item => {
        if (item.image?.startsWith('assets/')) images.set(item.image, item.title || item.name || item.image);
      });
      for (const [path, name] of images) { const option = el('option'); option.value = path; option.label = name; options.append(option); }
      const preview = el('img', null, 'admin-image-preview'); preview.alt = '選択中の画像'; preview.width = 120; preview.height = 80;
      const update = () => { const valid = /^assets\/[a-zA-Z0-9_./-]+$/.test(input.value) && !input.value.includes('..'); preview.hidden = !valid; if (valid) preview.src = input.value; else preview.removeAttribute('src'); };
      input.addEventListener('input', update); update();
      wrap.append(options, preview, el('small', '候補から素材を選択できます。外部画像は使用できません。'));
    }
    container.append(wrap); return input;
  }
  function renderQuestions(form, questions) {
    const area = el('div'); area.id = 'adminQuestions'; form.append(area);
    function append(q = { q: '', choices: ['', '', '', ''], answer: 0 }) {
      const fieldset = el('fieldset', null, 'admin-question'), head = el('div', null, 'admin-question-head');
      head.append(el('h4', `設問 ${area.children.length + 1}`), button('設問を削除', 'archive', () => { if (confirm('この設問を下書きから削除しますか？')) { fieldset.remove(); dirty = true; } })); fieldset.append(head);
      const grid = el('div', null, 'admin-form-grid');
      addField(grid, ['q', '設問', 'textarea', true], q.q);
      addField(grid, ['explain', '解説', 'textarea', true], q.explain);
      addField(grid, ['sourceTitle', '政府出典の名称', 'text', true], q.sourceTitle || data.published.sources[q.source]?.label);
      addField(grid, ['sourceUrl', '政府出典URL（go.jp）', 'url', true], q.sourceUrl || data.published.sources[q.source]?.url);
      fieldset.append(grid, el('p', '選択肢と正解', 'admin-note'));
      const choices = el('div', null, 'admin-choices'), name = `answer-${crypto.randomUUID()}`;
      function addChoice(text = '', checked = false) {
        const row = el('label', null, 'admin-choice'), radio = el('input'), input = el('input'); radio.type = 'radio'; radio.name = name; radio.checked = checked; radio.required = true; radio.setAttribute('aria-label', 'この選択肢が正解');
        input.type = 'text'; input.value = text; input.required = true; input.setAttribute('aria-label', '選択肢');
        row.append(radio, input, button('削除', 'archive', event => { event.preventDefault(); row.remove(); dirty = true; })); choices.append(row);
      }
      q.choices.forEach((choice, i) => addChoice(choice, i === q.answer));
      fieldset.append(choices, button('選択肢を追加', 'plus', () => { if (choices.children.length < 6) { addChoice(); dirty = true; } }));
      area.append(fieldset);
    }
    questions.forEach(append);
    form.append(button('設問を追加', 'plus', () => { if (area.children.length < 30) { append(); dirty = true; } }));
    const review = el('label', null, 'admin-review'), check = el('input'); check.type = 'checkbox'; check.id = 'adminQuizReviewed';
    review.append(check, document.createTextNode('公開前に政府出典を開き、設問・選択肢・正解・解説が資料と一致することを確認しました。')); form.append(review);
    form.append(el('p', '設問・正解等を変更すると、そのクイズの版を更新します。既存の累計ポイントと他のクイズの成績は変更しません。', 'admin-note'));
  }
  function readItem(form) {
    const item = { id: selected.id };
    for (const key of ['order', ...fields[group].map(field => field[0])]) {
      const input = form.elements.namedItem(key);
      if (input.dataset.facts) item[key] = input.value.split('\n').filter(line => line.trim()).map(line => { const [k, ...rest] = line.split(/[｜|]/); return { k: k.trim(), v: rest.join('｜').trim() }; });
      else item[key] = input.type === 'number' && input.value !== '' ? Number(input.value) : input.value;
    }
    if (group === 'quizzes') item.questions = [...form.querySelectorAll('.admin-question')].map(node => {
      const read = key => node.querySelector(`[name="${key}"]`).value;
      const rows = [...node.querySelectorAll('.admin-choice')];
      return { q: read('q'), explain: read('explain'), sourceTitle: read('sourceTitle'), sourceUrl: read('sourceUrl'),
        choices: rows.map(row => row.querySelector('input[type="text"]').value), answer: rows.findIndex(row => row.querySelector('input[type="radio"]').checked) };
    });
    return item;
  }
  async function saveItem(form) {
    if (!form.reportValidity()) return;
    await operation(async () => {
      const result = await call({ action: 'save', kind: group, item: readItem(form), baseRevision: selected._revision || 0 });
      selected = result.item; data.draft.items[group][selected.id] = selected; dirty = false; render(); status('下書きを保存しました。公開中の内容はまだ変更していません。');
    });
  }
  async function mutate(action) {
    if (dirty) return status('先に下書きを保存してください。', true);
    if (action === 'publish' && group === 'quizzes' && !document.getElementById('adminQuizReviewed').checked) return status('政府出典の内容確認にチェックを入れてください。', true);
    if (!confirm(action === 'publish' ? 'この内容を一般利用者へ公開しますか？' : action === 'archive' ? '公開停止して一覧から削除しますか？取得済みスタンプや学習記録は残ります。' : '下書きに復元しますか？公開するには、さらに公開操作が必要です。')) return;
    await operation(async () => {
      const result = await call({ action, kind: group, id: selected.id, baseRevision: selected._revision, reviewed: group === 'quizzes' });
      data = await call({ action: 'load' }); selected = result.item; dirty = false;
      render(); status(action === 'publish' ? '公開しました。アプリへ反映されます。' : action === 'archive' ? '公開を停止しました。履歴は保持されています。' : '下書きに復元しました。');
    });
  }
  function renderEvents(host) {
    const layout = el('div', null, 'admin-qr-layout'), form = el('form'), grid = el('div', null, 'admin-form-grid'); form.id = 'adminQRForm';
    const preset = data.published.stamps.find(item => item.id === qrStamp && !item.archived);
    addField(grid, ['label', 'イベント・設置場所のタイトル', 'text', true], preset?.name || '');
    const stamp = addField(grid, ['stampId', '付与するスタンプ', [''], false], ''); stamp.replaceChildren();
    const none = el('option', 'スタンプなし（ポイントのみ）'); none.value = ''; stamp.append(none);
    data.published.stamps.filter(item => !item.archived).forEach(item => { const option = el('option', `${item.no}：${item.name}`); option.value = item.id; stamp.append(option); });
    stamp.value = preset?.id || '';
    addField(grid, ['points', '参加ポイント（0〜500pt）', 'number', true], 50);
    const expiry = new Date(Date.now() + 30 * 86400000); expiry.setMinutes(expiry.getMinutes() - expiry.getTimezoneOffset());
    addField(grid, ['expiresAt', '有効期限', 'datetime-local', true], expiry.toISOString().slice(0, 16));
    form.append(el('h3', 'QRコードを発行'), grid, el('p', 'スタンプは先に公開してください。会場ごとのQRを発行でき、同じスタンプは1人1回だけ取得できます。QRは位置証明ではなく、画像を共有すると第三者も利用できます。', 'admin-note'));
    const issue = button('QRコードを発行', 'qr', () => {}, 'admin-btn-primary'); issue.type = 'submit'; form.append(issue);
    let requestId = crypto.randomUUID().replaceAll('-', '');
    form.addEventListener('input', () => { requestId = crypto.randomUUID().replaceAll('-', ''); });
    form.addEventListener('submit', event => { event.preventDefault(); if (!form.reportValidity()) return; operation(async () => {
      const payload = Object.fromEntries(new FormData(form));
      const result = await call({ action: 'qrIssue', requestId, label: payload.label, stampId: payload.stampId,
        points: Number(payload.points), expiresAt: new Date(payload.expiresAt).toISOString() });
      data.events.unshift({ id: result.eventId, ...payload, expiresAt: +new Date(payload.expiresAt), active: true });
      render();
      await showQR(result.code, { ...payload, expiresAt: +new Date(payload.expiresAt) });
      status('QRコードを発行しました。画像保存または印刷できます。');
    }); });
    const panel = el('div'); panel.id = 'adminQRPanel'; panel.className = 'admin-qr-panel'; panel.append(el('p', '発行したQRコードをここに表示します。', 'admin-empty'));
    layout.append(form, panel); host.append(layout);
    const table = el('table', null, 'admin-events'); table.append(el('caption', '発行済みQR（最大100件）'));
    const body = el('tbody'); table.append(body);
    for (const event of data.events) {
      const row = el('tr'), title = el('td', event.label), meta = el('td', `${event.points}pt｜${new Date(event.expiresAt).toLocaleString('ja-JP')}`), controls = el('td');
      title.append(el('small', event.active && event.expiresAt > Date.now() ? '　有効' : '　停止・期限切れ'));
      const buttons = el('div', null, 'admin-qr-controls');
      buttons.append(button('QRを表示', 'eye', () => operation(async () => { const result = await call({ action: 'qrShow', eventId: event.id }); await showQR(result.code, event); status('発行済みQRを表示しました。'); })));
      if (event.active) buttons.append(button('無効化', 'archive', () => { if (confirm('このQRを無効化しますか？元に戻せません。取得済みの記録は残ります。')) operation(async () => { await call({ action: 'qrDisable', eventId: event.id }); event.active = false; render(); status('QRを無効化しました。'); }); }, 'admin-btn-danger'));
      controls.append(buttons); row.append(title, meta, controls); body.append(row);
    }
    host.append(table);
  }
  async function showQR(code, event) {
    const image = await tools.qrImage(code), panel = document.getElementById('adminQRPanel'); panel.replaceChildren();
    panel.append(el('p', '北方領土ステータス', 'admin-note'), el('h3', event.label));
    const img = el('img'); img.src = image; img.alt = `${event.label}の参加QRコード`; panel.append(img);
    const stamp = data.published.stamps.find(item => item.id === event.stampId);
    if (stamp) panel.append(el('p', `スタンプ：${stamp.name}`));
    panel.append(el('p', `${event.points}pt｜期限 ${new Date(event.expiresAt).toLocaleString('ja-JP')}`, 'admin-note'), el('code', code));
    const controls = el('div', null, 'admin-qr-controls');
    controls.append(button('画像保存', 'download', () => { const link = el('a'); link.href = image; link.download = `hoppo-qr-${(event.id || 'event').slice(0, 12)}.png`; link.click(); }),
      button('コードをコピー', 'copy', async () => { try { await navigator.clipboard.writeText(code); status('コードをコピーしました。'); } catch { status('コード部分を選択してコピーしてください。', true); } }),
      button('印刷', 'print', () => window.print())); panel.append(controls);
  }
  window.Admin = {
    init() {
      Cloud.onChange(checkAccess);
      UI.on('page', page => { if (page === 'admin') { if (authorized && !data) load(); else if (!authorized) gate(); } });
      window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
      gate();
    },
    open() { UI.go('admin'); if (authorized && !data) load(); },
    refresh: load
  };
})();
