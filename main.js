/* SynBio Oxford. Five jobs: the live plot, the gene behind the page, the mailing list form, the video reel, and hiding the header on the way down. */

/* ---------- Fig. 1: the repressilator ----------
   Model from Elowitz and Leibler, "A synthetic oscillatory network of
   transcriptional regulators", Nature 403 (2000), in its dimensionless form:

     dm_i/dt = -m_i + alpha / (1 + p_j^n) + alpha0
     dp_i/dt = -beta * (p_i - m_i)

   where gene i is repressed by protein j. Order: 0 lacI, 1 tetR, 2 cI.
   cI represses lacI, LacI represses tetR, TetR represses cI.
*/
(function () {
  var canvas = document.getElementById('trace');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var cds = document.querySelectorAll('#repressilator .cds');
  var cell = document.getElementById('cell-fill');

  var ALPHA = 216, ALPHA0 = 0.216, BETA = 5, HILL = 2;
  var H = 0.005;          // integration step
  var SAMPLE = 0.05;      // model time between plotted points
  var WINDOW = 26;        // model time shown across the plot, about three periods
  var SPEED = 1.8;        // model time per second of real time
  var YMAX = 70;
  var N = Math.round(WINDOW / SAMPLE);

  var m = [1, 2, 3], p = [1, 1.5, 2];
  var buf = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
  var head = 0;           // index of the oldest sample
  var carry = 0;

  function step() {
    var dm = [0, 0, 0], dp = [0, 0, 0], k;
    for (k = 0; k < 3; k++) {
      dm[k] = -m[k] + ALPHA / (1 + Math.pow(p[(k + 2) % 3], HILL)) + ALPHA0;
      dp[k] = -BETA * (p[k] - m[k]);
    }
    for (k = 0; k < 3; k++) { m[k] += H * dm[k]; p[k] += H * dp[k]; }
  }

  function advance(t) {
    carry += t;
    var perSample = Math.round(SAMPLE / H);
    while (carry >= SAMPLE) {
      for (var i = 0; i < perSample; i++) step();
      for (var k = 0; k < 3; k++) buf[k][head] = p[k];
      head = (head + 1) % N;
      carry -= SAMPLE;
    }
  }

  // Run past the start-up transient, then fill the window.
  for (var i = 0; i < 60000; i++) step();
  advance(WINDOW);

  var css = getComputedStyle(document.documentElement);
  function v(name) { return css.getPropertyValue(name).trim(); }
  var colours = [v('--blue'), v('--red'), v('--ochre')];
  var rule = v('--rule'), soft = v('--ink-soft');

  var w = 0, h = 0;
  function size() {
    var dpr = window.devicePixelRatio || 1;
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    var left = 28, top = 6, bottom = 8;
    var pw = w - left, ph = h - top - bottom;
    ctx.clearRect(0, 0, w, h);

    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = soft;
    ctx.strokeStyle = rule;
    ctx.lineWidth = 1;
    [0, 30, 60].forEach(function (tick) {
      var y = Math.round(top + ph - (tick / YMAX) * ph) + 0.5;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.fillText(String(tick), 0, y);
    });

    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    for (var k = 0; k < 3; k++) {
      ctx.strokeStyle = colours[k];
      ctx.beginPath();
      for (var i = 0; i < N; i++) {
        var val = buf[k][(head + i) % N];
        var x = left + (i / (N - 1)) * pw;
        var y = top + ph - (Math.min(val, YMAX) / YMAX) * ph;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }

    // Shade each gene in the diagram by how much of its protein is around.
    for (var g = 0; g < cds.length; g++) {
      var level = p[+cds[g].getAttribute('data-gene')];
      cds[g].style.fillOpacity = (0.08 + 0.92 * Math.min(level / 62, 1)).toFixed(3);
    }
    // The whole cell tints with its LacI level, so it blinks in time with the blue trace.
    if (cell) cell.style.fillOpacity = (0.03 + 0.22 * Math.min(p[0] / 62, 1)).toFixed(3);
  }

  size(); draw();
  window.addEventListener('resize', function () { size(); draw(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);

  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (still.matches) return;

  var visible = true, last = 0, raf = 0;
  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) { last = 0; return; }
    if (last) advance(Math.min((now - last) / 1000, 0.1) * SPEED);
    last = now;
    draw();
    raf = requestAnimationFrame(frame);
  }
  function wake() { if (!raf) raf = requestAnimationFrame(frame); }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) wake();
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', wake);
  wake();
})();

