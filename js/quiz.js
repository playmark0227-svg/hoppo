/* ============================================================
   Quiz — list, play, scoring
   ============================================================ */
(function() {
  const POINTS_PER_CORRECT = 10;
  const PERFECT_BONUS = 50;

  let current = null;   // { quiz, index, correctCount }

  function renderList() {
    const list = document.getElementById('quizList');
    if (!list) return;
    const s = Store.get();
    const levelOrder = ['入門', '初級', '中級', '上級', '超難問'];
    const sorted = [...window.QUIZZES].sort((a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level));
    list.innerHTML = sorted.map(q => {
      const res = s.quizResults[q.id];
      const cleared = res && res.bestScore === q.questions.length;
      const played = res && res.timesPlayed > 0;
      const iconStyle = q.image
        ? `style="background-image: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.75)), url('${q.image}'); background-size: cover; background-position: center;"`
        : '';
      const scoreBadge = played
        ? `<div class="quiz-item-score">ベスト ${res.bestScore} / ${q.questions.length}</div>`
        : '';
      return `
        <div class="quiz-item ${cleared ? 'cleared' : ''}" data-quiz="${q.id}">
          <div class="quiz-item-icon ${/^[\u4e00-\u9fff]{2}$/.test(q.icon) ? 'quiz-item-symbol' : ''}" ${iconStyle}><span>${q.icon}</span></div>
          <div class="quiz-item-meta">
            <div class="quiz-item-title">${q.title}</div>
            <div class="quiz-item-desc">${q.desc}<span class="quiz-item-count">全${q.questions.length}問</span></div>
            <span class="quiz-level" data-level="${q.level}">${q.level}</span>
            ${scoreBadge}
          </div>
          <div class="quiz-item-arrow">›</div>
        </div>
      `;
    }).join('');
    list.querySelectorAll('.quiz-item').forEach(el => {
      el.addEventListener('click', () => start(el.dataset.quiz));
    });
  }

  async function start(quizId) {
    let quiz = window.QUIZZES.find(q => q.id === quizId);
    if (!quiz) return;
    if (window.Cloud?.enabled && !Cloud.account) return Cloud.open();
    const run = { quiz, index: 0, correctCount: 0, answers: [], earned: 0 };
    current = run;
    if (window.Cloud?.enabled) {
      try {
        const session = await Cloud.call('beginQuiz', { quizId });
        if (current !== run) return;
        quiz = { ...quiz, questions: session.questions }; run.quiz = quiz; run.sessionId = session.sessionId;
      } catch (error) { if (current === run) current = null; UI.toast(Cloud.errorMessage(error), 'bad'); return; }
    }
    document.getElementById('quizList').hidden = true;
    document.getElementById('quizResult').hidden = true;
    document.getElementById('quizPlay').hidden = false;
    document.body.classList.add('quiz-in-progress');

    // Populate banner with quiz-specific imagery
    const bannerBg = document.getElementById('quizPlayBannerBg');
    const icon = document.getElementById('quizPlayIcon');
    const title = document.getElementById('quizPlayTitle');
    if (bannerBg) bannerBg.style.backgroundImage = quiz.image ? `url('${quiz.image}')` : '';
    if (icon) {
      icon.textContent = quiz.icon || '';
      icon.classList.toggle('quiz-play-banner-symbol', /^[\u4e00-\u9fff]{2}$/.test(quiz.icon));
    }
    if (title) title.textContent = quiz.title;

    // Reset star track
    renderProgressStars();
    renderQuestion();
  }

  function renderProgressStars() {
    const { quiz, index } = current;
    const stars = document.getElementById('quizProgStars');
    if (!stars) return;
    const total = quiz.questions.length;
    stars.dataset.total = total;
    const dots = Array.from({ length: total }, (_, i) => {
      if (i < index) return '<span class="quiz-dot done"></span>';
      if (i === index) return '<span class="quiz-dot current"></span>';
      return '<span class="quiz-dot"></span>';
    }).join('');
    stars.innerHTML = dots;
  }

  function renderQuestion() {
    const { quiz, index } = current;
    const q = quiz.questions[index];

    document.getElementById('quizProgText').textContent = `${index + 1} / ${quiz.questions.length}`;
    const pct = ((index) / quiz.questions.length) * 100;
    document.getElementById('quizProgFill').style.width = pct + '%';
    renderProgressStars();

    const cheer = document.getElementById('quizMascotCheer');
    if (cheer) {
      const cheers = [
        '一緒に頑張ろう！',
        'じっくり考えてみて',
        'あなたなら出来る！',
        '繰り返しで覚えよう'
      ];
      cheer.textContent = cheers[index % cheers.length];
    }

    const questionEl = document.getElementById('quizQuestion');
    questionEl.textContent = q.q;

    // Gently flash the question card on new question
    const card = document.querySelector('.quiz-card');
    if (card) {
      card.classList.remove('q-enter');
      void card.offsetWidth;
      card.classList.add('q-enter');
    }

    const feedback = document.getElementById('quizFeedback');
    feedback.hidden = true;
    feedback.className = 'quiz-feedback';
    const nextBtn = document.getElementById('quizNextBtn');
    nextBtn.hidden = true;

    const choicesEl = document.getElementById('quizChoices');
    choicesEl.innerHTML = q.choices.map((c, i) => `
      <button class="quiz-choice" data-i="${i}">
        <span class="quiz-choice-letter">${String.fromCharCode(65 + i)}</span>
        <span class="quiz-choice-text">${c}</span>
      </button>
    `).join('');
    choicesEl.querySelectorAll('.quiz-choice').forEach(btn => {
      btn.addEventListener('click', () => answer(parseInt(btn.dataset.i, 10)));
    });
  }

  async function answer(choiceIndex) {
    if (!current || current.pending) return;
    const run = current;
    const { quiz, index } = current;
    const q = quiz.questions[index];
    const choicesEl = document.getElementById('quizChoices');
    const buttons = choicesEl.querySelectorAll('.quiz-choice');
    buttons.forEach(b => b.disabled = true);

    let correct = choiceIndex === q.answer;
    if (window.Cloud?.enabled) {
      run.pending = true;
      try {
        const result = await Cloud.call('answerQuiz', { sessionId: run.sessionId, index, choice: choiceIndex });
        if (current !== run) return;
        correct = result.correct; q.answer = result.answer; q.explain = result.explain; q.source = result.source;
        if (result.done) run.earned = result.earned;
      } catch (error) {
        if (current === run) buttons.forEach(b => b.disabled = false);
        UI.toast(Cloud.errorMessage(error), 'bad'); return;
      } finally { run.pending = false; }
    }
    buttons[choiceIndex].classList.add(correct ? 'correct' : 'wrong');
    if (!correct) buttons[q.answer].classList.add('correct');

    const fb = document.getElementById('quizFeedback');
    fb.replaceChildren();
    const status = document.createElement('strong');
    status.textContent = correct ? '正解' : '不正解';
    fb.append(status);
    if (q.explain) {
      const detail = document.createElement('p');
      detail.textContent = q.explain;
      fb.append(detail);
    }
    const source = window.QUIZ_SOURCES?.[q.source];
    if (source) {
      const link = document.createElement('a');
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'quiz-source-link';
      link.textContent = `出典：${source.label} ↗`;
      fb.append(link);
    }
    fb.className = 'quiz-feedback ' + (correct ? 'good' : 'bad');
    fb.hidden = false;

    // Mascot cheers briefly reflect the result
    const cheer = document.getElementById('quizMascotCheer');
    if (cheer) {
      cheer.textContent = correct ? 'やったね！✨' : 'おしい！次にいこう';
      cheer.classList.remove('pop');
      void cheer.offsetWidth;
      cheer.classList.add('pop');
    }

    if (correct) current.correctCount++;

    const pct = ((index + 1) / quiz.questions.length) * 100;
    document.getElementById('quizProgFill').style.width = pct + '%';

    const nextBtn = document.getElementById('quizNextBtn');
    nextBtn.hidden = false;
    nextBtn.textContent = index + 1 < quiz.questions.length ? '次へ →' : '結果を見る';
  }

  function next() {
    if (current.index + 1 < current.quiz.questions.length) {
      current.index++;
      renderQuestion();
    } else {
      finish();
    }
  }

  function finish() {
    const { quiz, correctCount } = current;
    const total = quiz.questions.length;
    const perfect = correctCount === total;

    const earned = window.Cloud?.enabled ? current.earned : correctCount * POINTS_PER_CORRECT + (perfect ? PERFECT_BONUS : 0);
    Store.recordQuizResult(quiz.id, correctCount, total);
    if (earned > 0) {
      Store.addPoints(earned, { type: 'quiz', label: `クイズ：${quiz.title}` }, { silent: true });
    }

    document.getElementById('quizPlay').hidden = true;
    document.body.classList.remove('quiz-in-progress');
    document.getElementById('quizResult').hidden = false;
    document.getElementById('quizResultTitle').textContent = perfect ? '全問正解！🎉' : 'お疲れさま！';
    document.getElementById('quizResultScore').textContent = `${correctCount} / ${total} 問正解`;
    const bonusEl = document.getElementById('quizResultBonus');
    if (earned > 0) {
      bonusEl.textContent = window.Cloud?.enabled ? `+${earned} pt（ベスト成績の向上分）` : `+${earned} pt 獲得！${perfect ? '（全問正解ボーナス +' + PERFECT_BONUS + 'pt）' : ''}`;
    } else {
      bonusEl.textContent = window.Cloud?.enabled ? '今回は追加ポイントなし。同じ版のクイズは成績の向上分のみ加算されます。' : 'また挑戦してみてね';
    }

    UI.refreshHeader();
    UI.refreshHome();
    if (perfect) UI.confetti();
    if (earned > 0) UI.toast(`+${earned} pt !`, 'points');
  }

  function back() {
    current = null;
    document.body.classList.remove('quiz-in-progress');
    document.getElementById('quizPlay').hidden = true;
    document.getElementById('quizResult').hidden = true;
    document.getElementById('quizList').hidden = false;
    renderList();
  }

  function bind() {
    document.getElementById('quizNextBtn').addEventListener('click', next);
    document.getElementById('quizBackBtn').addEventListener('click', back);
    const exitBtn = document.getElementById('quizPlayExit');
    if (exitBtn) exitBtn.addEventListener('click', () => {
      if (!current) return back();
      if (confirm('クイズをやめて一覧に戻りますか？')) back();
    });
  }

  window.Quiz = { init() { bind(); renderList(); }, refresh: renderList, back };
})();
