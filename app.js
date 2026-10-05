/*
 * Gist tutor
 * Terms, definitions, and examples come only from data/lessons.json.
 * This file does not hard-code ontology classes or properties.
 *
 * Course schema:
 * {
 *   "title": "Gist",
 *   "sourceNote": "string",
 *   "lessons": [
 *     {
 *       "id": "day-01",
 *       "title": "short title",
 *       "blurb": "one sentence",
 *       "exercises": [
 *         {"type":"teach","term":"gist:Person","kind":"class|property","line":"one-sentence definition","example":"a concrete sentence",
 *          "exampleHalloween":"...","exampleChristmas":"..."},
 *         {"type":"choice","prompt":"...","options":["a","b","c","d"],"answer":0,"why":"...",
 *          "promptHalloween":"...","optionsHalloween":["..."],"whyHalloween":"...",
 *          "promptChristmas":"...","optionsChristmas":["..."],"whyChristmas":"..."},
 *         {"type":"truefalse","prompt":"...","answer":true,"why":"..."},
 *         {"type":"match","prompt":"Match each name to its meaning","pairs":[{"left":"gist:Person","right":"a human being"}]},
 *         {"type":"typein","prompt":"...","accept":["Person","gist:Person"],"why":"..."}
 *       ]
 *     }
 *   ]
 * }
 *
 * kind is "class" or "property". choice.answer is the index of the right option.
 * truefalse.answer is a boolean. typein.accept is matched case-insensitively, after trimming.
 * Progress is stored in localStorage under gist-tutor-progress-v1.
 * Advent chocolates use gist-tutor-advent-v1 (migrates from completed lessons).
 * Optional lesson fields: adventBeat (Nativity/waiting one-liner), seasonal *Christmas examples.
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'gist-tutor-progress-v1';
  var ADVENT_KEY = 'gist-tutor-advent-v1';
  var THEME_COLOR_CHRISTMAS = '#0b2e1f';

  var ui = {
    status: 'loading',
    course: { title: 'Gist', sourceNote: '', lessons: [] },
    view: 'home',
    lessonIndex: 0,
    step: 0,
    firstTry: 0,
    scored: 0,
    phase: 'ask',
    problem: '',
    result: null,
    picked: null,
    typed: '',
    hint: '',
    hintBad: false,
    pickLeft: null,
    locked: new Set(),
    rightsOrder: [],
    matchClean: true,
    matchScored: false,
    flash: null,
    flashToken: 0,
    pendingFocus: null,
    restoreSelector: '',
    pendingAnnounce: ''
  };

  var lastContinue = 0;
  var announceToken = 0;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fold(value) {
    return String(value == null ? '' : value).trim().toLowerCase();
  }

  function localISODate(date) {
    var d = date || new Date();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + month + '-' + day;
  }

  function addDays(iso, n) {
    var parts = iso.split('-').map(Number);
    var dt = new Date(parts[0], parts[1] - 1, parts[2]);
    dt.setDate(dt.getDate() + n);
    return localISODate(dt);
  }

  function streakCount(dates) {
    var today = localISODate();
    var set = new Set();
    (dates || []).forEach(function (d) {
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today) set.add(d);
    });
    var cursor = set.has(today) ? today : addDays(today, -1);
    if (!set.has(cursor)) return 0;
    var n = 0;
    while (set.has(cursor)) {
      n += 1;
      cursor = addDays(cursor, -1);
      if (n > 5000) break;
    }
    return n;
  }


  function applyTheme() {
    var root = document.documentElement;
    root.classList.remove('halloween');
    root.classList.add('christmas');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLOR_CHRISTMAS);
    return 'christmas';
  }

  function seasonalField(ex, base) {
    var key = base + 'Christmas';
    if (ex && typeof ex[key] === 'string' && ex[key].trim()) return ex[key].trim();
    if (ex && typeof ex[base] === 'string' && ex[base].trim()) return ex[base].trim();
    return '';
  }

  function seasonalOptions(ex) {
    if (ex && Array.isArray(ex.optionsChristmas) && ex.optionsChristmas.length) return ex.optionsChristmas;
    return ex && Array.isArray(ex.options) ? ex.options : [];
  }

  function lessonId(lesson, index) {
    if (lesson && typeof lesson.id === 'string' && lesson.id.trim()) return lesson.id.trim();
    return 'lesson-' + String(index + 1);
  }

  function isLessonDone(progress, lesson, index) {
    var id = lessonId(lesson, index);
    var value = progress.completed && progress.completed[id];
    return typeof value === 'string' && value.length > 0;
  }

  function isUnlocked(progress, lessons, index) {
    var i;
    for (i = 0; i < index; i += 1) {
      if (!isLessonDone(progress, lessons[i], i)) return false;
    }
    return true;
  }

  function loadProgress() {
    var empty = { completed: {}, dates: [] };
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return empty;
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || Array.isArray(data)) return empty;
      var completed = data.completed && typeof data.completed === 'object' && !Array.isArray(data.completed)
        ? data.completed
        : {};
      var dates = Array.isArray(data.dates) ? data.dates.filter(function (d) { return typeof d === 'string'; }) : [];
      Object.keys(completed).forEach(function (id) {
        var value = completed[id];
        if (typeof value === 'string' && dates.indexOf(value) === -1) dates.push(value);
      });
      return { completed: completed, dates: dates };
    } catch (err) {
      return empty;
    }
  }

  function markComplete(id) {
    var progress = loadProgress();
    var today = localISODate();
    progress.completed[id] = today;
    if (progress.dates.indexOf(today) === -1) progress.dates.push(today);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  function loadAdvent() {
    var empty = { chocolates: {}, awarded: [] };
    try {
      var raw = localStorage.getItem(ADVENT_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          var chocolates = data.chocolates && typeof data.chocolates === 'object' && !Array.isArray(data.chocolates)
            ? data.chocolates
            : {};
          var awarded = Array.isArray(data.awarded) ? data.awarded.filter(function (id) { return typeof id === 'string'; }) : [];
          Object.keys(chocolates).forEach(function (id) {
            if (awarded.indexOf(id) === -1) awarded.push(id);
          });
          return { chocolates: chocolates, awarded: awarded };
        }
      }
    } catch (err) {}
    // Migrate: each completed lesson becomes one chocolate.
    var progress = loadProgress();
    var chocolates = {};
    var awarded = [];
    Object.keys(progress.completed || {}).forEach(function (id) {
      chocolates[id] = progress.completed[id];
      awarded.push(id);
    });
    var migrated = { chocolates: chocolates, awarded: awarded };
    try { localStorage.setItem(ADVENT_KEY, JSON.stringify(migrated)); } catch (err) {}
    return migrated;
  }

  function saveAdvent(data) {
    try { localStorage.setItem(ADVENT_KEY, JSON.stringify(data)); } catch (err) {}
  }

  function chocolateCount() {
    return loadAdvent().awarded.length;
  }

  function awardChocolate(id) {
    var advent = loadAdvent();
    var fresh = !advent.chocolates[id];
    if (fresh) {
      advent.chocolates[id] = localISODate();
      if (advent.awarded.indexOf(id) === -1) advent.awarded.push(id);
      saveAdvent(advent);
    }
    return { fresh: fresh, total: advent.awarded.length };
  }

  function doorNumber(index) {
    return index + 1;
  }

  function snowMarkup() {
    return '<div class="snow" aria-hidden="true">' +
      '<div class="snow-layer snow-layer-a"></div>' +
      '<div class="snow-layer snow-layer-b"></div>' +
      '<div class="snow-layer snow-layer-c"></div>' +
      '</div>';
  }

  function chocolateIcon() {
    return '<span class="choco-icon" aria-hidden="true"></span>';
  }

  function shuffle(list) {
    var arr = list.slice();
    var i;
    for (i = arr.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function currentLesson() {
    var lessons = ui.course && ui.course.lessons;
    if (!lessons) return null;
    return lessons[ui.lessonIndex] || null;
  }

  function currentExercise() {
    var lesson = currentLesson();
    if (!lesson || !Array.isArray(lesson.exercises)) return null;
    return lesson.exercises[ui.step] || null;
  }

  function exerciseProblem(ex) {
    if (!ex || typeof ex !== 'object') return 'This card is missing.';
    if (ex.type === 'teach') {
      if (typeof ex.term !== 'string' || !ex.term.trim()) return 'This card has no term.';
      return '';
    }
    if (ex.type === 'choice') {
      var opts = seasonalOptions(ex);
      if (!Array.isArray(opts) || opts.length < 2) return 'This choice needs at least two options.';
      if (!Number.isInteger(ex.answer) || ex.answer < 0 || ex.answer >= opts.length) return 'This choice has no valid answer.';
      return '';
    }
    if (ex.type === 'truefalse') {
      if (typeof ex.answer !== 'boolean') return 'This true or false card has no valid answer.';
      return '';
    }
    if (ex.type === 'match') {
      if (!Array.isArray(ex.pairs) || ex.pairs.length < 1) return 'This match has no pairs.';
      var i;
      for (i = 0; i < ex.pairs.length; i += 1) {
        var pair = ex.pairs[i];
        if (!pair || pair.left == null || pair.right == null || String(pair.left).trim() === '' || String(pair.right).trim() === '') {
          return 'This match has an empty pair.';
        }
      }
      return '';
    }
    if (ex.type === 'typein') {
      if (!Array.isArray(ex.accept) || !ex.accept.some(function (item) { return String(item).trim(); })) {
        return 'This card has no accepted answers.';
      }
      return '';
    }
    return 'This card type is not supported.';
  }

  function kindLabel(kind) {
    var k = String(kind || '').trim().toLowerCase();
    if (k === 'class') return 'Class';
    if (k === 'property') return 'Property';
    if (!k) return 'Term';
    return String(kind).trim();
  }

  function promptText(ex, fallback) {
    var seasonal = seasonalField(ex, 'prompt');
    if (seasonal) return seasonal;
    return fallback;
  }

  function whyText(ex) {
    return seasonalField(ex, 'why');
  }

  function accepted(ex, value) {
    var got = fold(value);
    if (!got) return false;
    return ex.accept.some(function (item) { return fold(item) === got; });
  }

  function scoreSentence(first, scored) {
    if (!scored) return 'You read every card in this lesson.';
    var noun = scored === 1 ? 'question' : 'questions';
    var base = 'You got ' + first + ' of ' + scored + ' ' + noun + ' right first time.';
    if (first === scored) return base + ' A clean run.';
    return base;
  }

  function richText(text) {
    var str = String(text);
    var re = /https?:\/\/[^\s]+/g;
    var html = '';
    var last = 0;
    var match;
    while ((match = re.exec(str))) {
      html += esc(str.slice(last, match.index));
      var url = match[0];
      var trailing = '';
      while (/[).,]$/.test(url)) {
        trailing = url.slice(-1) + trailing;
        url = url.slice(0, -1);
      }
      html += '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + '</a>' + esc(trailing);
      last = match.index + match[0].length;
    }
    html += esc(str.slice(last));
    return html;
  }

  function iconBack() {
    return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function iconTick() {
    return '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><path d="M5 12.5l4.2 4.2L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function iconLock() {
    return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><rect x="6" y="11" width="12" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  }

  function continueButton(label) {
    return '<div class="card-actions"><button type="button" class="btn" data-action="continue" data-continue>' + esc(label || 'Continue') + '</button></div>';
  }

  function verdictBlock(title, why, extra) {
    var tone = ui.result === 'wrong' ? 'bad' : 'good';
    return '<div class="verdict ' + tone + '"><p class="verdict-title">' + esc(title) + '</p>' +
      (why ? '<p class="why">' + esc(why) + '</p>' : '') +
      (extra || '') + '</div>';
  }

  function optionMark(state) {
    if (state === 'correct') return '<span class="option-mark" aria-hidden="true">✓</span>';
    if (state === 'wrong') return '<span class="option-mark" aria-hidden="true">×</span>';
    return '';
  }

  function optionSr(state) {
    if (state === 'correct') return '<span class="visually-hidden"> Correct answer.</span>';
    if (state === 'wrong') return '<span class="visually-hidden"> Not the answer.</span>';
    return '';
  }

  function progressNumbers() {
    var lesson = currentLesson();
    var total = lesson && Array.isArray(lesson.exercises) ? lesson.exercises.length : 0;
    if (ui.view === 'done') return { total: total, done: total, pct: total ? 100 : 0, current: total };
    var current = total ? Math.min(ui.step + 1, total) : 0;
    var done = total ? Math.min(ui.step, total) : 0;
    var pct = total ? Math.round((done / total) * 100) : 0;
    return { total: total, done: done, pct: pct, current: current };
  }

  function lessonChrome(body) {
    var lesson = currentLesson();
    var nums = progressNumbers();
    var count = ui.view === 'done'
      ? 'Done'
      : (nums.total ? '<span class="visually-hidden">Exercise </span>' + nums.current + ' of ' + nums.total : '');
    var title = lesson && lesson.title ? String(lesson.title) : 'Lesson';
    var day = 'Day ' + doorNumber(ui.lessonIndex);
    var beat = lesson && typeof lesson.adventBeat === 'string' && lesson.adventBeat.trim()
      ? '<p class="advent-beat">' + esc(lesson.adventBeat.trim()) + '</p>'
      : '';
    var choco = '<div class="choco-pill" title="Chocolates collected">' + chocolateIcon() +
      '<span><b>' + chocolateCount() + '</b> / 24</span></div>';
    return snowMarkup() +
      '<header class="lesson-top">' +
      '<button type="button" class="back" data-action="home">' + iconBack() + '<span>Calendar</span></button>' +
      '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + nums.total + '" aria-valuenow="' + nums.done + '" aria-label="Lesson progress">' +
      '<div class="progress-fill" style="width:' + nums.pct + '%"></div></div>' +
      '<span class="count">' + count + '</span></header>' +
      '<div class="stage">' + choco +
      '<p class="lesson-kicker">' + esc(day) + ' · ' + esc(title) + '</p>' +
      beat + body + '</div>';
  }

  function renderHome() {
    var course = ui.course;
    var progress = loadProgress();
    var lessons = course.lessons || [];
    var doneCount = 0;
    var i;
    for (i = 0; i < lessons.length; i += 1) {
      if (isLessonDone(progress, lessons[i], i)) doneCount += 1;
    }
    var dates = progress.dates.slice();
    var streak = streakCount(dates);
    var chocolates = chocolateCount();

    var doors = lessons.map(function (lesson, index) {
      var unlocked = isUnlocked(progress, lessons, index);
      var done = isLessonDone(progress, lesson, index);
      var n = doorNumber(index);
      var state = !unlocked ? 'locked' : (done ? 'done' : 'open');
      var title = lesson && lesson.title ? String(lesson.title) : ('Day ' + n);
      var label = done ? 'Opened' : (unlocked ? 'Open day ' + n : 'Locked — finish day ' + (n - 1) + ' first');
      var tone = 'door-tone-' + ((index % 3) + 1);
      var hint = '<span class="door-hint"><span class="visually-hidden">Opens </span>Dec ' + n + '</span>';
      var badge = '<span class="door-badge" aria-hidden="true"><span class="door-num">' + n + '</span></span>';
      var choco = done ? '<span class="door-choco" aria-hidden="true" title="Chocolate earned"></span>' : '';
      var face =
        '<span class="door-face">' +
          badge +
          choco +
          '<span class="door-title">' + esc(title) + '</span>' +
          hint +
        '</span>';
      if (!unlocked) {
        return '<li class="door-cell">' +
          '<div class="advent-door locked ' + tone + '" aria-label="Day ' + n + ' locked. ' + esc(title) + '. Opens Dec ' + n + '.">' +
          '<span class="door-lock" aria-hidden="true">' + iconLock() + '</span>' +
          face +
          '</div></li>';
      }
      var current = state === 'open' && !done ? ' aria-current="step"' : '';
      return '<li class="door-cell">' +
        '<button type="button" class="advent-door ' + state + ' ' + tone + '" data-action="open" data-index="' + index + '"' + current +
        ' aria-label="' + esc(label) + ': ' + esc(title) + '">' + face + '</button></li>';
    }).join('');

    var body;
    if (!lessons.length) {
      body = '<section class="card empty"><h2>Doors are on the way</h2><p>When the Advent course is added, twenty-four doors will open here.</p></section>';
    } else {
      body = '<nav class="advent-board" aria-label="Gistmas Advent calendar">' +
        '<ol class="advent-grid">' + doors + '</ol>' +
        '</nav>' +
        '<p class="footnote">Open doors in order — each finished day awards a virtual chocolate. Finished days stay open to practise again.</p>';
    }

    var eyebrow = 'Gistmas Advent';
    var heading = 'Merry Christmas, one and all';
    var lead = 'Twenty-four doors of holly, chocolate, and the real gist — from prophecy to joy.';
    var ornament = '<span class="home-holly" aria-hidden="true"></span>';
    var santa = '<figure class="dave-santa">' +
      '<img src="assets/dave-santa.jpg" width="160" height="160" alt="Dave McComb as Santa Claus">' +
      '<figcaption>Dave McComb · Semantic Arts · as Santa</figcaption>' +
      '</figure>';

    return snowMarkup() +
      '<header class="home-head">' +
      ornament +
      '<p class="eyebrow">' + esc(eyebrow) + '</p>' +
      '<h1 class="home-greeting">' + esc(heading) + '</h1>' +
      '<p class="sub home-lead">' + esc(lead) + '</p>' +
      '<p class="season-line">A Gistmas Advent calendar through the Semantic Arts ontology · CC BY 4.0</p>' +
      santa +
      (course.sourceNote ? '<p class="source">' + richText(course.sourceNote) + '</p>' : '') +
      '</header>' +
      '<section class="stats" aria-label="Progress">' +
      '<div class="stat choco-stat"><b>' + chocolates + '</b><span>' + (chocolates === 1 ? 'chocolate' : 'chocolates') + '</span></div>' +
      '<div class="stat"><b>' + doneCount + '</b><span>' + (doneCount === 1 ? 'door open' : 'doors open') + '</span></div>' +
      '<div class="stat"><b>' + streak + '</b><span>day streak</span></div>' +
      '</section>' + body;
  }

  function renderTeach(ex) {
    var line = typeof ex.line === 'string' && ex.line.trim() ? '<p class="line">' + esc(ex.line) + '</p>' : '';
    var exampleText = seasonalField(ex, 'example');
    var example = exampleText
      ? '<div class="example"><span class="example-label">For example</span><p class="line">' + esc(exampleText) + '</p></div>'
      : '';
    return '<div class="card-body"><p class="kind">' + esc(kindLabel(ex.kind)) + '</p>' +
      '<h2 id="step-heading" class="term" tabindex="-1">' + esc(ex.term) + '</h2>' +
      line + example + '</div>' + continueButton();
  }

  function renderChoice(ex) {
    var options = seasonalOptions(ex);
    var buttons = options.map(function (opt, index) {
      var state = '';
      if (ui.phase === 'feedback') {
        if (index === ex.answer) state = 'correct';
        else if (index === ui.picked) state = 'wrong';
      }
      var cls = ['option', state, state === 'wrong' ? 'shake' : ''].filter(Boolean).join(' ');
      var disabled = ui.phase === 'feedback' ? ' disabled' : '';
      return '<button type="button" class="' + cls + '" data-action="choice" data-index="' + index + '"' + disabled + '>' +
        '<span class="option-label">' + esc(opt) + optionSr(state) + '</span>' + optionMark(state) + '</button>';
    }).join('');
    var verdict = ui.phase === 'feedback'
      ? verdictBlock(ui.result === 'wrong' ? 'Not quite' : 'Right', whyText(ex))
      : '';
    var actions = ui.phase === 'feedback' ? continueButton() : '';
    return '<div class="card-body"><h2 id="step-heading" class="prompt" tabindex="-1">' + esc(promptText(ex, 'Choose one')) + '</h2>' +
      '<div class="stack">' + buttons + '</div>' + verdict + '</div>' + actions;
  }

  function renderTrueFalse(ex) {
    function button(value, label) {
      var state = '';
      if (ui.phase === 'feedback') {
        if (value === ex.answer) state = 'correct';
        else if (value === ui.picked) state = 'wrong';
      }
      var cls = ['option', state, state === 'wrong' ? 'shake' : ''].filter(Boolean).join(' ');
      var disabled = ui.phase === 'feedback' ? ' disabled' : '';
      return '<button type="button" class="' + cls + '" data-action="tf" data-value="' + (value ? 'true' : 'false') + '"' + disabled + '>' +
        '<span class="option-label">' + label + optionSr(state) + '</span>' + optionMark(state) + '</button>';
    }
    var verdict = ui.phase === 'feedback'
      ? verdictBlock(ui.result === 'wrong' ? 'Not quite' : 'Right', whyText(ex))
      : '';
    var actions = ui.phase === 'feedback' ? continueButton() : '';
    return '<div class="card-body"><h2 id="step-heading" class="prompt" tabindex="-1">' + esc(promptText(ex, 'True or false?')) + '</h2>' +
      '<div class="tf">' + button(true, 'True') + button(false, 'False') + '</div>' + verdict + '</div>' + actions;
  }

  function renderMatch(ex) {
    var pairs = ex.pairs;
    var left = pairs.map(function (pair, index) {
      var locked = ui.locked.has(index);
      var selected = ui.pickLeft === index;
      var flash = ui.flash && ui.flash.l === index;
      var cls = ['match-btn', locked ? 'locked' : '', selected ? 'selected' : '', flash ? 'wrong shake' : ''].filter(Boolean).join(' ');
      var disabled = locked || ui.phase === 'feedback' ? ' disabled' : '';
      return '<button type="button" class="' + cls + '" data-action="left" data-left="' + index + '" aria-pressed="' + (selected ? 'true' : 'false') + '"' + disabled + '>' + esc(pair.left) + '</button>';
    }).join('');
    var right = ui.rightsOrder.map(function (pairIndex, pos) {
      var locked = ui.locked.has(pairIndex);
      var flash = ui.flash && ui.flash.r === pos;
      var cls = ['match-btn', locked ? 'locked' : '', flash ? 'wrong shake' : ''].filter(Boolean).join(' ');
      var disabled = locked || ui.phase === 'feedback' ? ' disabled' : '';
      return '<button type="button" class="' + cls + '" data-action="right" data-right="' + pos + '"' + disabled + '>' + esc(pairs[pairIndex].right) + '</button>';
    }).join('');
    var hint = ui.hint ? '<p class="hint' + (ui.hintBad ? ' bad' : '') + '">' + esc(ui.hint) + '</p>' : '';
    var verdict = ui.phase === 'feedback' ? verdictBlock('All paired', '') : '';
    var actions = ui.phase === 'feedback' ? continueButton() : '';
    return '<div class="card-body"><h2 id="step-heading" class="prompt" tabindex="-1">' + esc(promptText(ex, 'Match each name to its meaning')) + '</h2>' +
      '<p class="help">Tap one on the left, then its match on the right.</p>' +
      '<div class="match"><div class="match-col">' + left + '</div><div class="match-col">' + right + '</div></div>' +
      hint + verdict + '</div>' + actions;
  }

  function renderTypein(ex) {
    var inputClass = 'answer';
    if (ui.phase === 'feedback') inputClass += ui.result === 'wrong' ? ' wrong shake' : ' correct';
    var disabled = ui.phase === 'feedback' ? ' disabled' : '';
    var hint = ui.hint ? '<p class="hint' + (ui.hintBad ? ' bad' : '') + '">' + esc(ui.hint) + '</p>' : '';
    var extra = '';
    if (ui.phase === 'feedback' && ui.result === 'wrong' && ex.accept && ex.accept.length) {
      extra = '<p class="accepted">One accepted answer is ' + esc(ex.accept[0]) + '.</p>';
    }
    var verdict = ui.phase === 'feedback'
      ? verdictBlock(ui.result === 'wrong' ? 'Not quite' : 'Right', whyText(ex), extra)
      : '';
    var field = '<label class="field-label" for="answer">Answer</label>' +
      '<input id="answer" data-typein-input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" value="' + esc(ui.typed) + '" class="' + inputClass + '"' + disabled + '>';
    var form = ui.phase === 'ask'
      ? '<form id="typein-form" data-typein novalidate>' + field + hint + '</form>'
      : field;
    var actions = ui.phase === 'ask'
      ? '<div class="card-actions"><button type="submit" class="btn" form="typein-form">Check</button></div>'
      : continueButton();
    return '<div class="card-body"><h2 id="step-heading" class="prompt" tabindex="-1">' + esc(promptText(ex, 'Type the answer')) + '</h2>' +
      form + verdict + '</div>' + actions;
  }

  function renderExercise(ex) {
    if (ui.problem) {
      return '<div class="card-body"><h2 id="step-heading" tabindex="-1">This card cannot be shown</h2><p class="line">' + esc(ui.problem) + '</p></div>' + continueButton();
    }
    if (ex.type === 'teach') return renderTeach(ex);
    if (ex.type === 'choice') return renderChoice(ex);
    if (ex.type === 'truefalse') return renderTrueFalse(ex);
    if (ex.type === 'match') return renderMatch(ex);
    if (ex.type === 'typein') return renderTypein(ex);
    return '<div class="card-body"><h2 id="step-heading" tabindex="-1">This card cannot be shown</h2><p class="line">This card type is not supported.</p></div>' + continueButton();
  }

  function renderLesson() {
    var lesson = currentLesson();
    var exercises = lesson && Array.isArray(lesson.exercises) ? lesson.exercises : [];
    if (!exercises.length) {
      return lessonChrome('<article class="card"><div class="card-body"><h2 id="step-heading" tabindex="-1">This lesson has no cards yet</h2><p class="line">There is nothing to practise here.</p></div>' +
        '<div class="card-actions"><button type="button" class="btn" data-action="home" data-continue>Back to the calendar</button></div></article>');
    }
    return lessonChrome('<article class="card">' + renderExercise(exercises[ui.step]) + '</article>');
  }

  function renderDone() {
    var sentence = scoreSentence(ui.firstTry, ui.scored);
    var figure = ui.scored ? '<p class="score-num">' + ui.firstTry + '<span> / ' + ui.scored + '</span></p>' : '';
    var award = ui.chocolateAward || { fresh: false, total: chocolateCount() };
    var santaBit = '<img class="dave-santa-mini wink" src="assets/dave-santa.jpg" width="88" height="88" alt="Dave McComb as Santa Claus">';
    var chocoShow = '<div class="choco-celebrate" aria-hidden="true">' +
      '<div class="foil-choco"><span class="foil-shine"></span></div>' +
      '</div>';
    var chocoLine = award.fresh
      ? '<p class="choco-line">A foil-wrapped chocolate is yours — <b>' + award.total + '</b> of 24 in your stash.</p>'
      : '<p class="choco-line">Chocolate already in your stash — <b>' + award.total + '</b> of 24.</p>';
    var card = '<article class="card celebrate-card"><div class="card-body">' + santaBit + chocoShow +
      '<h2 id="step-heading" tabindex="-1">Door open — chocolate earned</h2>' +
      chocoLine + figure + '<p class="score-line">' + esc(sentence) + '</p></div>' +
      continueButton('Back to the calendar') + '</article>';
    return lessonChrome(card);
  }

  function paint() {
    var app = document.getElementById('app');
    var lessonMode = ui.status === 'ready' && (ui.view === 'lesson' || ui.view === 'done');
    app.classList.toggle('is-lesson', lessonMode);
    app.classList.toggle('is-home', ui.status === 'ready' && ui.view === 'home');
    var html;
    if (ui.status === 'loading') html = '<p class="loading">Loading the course…</p>';
    else if (ui.status === 'error') html = '<section class="card"><h2>The course could not be loaded</h2><p class="line">Check data/lessons.json, then refresh.</p></section>';
    else if (ui.view === 'lesson') html = renderLesson();
    else if (ui.view === 'done') html = renderDone();
    else html = renderHome();
    app.innerHTML = html;
    if (ui.status !== 'ready') return;
    applyTheme();
    var chromeTitle = 'Gistmas Advent';
    if (ui.view === 'home') document.title = 'Merry Christmas, one and all · ' + chromeTitle;
    else {
      var lesson = currentLesson();
      var name = lesson && lesson.title ? lesson.title : 'Lesson';
      document.title = name + ' · ' + chromeTitle;
    }
  }

  function focusAfter() {
    var el = null;
    if (ui.restoreSelector) {
      el = document.querySelector(ui.restoreSelector);
      ui.restoreSelector = '';
    }
    if (!el && ui.pendingFocus === 'continue') el = document.querySelector('[data-continue]');
    else if (!el && ui.pendingFocus === 'input') el = document.querySelector('[data-typein-input]');
    else if (!el && ui.pendingFocus === 'heading') el = document.getElementById('step-heading');
    ui.pendingFocus = null;
    if (el && typeof el.focus === 'function') el.focus();
  }

  function flushAnnounce() {
    if (!ui.pendingAnnounce) return;
    var text = ui.pendingAnnounce;
    ui.pendingAnnounce = '';
    var live = document.getElementById('live');
    if (!live) return;
    var token = ++announceToken;
    live.textContent = '';
    setTimeout(function () {
      if (token !== announceToken) return;
      live.textContent = text;
    }, 40);
  }

  function render() {
    try {
      paint();
    } catch (err) {
      console.error(err);
      var app = document.getElementById('app');
      app.classList.remove('is-lesson');
      app.innerHTML = '<section class="card"><h2>Something went wrong</h2><p class="line">This screen could not be drawn. Your saved progress was left as it was.</p></section>';
      return;
    }
    try { focusAfter(); } catch (err) { console.error(err); }
    try { flushAnnounce(); } catch (err) { console.error(err); }
  }

  function showHome() {
    ui.flashToken += 1;
    ui.flash = null;
    ui.view = 'home';
    ui.pendingFocus = null;
    ui.restoreSelector = '';
    ui.pendingAnnounce = '';
    render();
  }

  function beginStep() {
    var ex = currentExercise();
    ui.problem = ex ? exerciseProblem(ex) : 'This card is missing.';
    ui.phase = (ui.problem || (ex && ex.type === 'teach')) ? 'feedback' : 'ask';
    ui.result = null;
    ui.picked = null;
    ui.typed = '';
    ui.hint = '';
    ui.hintBad = false;
    ui.pickLeft = null;
    ui.locked = new Set();
    ui.rightsOrder = [];
    ui.matchClean = true;
    ui.matchScored = false;
    ui.flash = null;
    ui.flashToken += 1;
    ui.pendingAnnounce = '';
    ui.restoreSelector = '';
    if (ex && ex.type === 'match' && !ui.problem) {
      ui.rightsOrder = shuffle(ex.pairs.map(function (_, index) { return index; }));
    }
  }

  function focusForCurrent() {
    var ex = currentExercise();
    if (ex && !ui.problem && ex.type === 'typein' && ui.phase === 'ask') return 'input';
    if (ui.phase === 'feedback' && ex && ex.type !== 'teach' && !ui.problem) return 'continue';
    return 'heading';
  }

  function openLesson(index) {
    var lessons = ui.course.lessons || [];
    if (!Number.isInteger(index) || index < 0 || index >= lessons.length) return;
    var progress = loadProgress();
    if (!isUnlocked(progress, lessons, index)) return;
    ui.lessonIndex = index;
    ui.step = 0;
    ui.firstTry = 0;
    ui.scored = 0;
    ui.view = 'lesson';
    var lesson = lessons[index];
    if (!lesson || !Array.isArray(lesson.exercises) || lesson.exercises.length === 0) {
      ui.pendingFocus = 'heading';
      ui.restoreSelector = '';
      render();
      return;
    }
    beginStep();
    ui.pendingFocus = focusForCurrent();
    render();
  }

  function completeLesson() {
    var lesson = currentLesson();
    var id = lessonId(lesson, ui.lessonIndex);
    try {
      markComplete(id);
    } catch (err) {
      console.error(err);
    }
    try {
      ui.chocolateAward = awardChocolate(id);
    } catch (err) {
      ui.chocolateAward = { fresh: false, total: chocolateCount() };
      console.error(err);
    }
    ui.view = 'done';
    ui.pendingFocus = 'heading';
    var award = ui.chocolateAward;
    ui.pendingAnnounce = (award.fresh
      ? 'Door open. A chocolate is yours. ' + award.total + ' of 24. '
      : 'Door open. ') + scoreSentence(ui.firstTry, ui.scored);
    render();
  }

  function advance() {
    var lesson = currentLesson();
    var total = lesson && Array.isArray(lesson.exercises) ? lesson.exercises.length : 0;
    if (ui.step + 1 >= total) {
      completeLesson();
      return;
    }
    ui.step += 1;
    beginStep();
    ui.pendingFocus = focusForCurrent();
    render();
  }

  function onContinue() {
    var now = Date.now();
    if (now - lastContinue < 280) return;
    if (ui.view === 'done') {
      lastContinue = now;
      showHome();
      return;
    }
    if (ui.view !== 'lesson') return;
    var lesson = currentLesson();
    var total = lesson && Array.isArray(lesson.exercises) ? lesson.exercises.length : 0;
    if (!total) {
      lastContinue = now;
      showHome();
      return;
    }
    var ex = currentExercise();
    if (!ex) return;
    if (!(ui.problem || ex.type === 'teach' || ui.phase === 'feedback')) return;
    lastContinue = now;
    advance();
  }

  function onChoice(index) {
    if (ui.phase !== 'ask') return;
    var ex = currentExercise();
    if (!ex || ui.problem || !Number.isInteger(index)) return;
    var right = index === ex.answer;
    ui.phase = 'feedback';
    ui.result = right ? 'right' : 'wrong';
    ui.picked = index;
    ui.scored += 1;
    if (right) ui.firstTry += 1;
    var why = whyText(ex);
    var correctLabel = String(seasonalOptions(ex)[ex.answer]);
    ui.pendingAnnounce = right
      ? (why ? 'Right. ' + why : 'Right.')
      : (why ? 'Not quite. ' + why + ' The right answer is ' + correctLabel + '.' : 'Not quite. The right answer is ' + correctLabel + '.');
    ui.pendingFocus = 'continue';
    render();
  }

  function onTF(value) {
    if (ui.phase !== 'ask') return;
    var ex = currentExercise();
    if (!ex || ui.problem) return;
    var right = value === ex.answer;
    ui.phase = 'feedback';
    ui.result = right ? 'right' : 'wrong';
    ui.picked = value;
    ui.scored += 1;
    if (right) ui.firstTry += 1;
    var why = whyText(ex);
    var answerWord = ex.answer ? 'True' : 'False';
    ui.pendingAnnounce = right
      ? (why ? 'Right. ' + why : 'Right.')
      : (why ? 'Not quite. ' + why + ' The answer is ' + answerWord + '.' : 'Not quite. The answer is ' + answerWord + '.');
    ui.pendingFocus = 'continue';
    render();
  }

  function onTypein(value) {
    if (ui.phase !== 'ask') return;
    var ex = currentExercise();
    if (!ex || ui.problem) return;
    ui.typed = value;
    if (!fold(value)) {
      ui.hint = 'Type an answer first.';
      ui.hintBad = true;
      ui.pendingAnnounce = ui.hint;
      ui.pendingFocus = 'input';
      render();
      return;
    }
    var ok = accepted(ex, value);
    ui.phase = 'feedback';
    ui.result = ok ? 'right' : 'wrong';
    ui.hint = '';
    ui.scored += 1;
    if (ok) ui.firstTry += 1;
    var why = whyText(ex);
    var shown = String(ex.accept[0]);
    ui.pendingAnnounce = ok
      ? (why ? 'Right. ' + why : 'Right.')
      : (why ? 'Not quite. ' + why + ' One accepted answer is ' + shown + '.' : 'Not quite. One accepted answer is ' + shown + '.');
    ui.pendingFocus = 'continue';
    render();
  }

  function armFlash(left, pos) {
    var token = ++ui.flashToken;
    var step = ui.step;
    ui.flash = { l: left, r: pos };
    ui.restoreSelector = '[data-action="left"][data-left="' + left + '"]';
    ui.pendingFocus = null;
    render();
    setTimeout(function () {
      if (token !== ui.flashToken) return;
      if (ui.view !== 'lesson' || ui.step !== step) return;
      ui.flash = null;
      ui.restoreSelector = '[data-action="left"][data-left="' + left + '"]';
      render();
    }, 520);
  }

  function onMatchLeft(index) {
    if (ui.phase !== 'ask' || !Number.isInteger(index) || ui.locked.has(index)) return;
    ui.flashToken += 1;
    ui.flash = null;
    ui.pickLeft = ui.pickLeft === index ? null : index;
    ui.hint = ui.pickLeft === null ? '' : 'Now tap the match on the right.';
    ui.hintBad = false;
    ui.restoreSelector = ui.pickLeft === null
      ? '[data-action="left"][data-left="' + index + '"]'
      : '[data-action="right"]:not(:disabled)';
    ui.pendingFocus = null;
    render();
  }

  function onMatchRight(pos) {
    if (ui.phase !== 'ask' || !Number.isInteger(pos)) return;
    var ex = currentExercise();
    if (!ex) return;
    if (ui.pickLeft === null) {
      ui.hint = 'Choose one on the left first.';
      ui.hintBad = true;
      ui.pendingAnnounce = ui.hint;
      ui.restoreSelector = '[data-action="right"][data-right="' + pos + '"]';
      ui.pendingFocus = null;
      render();
      return;
    }
    var left = ui.pickLeft;
    var pairIndex = ui.rightsOrder[pos];
    if (left === pairIndex) {
      ui.flashToken += 1;
      ui.flash = null;
      ui.locked.add(left);
      ui.pickLeft = null;
      ui.hint = '';
      if (ui.locked.size === ex.pairs.length && !ui.matchScored) {
        ui.matchScored = true;
        ui.scored += 1;
        if (ui.matchClean) ui.firstTry += 1;
        ui.phase = 'feedback';
        ui.result = 'right';
        ui.pendingAnnounce = ui.matchClean ? 'All paired, first time.' : 'All paired.';
        ui.pendingFocus = 'continue';
        ui.restoreSelector = '';
      } else {
        ui.restoreSelector = '[data-action="left"]:not(:disabled)';
        ui.pendingFocus = null;
      }
      render();
      return;
    }
    ui.matchClean = false;
    ui.pickLeft = null;
    ui.hint = 'Not a pair. Try another match.';
    ui.hintBad = true;
    ui.pendingAnnounce = 'Not a pair.';
    armFlash(left, pos);
  }

  function onClick(event) {
    var target = event.target;
    var btn = target && target.closest ? target.closest('[data-action]') : null;
    if (!btn || btn.disabled) return;
    var action = btn.dataset.action;
    if (action === 'home') { showHome(); return; }
    if (action === 'open') { openLesson(Number(btn.dataset.index)); return; }
    if (action === 'continue') { onContinue(); return; }
    if (action === 'choice') { onChoice(Number(btn.dataset.index)); return; }
    if (action === 'tf') { onTF(btn.dataset.value === 'true'); return; }
    if (action === 'left') { onMatchLeft(Number(btn.dataset.left)); return; }
    if (action === 'right') { onMatchRight(Number(btn.dataset.right)); return; }
  }

  function onSubmit(event) {
    var form = event.target && event.target.closest ? event.target.closest('form[data-typein]') : null;
    if (!form) return;
    event.preventDefault();
    if (ui.phase !== 'ask') return;
    var input = form.querySelector('[data-typein-input]');
    onTypein(input ? input.value : '');
  }

  function onKey(event) {
    if (event.key !== 'Enter' || event.repeat) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    var cont = document.querySelector('[data-continue]');
    if (!cont) return;
    var target = event.target;
    if (target && target.closest && target.closest('button, a, input, textarea, select, label')) return;
    event.preventDefault();
    cont.click();
  }

  function loadCourse() {
    fetch('data/lessons.json', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('Could not read the course');
        return res.json();
      })
      .then(function (data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Course file is not an object');
        ui.course = {
          title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Gist',
          sourceNote: typeof data.sourceNote === 'string' ? data.sourceNote.trim() : '',
          lessons: Array.isArray(data.lessons) ? data.lessons.filter(Boolean) : []
        };
        ui.status = 'ready';
        ui.view = 'home';
        render();
      })
      .catch(function (err) {
        console.error(err);
        ui.status = 'error';
        render();
      });
  }

  function boot() {
    var app = document.getElementById('app');
    app.addEventListener('click', onClick);
    app.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', onKey);
    applyTheme();
    render();
    loadCourse();
  }

  boot();
}());