/* ---------- The gene behind the page ----------
   The background is the coding sequence of green fluorescent protein from
   Aequorea victoria (GenBank M62653, Prasher et al. 1992), written out codon
   by codon and repeated down the page. Where the pointer passes, each codon
   is swapped for the amino acid it codes for, then fades back.
*/
(function () {
  var canvas = document.getElementById('genome');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var GFP = 'ATGAGTAAAGGAGAAGAACTTTTCACTGGAGTTGTCCCAATTCTTGTTGAATTAGATGGTGATGTTAATGGGCACAAATTTTCTGTCAGTGGAGAGGGTGAAGGTGATGCAACATACGGAAAACTTACCCTTAAATTTATTTGCACTACTGGAAAACTACCTGTTCCATGGCCAACACTTGTCACTACTTTCTCTTATGGTGTTCAATGCTTTTCAAGATACCCAGATCATATGAAACAGCATGACTTTTTCAAGAGTGCCATGCCCGAAGGTTATGTACAGGAAAGAACTATATTTTTCAAAGATGACGGGAACTACAAGACACGTGCTGAAGTCAAGTTTGAAGGTGATACCCTTGTTAATAGAATCGAGTTAAAAGGTATTGATTTTAAAGAAGATGGAAACATTCTTGGACACAAATTGGAATACAACTATAACTCACACAATGTATACATCATGGCAGACAAACAAAAGAATGGAATCAAAGTTAACTTCAAAATTAGACACAACATTGAAGATGGAAGCGTTCAACTAGCAGACCATTATCAACAAAATACTCCAATTGGCGATGGCCCTGTCCTTTTACCAGACAACCATTACCTGTCCACACAATCTGCCCTTTCGAAAGATCCCAACGAAAAGAGAGACCACATGGTCCTTCTTGAGTTTGTAACAGCTGCTGGGATTACACATGGCATGGATGAACTATACAAATAA';

  // The standard genetic code, in TCAG order, and three-letter names.
  var BASES = 'TCAG';
  var TABLE = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
  var NAMES = { A: 'Ala', R: 'Arg', N: 'Asn', D: 'Asp', C: 'Cys', Q: 'Gln', E: 'Glu', G: 'Gly', H: 'His', I: 'Ile',
                L: 'Leu', K: 'Lys', M: 'Met', F: 'Phe', P: 'Pro', S: 'Ser', T: 'Thr', W: 'Trp', Y: 'Tyr', V: 'Val', '*': 'Ter' };
  var codons = [], residues = [];
  for (var i = 0; i < GFP.length; i += 3) {
    var c = GFP.substr(i, 3);
    codons.push(c);
    residues.push(NAMES[TABLE[BASES.indexOf(c[0]) * 16 + BASES.indexOf(c[1]) * 4 + BASES.indexOf(c[2])]]);
  }
  var LEN = codons.length;

  var FONT = '500 13px "IBM Plex Mono", ui-monospace, monospace';
  var ROW = 30;            // px between lines
  var RADIUS = 115;        // px reach of the pointer
  var FADE = 0.35;         // seconds for a translated codon to fade back
  var BASE_ALPHA = 0.048;  // the resting sequence
  var PEAK_ALPHA = 0.5;    // a freshly translated residue
  var INK = '26, 24, 54', BLUE = '39, 33, 119';

  var w = 0, h = 0, cell = 0, cols = 0;
  var rowText = {};        // cache of resting lines
  var live = new Map();    // row * 4096 + col -> activation, 0 to 1
  var pointer = null;      // last pointer position in window coordinates
  var raf = 0, last = 0;

  function size() {
    var dpr = window.devicePixelRatio || 1;
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = FONT;
    cell = ctx.measureText('ATG ').width;
    var n = Math.ceil(w / cell) + 1;
    if (n !== cols) { cols = n; rowText = {}; live.clear(); }
  }

  function line(row) {
    if (!rowText[row]) {
      var parts = [];
      for (var c = 0; c < cols; c++) parts.push(codons[(row * cols + c) % LEN]);
      rowText[row] = parts.join(' ');
    }
    return rowText[row];
  }

  function draw() {
    var scroll = window.scrollY || 0;
    var first = Math.floor(scroll / ROW), lastRow = Math.floor((scroll + h) / ROW);
    var busy = {};
    live.forEach(function (a, key) { busy[key >> 12] = true; });

    ctx.clearRect(0, 0, w, h);
    ctx.font = FONT;
    ctx.textBaseline = 'middle';
    for (var row = first; row <= lastRow; row++) {
      var y = Math.round(row * ROW + ROW / 2 - scroll);
      if (!busy[row]) {
        ctx.fillStyle = 'rgba(' + INK + ',' + BASE_ALPHA + ')';
        ctx.fillText(line(row), 0, y);
        continue;
      }
      for (var c = 0; c < cols; c++) {
        var a = live.get(row * 4096 + c) || 0;
        var idx = (row * cols + c) % LEN;
        if (a < 1) {
          ctx.fillStyle = 'rgba(' + INK + ',' + (BASE_ALPHA * (1 - a)).toFixed(3) + ')';
          ctx.fillText(codons[idx], c * cell, y);
        }
        if (a > 0) {
          ctx.fillStyle = 'rgba(' + BLUE + ',' + (PEAK_ALPHA * a).toFixed(3) + ')';
          ctx.fillText(residues[idx], c * cell, y);
        }
      }
    }
  }

  // Translate the codons around the pointer.
  function touch() {
    if (!pointer) return;
    var px = pointer.x, py = pointer.y + (window.scrollY || 0);
    var r0 = Math.floor((py - RADIUS) / ROW), r1 = Math.floor((py + RADIUS) / ROW);
    var c0 = Math.max(0, Math.floor((px - RADIUS) / cell)), c1 = Math.min(cols - 1, Math.floor((px + RADIUS) / cell));
    for (var row = Math.max(0, r0); row <= r1; row++) {
      for (var c = c0; c <= c1; c++) {
        var dx = c * cell + cell * 0.375 - px, dy = row * ROW + ROW / 2 - py;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d >= RADIUS) continue;
        var s = 1 - (d / RADIUS) * (d / RADIUS);   // full strength over most of the disc, soft only at the rim
        var key = row * 4096 + c;
        if (s > (live.get(key) || 0)) live.set(key, s);
      }
    }
    wake();
  }

  function frame(now) {
    raf = 0;
    var dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    live.forEach(function (a, key) {
      a -= dt / FADE;
      if (a <= 0) live.delete(key); else live.set(key, a);
    });
    draw();
    if (live.size) raf = requestAnimationFrame(frame); else last = 0;
  }
  function wake() { if (!raf) raf = requestAnimationFrame(frame); }

  size(); draw();
  window.addEventListener('resize', function () { size(); draw(); });
  window.addEventListener('scroll', function () { touch(); wake(); }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { size(); draw(); });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function move(e) { pointer = { x: e.clientX, y: e.clientY }; touch(); }
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerdown', move, { passive: true });
  document.addEventListener('pointerleave', function () { pointer = null; });
})();

