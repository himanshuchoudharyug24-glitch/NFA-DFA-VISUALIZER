/* ========================================================
   NFA → DFA Converter  |  script.js
   Student : Himanshu Choudhary  |  Roll: 2024UCS1604
   Subject : Theory of Automata and Formal Languages
   ======================================================== */
'use strict';

/* ───────────────────────── CONSTANTS ───────────────────────── */
var EPS = '\u03B5'; // ε

/* ───────────────────────── GLOBAL STATE ───────────────────────── */
var NFA      = null;
var DFA      = null;
var STEPS    = [];
var CUR      = -1;
var PLAYING  = false;
var PLAY_TIM = null;

/* ───────────────────────── DOM HELPERS ───────────────────────── */
function V(id)        { return document.getElementById(id); }
function html(id, h)  { var e = V(id); if (e) e.innerHTML = h; }
function show(id)     { var e = V(id); if (e) e.style.display = ''; }
function hide(id)     { var e = V(id); if (e) e.style.display = 'none'; }
function showf(id)    { var e = V(id); if (e) e.style.display = 'flex'; }
function clearErr()   { html('err-box', ''); }
function showErr(msg) { html('err-box', '<div class="errmsg">&#x26A0; ' + msg + '</div>'); }
function setLabel(s)  { return '{' + Array.from(s).sort().join(',') + '}'; }

/* ───────────────────────── MODAL ───────────────────────── */
function openModal()  { V('overlay').classList.add('on'); }
function closeModal() { V('overlay').classList.remove('on'); }

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeModal();
});

/* ───────────────────────── KEYBOARD SHORTCUTS ───────────────────────── */
document.addEventListener('keydown', function(e) {
  var tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (e.key === 'ArrowLeft')              { e.preventDefault(); prevStep(); }
  if (e.key === 'ArrowRight')             { e.preventDefault(); nextStep(); }
  if (e.key === ' ')                      { e.preventDefault(); if (STEPS.length) togglePlay(); }
  if (e.key === 'Enter')                  { e.preventDefault(); doConvert(); }
  if (e.key === 'r' || e.key === 'R')     { doReset(); }
});

/* ───────────────────────── PRESETS ───────────────────────── */
var PRESETS = {
  ab: {
    states: 'q0, q1, q2',
    alpha:  'a, b',
    start:  'q0',
    accept: 'q2',
    trans:  'q0,a \u2192 q0 q1\nq0,b \u2192 q0\nq1,b \u2192 q2'
  },
  eps: {
    states: 'q0, q1, q2, q3',
    alpha:  'a, b, \u03B5',
    start:  'q0',
    accept: 'q3',
    trans:  'q0,\u03B5 \u2192 q1\nq0,\u03B5 \u2192 q2\nq1,a \u2192 q1\nq1,\u03B5 \u2192 q3\nq2,b \u2192 q2\nq2,\u03B5 \u2192 q3\nq3,a \u2192 q3'
  },
  binary: {
    states: 'q0, q1, q2',
    alpha:  '0, 1',
    start:  'q0',
    accept: 'q0',
    trans:  'q0,0 \u2192 q0\nq0,1 \u2192 q1\nq1,0 \u2192 q2\nq1,1 \u2192 q0\nq2,0 \u2192 q1\nq2,1 \u2192 q2'
  },
  union: {
    states: 'q0, q1, q2, q3',
    alpha:  'a, b',
    start:  'q0',
    accept: 'q1, q3',
    trans:  'q0,a \u2192 q1\nq1,a \u2192 q1\nq0,b \u2192 q3\nq3,b \u2192 q3'
  },
  aabb: {
    states: 'q0, q1, q2, q3',
    alpha:  'a, b',
    start:  'q0',
    accept: 'q3',
    trans:  'q0,a \u2192 q0 q1\nq1,a \u2192 q1\nq1,b \u2192 q2\nq2,b \u2192 q3\nq3,b \u2192 q3'
  },
  mod3: {
    states: 'p, q, r',
    alpha:  '0, 1',
    start:  'p',
    accept: 'p',
    trans:  'p,0 \u2192 p\np,1 \u2192 q\nq,0 \u2192 r\nq,1 \u2192 p\nr,0 \u2192 q\nr,1 \u2192 r'
  },
  all0: {
    states: 'q0, q1, q2',
    alpha:  '0, 1',
    start:  'q0',
    accept: 'q0',
    trans:  'q0,0 \u2192 q0 q1\nq1,0 \u2192 q2\nq2,0 \u2192 q1'
  }
};

function loadPreset(k) {
  var p = PRESETS[k];
  if (!p) return;
  V('inp-states').value = p.states;
  V('inp-alpha').value  = p.alpha;
  V('inp-start').value  = p.start;
  V('inp-accept').value = p.accept;
  V('inp-trans').value  = p.trans;
  clearErr();
  document.querySelectorAll('.pbtn').forEach(function(b) { b.classList.remove('active'); });
  var btn = V('pb-' + k);
  if (btn) btn.classList.add('active');
}

