/* Authentication and remote state. No tokens/passwords are saved by this module. */
(function () {
  // Missing configuration must not silently convert a production session into a local demo.
  const config = window.HOPPO_CLOUD_CONFIG || { enabled: true };
  const passwordMinLength = 6;
  const listeners = new Set();
  let sdk, auth, db, functions, currentUser = null, account = null;
  let identityVerified = false, emailSession = false;
  let unsubscribers = [], generation = 0, initialHydration = false;
  let people = [], following = [], blocked = [], threads = [], busy = false, friendProfiles = [], reads = {}, authMode = 'login';
  let profileDirty = false, profileSaving = false, profileRevision = 0;
  let resolveBoot, rejectBoot, bootSettled = false;
  let hydrationPending = [], hydrationFailed = false;
  const boot = new Promise((resolve, reject) => { resolveBoot = resolve; rejectBoot = reject; });
  function finishBoot(error, outcome) {
    if (bootSettled) return;
    bootSettled = true;
    if (error) rejectBoot(error); else resolveBoot(outcome);
  }
  const notify = () => { listeners.forEach(fn => fn()); renderAccount(); };
  const clear = () => {
    unsubscribers.forEach(fn => fn()); unsubscribers = [];
    account = null; people = []; following = []; blocked = []; threads = []; friendProfiles = []; reads = {}; initialHydration = false; hydrationPending = []; hydrationFailed = false;
  };
  const errors = {
    'auth/invalid-credential': 'メールアドレスまたはパスワードを確認してください。',
    'auth/email-already-in-use': '登録できませんでした。ログインまたはパスワード再設定をお試しください。',
    'auth/invalid-email': 'メールアドレスを確認してください。',
    'auth/weak-password': 'パスワードは6文字以上で設定してください。',
    'auth/password-does-not-meet-requirements': 'パスワードがサーバーの条件を満たしていません。6文字以上の別のパスワードをお試しください。',
    'auth/operation-not-allowed': '現在このログイン方法を利用できません。運営側の設定確認が必要です。',
    'auth/user-disabled': 'このアカウントは利用できません。',
    'auth/user-not-found': 'メールアドレスまたはパスワードを確認してください。',
    'auth/wrong-password': 'メールアドレスまたはパスワードを確認してください。',
    'auth/too-many-requests': '試行回数が多いため、しばらく待ってからお試しください。',
    'functions/unauthenticated': 'ログイン情報が失効しました。再度ログインしてください。',
    'auth/network-request-failed': '通信できません。接続を確認してください。',
    'functions/permission-denied': '操作できません。メール確認・相互フォロー・DM設定を確認してください。',
    'functions/resource-exhausted': '操作回数の上限です。時間を空けてお試しください。',
    'functions/already-exists': 'このLINEアカウントには別の学習記録があります。自動統合はできません。',
    'functions/failed-precondition': '利用設定を確認してください。',
    'functions/unavailable': 'サーバーへ接続できません。時間を空けてお試しください。'
  };
  function errorMessage(error) {
    if (error?.details?.reason === 'recent-login-required' || error?.message === 'line-requires-recent-login') return '安全のため、一度ログアウトして再ログインしてから操作してください。';
    if (error?.message === 'line-link-needs-email-account') return 'LINE連携には、メール確認済みのメールアカウントでログインしてください。';
    if (error?.message === 'line-openid-scope') return 'LINEの認証情報を取得できません。もう一度お試しください。';
    if (error?.message === 'line-sdk') return 'LINEログインを読み込めません。通信状態を確認してください。';
    return errors[error?.code] || '処理を完了できませんでした。設定または通信状態を確認してください。';
  }
  function status(text, bad = false) {
    const node = document.getElementById('authStatus');
    node.textContent = text; node.classList.toggle('error', bad);
    document.getElementById('authErrorCode').hidden = true;
    document.getElementById('authErrorCode').textContent = '';
  }
  function profileStatus(text, state = '') {
    const node = document.getElementById('cloudProfileStatus');
    if (!node) return;
    node.textContent = text;
    if (state) node.dataset.state = state;
    else delete node.dataset.state;
  }
  function markProfileDirty() {
    if (!account) return;
    profileRevision++;
    profileDirty = true;
    profileStatus('変更はまだクラウドに保存されていません。', 'dirty');
  }
  function clearBirthdayError() {
    const input = document.getElementById('settingsBirthday');
    const error = document.getElementById('settingsBirthdayError');
    input.removeAttribute('aria-invalid');
    error.textContent = ''; error.hidden = true;
  }
  function adultBirthday(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== value) return false;
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
    const [year, month, day] = today.split('-').map(Number);
    const [birthYear, birthMonth, birthDay] = value.split('-').map(Number);
    const age = year - birthYear - (month < birthMonth || (month === birthMonth && day < birthDay) ? 1 : 0);
    return age >= 18 && age <= 120;
  }
  function failure(error, prefix = '') {
    const code = /^(auth|functions|appCheck)\/[a-z0-9-]+$/.test(error?.code || '') ? error.code : 'app/unexpected-error';
    status(prefix + errorMessage(error), true);
    const node = document.getElementById('authErrorCode');
    node.textContent = `確認用コード：${code}`; node.hidden = false;
  }
  function clearFieldError(id) {
    const input = document.getElementById(id), error = document.getElementById(`${id}Error`);
    if (error.textContent && document.getElementById('authStatus').textContent === error.textContent) status('');
    input.removeAttribute('aria-invalid'); error.hidden = true; error.textContent = '';
  }
  function fieldError(id, message) {
    const input = document.getElementById(id), error = document.getElementById(`${id}Error`);
    input.setAttribute('aria-invalid', 'true'); error.textContent = message; error.hidden = false;
    status(message, true); input.focus(); return false;
  }
  function validateEmail() {
    const email = document.getElementById('authEmail');
    clearFieldError('authEmail'); email.value = email.value.trim();
    if (!email.value) return fieldError('authEmail', 'メールアドレスを入力してください。');
    if (!email.validity.valid) return fieldError('authEmail', 'メールアドレスの形式を確認してください（例：name@example.com）。');
    return true;
  }
  function validatePassword(register = false) {
    const password = document.getElementById('authPassword');
    clearFieldError('authPassword');
    if (!password.value) return fieldError('authPassword', 'パスワードを入力してください。');
    if (register && password.value.length < passwordMinLength) return fieldError('authPassword', 'パスワードが短すぎます。新規登録は6文字以上にしてください。');
    if (register) {
      const confirmation = document.getElementById('authPasswordConfirm');
      clearFieldError('authPasswordConfirm');
      if (!confirmation.value) return fieldError('authPasswordConfirm', '確認用のパスワードをもう一度入力してください。');
      if (confirmation.value !== password.value) return fieldError('authPasswordConfirm', '2回入力したパスワードが一致していません。');
    }
    return true;
  }
  function updatePasswordCount() {
    const length = document.getElementById('authPassword').value.length;
    document.getElementById('authPasswordCount').textContent = length ? `現在${length}文字` : '未入力';
  }
  function clearPasswords() {
    ['authPassword', 'authPasswordConfirm'].forEach(id => { document.getElementById(id).value = ''; clearFieldError(id); });
    updatePasswordCount();
  }
  function setAuthMode(mode) {
    if (busy || currentUser) return;
    authMode = mode;
    document.getElementById('authExistingNotice').hidden = true;
    clearPasswords(); clearFieldError('authEmail');
    ['login', 'register'].forEach(kind => {
      const tab = document.getElementById(kind === 'login' ? 'authLoginTab' : 'authRegisterTab');
      tab.setAttribute('aria-selected', String(kind === mode)); tab.tabIndex = kind === mode ? 0 : -1;
    });
    document.getElementById('authFields').setAttribute('aria-labelledby', mode === 'login' ? 'authLoginTab' : 'authRegisterTab');
    document.getElementById('authPassword').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    status(mode === 'register' ? 'メールアドレスと、同じパスワードを2回入力してください。' : '登録済みのメールアドレスとパスワードを入力してください。');
    renderAccount();
  }
  function isStorageFailure(error) {
    const original = error?.customData?.originalError || error;
    return error?.code === 'auth/web-storage-unsupported' || ['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED', 'SecurityError'].includes(original?.name);
  }
  async function authenticate(register, email, password) {
    const run = () => register ? sdk.createUserWithEmailAndPassword(auth, email, password) : sdk.signInWithEmailAndPassword(auth, email, password);
    try { return await run(); } catch (error) {
      if (!isStorageFailure(error)) throw error;
      const created = register && auth.currentUser?.email === email;
      // Auth may have created the account before persistent storage failed. Never create it twice.
      await sdk.setPersistence(auth, sdk.inMemoryPersistence);
      const notice = document.getElementById('authStorageNotice');
      notice.hidden = false; notice.textContent = 'この端末ではログイン状態を長期保存できません。画面やブラウザを閉じた後は、再度ログインしてください。';
      return created ? sdk.signInWithEmailAndPassword(auth, email, password) : run();
    }
  }
  async function sendVerification(user, created = false) {
    try {
      await sdk.sendEmailVerification(user);
      status(`確認メールを${user.email}に送信しました。届いたリンクを開き、「メール確認を反映」を押してください。`);
    } catch (error) {
      failure(error, `${created ? 'アカウントは作成済みです。' : ''}確認メールを送信できませんでした。「確認メールを再送」から再度お試しください。`);
    }
  }
  async function call(name, data = {}) {
    await ready;
    if (!sdk || !config.enabled) throw new Error('not-configured');
    try { return (await sdk.httpsCallable(functions, name)(data)).data; }
    catch (error) {
      if (error?.code === 'functions/unauthenticated' && currentUser) {
        clear(); Store.clearRemote({ clearPersonal: true }); Settings.syncFields(); notify();
        await sdk.signOut(auth);
      }
      throw error;
    }
  }
  function watch(ref, fn, epoch, label) {
    return new Promise((resolve, reject) => {
      let received = false;
      unsubscribers.push(sdk.onSnapshot(ref, { includeMetadataChanges: true }, snap => {
        if (generation !== epoch) return;
        Promise.resolve().then(() => fn(snap)).then(() => {
          if (!received && !snap.metadata?.fromCache) {
            received = true;
            hydrationPending = hydrationPending.filter(item => item !== label);
            if (!hydrationFailed) window.App?.showLoader(`アカウントのデータを読み込んでいます…（${6 - hydrationPending.length}/6）`);
            resolve();
          }
        }).catch(error => { if (!received) reject(error); else failure(error); });
      }, error => {
        if (generation !== epoch) return;
        if (['permission-denied', 'unauthenticated'].includes(error.code)) {
          clear(); Store.clearRemote({ clearPersonal: true }); Settings.syncFields(); notify();
        }
        status('データを取得できません。サーバー設定と接続を確認してください。', true);
        if (!received) reject(error);
      }));
    });
  }
  async function connectAccount(epoch) {
    if (!currentUser || !identityVerified) return;
    const user = currentUser;
    await user.getIdToken(true);
    const existing = await sdk.getDocFromServer(sdk.doc(db, 'users', user.uid));
    if (epoch !== generation || currentUser !== user) return;
    if (existing.data()?.termsVersion !== '2026-10-14' && !document.getElementById('authTerms').checked) {
      status('利用条件・データの扱いを確認し、同意して「利用を開始」を押してください。'); return 'action';
    }
    await call('ensureAccount', { termsVersion: '2026-10-14', name: document.getElementById('authNickname').value });
    if (epoch !== generation || currentUser !== user) return;
    // The daily bonus changes points; subscribe after it so the first server snapshot is current.
    await call('claimDaily');
    if (epoch !== generation || currentUser !== user) return;
    const initial = [];
    hydrationPending = ['プロフィール', 'ランキング', 'フレンド', 'ブロック', '既読', 'メッセージ'];
    initial.push(watch(sdk.doc(db, 'users', user.uid), snap => {
      if (!snap.exists()) {
        if (snap.metadata?.fromCache) return;
        throw new Error('アカウントデータが見つかりません。');
      }
      account = snap.data();
      if (account.suspended || account.deleting) throw new Error('このアカウントは利用できません。');
      const hydrateProfile = !initialHydration || (!profileDirty && !profileSaving);
      Store.applyRemote(account, user.uid, hydrateProfile); initialHydration = true;
      if (hydrateProfile) Settings.syncFields();
      notify(); UI.refreshHome();
      if (window.License) License.refresh();
      if (window.Stamps) Stamps.refresh();
    }, epoch, 'プロフィール'));
    initial.push(watch(sdk.query(sdk.collection(db, 'publicProfiles'), sdk.orderBy('totalEarned', 'desc'), sdk.limit(100)), snap => {
      people = snap.docs.map(doc => doc.data()); notify();
    }, epoch, 'ランキング'));
    initial.push(watch(sdk.query(sdk.collection(db, 'users', user.uid, 'following'), sdk.limit(100)), async snap => {
      following = snap.docs.map(doc => doc.id); notify(); const requested = following.slice();
      try {
        const results = await Promise.all(requested.map(id => sdk.getDoc(sdk.doc(db, 'publicProfiles', id))));
        if (generation === epoch && JSON.stringify(requested) === JSON.stringify(following)) { friendProfiles = results.filter(s => s.exists()).map(s => s.data()); notify(); }
      } catch (error) { if (!initialHydration) throw error; }
    }, epoch, 'フレンド'));
    initial.push(watch(sdk.query(sdk.collection(db, 'users', user.uid, 'blocks'), sdk.limit(200)), snap => { blocked = snap.docs.map(doc => doc.id); notify(); }, epoch, 'ブロック'));
    initial.push(watch(sdk.query(sdk.collection(db, 'users', user.uid, 'reads'), sdk.limit(500)), snap => { reads = Object.fromEntries(snap.docs.map(doc => [doc.id, doc.data().at])); notify(); }, epoch, '既読'));
    initial.push(watch(sdk.query(sdk.collection(db, 'threads'), sdk.where('members', 'array-contains', user.uid), sdk.orderBy('updatedAt', 'desc'), sdk.limit(50)), snap => {
      threads = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); notify();
    }, epoch, 'メッセージ'));
    await Promise.all(initial);
    if (epoch !== generation || currentUser !== user) return;
    if (epoch === generation) status('ログインしました。プロフィールからランキング参加を選べます。');
    return 'ready';
  }
  async function session(user) {
    const epoch = ++generation;
    if (user) window.App?.showLoader('プロフィール・ポイント・交流データを読み込んでいます…');
    const previousUid = currentUser?.uid;
    clear(); currentUser = user;
    if (!user || (previousUid && previousUid !== user.uid)) { Store.clearRemote({ clearPersonal: true }); Settings.syncFields(); }
    identityVerified = false; emailSession = false;
    profileDirty = false; profileSaving = false; profileRevision = 0;
    profileStatus('プロフィールの変更は保存ボタンでクラウドに反映されます。');
    notify();
    if (!user) { finishBoot(null, 'signedOut'); window.App?.finishLoading(); return; }
    try {
      const token = await user.getIdTokenResult();
      if (epoch !== generation || currentUser !== user) return;
      identityVerified = user.emailVerified || token.claims.lineVerified === true;
      emailSession = !!user.email && user.emailVerified && token.signInProvider === 'password';
      renderAccount();
    } catch (error) { if (epoch === generation) { hydrationFailed = true; failure(error); finishBoot(error); window.App?.loadingError(); } return; }
    if (!identityVerified) {
      status('確認メールのリンクを開いた後、「メール確認を反映」を押してください。');
      finishBoot(null, 'action'); window.App?.finishLoading('action'); return;
    }
    try {
      const outcome = await connectAccount(epoch);
      if (epoch !== generation) return;
      finishBoot(null, outcome);
      window.App?.finishLoading(outcome);
    } catch (error) {
      if (epoch !== generation) return;
      hydrationFailed = true;
      failure(error); finishBoot(error); window.App?.loadingError();
    }
  }
  function renderAccount() {
    document.getElementById('authLaunchNotice').textContent = `${config.enabled ? '現在は試験公開中です。' : '現在は公開準備中です。'}利用条件・データ保持期間・問い合わせ窓口は正式公開前に確定します。`;
    const signed = !!currentUser;
    const verified = signed && identityVerified;
    const registering = authMode === 'register';
    if (signed) document.getElementById('authExistingNotice').hidden = true;
    document.getElementById('authFields').hidden = signed;
    document.getElementById('authModeTabs').hidden = signed;
    document.getElementById('authRegistrationFields').hidden = !registering;
    document.getElementById('authPasswordConfirm').required = registering && !signed;
    document.getElementById('authNicknameField').hidden = !registering;
    document.getElementById('authPasswordGuidance').hidden = !registering;
    document.getElementById('authLoginHelp').hidden = registering;
    document.getElementById('authLoginBtn').hidden = registering;
    document.getElementById('authRegisterBtn').hidden = !registering;
    document.getElementById('authResetBtn').hidden = registering;
    document.getElementById('authConsent').hidden = signed ? !!account : !registering;
    document.getElementById('authSessionActions').hidden = !signed;
    document.getElementById('authVerifyBtn').hidden = !signed || verified;
    document.getElementById('authResendBtn').hidden = !signed || verified;
    document.getElementById('authActivateBtn').hidden = !verified || !!account;
    document.getElementById('authLineBtn').hidden = !config.liffId || signed;
    const lineLinkArea = document.getElementById('authLineLinkArea');
    const canLinkLine = !!config.liffId && !!account && emailSession;
    lineLinkArea.hidden = !canLinkLine;
    document.getElementById('authLineLinkStatus').textContent = account?.lineHash ? 'LINEアカウントを連携済みです。' : 'LINEアカウントは未連携です。';
    document.getElementById('authLineLinkConsentLabel').hidden = !!account?.lineHash;
    document.getElementById('authLineLinkBtn').hidden = !!account?.lineHash;
    document.getElementById('authIdentity').textContent = signed ? (currentUser.email || 'LINEアカウント') : 'メールアドレスでログイン';
    document.getElementById('accountSummary').textContent = account ? 'ログイン中・クラウド接続済み' : signed ? 'メール確認・利用同意が必要です' : config.enabled ? '未ログイン' : 'ログインは準備中（Firebase未接続）';
    document.getElementById('accountManageBtn').textContent = signed ? 'アカウント管理' : 'ログイン・新規登録';
    document.getElementById('cloudProfileControls').hidden = !account;
    document.getElementById('cloudTermsLinks').hidden = !config.enabled;
    document.querySelectorAll('#authFields button, #authModeTabs button, #authLineBtn').forEach(node => { node.disabled = busy || !sdk; });
    document.querySelectorAll('#authSessionActions button').forEach(node => { node.disabled = busy; });
    const profile = account?.profile;
    const saveButton = document.getElementById('cloudSaveProfile');
    saveButton.disabled = profileSaving;
    saveButton.textContent = profileSaving ? '保存中…' : 'プロフィールと公開設定を保存';
    if (profile && !profileDirty && document.activeElement?.closest('#cloudProfileControls') == null) {
      document.getElementById('cloudRankingConsent').checked = !!profile.publicRanking;
      document.getElementById('cloudDmConsent').checked = !!profile.dmEnabled;
    }
  }
  async function saveProfile() {
    if (profileSaving) return;
    if (!account || !currentUser) return profileStatus('ログインしてから保存してください。', 'error');
    const local = Store.getProfile();
    const profile = {
      name: document.getElementById('settingsName').value.trim().slice(0, 12) || 'ゲスト',
      bio: document.getElementById('settingsBio').value.slice(0, 80),
      region: document.getElementById('settingsRegion').value.slice(0, 24),
      birthday: document.getElementById('settingsBirthday').value,
      favoriteIsland: local.favoriteIsland,
      avatarFrame: local.avatarFrame,
      avatarPattern: local.avatarPattern,
      publicRanking: document.getElementById('cloudRankingConsent').checked,
      dmEnabled: document.getElementById('cloudDmConsent').checked
    };
    clearBirthdayError();
    if (profile.dmEnabled && !profile.publicRanking) {
      profileStatus('DMにはランキング公開への同意が必要です。上のチェックを入れてください。', 'error');
      document.getElementById('cloudRankingConsent').focus();
      return;
    }
    if (profile.dmEnabled && !adultBirthday(profile.birthday)) {
      const message = 'DMには18歳以上の誕生日登録が必要です。';
      profileStatus(`${message}下の「基本情報」に誕生日を入力してください。`, 'error');
      const error = document.getElementById('settingsBirthdayError');
      error.textContent = message; error.hidden = false;
      document.getElementById('settingsBirthday').setAttribute('aria-invalid', 'true');
      document.getElementById('settingsBirthday').focus();
      return;
    }
    if (Object.keys(profile).every(key => profile[key] === account.profile[key])) {
      profileDirty = false;
      profileStatus('変更はありません。', 'saved');
      return;
    }
    const epoch = generation, userId = currentUser.uid, sentRevision = profileRevision;
    profileSaving = true; renderAccount();
    profileStatus('クラウドに保存しています…');
    try {
      const result = await call('updateProfile', { profile });
      if (generation !== epoch || currentUser?.uid !== userId) return;
      if (!result?.profile) throw new Error('missing-profile-response');
      account = { ...account, profile: result.profile };
      if (profileRevision === sentRevision) {
        Store.state.name = result.profile.name;
        Object.assign(Store.state.profile, result.profile);
        Store.commit(); Settings.syncFields();
        profileDirty = false;
        profileStatus('クラウドに保存しました。', 'saved');
        UI.toast('プロフィールを保存しました。', 'good');
      } else {
        profileStatus('前の内容を保存しました。追加の変更は未保存です。', 'dirty');
      }
    } catch (error) {
      profileStatus(`保存できませんでした。${errorMessage(error)}${error?.code ? `（${error.code}）` : ''}`, 'error');
    } finally {
      profileSaving = false; renderAccount();
    }
  }
  async function action(fn) {
    if (busy) return;
    busy = true; renderAccount();
    let duplicate = false;
    try { await fn(); } catch (error) {
      duplicate = authMode === 'register' && error?.code === 'auth/email-already-in-use';
      if (!duplicate) failure(error);
    } finally {
      busy = false;
      if (duplicate && !currentUser) {
        setAuthMode('login');
        document.getElementById('authExistingNotice').hidden = false;
        status('ログイン画面に切り替えました。登録時のパスワードを入力してください。忘れた場合は「パスワードを再設定」を押してください。');
        document.getElementById('authPassword').focus();
      }
      renderAccount();
    }
  }
  function open() { UI.openModal('authModal'); document.getElementById('authEmail').focus(); }
  async function init() {
    document.getElementById('authEmail').addEventListener('input', () => {
      clearFieldError('authEmail'); document.getElementById('authExistingNotice').hidden = true;
    });
    document.getElementById('authPassword').addEventListener('input', () => { clearFieldError('authPassword'); updatePasswordCount(); });
    document.getElementById('authPasswordConfirm').addEventListener('input', () => clearFieldError('authPasswordConfirm'));
    document.getElementById('authLoginTab').addEventListener('click', () => setAuthMode('login'));
    document.getElementById('authRegisterTab').addEventListener('click', () => setAuthMode('register'));
    document.getElementById('authModeTabs').addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); setAuthMode(event.key === 'Home' ? 'login' : event.key === 'End' ? 'register' : authMode === 'login' ? 'register' : 'login');
      document.getElementById(authMode === 'login' ? 'authLoginTab' : 'authRegisterTab').focus();
    });
    updatePasswordCount();
    document.getElementById('authModal').addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const items = Array.from(document.querySelectorAll('#authModal a[href], #authModal button:not(:disabled), #authModal input:not(:disabled)')).filter(item => item.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
    document.querySelectorAll('[data-auth-open]').forEach(button => button.addEventListener('click', open));
    document.getElementById('authForm').addEventListener('submit', event => {
      event.preventDefault(); return action(async () => {
        const registering = authMode === 'register';
        if (!validateEmail() || !validatePassword(registering)) return;
        if (registering && !document.getElementById('authTerms').checked) return status('利用条件への同意が必要です。', true);
        await ready;
        const email = document.getElementById('authEmail').value, password = document.getElementById('authPassword').value;
        status(registering ? 'アカウントを作成しています。' : 'ログインしています。');
        const credential = await authenticate(registering, email, password);
        clearPasswords();
        if (registering) await sendVerification(credential.user, true);
      });
    });
    document.getElementById('authResetBtn').addEventListener('click', () => action(async () => {
      if (!validateEmail()) return;
      const email = document.getElementById('authEmail');
      try { await sdk.sendPasswordResetEmail(auth, email.value.trim()); } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error;
      }
      status('該当するアカウントがある場合、パスワード再設定メールを送信しました。');
    }));
    document.getElementById('authResendBtn').addEventListener('click', () => action(async () => {
      if (currentUser && !currentUser.emailVerified) await sendVerification(currentUser);
    }));
    document.getElementById('authVerifyBtn').addEventListener('click', () => action(async () => { await sdk.reload(currentUser); await session(auth.currentUser); }));
    document.getElementById('authActivateBtn').addEventListener('click', () => action(() => connectAccount(generation)));
    document.getElementById('authLogoutBtn').addEventListener('click', () => action(async () => { await sdk.signOut(auth); status('ログアウトしました。'); }));
    document.getElementById('authDeleteBtn').addEventListener('click', () => action(async () => {
      if (!confirm('アカウントとクラウドの学習記録・DMを削除しますか？元には戻せません。続行には直近5分以内のログインが必要です。')) return;
      await call('deleteAccount'); await sdk.signOut(auth); status('アカウントを削除しました。');
    }));
    document.getElementById('cloudSaveProfile').addEventListener('click', saveProfile);
    ['cloudRankingConsent', 'cloudDmConsent'].forEach(id => {
      document.getElementById(id).addEventListener('change', markProfileDirty);
    });
    document.getElementById('settingsBirthday').addEventListener('change', clearBirthdayError);
    document.getElementById('authLineBtn').addEventListener('click', () => action(lineLogin));
    document.getElementById('authLineLinkBtn').addEventListener('click', () => action(async () => {
      if (!document.getElementById('authLineLinkConsent').checked) {
        status('LINE連携の内容を確認し、同意してください。', true); return;
      }
      await lineLogin('link');
    }));
    renderAccount();
    if (!window.HOPPO_CLOUD_CONFIG) { status('設定を取得できませんでした。接続を確認して再読み込みしてください。', true); throw new Error('クラウド設定を取得できませんでした。'); }
    if (!config.enabled) { status('現在はプレビューです。アカウント作成・利用者間通信はまだ有効ではありません。'); return; }
    if ((config.emulator && !['localhost', '127.0.0.1'].includes(location.hostname)) || !config.firebase?.apiKey || !config.firebase?.projectId || !config.firebase?.appId || (!config.emulator && !config.appCheckSiteKey)) {
      status('FirebaseまたはApp Checkの設定が未完了です。', true); throw new Error('クラウド設定が未完了です。');
    }
    try {
      sdk = await import('./vendor/firebase.js?v=55');
      const app = sdk.initializeApp(config.firebase);
      auth = sdk.getAuth(app); db = sdk.getFirestore(app); functions = sdk.getFunctions(app, config.region || 'asia-northeast1');
      auth.languageCode = 'ja';
      if (config.emulator && ['localhost', '127.0.0.1'].includes(location.hostname)) {
        sdk.connectAuthEmulator(auth, 'http://127.0.0.1:9099'); sdk.connectFirestoreEmulator(db, '127.0.0.1', 8080); sdk.connectFunctionsEmulator(functions, '127.0.0.1', 5001);
      } else {
        status('安全な接続を確認しています。');
        const appCheck = sdk.initializeAppCheck(app, { provider: new sdk.ReCaptchaEnterpriseProvider(config.appCheckSiteKey), isTokenAutoRefreshEnabled: true });
        await sdk.getAppCheckToken(appCheck);
        document.getElementById('authModal').dataset.appCheck = 'verified';
      }
      // getAuth selects IndexedDB, local or session storage according to browser availability.
      sdk.onAuthStateChanged(auth, session, error => {
        hydrationFailed = true;
        failure(error); finishBoot(error); window.App?.loadingError();
      });
      renderAccount(); status('ログイン、または新規登録を選んでください。');
    } catch (error) {
      sdk = null;
      status(error?.code?.startsWith('appCheck/') ? '安全な接続を確認できません。通信環境を確認して再読み込みしてください。' : errorMessage(error), true);
      renderAccount();
      throw error;
    }
  }
  let liffPromise;
  async function lineLogin(requestedIntent = 'login') {
    if (!config.liffId) return;
    await ready;
    if (typeof auth?.authStateReady === 'function') await auth.authStateReady();
    const intent = sessionStorage.getItem('hoppo-line-intent') ||
      (new URLSearchParams(location.search).get('hoppoLineIntent') === 'link' ? 'link' : requestedIntent);
    if (intent === 'link') {
      const user = auth.currentUser;
      const token = user ? await user.getIdTokenResult() : null;
      if (!user?.email || !user.emailVerified || token?.signInProvider !== 'password') {
        throw new Error('line-link-needs-email-account');
      }
      const age = Date.now() - Date.parse(token.authTime);
      if (!Number.isFinite(age) || age > 300000 || age < -60000) {
        throw new Error('line-requires-recent-login');
      }
    }
    if (!liffPromise) liffPromise = import('./vendor/liff.js?v=55').then(module => module.default).catch(() => {
      liffPromise = null; throw new Error('line-sdk');
    });
    const liff = await liffPromise;
    await liff.init({ liffId: config.liffId });
    if (!liff.isLoggedIn()) {
      sessionStorage.setItem('hoppo-line-intent', intent);
      const redirect = new URL(location.origin + location.pathname);
      if (intent === 'link') redirect.searchParams.set('hoppoLineIntent', 'link');
      liff.login({ redirectUri: redirect.href }); return;
    }
    const idToken = liff.getIDToken();
    if (!idToken) throw new Error('line-openid-scope');
    if (intent === 'link') {
      await call('linkLineAccount', { idToken, consent: true });
      status('LINEアカウントを連携しました。今後はどちらからも同じ学習記録を利用できます。');
    } else {
      const result = await call('exchangeLineToken', { idToken });
      await sdk.signInWithCustomToken(auth, result.token);
    }
    sessionStorage.removeItem('hoppo-line-intent');
    if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  }
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  window.Cloud = {
    init() {
      if (config.enabled) Store.clearRemote();
      return init().then(() => {
        resolveReady();
        if (sdk && config.liffId && (sessionStorage.getItem('hoppo-line-intent') || new URLSearchParams(location.search).has('liff.state') || new URLSearchParams(location.search).has('hoppoLineIntent'))) action(lineLogin);
        return config.enabled ? boot : 'preview';
      }, error => { resolveReady(); throw error; });
    },
    open, call, errorMessage, markProfileDirty,
    get enabled() { return config.enabled === true; },
    get user() { return currentUser; }, get account() { return account; },
    get people() { return people; }, get following() { return following; },
    get blocked() { return blocked; }, get threads() { return threads; },
    get friendProfiles() { return friendProfiles; },
    get reads() { return reads; },
    get hydrationPending() { return hydrationPending.slice(); },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    watchMessages(threadId, cb, onError) {
      if (!account) return () => {};
      const epoch = generation, user = currentUser;
      return sdk.onSnapshot(sdk.query(sdk.collection(db, 'threads', threadId, 'messages'), sdk.orderBy('at', 'desc'), sdk.limit(100)),
        snap => {
          if (epoch === generation && user === currentUser && account) cb(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse());
        }, error => { if (epoch === generation && user === currentUser) { cb([]); onError?.(error); } });
    }
  };
})();
