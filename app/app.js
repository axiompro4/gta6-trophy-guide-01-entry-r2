// Leonida Trophy Tracker — checklist, roadmap and progress for GTA VI on PS5.
// Loads the trophy data from data/trophies.json, saves earned trophies in
// localStorage, and never makes a network request of its own.
const DATA_URL = 'data/trophies.json';
const STORE_KEY = 'leonida-tracker-v1';
const DEMO_EARNED = [2, 3, 4, 15, 16, 31, 35, 54];

const KIND_LABELS = {
  all: 'All kinds', story: 'Story', missable: 'Missable',
  collectibles: 'Collectibles', activities: 'Activities',
  platinum: 'Platinum', completion: '100% run', online: 'Online',
};
const GRADE_LABELS = { all: 'All grades', platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

const ROADMAP = [
  {
    title: 'Play the story — and do the one missable thing',
    body: 'Finish Chapters 1 to 5 and the final mission. The checklist only unlocks after the story, but everything you do during it already counts.',
    steps: [
      'In Chapter 1, after the mission Down to Earth, follow Lucia to the balcony at Jason\u2019s house and accept her meditation invitation. It never comes back — the game\u2019s only missable trophy (Positive Mental Attitude) may depend on it.',
      'Scan vehicles with the WAiNK app and study animals through binoculars whenever you meet them — you need 200 of 277 base vehicles and 100 of 255 animals later.',
      'Start every stranger chain as soon as its icon appears. Strangers can go quiet for stretches of the story, and one report says some chains have windows tied to story progress.',
      'Never turn cheats on: cheats disable trophies and saving. Keep a spread of manual saves as you go — there is no mission replay.',
    ],
    earns: 'Earns: the 12 story trophies, and keeps Positive Mental Attitude alive.',
  },
  {
    title: 'Unlock the systems the rest of the run needs',
    body: 'Chapter 2 opens the economy; Chapter 3 opens quiet theft; Chapter 4 opens vaults.',
    steps: [
      'Chapter 2, mission Moses: vehicle registering and the Scooter Bros app (Watkins Auto Parts, Port Gellhorn). Steal a car with no tracker, Respray, then Register.',
      'Chapter 2, mission Daily Driver: the Vice City Real Estate app. The 8 purchasable garages cost about $160,000 together.',
      'Chapter 3: the Snap Gun from Yasmani\u2019s Jewelry Jobs, and the Key Cloner from Clonin\u2019 Keys, Makin\u2019 GS for keyless cars.',
      'Chapter 4, optional mission \u201cThat\u2019s Where The Money Is\u2026\u201d: bank-vault robberies unlock.',
    ],
    earns: 'Earns: On the Spot, Little Boxes, Sneakthief, Maximum Withdrawal.',
  },
  {
    title: 'Activities and skills',
    body: 'The grindy skill trophies, done while the map is still fresh.',
    steps: [
      'Shooting Range: gold medals in all 42 challenges (also needed for 100%).',
      'Top Fun drone races: win at all 14 locations; 42 time trials in total (also needed for 100%).',
      'Win 20 different races; complete 250 stunts (100% wants 300); finish 50 of the 80 Challenges (100% wants 70).',
      'Try every activity type once for Master of None, and complete an arcade game for Stick Fiddler.',
    ],
    earns: 'Earns: The Shootist, Top Fun, Earn Cash, Not Kudos, Cunning Stunts, One Last Thing, Master of None.',
  },
  {
    title: 'Collections, money and the map',
    body: 'The slow accumulation — most of it finishes while you do everything else.',
    steps: [
      'Collectible Cards: complete 3 sets (100% wants 15 of 18). WAiNK: scan 100 locations. Vehicles: discover 100 (100% wants 200).',
      'Money: buy all 8 garages ($160,000); fence $100,000 of narcotics, $100,000 of jewelry and $250,000 of marked bills; rob 5 bank vaults (100% wants 8).',
      'Meditate at all 18 spots (10 locations, most count twice — once per character). Explore all of Leonida to clear the map fog.',
      'Hunt with Bret: all 15 of his Target Decks are required for 100%, and his unique-animal hunt is the Fair Game trophy.',
    ],
    earns: 'Earns: Don\u2019t Touch My Deck, You WAiNKer!, Whip It Good, Little Boxes, Dime on the Dollar, The Goodtime State, Fair Game.',
  },
  {
    title: 'Cleanup and 100% completion',
    body: 'Open Progress > Stats > 100% Completion after the story and work the list that is left.',
    steps: [
      'Story & tasks: 100 optional tasks, 39 gang operations, 22 bank jobs, 7 payday loan jobs, 34 of 35 Smash \u2019N\u2019 Grabs, 50 of 91 stick ups, 8 vaults, and the fencing totals above.',
      'Exploration: 5 of 7 Kenton sets, 15 of 18 card sets, 33 underwater discoveries, 30 magazines/books/comics, 15 of 18 meditations, 100 of 125 Cocaine Flamingos, 2 playlists, 70 of 79 styles, 30 unique race wins, 10 of 13 race-challenge golds, 42 shooting-range golds, 4 video games, 5 pool opponents, 2 mini-golf locations, 90 of 100 basketball hoops, 42 drone time trials, 300 stunts, 70 challenges, 15 Target Decks.',
      'Discovery: 200 of 277 base vehicles, 50 of 66 standard-issue weapons, 100 of 255 animals.',
      'When the checklist reads 100%, A Long Road pops — and with it, the platinum.',
    ],
    earns: 'Earns: A Long Road, then Vice Got a Price! — the platinum.',
  },
];

let trophies = [];
let earned = new Set();
let spoilerOn = false;
let kindFilter = 'all';
let gradeFilter = 'all';
let query = '';
let currentView = 'checklist';
let detailId = null;

const $ = (sel) => document.querySelector(sel);
const listEl = $('#trophyList');
const hintEl = $('#listHint');

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.earned)) earned = new Set(data.earned.filter((n) => Number.isInteger(n)));
    if (typeof data.spoiler === 'boolean') spoilerOn = data.spoiler;
  } catch { /* a corrupt store starts empty */ }
}