/* ───────────────────────── NFA PARSER ───────────────────────── */
function parseNFA() {
  var states = V('inp-states').value.split(',')
    .map(function(s) { return s.trim(); }).filter(Boolean);

  var alphaRaw = V('inp-alpha').value.split(',')
    .map(function(s) { return s.trim(); }).filter(Boolean)
    .map(function(s) { return s === 'eps' ? EPS : s; });

  var startState   = V('inp-start').value.trim();
  var acceptStates = new Set(
    V('inp-accept').value.split(',')
      .map(function(s) { return s.trim(); }).filter(Boolean)
  );

  var hasEpsilon = alphaRaw.indexOf(EPS) >= 0;
  var alphabet   = alphaRaw.filter(function(s) { return s !== EPS; });
  var fullAlpha  = alphaRaw; // includes EPS if present

  if (!states.length)
    throw new Error('No states defined.');
  if (!alphabet.length)
    throw new Error('Alphabet cannot be empty (excluding epsilon).');
  if (!states.includes(startState))
    throw new Error('Start state "' + startState + '" not in states list.');

  acceptStates.forEach(function(a) {
    if (!states.includes(a))
      throw new Error('Accept state "' + a + '" not in states list.');
  });

  // Build empty transition table
  var tr = {};
  states.forEach(function(s) {
    tr[s] = {};
    fullAlpha.forEach(function(sym) { tr[s][sym] = new Set(); });
    tr[s][EPS] = tr[s][EPS] || new Set();
  });

  // Parse transition lines
  var lines = V('inp-trans').value
    .split('\n').map(function(l) { return l.trim(); }).filter(Boolean);

  lines.forEach(function(line) {
    var m = line.match(/^(.+?)\s*,\s*(.+?)\s*(?:\u2192|->|>)\s*(.*)$/);
    if (!m) throw new Error('Bad transition format: "' + line + '"');

    var from = m[1].trim();
    var sym  = m[2].trim() === 'eps' ? EPS : m[2].trim();
    var tos  = m[3].trim().split(/\s+/).filter(Boolean);

    if (!states.includes(from))
      throw new Error('Unknown state "' + from + '".');
    if (!alphabet.includes(sym) && sym !== EPS)
      throw new Error('Symbol "' + sym + '" not in alphabet.');

    tos.forEach(function(t) {
      if (!states.includes(t))
        throw new Error('Unknown destination state "' + t + '".');
      tr[from][sym].add(t);
    });
  });

  return {
    states:       states,
    alphabet:     alphabet,
    fullAlpha:    fullAlpha,
    hasEpsilon:   hasEpsilon,
    tr:           tr,
    startState:   startState,
    acceptStates: acceptStates
  };
}

/* ───────────────────────── EPSILON CLOSURE ───────────────────────── */
function epsClosure(stateSet, tr) {
  var closure = new Set(stateSet);
  var stack   = Array.from(stateSet);
  while (stack.length) {
    var s   = stack.pop();
    var eps = tr[s] && tr[s][EPS] ? tr[s][EPS] : new Set();
    eps.forEach(function(t) {
      if (!closure.has(t)) { closure.add(t); stack.push(t); }
    });
  }
  return closure;
}

/* ───────────────────────── MOVE ───────────────────────── */
function move(stateSet, sym, tr) {
  var res = new Set();
  stateSet.forEach(function(s) {
    var targets = tr[s] && tr[s][sym] ? tr[s][sym] : new Set();
    targets.forEach(function(t) { res.add(t); });
  });
  return res;
}

