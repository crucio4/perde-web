/* ============================================================
   PERDE — landing page
   ============================================================ */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Nav: hairline on scroll ---------- */
  var navbar = document.getElementById('navbar');
  var ticking = false;

  function updateNav() {
    navbar.classList.toggle('scrolled', window.scrollY > 24);
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      requestAnimationFrame(updateNav);
      ticking = true;
    }
  }, { passive: true });
  updateNav();

  /* ---------- Nav: mobile ---------- */
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });

    navLinks.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  // Anything that isn't above the fold gets a soft entrance.
  var revealTargets = document.querySelectorAll(
    '.band .tag, .band .head, .band .sub, .channel, .channel-join, .channel-foot, ' +
    '.measure, .row, .note, .timing-col, .stat, .stats-foot, .matrix-scroll, ' +
    '.matrix-key, .limit, .chips, .fineprint, .q, .steps li, .get-actions'
  );

  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = Math.min(parseInt(el.dataset.revealIndex || '0', 10), 6) * 55;
        setTimeout(function () { el.classList.add('revealed'); }, delay);
        revealObserver.unobserve(el);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    // Stagger siblings that share a parent.
    var seen = new Map();
    revealTargets.forEach(function (el) {
      var key = el.parentNode;
      var i = seen.get(key) || 0;
      seen.set(key, i + 1);
      el.dataset.revealIndex = String(i);
      el.classList.add('will-reveal');
      revealObserver.observe(el);
    });
  }

  /* ============================================================
     Detection rig — a faithful-enough simulation of the real
     decision engine, running on scripted scores.
     Real values: soft 0.68 · window 5 of 8 · EMA a=0.45
     ============================================================ */
  (function detectionRig() {
    var rig = document.getElementById('rig');
    if (!rig) return;

    var elWindow  = document.getElementById('window');
    var elState   = document.getElementById('rigState');
    var elEma     = document.getElementById('mEma');
    var elHits    = document.getElementById('mHits');
    var elContent = document.getElementById('rigContent');
    var elLabel   = document.getElementById('rigContentLabel');
    var elCurtain = document.getElementById('curtain');
    var elMsg     = document.getElementById('curtainMsg');

    var WINDOW_SIZE = 8;
    var HITS_REQUIRED = 5;
    var SOFT = 0.68;
    var ALPHA = 0.45;
    var TICK = 420;

    // Scripted run: calm browsing → one high frame while scrolling
    // (must NOT block) → calm → sustained viewing → block.
    var SEQ = [
      { s: 0.04, l: 'browsing' },
      { s: 0.07, l: 'browsing' },
      { s: 0.03, l: 'browsing' },
      { s: 0.11, l: 'browsing' },
      { s: 0.88, l: 'thumbnail passing' },
      { s: 0.09, l: 'browsing' },
      { s: 0.05, l: 'browsing' },
      { s: 0.06, l: 'browsing' },
      { s: 0.42, l: 'sustained viewing' },
      { s: 0.71, l: 'sustained viewing' },
      { s: 0.66, l: 'sustained viewing' },
      { s: 0.79, l: 'sustained viewing' },
      { s: 0.84, l: 'sustained viewing' },
      { s: 0.88, l: 'sustained viewing' },
      { s: 0.91, l: 'sustained viewing' }
    ];

    var MESSAGES = [
      "You decided this wasn't who you wanted to be.",
      'The urge passes either way. Only one version of you is still here after.',
      'Nothing on the other side of this is new.',
      'You already know how the next twenty minutes feel.'
    ];

    // Build the 8 window slots.
    var slots = [];
    for (var i = 0; i < WINDOW_SIZE; i++) {
      var slot = document.createElement('span');
      elWindow.appendChild(slot);
      slots.push(slot);
    }

    var frames = [];
    var ema = 0;
    var cursor = 0;
    var msgIndex = 0;
    var timer = null;
    var running = false;

    function paint(hits, state, label, heat) {
      for (var i = 0; i < WINDOW_SIZE; i++) {
        var f = frames[frames.length - WINDOW_SIZE + i];
        slots[i].className = f === undefined ? '' : (f >= SOFT ? 'hit' : 'miss');
      }
      elEma.textContent = ema.toFixed(2);
      elHits.textContent = String(hits);
      elState.textContent = state;
      elState.setAttribute('data-state', state === 'watching' ? 'idle' : state);
      elLabel.textContent = label;
      elContent.setAttribute('data-heat', heat);
    }

    function reset() {
      frames = [];
      ema = 0;
      cursor = 0;
      elCurtain.classList.remove('down');
      paint(0, 'watching', 'browsing', 'cool');
    }

    function tick() {
      var step = SEQ[cursor];
      cursor++;

      frames.push(step.s);
      if (frames.length > 40) frames.shift();
      ema = ema + ALPHA * (step.s - ema);

      var recent = frames.slice(-WINDOW_SIZE);
      var hits = recent.filter(function (v) { return v >= SOFT; }).length;

      var heat = ema >= 0.6 ? 'hot' : (ema >= 0.28 ? 'warm' : 'cool');
      var state = hits >= 3 ? 'rising' : 'watching';

      if (hits >= HITS_REQUIRED) {
        paint(hits, 'blocked', 'blocked', 'hot');
        block();
        return;
      }

      paint(hits, state, step.l, heat);

      if (cursor >= SEQ.length) {
        cursor = 0;
        frames = [];
        ema = 0;
      }
      timer = setTimeout(tick, TICK);
    }

    function block() {
      elMsg.textContent = MESSAGES[msgIndex % MESSAGES.length];
      msgIndex++;
      elCurtain.classList.add('down');

      // Real app: minimum 3s on screen, then release, then 4s cooldown.
      timer = setTimeout(function () {
        elCurtain.classList.remove('down');
        paint(0, 'cooldown', 'cooldown 4s', 'cool');
        timer = setTimeout(function () {
          reset();
          timer = setTimeout(tick, TICK);
        }, 1600);
      }, 3200);
    }

    function start() {
      if (running) return;
      running = true;
      reset();
      timer = setTimeout(tick, TICK);
    }

    function stop() {
      running = false;
      clearTimeout(timer);
    }

    // Static, readable end-state when motion is reduced.
    if (reduceMotion) {
      frames = [0.06, 0.42, 0.71, 0.66, 0.79, 0.84, 0.88, 0.91];
      ema = 0.74;
      elMsg.textContent = MESSAGES[0];
      paint(5, 'blocked', 'blocked', 'hot');
      elCurtain.classList.add('down');
      return;
    }

    // Only run while visible — no reason to burn cycles off-screen.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? start() : stop();
      }, { threshold: 0.25 }).observe(rig);
    } else {
      start();
    }

    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });
  })();

  /* ============================================================
     Latest release from the GitHub API.
     Falls back silently to the APK committed in assets/.
     ============================================================ */
  (function latestRelease() {
    var REPO = 'crucio4/perde-app';

    function formatBytes(bytes) {
      if (!bytes) return '';
      var mb = bytes / (1024 * 1024);
      return (mb >= 100 ? Math.round(mb) : mb.toFixed(1)) + ' MB';
    }

    function formatDate(iso) {
      var d = new Date(iso);
      if (isNaN(d)) return '';
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    fetch('https://api.github.com/repos/' + REPO + '/releases/latest')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (release) {
        var apk = (release.assets || []).filter(function (a) {
          return /\.apk$/i.test(a.name);
        })[0];
        if (!apk) return;

        var size = formatBytes(apk.size);

        ['download-btn', 'download-btn-2'].forEach(function (id) {
          var btn = document.getElementById(id);
          if (!btn) return;
          btn.href = apk.browser_download_url;
          btn.setAttribute('download', apk.name);
        });

        ['download-btn-meta', 'download-btn-meta-2'].forEach(function (id) {
          var meta = document.getElementById(id);
          if (meta && size) meta.textContent = size;
        });

        var info = document.getElementById('release-info');
        var version = release.tag_name || release.name || '';
        if (info && version) {
          document.getElementById('release-version').textContent = version;
          document.getElementById('release-size').textContent = size;
          document.getElementById('release-date').textContent = formatDate(release.published_at);
          info.hidden = false;
        }

        // Keep the structured data in step with what's actually served.
        var ld = document.querySelector('script[type="application/ld+json"]');
        if (!ld) return;
        try {
          var schema = JSON.parse(ld.textContent);
          if (schema['@type'] !== 'SoftwareApplication') return;
          schema.downloadUrl = apk.browser_download_url;
          schema.softwareVersion = version.replace(/^v/, '');
          if (size) schema.fileSize = size.replace(' ', '');
          ld.textContent = JSON.stringify(schema, null, 2);
        } catch (e) {
          /* structured data stays as authored */
        }
      })
      .catch(function () {
        // No release, rate-limited, or offline — the committed APK link stands.
      });
  })();
})();