function saveStore() {
  localStorage.setItem(STORE_KEY, JSON.stringify({ earned: [...earned].sort((a, b) => a - b), spoiler: spoilerOn }));
}

function gradeWord(t) { return t.grade.charAt(0).toUpperCase() + t.grade.slice(1); }

function isHiddenFromViewer(t) {
  return spoilerOn && t.hidden && !earned.has(t.id);
}

function visibleTrophies() {
  return trophies.filter((t) => {
    if (kindFilter === 'missable' && !t.missable) return false;
    if (kindFilter === 'online') return false;
    if (kindFilter !== 'all' && kindFilter !== 'missable' && t.kind !== kindFilter) return false;
    if (gradeFilter !== 'all' && t.grade !== gradeFilter) return false;
    if (query) {
      const hay = (t.name + ' ' + t.description + ' ' + t.guide).toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

function renderProgress() {
  const total = trophies.length || 55;
  const done = earned.size;
  $('#progressCount').textContent = done + ' / ' + total + ' earned';
  $('#progressPct').textContent = Math.round((done / total) * 100) + '%';
  $('#progressFill').style.width = (done / total) * 100 + '%';
  const counts = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const all = trophies.filter((t) => t.grade === g).length;
    const got = trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
    return '<span><b>' + got + '/' + all + '</b> ' + gradeWord({ grade: g }) + '</span>';
  }).join('');
  $('#gradeCounts').innerHTML = counts + '<span>· <b>' + trophies.filter((t) => t.hidden).length + '</b> hidden trophies · <b>0</b> online</span>';
}

function trophyRow(t) {
  const li = document.createElement('li');
  li.className = 'trophy-row' + (earned.has(t.id) ? ' earned' : '');
  const hidden = isHiddenFromViewer(t);
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.checked = earned.has(t.id);
  check.setAttribute('aria-label', 'Mark ' + (hidden ? 'hidden trophy' : t.name) + ' as earned');
  check.addEventListener('click', (ev) => {
    ev.stopPropagation();
    toggleEarned(t.id, check.checked);
  });
  const mid = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'trophy-name' + (hidden ? ' spoiler-name' : '');
  name.textContent = hidden ? 'Hidden trophy — earn it to reveal' : t.name;
  const desc = document.createElement('div');
  desc.className = 'trophy-desc';
  desc.textContent = hidden ? 'This trophy stays hidden on PlayStation until you earn it.' : t.description;
  const tags = document.createElement('div');
  tags.className = 'trophy-tags';
  const gradeTag = document.createElement('span');
  gradeTag.className = 'tag grade-' + t.grade;
  gradeTag.textContent = gradeWord(t);
  tags.appendChild(gradeTag);
  const kindTag = document.createElement('span');
  kindTag.className = 'tag';
  kindTag.textContent = KIND_LABELS[t.kind] || t.kind;
  tags.appendChild(kindTag);
  if (t.missable) {
    const m = document.createElement('span');
    m.className = 'tag missable';
    m.textContent = '⚠ Missable';
    tags.appendChild(m);
  }
  if (t.hidden && !hidden) {
    const h = document.createElement('span');
    h.className = 'tag hidden-t';
    h.textContent = 'Hidden on PS5';
    tags.appendChild(h);
  }
  mid.append(name, desc, tags);
  const side = document.createElement('div');
  side.className = 'trophy-grade-side';
  side.textContent = '#' + t.id + ' · ' + gradeWord(t);
  li.append(check, mid, side);
  li.addEventListener('click', () => openDetail(t.id));
  return li;
}

function renderList() {
  const shown = visibleTrophies();
  listEl.innerHTML = '';
  for (const t of shown) listEl.appendChild(trophyRow(t));
  const total = trophies.length;
  hintEl.textContent = shown.length === total
    ? 'Showing all ' + total + ' trophies. Tick a trophy when you earn it; click a row for its guide and sources.'
    : 'Showing ' + shown.length + ' of ' + total + ' trophies.';
  renderProgress();
}

function toggleEarned(id, on) {
  if (on) earned.add(id); else earned.delete(id);
  saveStore();
  renderList();
  if (detailId === id) openDetail(id);
}

function openDetail(id) {
  const t = trophies.find((x) => x.id === id);
  if (!t) return;
  detailId = id;
  const body = $('#detailBody');
  body.innerHTML = '';
  const hidden = isHiddenFromViewer(t);
  const h = document.createElement('h2');
  h.textContent = hidden ? 'Hidden trophy' : t.name;
  const d = document.createElement('p');
  d.className = 'detail-desc';
  d.textContent = hidden ? 'Hidden on PlayStation until earned.' : t.description;
  const meta = document.createElement('p');
  meta.className = 'detail-meta';
  meta.textContent = '#' + t.id + ' · ' + gradeWord(t) + ' · ' + (KIND_LABELS[t.kind] || t.kind)
    + (t.missable && t.kind !== 'missable' ? ' · ⚠ Missable' : '') + (t.hidden ? ' · Hidden on PS5' : '');
  const guideTitle = document.createElement('h3');
  guideTitle.textContent = 'Guide';
  const guide = document.createElement('p');
  guide.className = 'guide-text';
  guide.textContent = hidden ? 'Earn this trophy to reveal its guide.' : t.guide;
  body.append(h, d, meta, guideTitle, guide);
  if (!hidden) {
    const sTitle = document.createElement('h3');
    sTitle.textContent = 'Sources — where each fact comes from';
    const list = document.createElement('ul');
    list.className = 'sources';
    for (const s of t.sources) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = s.name;
      li.appendChild(a);
      list.appendChild(li);
    }
    body.append(sTitle, list);
  }
  const line = document.createElement('label');
  line.className = 'earned-line';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(t.id);
  box.addEventListener('change', () => toggleEarned(t.id, box.checked));
  line.append(box, document.createTextNode(' I earned this trophy'));
  body.appendChild(line);
  $('#detailPanel').hidden = false;
}

function closeDetail() {
  detailId = null;
  $('#detailPanel').hidden = true;
}

function renderRoadmap() {
  const ol = $('#roadmapList');
  ol.innerHTML = '';
  for (const stage of ROADMAP) {
    const li = document.createElement('li');
    const h = document.createElement('h3');
    h.textContent = stage.title;
    const b = document.createElement('p');
    b.textContent = stage.body;
    const steps = document.createElement('ul');
    for (const s of stage.steps) {
      const item = document.createElement('li');
      item.textContent = s;
      steps.appendChild(item);
    }
    const earns = document.createElement('p');
    earns.className = 'earns';
    earns.textContent = stage.earns;
    li.append(h, b, steps, earns);
    ol.appendChild(li);
  }
}

function renderChips() {
  const kinds = ['all', 'story', 'missable', 'collectibles', 'activities', 'platinum', 'completion', 'online'];
  const kc = $('#kindChips');
  kc.innerHTML = '';
  for (const k of kinds) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (kindFilter === k ? ' active' : '');
    b.textContent = KIND_LABELS[k];
    b.addEventListener('click', () => { kindFilter = k; renderChips(); renderList(); });
    kc.appendChild(b);
  }
  const gc = $('#gradeChips');
  gc.innerHTML = '';
  for (const g of Object.keys(GRADE_LABELS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (gradeFilter === g ? ' active' : '');
    b.textContent = GRADE_LABELS[g];
    b.addEventListener('click', () => { gradeFilter = g; renderChips(); renderList(); });
    gc.appendChild(b);
  }
}

function setView(view) {
  currentView = view;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $('#view-checklist').hidden = view !== 'checklist';
  $('#view-roadmap').hidden = view !== 'roadmap';
  $('#view-warnings').hidden = view !== 'warnings';
  $('#toolbar').style.display = view === 'checklist' ? '' : 'none';
}

function exportProgress() {
  const payload = { app: 'leonida-trophy-tracker', game: 'Grand Theft Auto VI', exportedAt: new Date().toISOString(), earned: [...earned].sort((a, b) => a - b) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leonida-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const ids = Array.isArray(data.earned) ? data.earned : data;
      const valid = new Set(trophies.map((t) => t.id));
      const next = new Set(ids.filter((n) => Number.isInteger(n) && valid.has(n)));
      earned = next;
      saveStore();
      renderList();
    } catch { alert('That file is not a Leonida Trophy Tracker export.'); }
  };
  reader.readAsText(file);
}