/* ───────────────────────── SUBSET CONSTRUCTION ───────────────────────── */
function subsetConstruct(nfa) {
  var alphabet     = nfa.alphabet;
  var tr           = nfa.tr;
  var startState   = nfa.startState;
  var acceptStates = nfa.acceptStates;

  var steps    = [];
  var dfaStates = new Map();   // label -> Set of NFA states
  var dfaTr    = {};
  var queue    = [];

  var s0 = epsClosure(new Set([startState]), tr);
  var l0 = setLabel(s0);
  dfaStates.set(l0, s0);
  dfaTr[l0] = {};
  queue.push(l0);

  steps.push({
    act:      'init',
    desc:     '\u03B5-closure({' + startState + '}) = ' + l0 + '  \u2192  Initial DFA state',
    newState: l0,
    nfaSubset: Array.from(s0),
    isNew:    true,
    tableRow: null
  });

  while (queue.length) {
    var cur    = queue.shift();
    var curSet = dfaStates.get(cur);

    alphabet.forEach(function(sym) {
      var mv  = move(curSet, sym, tr);
      var cl  = epsClosure(mv, tr);
      var lbl = setLabel(cl);

      dfaTr[cur][sym] = lbl;

      var isNew = !dfaStates.has(lbl);
      if (isNew) {
        dfaStates.set(lbl, cl);
        dfaTr[lbl] = {};
        queue.push(lbl);
      }

      steps.push({
        act:       isNew ? 'new' : 'exist',
        desc:      '\u03B4(' + cur + ', ' + sym + ') = \u03B5-closure(move(' + cur + ',' + sym + ')) = \u03B5-closure(' + setLabel(mv) + ') = ' + lbl + (isNew ? '  \u2190 NEW' : '  \u2190 exists'),
        fromState: cur,
        symbol:    sym,
        toState:   lbl,
        nfaSubset: Array.from(cl),
        isNew:     isNew,
        tableRow:  { from: cur, sym: sym, to: lbl }
      });
    });
  }

  // Determine DFA accept states
  var dfaAccept = new Set();
  dfaStates.forEach(function(sub, lbl) {
    acceptStates.forEach(function(a) {
      if (sub.has(a)) dfaAccept.add(lbl);
    });
  });

  return {
    dfaStates:  dfaStates,
    dfaTr:      dfaTr,
    startLabel: l0,
    dfaAccept:  dfaAccept,
    alphabet:   alphabet,
    steps:      steps
  };
}

/* ───────────────────────── MAIN ACTIONS ───────────────────────── */
function doConvert() {
  clearErr();
  try {
    NFA   = parseNFA();
    DFA   = subsetConstruct(NFA);
    STEPS = DFA.steps;
    CUR   = STEPS.length - 1;
    renderAll();
    V('sc').style.display = 'none';
    hide('prog-wrap');
  } catch (e) {
    showErr(e.message);
  }
}

function doStep() {
  clearErr();
  try {
    NFA   = parseNFA();
    DFA   = subsetConstruct(NFA);
    STEPS = DFA.steps;
    CUR   = 0;

    drawGraph('gc-nfa',  NFA.states, NFA.tr, NFA.fullAlpha, NFA.startState, NFA.acceptStates, 'nfa');
    drawGraph('gc-nfa2', NFA.states, NFA.tr, NFA.fullAlpha, NFA.startState, NFA.acceptStates, 'nfa2');
    renderNFATable();
    renderStepsTable();

    showf('sc');
    show('prog-wrap');
    updateStepUI();
    drawDFAStep(CUR);
    highlightRow(CUR);
  } catch (e) {
    showErr(e.message);
  }
}

function doReset() {
  NFA = null; DFA = null; STEPS = []; CUR = -1;
  stopPlay();

  ['gc-nfa', 'gc-dfa', 'gc-nfa2', 'gc-dfa2'].forEach(function(id) {
    var e = V(id);
    if (e) e.innerHTML = '<div class="empty"><div class="ei" style="font-size:28px;">\u223F</div></div>';
  });
  ['steps-empty', 'nfat-empty', 'dfat-empty'].forEach(function(id) {
    var e = V(id); if (e) e.style.display = 'flex';
  });
  ['steps-tbl', 'nfat-tbl', 'dfat-tbl'].forEach(function(id) { hide(id); });
  ['sc', 'sbar', 'tester-panel', 'info-panel', 'prog-wrap', 'export-bar'].forEach(function(id) {
    var e = V(id); if (e) e.style.display = 'none';
  });

  clearErr();
  V('test-str').value = '';
  html('test-result', '');
  hide('tape-wrap');
  document.querySelectorAll('.pbtn').forEach(function(b) { b.classList.remove('active'); });
}

function finishAll() {
  stopPlay();
  CUR = STEPS.length - 1;
  renderAll();
  V('sc').style.display = 'none';
  hide('prog-wrap');
}

