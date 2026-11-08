(function () {
  var questions = [
    {
      text: 'At the end of a normal homeschool week, what feels hardest?',
      answers: [
        ['I know we did things, but I cannot tell you exactly what they were.', 'visibility'],
        ['I make a plan, but I cannot make it work in real life.', 'rhythm'],
        ['I keep wondering if what we are doing will be enough.', 'records'],
        ['I am carrying too many lists, notes, and systems in my head.', 'simplicity']
      ]
    },
    {
      text: 'When something unexpectedly changes the day, what tends to happen?',
      answers: [
        ['The learning still happens, but I lose track of it.', 'visibility'],
        ['I know what I meant to do, but I cannot get the plan to carry me through the day.', 'rhythm'],
        ['I start worrying that I will not have what I need later.', 'records'],
        ['I spend more energy reorganizing than being with my child.', 'simplicity']
      ]
    },
    {
      text: 'If someone asked what your child learned this month, how would that feel?',
      answers: [
        ['I would have to piece the month together from memory and my phone\'s photo album.', 'visibility'],
        ['I would have plans written down, but I would not know what actually carried us through the month.', 'rhythm'],
        ['My stomach would drop because I am not sure I saved enough to show for it.', 'records'],
        ['I would open five different places and still feel unsure.', 'simplicity']
      ]
    },
    {
      text: 'Which thought sounds most familiar right now?',
      answers: [
        ['I wish I could see the good we are doing.', 'visibility'],
        ['I can make a plan on paper, but I cannot make it stick when real life starts.', 'rhythm'],
        ['I do not want to panic when someone asks what we have done.', 'records'],
        ['I cannot keep being the system that holds everything together.', 'simplicity']
      ]
    },
    {
      text: 'What would feel like the biggest relief by Friday?',
      answers: [
        ['I want to look back and see what we actually did.', 'visibility'],
        ['I want a plan I can actually use—not another planner to keep up with.', 'rhythm'],
        ['I want to know I am not going to scramble later.', 'records'],
        ['I want one less thing to remember.', 'simplicity']
      ]
    },
    {
      text: 'What do you most want help with first?',
      answers: [
        ['I want to remember and see the learning that is already happening.', 'visibility'],
        ['I want our days to feel less like a reset every morning.', 'rhythm'],
        ['I want to feel less anxious about the records.', 'records'],
        ['I want one calm system that works with my brain, instead of carrying it all in my head.', 'simplicity']
      ]
    }
  ];

  var results = {
    visibility: {
      title: 'Make the learning easier to see.',
      lead: 'You are not failing to remember. A lot of real learning is happening in small moments that are easy to lose. grovio gives those moments one gentle place to land.',
      actionTitle: 'Save one moment today.',
      steps: [
        'Open grovio and choose your learner.',
        'Tap Add a moment.',
        'Add a photo or sentence, choose the subject, and save.'
      ],
      featureName: 'Learning moments',
      featureCopy: 'Save a photo or note with the subject and date. Grovio keeps it there.',
      cta: 'Get grovio — save one moment',
      guide: '/guide/what-counts-as-learning',
      guideText: 'Read: What counts as learning?',
      image: 'assets/optimized/feature-portfolio-720.jpg'
    },
    rhythm: {
      title: 'Find a rhythm that fits real life.',
      lead: 'You are not failing at planning. You can make a plan—the hard part is turning it into a day you can actually live. grovio lets you start with a rhythm instead of maintaining a perfect planner.',
      actionTitle: 'Pick three anchors for tomorrow.',
      steps: [
        'Open grovio and choose Rhythm or Schedule.',
        'Add three anchors for tomorrow.',
        'Leave the rest of the day open.'
      ],
      featureName: 'Rhythm & Schedule',
      featureCopy: 'Choose Rhythm or Schedule. grovio keeps the next step visible without asking you to maintain a paper planner.',
      cta: 'Get grovio — try a rhythm',
      guide: '/guide/how-do-i-create-a-daily-rhythm',
      guideText: 'Read: How do I create a daily rhythm?',
      image: 'assets/optimized/feature-planner-rhythm-720.jpg'
    },
    records: {
      title: 'Keep records as you go.',
      lead: 'You are not behind. You are trying to remember too much at once. Records feel lighter when they are built a little at a time.',
      actionTitle: "Mark today's attendance.",
      steps: [
        'Open grovio and choose your learner.',
        "Tap attendance for today.",
        'Save one learning moment before you close the app.'
      ],
      featureName: 'Attendance',
      featureCopy: 'Mark attendance and save moments as you go, so the record grows with the learning.',
      cta: 'Get grovio — keep records as you go',
      guide: '/guide/what-records-should-i-keep',
      guideText: 'Read: What records should I keep?',
      image: 'assets/optimized/feature-attendance-720.jpg'
    },
    simplicity: {
      title: 'Put the essentials in one place.',
      lead: 'You are not bad at systems. You are carrying too many things in too many places. grovio gives today\'s plan, attendance, and moments one calm home—you can start with one thing and leave the rest alone.',
      actionTitle: 'Start with one thing today.',
      steps: [
        'Open grovio and choose your learner.',
        'Add one thing for tomorrow.',
        'Save one moment from today. Stop there—you do not have to set up the rest.'
      ],
      featureName: 'Today',
      featureCopy: 'One calm place for today\'s plan, attendance, and moments. Start with one learner—nothing else is required first.',
      cta: 'Get grovio — start with one thing',
      guide: '/guide/how-do-i-stay-consistent-without-burnout',
      guideText: 'Read: How do I stay consistent without burnout?',
      image: 'assets/optimized/feature-home-toast-720.jpg'
    }
  };

  var screens = {
    intro: document.querySelector('[data-screen="intro"]'),
    quiz: document.querySelector('[data-screen="quiz"]'),
    email: document.querySelector('[data-screen="email"]'),
    result: document.querySelector('[data-screen="result"]')
  };
  var form = document.getElementById('checkin-form');
  var emailForm = document.querySelector('[data-email-form]');
  var emailInput = document.getElementById('checkin-email');
  var emailError = document.querySelector('[data-email-error]');
  var title = document.querySelector('[data-question-title]');
  var answerList = document.querySelector('[data-answer-list]');
  var progressLabel = document.querySelector('[data-progress-label]');
  var progressBar = document.querySelector('[data-progress-bar]');
  var error = document.querySelector('[data-answer-error]');
  var state = { question: 0, answers: [] };
  var context = getContext();
  var viewTracked = false;

  function getContext() {
    var allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'video', 'creator'];
    var params = new URLSearchParams(window.location.search);
    var saved = {};
    allowed.forEach(function (key) {
      var value = params.get(key);
      if (value) saved[key] = value;
    });
    saved.session_id = getSessionId();
    return saved;
  }

  function getSessionId() {
    var key = 'grovio_checkin_session';
    try {
      var existing = sessionStorage.getItem(key);
      if (existing) return existing;
      var id = window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'checkin-' + Date.now() + '-' + Math.random().toString(16).slice(2);
      sessionStorage.setItem(key, id);
      return id;
    } catch (ignore) {
      return 'checkin-' + Date.now();
    }
  }

  function track(name, extra) {
    var payload = Object.assign({}, context, extra || {});
    delete payload.session_id;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...payload });
    if (typeof window.fbq === 'function') window.fbq('trackCustom', name, payload);
  }

  function trackStandard(name, extra) {
    var payload = Object.assign({}, context, extra || {});
    delete payload.session_id;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...payload });
    if (typeof window.fbq === 'function') window.fbq('track', name, payload);
  }

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) { screens[key].hidden = key !== name; });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderQuestion() {
    var current = questions[state.question];
    title.textContent = current.text;
    progressLabel.textContent = 'Question ' + (state.question + 1) + ' of ' + questions.length;
    progressBar.style.width = (((state.question + 1) / questions.length) * 100) + '%';
    answerList.innerHTML = current.answers.map(function (answer, index) {
      var id = 'answer-' + state.question + '-' + index;
      var checked = state.answers[state.question] === answer[1] ? ' checked' : '';
      return '<div class="answer-option"><input type="radio" id="' + id + '" name="answer" value="' + answer[1] + '"' + checked + '><label for="' + id + '">' + answer[0] + '</label></div>';
    }).join('');
    error.hidden = true;
  }

  function calculateResult() {
    var totals = { visibility: 0, rhythm: 0, records: 0, simplicity: 0 };
    state.answers.forEach(function (key, index) {
      totals[key] += index === questions.length - 1 ? 2 : 1;
    });
    var highest = Math.max.apply(null, Object.keys(totals).map(function (key) { return totals[key]; }));
    var candidates = Object.keys(totals).filter(function (key) { return totals[key] === highest; });
    if (candidates.length > 1 && state.answers[3] && candidates.indexOf(state.answers[3]) !== -1) return state.answers[3];
    return candidates[0] || 'simplicity';
  }

  function renderResult() {
    var key = calculateResult();
    var result = results[key];
    document.querySelector('[data-result-title]').textContent = result.title;
    document.querySelector('[data-result-lead]').textContent = result.lead;
    document.querySelector('[data-result-action-title]').textContent = result.actionTitle;
    document.querySelector('[data-result-steps]').innerHTML = result.steps.map(function (step) { return '<li>' + step + '</li>'; }).join('');
    document.querySelector('[data-result-feature-name]').textContent = result.featureName;
    document.querySelector('[data-result-feature-copy]').textContent = result.featureCopy;
    var image = document.querySelector('[data-result-image]');
    image.src = result.image;
    image.alt = 'A preview of ' + result.featureName + ' in grovio';
    var cta = document.querySelector('[data-result-cta]');
    var getPath = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) ? '/get.html' : '/get';
    var destination = new URL(getPath, window.location.origin);
    Object.keys(context).forEach(function (field) { if (field !== 'session_id') destination.searchParams.set(field, context[field]); });
    destination.searchParams.set('result', key);
    cta.href = destination.pathname + destination.search;
    cta.textContent = result.cta + ' →';
    var guide = document.querySelector('[data-guide-link]');
    guide.href = result.guide;
    guide.innerHTML = result.guideText + ' <span aria-hidden="true">&rarr;</span>';
    try { sessionStorage.setItem('grovio_checkin_result', JSON.stringify({ result: key, completed_at: new Date().toISOString() })); } catch (ignore) {}
    track('checkin_complete', { result: key });
    track('checkin_result_view', { result: key });
    showScreen('result');
  }

  function showEmailGate() {
    emailInput.value = '';
    emailError.hidden = true;
    showScreen('email');
    window.setTimeout(function () { emailInput.focus(); }, 120);
    track('checkin_questions_complete');
  }

  document.querySelector('[data-action="start"]').addEventListener('click', function () {
    state = { question: 0, answers: [] };
    renderQuestion();
    showScreen('quiz');
    trackStandard('ViewContent', { content_name: 'Grovio Homeschool Check-In', content_type: 'quiz' });
    track('checkin_start');
  });
  document.querySelector('[data-action="back"]').addEventListener('click', function () {
    if (state.question === 0) showScreen('intro');
    else { state.question -= 1; renderQuestion(); }
  });
  document.querySelector('[data-action="restart"]').addEventListener('click', function () {
    state = { question: 0, answers: [] };
    showScreen('intro');
  });
  document.querySelector('[data-action="skip-email"]').addEventListener('click', function () {
    track('checkin_email_skipped', { result: calculateResult() });
    renderResult();
  });
  emailForm.addEventListener('submit', function (event) {
    if (!emailForm.checkValidity()) return;
    var result = calculateResult();
    trackStandard('Lead', {
      content_name: 'Grovio Homeschool Check-In',
      content_category: 'quiz',
      result: result
    });
    track('checkin_email_submit', { result: result });
    window.setTimeout(renderResult, 80);
  });
  answerList.addEventListener('change', function (event) {
    var selected = event.target;
    if (!selected || selected.name !== 'answer') return;
    state.answers[state.question] = selected.value;
    window.setTimeout(function () {
      if (state.question === questions.length - 1) showEmailGate();
      else { state.question += 1; renderQuestion(); }
    }, 180);
  });
  document.querySelector('[data-result-cta]').addEventListener('click', function () {
    var result = calculateResult();
    track('checkin_app_click', { result: result, platform: 'store-router' });
  });
  document.querySelector('[data-guide-link]').addEventListener('click', function () {
    track('checkin_guide_click', { result: calculateResult() });
  });

  if (!viewTracked) { viewTracked = true; track('checkin_view'); }
}());