/* ---------- Mailing list form ----------
   Sends the form to Mailchimp in the background and shows the answer in place.
   Mailchimp's embedded forms answer through a script callback (JSONP), which is
   the only way to read its reply from another site.
   If the request cannot be made, the form submits the ordinary way and opens
   our Mailchimp signup page with the address filled in.
*/
(function () {
  var form = document.getElementById('signup');
  var msg = document.getElementById('signup-msg');
  if (!form || !msg) return;
  var fid = (form.getAttribute('data-fid') || '').trim();
  if (!fid) return;

  var ENDPOINT = form.action.replace(/\/subscribe\/?$/, '/subscribe/post-json');
  var extras = form.querySelectorAll('.extra');
  var busy = false;

  // Mailchimp messages can contain links and a leading field number ("0 - ...").
  function plain(html) {
    var d = document.createElement('div');
    d.innerHTML = String(html || '');
    // Drop "click here" links, which would be dead text once the markup is removed.
    Array.prototype.forEach.call(d.querySelectorAll('a'), function (link) { link.parentNode.removeChild(link); });
    return (d.textContent || '').replace(/^\d+\s*-\s*/, '').trim();
  }

  function say(text, bad) {
    msg.textContent = text;
    msg.className = 'signup-msg wide' + (bad ? ' bad' : '');
  }

  // Mailchimp wants the position and subject after all: show those two questions.
  function askForMore() {
    Array.prototype.forEach.call(extras, function (box) {
      box.hidden = false;
      var field = box.querySelector('[data-mc]');
      if (field) field.required = true;
    });
    say('Two more details, then you are on the list.', false);
    var first = extras[0] && extras[0].querySelector('[data-mc]');
    if (first) first.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    busy = true;
    form.classList.add('busy');
    say('Sending.', false);

    var name = 'synbioSignup' + Date.now();
    var params = ['u=' + encodeURIComponent(form.elements.u.value), 'id=' + encodeURIComponent(form.elements.id.value),
                  'f_id=' + encodeURIComponent(fid), 'c=' + name];
    Array.prototype.forEach.call(form.querySelectorAll('[data-mc]'), function (el) {
      if (el.value) params.push(el.getAttribute('data-mc') + '=' + encodeURIComponent(el.value));
    });
    // Mailchimp's own bot trap: a field that must be sent empty.
    params.push(encodeURIComponent('b_' + form.elements.u.value + '_' + form.elements.id.value) + '=');

    var script = document.createElement('script');
    var timer = setTimeout(fallback, 10000);

    function tidy() {
      clearTimeout(timer);
      if (script.parentNode) script.parentNode.removeChild(script);
      busy = false;
      form.classList.remove('busy');
    }
    // Could not reach Mailchimp this way: hand over to its own page instead.
    function fallback() {
      tidy();
      window[name] = function () {};
      say('Opening the signup page.', false);
      form.submit();
    }

    window[name] = function (reply) {
      tidy();
      delete window[name];
      if (reply && reply.result === 'success') {
        var done = document.createElement('p');
        done.className = 'signup-done';
        done.setAttribute('role', 'status');
        done.textContent = plain(reply.msg) || 'Thank you. You are on the list.';
        form.parentNode.replaceChild(done, form);
        return;
      }
      var raw = String((reply && reply.msg) || '');
      var which = raw.match(/^(\d+)\s*-/);
      if (which && +which[1] >= 3 && extras[0] && extras[0].hidden) { askForMore(); return; }
      say(plain(raw) || 'That did not work. Please try again.', true);
    };
    script.onerror = fallback;
    script.src = ENDPOINT + '?' + params.join('&');
    document.head.appendChild(script);
  });
})();