/* ───────────────────────── STEP CONTROLS ───────────────────────── */
function prevStep() {
  if (CUR > 0) { CUR--; updateStepUI(); drawDFAStep(CUR); highlightRow(CUR); }
}
function nextStep() {
  if (CUR < STEPS.length - 1) { CUR++; updateStepUI(); drawDFAStep(CUR); highlightRow(CUR); }
}
function togglePlay() {
  if (PLAYING) stopPlay(); else startPlay();
}
function getDelay() {
  var v = parseInt(V('speed').value);
  return [900, 650, 450, 280, 140][v - 1] || 450;
}
function startPlay() {
  PLAYING = true;
  V('sb-play').textContent = '\u23F8 Pause';
  PLAY_TIM = setInterval(function() {
    if (CUR >= STEPS.length - 1) { stopPlay(); return; }
    nextStep();
  }, getDelay());
}
function stopPlay() {
  PLAYING = false;
  clearInterval(PLAY_TIM);
  var b = V('sb-play');
  if (b) b.textContent = '\u25B6 Play';
}
function updateStepUI() {
  V('sb-prev').disabled = CUR <= 0;
  V('sb-next').disabled = CUR >= STEPS.length - 1;
  V('s-info').textContent = 'Step ' + (CUR + 1) + ' / ' + STEPS.length;
  var pct = STEPS.length > 1 ? (CUR / (STEPS.length - 1) * 100) : 100;
  V('prog-fill').style.width = pct + '%';
}
function highlightRow(idx) {
  document.querySelectorAll('.tbl tr[data-i]').forEach(function(r) { r.classList.remove('hl'); });
  var r = document.querySelector('.tbl tr[data-i="' + idx + '"]');
  if (r) { r.classList.add('hl'); r.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}

/* ───────────────────────── RENDER ALL ───────────────────────── */
function renderAll() {
  drawGraph('gc-nfa',  NFA.states, NFA.tr, NFA.fullAlpha, NFA.startState, NFA.acceptStates, 'nfa');
  drawGraph('gc-nfa2', NFA.states, NFA.tr, NFA.fullAlpha, NFA.startState, NFA.acceptStates, 'nfa2');
  drawDFAFull();
  renderStepsTable();
  renderNFATable();
  renderDFATable();
  renderInfoPanel();
  show('tester-panel');
  show('info-panel');
  showf('sbar');
  showf('export-bar');
  V('sbar-txt').innerHTML =
    '<span class="pill pg">\u2713 COMPLETE</span> &nbsp; DFA has <b style="color:var(--g)">' +
    DFA.dfaStates.size + '</b> states from <b style="color:var(--g3)">' +
    NFA.states.length + '</b> NFA states &nbsp;&middot;&nbsp; ' + STEPS.length + ' construction steps';
}

/* ───────────────────────── GRAPH ENGINE ───────────────────────── */
function layout(stateList, W, H, R) {
  var n   = stateList.length;
  var pos = {};
  if (!n) return pos;
  if (n === 1) { pos[stateList[0]] = { x: W / 2, y: H / 2 }; return pos; }

  if (n <= 8) {
    var cx = W / 2, cy = H / 2;
    var rx = Math.min(W / 2 - R - 22, 195);
    var ry = Math.min(H / 2 - R - 22, 125);
    stateList.forEach(function(s, i) {
      var a = (2 * Math.PI * i / n) - Math.PI / 2;
      pos[s] = { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
    });
  } else {
    var cols = Math.ceil(Math.sqrt(n));
    var rows = Math.ceil(n / cols);
    var cw   = W / (cols + 1);
    var rh   = H / (rows + 1);
    stateList.forEach(function(s, i) {
      pos[s] = { x: cw * (i % cols + 1), y: rh * (Math.floor(i / cols) + 1) };
    });
  }
  return pos;
}

function drawGraph(canvasId, stateList, tr, alphabet, startState, acceptStates, mode, hlState) {
  var c = V(canvasId);
  if (!c) return;

  var W = c.clientWidth || 560;
  var H = 300;
  var n = stateList.length;
  var R = Math.max(20, Math.min(27, 160 / Math.max(n, 1)));

  var pos = layout(stateList, W, H, R);

  var isNFA      = mode.indexOf('nfa') >= 0;
  var nodeBorder = isNFA ? '#5cb8ff' : '#5dffaa';
  var startBrd   = '#5dffaa';
  var acceptBrd  = '#ff5c8a';
  var bothBrd    = '#ffb85c';
  var edgeClr    = isNFA ? 'rgba(92,184,255,.55)' : 'rgba(93,255,170,.55)';
  var lblClr     = isNFA ? '#7ecdff' : '#7effc8';
  var arrowClr   = isNFA ? '#5cb8ff' : '#5dffaa';
  var deadClr    = '#1a1a3a';

  // Build edge map: from__to -> [symbols]
  var edgeMap = {};
  stateList.forEach(function(s) {
    alphabet.forEach(function(sym) {
      var dests   = tr[s] && tr[s][sym] ? tr[s][sym] : new Set();
      var destArr = dests instanceof Set
        ? Array.from(dests)
        : (Array.isArray(dests) ? dests : [dests]);

      destArr.forEach(function(d) {
        if (!d || d === '{}') return;
        var k = s + '__' + d;
        if (!edgeMap[k]) edgeMap[k] = [];
        if (edgeMap[k].indexOf(sym) < 0) edgeMap[k].push(sym);
      });
    });
  });

  var aid = 'arr-' + canvasId + mode;
  var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">';
  svg += '<defs>';
  svg += '<marker id="' + aid + '" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto">';
  svg += '<path d="M0,0 L0,6 L9,3 Z" fill="' + arrowClr + '"/></marker>';
  svg += '<filter id="gf' + mode + '">';
  svg += '<feGaussianBlur stdDeviation="2.5" result="cb"/>';
  svg += '<feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
  svg += '</defs>';

  // Draw edges
  Object.keys(edgeMap).forEach(function(k) {
    var parts = k.split('__');
    var from  = parts[0];
    var to    = parts.slice(1).join('__');
    if (!pos[from] || !pos[to]) return;
    var lbl = edgeMap[k].join(',');

    if (from === to) {
      // Self-loop
      var x = pos[from].x, y = pos[from].y;
      svg += '<path d="M' + (x - 15) + ',' + (y - R) +
             ' C' + (x - 42) + ',' + (y - 74) +
             ' ' + (x + 42) + ',' + (y - 74) +
             ' ' + (x + 15) + ',' + (y - R) + '"';
      svg += ' fill="none" stroke="' + edgeClr + '" stroke-width="1.5" marker-end="url(#' + aid + ')"/>';
      svg += '<text x="' + x + '" y="' + (y - R - 28) + '" text-anchor="middle"';
      svg += ' font-family="Space Mono,monospace" font-size="10" fill="' + lblClr + '">' + lbl + '</text>';
    } else {
      var fx = pos[from].x, fy = pos[from].y;
      var tx = pos[to].x,   ty = pos[to].y;
      var dx = tx - fx, dy = ty - fy;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / len, uy = dy / len;

      var revKey = to + '__' + from;
      var curved = edgeMap[revKey] ? 1 : 0;
      var offset = curved ? 18 : 0;
      var nx = -uy * offset, ny = ux * offset;

      var sx = fx + ux * R + nx, sy = fy + uy * R + ny;
      var ex = tx - ux * R + nx, ey = ty - uy * R + ny;
      var mx = (sx + ex) / 2 + nx * .6, my = (sy + ey) / 2 + ny * .6;

      if (curved) {
        svg += '<path d="M' + sx + ',' + sy + ' Q' + mx + ',' + my + ' ' + ex + ',' + ey + '"';
        svg += ' fill="none" stroke="' + edgeClr + '" stroke-width="1.5" marker-end="url(#' + aid + ')"/>';
        svg += '<text x="' + mx + '" y="' + (my - 5) + '" text-anchor="middle"';
        svg += ' font-family="Space Mono,monospace" font-size="10" fill="' + lblClr + '">' + lbl + '</text>';
      } else {
        svg += '<line x1="' + sx + '" y1="' + sy + '" x2="' + ex + '" y2="' + ey + '"';
        svg += ' stroke="' + edgeClr + '" stroke-width="1.5" marker-end="url(#' + aid + ')"/>';
        var lx = (sx + ex) / 2 - uy * 12;
        var ly = (sy + ey) / 2 + ux * 12;
        svg += '<text x="' + lx + '" y="' + ly + '" text-anchor="middle"';
        svg += ' font-family="Space Mono,monospace" font-size="10" fill="' + lblClr + '">' + lbl + '</text>';
      }
    }
  });

  // Start arrow
  if (pos[startState]) {
    var sx2 = pos[startState].x, sy2 = pos[startState].y;
    svg += '<line x1="' + (sx2 - R - 30) + '" y1="' + sy2 + '" x2="' + (sx2 - R - 3) + '" y2="' + sy2 + '"';
    svg += ' stroke="' + startBrd + '" stroke-width="2" marker-end="url(#' + aid + ')"/>';
    svg += '<text x="' + (sx2 - R - 34) + '" y="' + (sy2 - 7) + '" text-anchor="middle"';
    svg += ' font-family="Space Mono,monospace" font-size="8" fill="' + startBrd + '">start</text>';
  }

  // Draw nodes
  stateList.forEach(function(s) {
    if (!pos[s]) return;
    var x = pos[s].x, y = pos[s].y;

    var isAcc = acceptStates instanceof Set ? acceptStates.has(s) : acceptStates(s);
    var isSt  = s === startState;
    var isDead = (s === '{}' || s === '{\u2205}');
    var isHL   = s === hlState;

    var stroke = nodeBorder;
    if (isSt && isAcc) stroke = bothBrd;
    else if (isSt)     stroke = startBrd;
    else if (isAcc)    stroke = acceptBrd;
    if (isDead)        stroke = '#252545';

    var sw   = isHL ? '3.5' : '2.2';
    var fill = isDead ? deadClr : (isHL ? 'rgba(93,255,170,.08)' : '#0b0b18');

    svg += '<circle cx="' + x + '" cy="' + y + '" r="' + R + '"';
    svg += ' fill="' + fill + '"';
    svg += ' stroke="' + stroke + '" stroke-width="' + sw + '" filter="url(#gf' + mode + ')"/>';

    if (isAcc) {
      svg += '<circle cx="' + x + '" cy="' + y + '" r="' + (R - 5) + '"';
      svg += ' fill="none" stroke="' + stroke + '" stroke-width="1" opacity=".5"/>';
    }

    var lbl = s.length > 10 ? s.substring(0, 9) + '\u2026' : s;
    var fs  = lbl.length > 6 ? 7 : (lbl.length > 4 ? 9 : 11);
    svg += '<text x="' + x + '" y="' + (y + fs / 3) + '" text-anchor="middle"';
    svg += ' font-family="Space Mono,monospace" font-size="' + fs + '"';
    svg += ' fill="' + (isDead ? '#2a2a5a' : '#dde0f0') + '" font-weight="700">' + lbl + '</text>';
  });

  svg += '</svg>';
  c.innerHTML = svg;
}

function buildDFATransMap() {
  var dfaStates = DFA.dfaStates;
  var dfaTr     = DFA.dfaTr;
  var alphabet  = DFA.alphabet;
  var tr2 = {};
  dfaStates.forEach(function(sub, s) {
    tr2[s] = {};
    alphabet.forEach(function(sym) {
      var d = dfaTr[s] && dfaTr[s][sym];
      if (d) tr2[s][sym] = new Set([d]);
    });
  });
  return tr2;
}

function drawDFAFull(hlState) {
  var sl  = Array.from(DFA.dfaStates.keys());
  var tr2 = buildDFATransMap();
  drawGraph('gc-dfa',  sl, tr2, DFA.alphabet, DFA.startLabel, DFA.dfaAccept, 'dfa',  hlState);
  drawGraph('gc-dfa2', sl, tr2, DFA.alphabet, DFA.startLabel, DFA.dfaAccept, 'dfa2');
}

function drawDFAStep(idx) {
  if (!DFA) return;
  var seenSt = new Set();
  var seenTr = {};

  for (var i = 0; i <= idx; i++) {
    var st = STEPS[i];
    if (st.newState)  seenSt.add(st.newState);
    if (st.toState)   seenSt.add(st.toState);
    if (st.fromState) seenSt.add(st.fromState);
    if (st.tableRow) {
      var fr  = st.tableRow.from;
      var sym = st.tableRow.sym;
      var to  = st.tableRow.to;
      if (!seenTr[fr]) seenTr[fr] = {};
      if (!seenTr[fr][sym]) seenTr[fr][sym] = new Set();
      seenTr[fr][sym].add(to);
    }
  }

  var cur = STEPS[idx];
  var hl  = cur.toState || cur.newState;
  drawGraph('gc-dfa', Array.from(seenSt), seenTr, DFA.alphabet, DFA.startLabel, DFA.dfaAccept, 'dfa', hl);
}

/* ───────────────────────── TABLE RENDERERS ───────────────────────── */
function renderStepsTable() {
  var rows = STEPS.map(function(s, i) {
    var isAcc = DFA && DFA.dfaAccept.has(s.newState || s.toState);
    var badge = s.act === 'init'
      ? '<span class="pill pg">INIT</span>'
      : s.isNew
        ? '<span class="pill pp">NEW</span>'
        : '<span class="pill pb2">EXIST</span>';

    return '<tr data-i="' + i + '">' +
      '<td style="font-size:8px;color:var(--dim)">' + (i + 1) + '</td>' +
      '<td class="lbl">' + (s.newState || s.toState || '&mdash;') +
        (isAcc ? ' <span class="acc">\u2605</span>' : '') + '</td>' +
      '<td class="nss">{' + (s.nfaSubset || []).join(', ') + '}</td>' +
      '<td style="font-size:8px;color:var(--dim);max-width:240px;word-break:break-all;">' + s.desc + '</td>' +
      '<td>' + badge + '</td>' +
      '</tr>';
  }).join('');

  html('steps-tbl',
    '<table class="tbl"><thead><tr>' +
    '<th>#</th><th>DFA State</th><th>NFA Subset</th><th>Description</th><th>Type</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>'
  );
  hide('steps-empty');
  show('steps-tbl');
  V('steps-tbl').classList.add('ai');
}

function renderNFATable() {
  if (!NFA) return;
  var states = NFA.states;
  var alpha  = NFA.fullAlpha;
  var tr     = NFA.tr;
  var ss     = NFA.startState;
  var acc    = NFA.acceptStates;

  var h = '<table class="ttbl"><thead><tr><th>State</th>';
  alpha.forEach(function(sym) { h += '<th>' + sym + '</th>'; });
  h += '</tr></thead><tbody>';

  states.forEach(function(s) {
    var isA = acc.has(s), isS = s === ss;
    h += '<tr class="' + (isA ? 'accrow' : '') + '">';
    h += '<td class="rlbl">' + (isS ? '&rarr;' : '') + (isA ? '*' : '') + s + '</td>';
    alpha.forEach(function(sym) {
      var d = Array.from(tr[s] && tr[s][sym] ? tr[s][sym] : []);
      h += '<td>' + (d.length ? '{' + d.join(',') + '}' : '&empty;') + '</td>';
    });
    h += '</tr>';
  });

  h += '</tbody></table>';
  html('nfat-tbl', h);
  hide('nfat-empty');
  show('nfat-tbl');
}

function renderDFATable() {
  if (!DFA) return;
  var dfaStates = DFA.dfaStates;
  var dfaTr     = DFA.dfaTr;
  var sl        = DFA.startLabel;
  var acc       = DFA.dfaAccept;
  var alpha     = DFA.alphabet;

  var h = '<table class="ttbl"><thead><tr><th>DFA State</th><th>NFA Subset</th>';
  alpha.forEach(function(sym) { h += '<th>' + sym + '</th>'; });
  h += '</tr></thead><tbody>';

  dfaStates.forEach(function(sub, lbl) {
    var isA = acc.has(lbl), isS = lbl === sl;
    h += '<tr class="' + (isA ? 'accrow' : '') + '">';
    h += '<td class="rlbl">' + (isS ? '&rarr;' : '') + (isA ? '*' : '') + lbl + '</td>';
    h += '<td style="font-size:8px;color:var(--g3)">{' + Array.from(sub).join(', ') + '}</td>';
    alpha.forEach(function(sym) {
      h += '<td>' + (dfaTr[lbl] && dfaTr[lbl][sym] ? dfaTr[lbl][sym] : '&empty;') + '</td>';
    });
    h += '</tr>';
  });

  h += '</tbody></table>';
  html('dfat-tbl', h);
  hide('dfat-empty');
  show('dfat-tbl');
}

function renderInfoPanel() {
  var nc  = NFA.states.length;
  var dc  = DFA.dfaStates.size;
  var acc = DFA.dfaAccept;
  var sl  = DFA.startLabel;

  var cards = [
    { v: nc,           k: 'NFA States',    c: 'var(--g3)', bg: 'rgba(92,184,255,.06)',  bc: 'rgba(92,184,255,.2)' },
    { v: dc,           k: 'DFA States',    c: 'var(--g)',  bg: 'rgba(93,255,170,.06)',  bc: 'rgba(93,255,170,.2)' },
    { v: acc.size,     k: 'Accept States', c: 'var(--g2)', bg: 'rgba(255,92,138,.06)',  bc: 'rgba(255,92,138,.2)' },
    { v: STEPS.length, k: 'Total Steps',   c: 'var(--g4)', bg: 'rgba(255,184,92,.06)',  bc: 'rgba(255,184,92,.2)' },
  ];

  var cardsHTML = cards.map(function(c) {
    return '<div class="card" style="background:' + c.bg + ';border-color:' + c.bc + ';">' +
           '<div class="cv" style="color:' + c.c + '">' + c.v + '</div>' +
           '<div class="ck" style="color:' + c.c + '">' + c.k + '</div></div>';
  }).join('');

  var rows = [
    ['Start State',        '<span style="color:var(--g)">'  + sl + '</span>'],
    ['Accept States',      '<span style="color:var(--g2)">' + (Array.from(acc).join(', ') || 'none') + '</span>'],
    ['Has &epsilon;-Trans','<span style="color:var(--g4)">' + (NFA.hasEpsilon ? 'YES' : 'NO') + '</span>'],
    ['Alphabet',           '<span style="color:var(--g3)">{' + NFA.alphabet.join(', ') + '}</span>'],
    ['State ratio',        '<span style="color:var(--g5)">' + nc + ' NFA \u2192 ' + dc + ' DFA</span>'],
  ].map(function(r) {
    return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:10px;">' +
           '<span style="color:var(--dim)">' + r[0] + '</span>' + r[1] + '</div>';
  }).join('');

  html('info-body', '<div class="cards">' + cardsHTML + '</div>' + rows);
}

/* ───────────────────────── STRING TESTER ───────────────────────── */
function testString() {
  if (!DFA) return;
  var dfaTr = DFA.dfaTr;
  var sl    = DFA.startLabel;
  var acc   = DFA.dfaAccept;
  var raw   = V('test-str').value;
  var chars = raw === '' ? [] : raw.split('');
  var cur   = sl;
  var trace = ['<span style="color:var(--dim)">Start: <b style="color:var(--g3)">' + cur + '</b></span>'];
  var ok    = true;

  // Build animated input tape
  if (chars.length > 0) {
    var tapeHTML = chars.map(function(ch, i) {
      return '<div class="tcell" id="tc' + i + '">' + ch + '</div>';
    }).join('');
    V('tape').innerHTML = tapeHTML;
    show('tape-wrap');

    var step = 0;
    function animNext() {
      if (step > 0) {
        var prev = V('tc' + (step - 1));
        if (prev) prev.classList.replace('active', 'done');
      }
      var cell = V('tc' + step);
      if (cell && step < chars.length) cell.classList.add('active');
      step++;
      if (step <= chars.length) setTimeout(animNext, 110);
    }
    document.querySelectorAll('.tcell').forEach(function(c) { c.className = 'tcell'; });
    setTimeout(animNext, 40);
  } else {
    hide('tape-wrap');
  }

  // Run simulation
  chars.forEach(function(ch) {
    if (!ok) return;
    var nxt = dfaTr[cur] && dfaTr[cur][ch];
    if (!nxt) {
      trace.push('<span class="t-err">\u03B4(' + cur + ', ' + ch + ') = UNDEFINED \u2192 REJECT</span>');
      ok = false;
    } else {
      trace.push('<span class="t-ok">\u03B4(' + cur + ', ' + ch + ') = ' + nxt + '</span>');
      cur = nxt;
    }
  });

  var accepted = ok && acc.has(cur);
  var verdict  = accepted ? '\u2713 ACCEPTED' : '\u2717 REJECTED';
  var cls2     = accepted ? 'accepted' : 'rejected';
  var final    = ok
    ? '<div class="t-end">Final state: <b>' + cur + '</b>  \u2192  ' +
      (acc.has(cur)
        ? '<span style="color:var(--g)">ACCEPT \u2605</span>'
        : '<span style="color:var(--g2)">NOT ACCEPT</span>') + '</div>'
    : '';

  html('test-result',
    '<div class="tester-result ' + cls2 + '">' +
    verdict + ' &nbsp;&middot;&nbsp; &ldquo;' +
    (raw === '' ? '\u03B5 (empty string)' : raw) + '&rdquo;</div>' +
    '<div class="trace-box">' + trace.map(function(l) { return '<div>' + l + '</div>'; }).join('') + final + '</div>'
  );

  // Highlight final state on the DFA graph
  if (ok && DFA) drawDFAFull(cur);
}

/* ───────────────────────── TAB SWITCHES ───────────────────────── */
function gTab(name, el) {
  document.querySelectorAll('#gtabs .tab').forEach(function(t) { t.classList.remove('on'); });
  el.classList.add('on');
  ['g-nfa', 'g-dfa', 'g-both'].forEach(function(id) {
    var e = V(id); if (e) e.classList.remove('on');
  });
  var t = V('g-' + name); if (t) t.classList.add('on');
}

function tTab(name, el) {
  document.querySelectorAll('#ttabs .tab').forEach(function(t) { t.classList.remove('on'); });
  el.classList.add('on');
  ['t-steps', 't-nfat', 't-dfat'].forEach(function(id) {
    var e = V(id); if (e) e.classList.remove('on');
  });
  var t = V('t-' + name); if (t) t.classList.add('on');
}

/* ───────────────────────── EXPORT ───────────────────────── */
function copyDFATable(btn) {
  if (!DFA) return;
  var dfaStates = DFA.dfaStates;
  var dfaTr     = DFA.dfaTr;
  var sl        = DFA.startLabel;
  var acc       = DFA.dfaAccept;
  var alpha     = DFA.alphabet;

  var lines = ['DFA TRANSITION TABLE\n'];
  var hdr   = 'State'.padEnd(22) + 'NFA Subset'.padEnd(28) + alpha.join('\t\t');
  lines.push(hdr);
  lines.push('-'.repeat(hdr.length + 10));

  dfaStates.forEach(function(sub, lbl) {
    var pfx = (lbl === sl ? '\u2192' : '') + (acc.has(lbl) ? '*' : '');
    var row = (pfx + lbl).padEnd(22) + ('{' + Array.from(sub).join(',') + '}').padEnd(28);
    row += alpha.map(function(sym) {
      return dfaTr[lbl] && dfaTr[lbl][sym] ? dfaTr[lbl][sym] : '\u2205';
    }).join('\t\t');
    lines.push(row);
  });

  navigator.clipboard.writeText(lines.join('\n')).then(function() {
    var orig = btn.textContent;
    btn.textContent = '\u2713 Copied!';
    btn.classList.add('ok');
    setTimeout(function() { btn.textContent = orig; btn.classList.remove('ok'); }, 1600);
  });
}

function exportSVG(canvasId, name) {
  var c    = V(canvasId); if (!c) return;
  var svgEl = c.querySelector('svg'); if (!svgEl) return;
  var blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' });
  var a    = document.createElement('a');
  a.href   = URL.createObjectURL(blob);
  a.download = name + '-automaton.svg';
  a.click();
}

/* ───────────────────────── RESIZE ───────────────────────── */
window.addEventListener('resize', function() {
  if (NFA) {
    drawGraph('gc-nfa',  NFA.states, NFA.tr, NFA.fullAlpha, NFA.startState, NFA.acceptStates, 'nfa');
    drawGraph('gc-nfa2', NFA.states, NFA.tr, NFA.fullAlpha, NFA.startState, NFA.acceptStates, 'nfa2');
  }
  if (DFA) drawDFAFull();
});

/* ───────────────────────── AUTO-RUN ON LOAD ───────────────────────── */
window.addEventListener('load', function() {
  setTimeout(doConvert, 200);
});