async function init() {
  loadStore();
  const params = new URLSearchParams(location.search);
  if (params.get('demo') === '1') {
    for (const id of DEMO_EARNED) earned.add(id);
  }
  if (params.get('spoiler') === '1') spoilerOn = true;
  if (params.get('kind') && KIND_LABELS[params.get('kind')]) kindFilter = params.get('kind');
  if (params.get('view') && ['checklist', 'roadmap', 'warnings'].includes(params.get('view'))) currentView = params.get('view');
  try {
    const res = await fetch(DATA_URL);
    const data = await res.json();
    trophies = data.trophies;
  } catch (e) {
    listEl.innerHTML = '<li class="trophy-row"><div>Could not load data/trophies.json — serve the app folder over HTTP or open it from the same folder.</div></li>';
    return;
  }
  renderChips();
  renderRoadmap();
  renderList();
  setView(currentView);
  const spoilerBox = $('#spoilerToggle');
  spoilerBox.checked = spoilerOn;
  spoilerBox.addEventListener('change', () => { spoilerOn = spoilerBox.checked; saveStore(); renderList(); });
  $('#searchBox').addEventListener('input', (ev) => { query = ev.target.value.trim().toLowerCase(); renderList(); });
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('#detailClose').addEventListener('click', closeDetail);
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeDetail(); });
  $('#exportBtn').addEventListener('click', exportProgress);
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', (ev) => { if (ev.target.files[0]) importProgress(ev.target.files[0]); ev.target.value = ''; });
  if (params.get('open')) {
    const id = Number(params.get('open'));
    if (trophies.some((t) => t.id === id)) openDetail(id);
  }
  document.title = 'SELFTEST Leonida Trophy Tracker';
  window.__selftest = { detail: 'trophies=' + trophies.length + ' earned=' + earned.size + ' view=' + currentView };
}

init();