/* ---------- Video reel ----------
   The reel behind the hero and the join section plays only while it is on
   screen, and not at all for people who have asked for reduced motion.
*/
(function () {
  var videos = document.querySelectorAll('.band-video');
  if (!videos.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    Array.prototype.forEach.call(videos, function (v) { v.removeAttribute('autoplay'); v.pause(); });
    return;
  }
  function play(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }

  if (!('IntersectionObserver' in window)) { Array.prototype.forEach.call(videos, play); return; }
  var watch = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) play(entry.target); else entry.target.pause();
    });
  }, { rootMargin: '100px' });
  Array.prototype.forEach.call(videos, function (v) { watch.observe(v); });
})();

/* ---------- Header ----------
   The top bar slides away while the page is scrolled down and comes back
   as soon as it is scrolled up, or when keyboard focus moves into it.
*/
(function () {
  var bar = document.getElementById('topbar');
  if (!bar) return;
  var lastY = window.scrollY || 0, ticking = false;

  function update() {
    ticking = false;
    var y = window.scrollY || 0;
    if (Math.abs(y - lastY) < 6) return;          // ignore jitter
    bar.classList.toggle('away', y > lastY && y > 80);
    lastY = y;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  bar.addEventListener('focusin', function () { bar.classList.remove('away'); });
})();
