const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionButtons = [...document.querySelectorAll('.motion-toggle')];
const runners = [...document.querySelectorAll('[data-runner]')].map((node, i) => {
  const path = document.getElementById(node.dataset.runner);
  return {node, path, length: path.getTotalLength(), offset: (i % 3) / 3};
});
let motionRunning = !reducedMotion.matches, motionFrame = 0, motionElapsed = 2, lastTime = 0;
function drawMotion(seconds) {
  runners.forEach(({node,path,length,offset}) => {
    const phase = ((seconds / 12 + offset) % 1 + 1) % 1;
    const point = path.getPointAtLength(length * phase);
    node.setAttribute('cx', point.x); node.setAttribute('cy', point.y);
    node.setAttribute('opacity', Math.min(1,phase*14,(1-phase)*14));
  });
}
function syncMotion() { window.lawMotionPlaying=motionRunning;window.dispatchEvent(new CustomEvent('law-motion',{detail:{playing:motionRunning}})); motionButtons.forEach(button => {button.textContent = motionRunning ? 'Pause animation' : 'Resume animation'; button.setAttribute('aria-pressed', String(motionRunning));}); }
function motionTick(now) { if (!motionRunning) return; if (lastTime) motionElapsed += Math.min((now-lastTime)/1000,.1); lastTime=now; drawMotion(motionElapsed); motionFrame=requestAnimationFrame(motionTick); }
function pauseMotion() { motionRunning=false;cancelAnimationFrame(motionFrame);lastTime=0;syncMotion(); }
motionButtons.forEach(button => button.addEventListener('click', () => { if (motionRunning) pauseMotion(); else {motionRunning=true;syncMotion();motionFrame=requestAnimationFrame(motionTick);} }));
reducedMotion.addEventListener('change', e => { if (e.matches) pauseMotion(); });
// Leaving a tab suspends rendering without changing the user's motion choice.
document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(motionFrame);
  lastTime=0;
  if (!document.hidden && motionRunning && runners.length) motionFrame=requestAnimationFrame(motionTick);
});
window.drawLawFrame = seconds => { pauseMotion();drawMotion(seconds); };
drawMotion(2);syncMotion();if(motionRunning && runners.length)motionFrame=requestAnimationFrame(motionTick);

// Homepage motion images are muted loops, loaded only when visible and enabled.
(() => {
  const entries = [...document.querySelectorAll('.ambient-loop')].map(video => ({video, visible:false}));
  const update = entry => {
    const {video} = entry;
    if (!motionRunning || !entry.visible || document.hidden) { video.pause(); return; }
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    video.muted = true;
    video.play().catch(() => { if (video.readyState < 2) video.classList.remove('has-frame'); });
  };
  entries.forEach(entry => {
    entry.video.addEventListener('playing', () => entry.video.classList.add('has-frame'));
    entry.video.addEventListener('error', () => entry.video.classList.remove('has-frame'));
  });
  const updateAll = () => entries.forEach(update);
  window.addEventListener('law-motion', updateAll);
  document.addEventListener('visibilitychange', updateAll);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(changes => changes.forEach(change => {
      const entry = entries.find(item => item.video === change.target);
      entry.visible = change.isIntersecting;
      update(entry);
    }), {threshold:0.05});
    entries.forEach(entry => observer.observe(entry.video));
  } else { entries.forEach(entry => {entry.visible=true;}); updateAll(); }
})();

// All content is present in the HTML. Enhance it into selectable panels only
// when JavaScript is available, preserving reading access without scripts.
const families = ['world', 'horizon', 'group'];
function selectPanel(family, id, updateHash = false) {
  const panels = [...document.querySelectorAll(`[data-panel="${family}"]`)];
  if (!panels.some(panel => panel.id === id)) return;
  panels.forEach(panel => { panel.hidden = panel.id !== id; });
  document.querySelectorAll(`[data-family="${family}"]`).forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.select === id));
  });
  if (family === 'world') {
    const selected = panels.find(panel => panel.id === id);
    const visual = document.querySelector('[data-world-visual]');
    const slot = selected.querySelector('.world-scene-slot');
    if (visual && slot) slot.append(visual);
    document.querySelectorAll('.world-card').forEach(button => {
      const state = button.querySelector('.world-choice-state');
      if (state) state.textContent = button.dataset.select === id ? 'Viewing this future' : 'View future';
    });
  }
  if (family === 'group') document.querySelectorAll('[data-group-graphic]').forEach(group => group.classList.toggle('is-selected', group.dataset.groupGraphic === id));
  if (family === 'horizon') document.querySelectorAll('[data-curve]').forEach(curve => curve.classList.toggle('active', curve.dataset.curve === id));
  if (updateHash) history.pushState(null, '', `#${id}`);
}
function applyHash() {
  const id = location.hash.slice(1);
  families.forEach(family => {
    const panels = [...document.querySelectorAll(`[data-panel="${family}"]`)];
    if (panels.length) selectPanel(family, panels.find(panel => panel.id === id)?.id || panels[0].id);
  });
}
applyHash();
window.addEventListener('hashchange', applyHash);
window.addEventListener('popstate', applyHash);
document.querySelectorAll('[data-select]').forEach(button => {
  button.addEventListener('click', () => selectPanel(button.dataset.family, button.dataset.select, true));
});

// Concept definitions work with pointer hover, keyboard focus and touch.
(() => {
  let active = null;
  const close = () => {
    if (!active) return;
    active.tip.hidden = true;
    active.button.setAttribute('aria-expanded', 'false');
    active = null;
  };
  const position = () => {
    if (!active) return;
    const anchor = active.button.getBoundingClientRect();
    const tip = active.tip.getBoundingClientRect();
    const left = Math.max(18, Math.min(innerWidth - tip.width - 18, anchor.left + anchor.width / 2 - tip.width / 2));
    const below = anchor.bottom + 10;
    const top = below + tip.height <= innerHeight - 18 ? below : Math.max(18, anchor.top - tip.height - 10);
    active.tip.style.left = left + 'px';
    active.tip.style.top = top + 'px';
  };
  const show = (entry, pinned = false) => {
    if (active && active !== entry) close();
    active = entry;
    entry.pinned = pinned;
    entry.tip.hidden = false;
    entry.button.setAttribute('aria-expanded', 'true');
    position();
  };
  document.querySelectorAll('.term').forEach(button => {
    const entry = {button, tip: document.getElementById(button.getAttribute('aria-controls')), wrap: button.closest('.term-wrap'), pinned: false};
    if (!entry.tip) return;
    entry.wrap.addEventListener('mouseenter', () => { clearTimeout(entry.hideTimer); if (active !== entry) show(entry); });
    entry.wrap.addEventListener('mouseleave', () => { entry.hideTimer = setTimeout(() => { if (active === entry && !entry.pinned && document.activeElement !== button && !entry.wrap.matches(':hover')) close(); }, 180); });
    button.addEventListener('focus', () => show(entry));
    button.addEventListener('blur', () => { if (active === entry) close(); });
    button.addEventListener('click', () => {
      if (active === entry && entry.pinned) close();
      else show(entry, true);
    });
  });
  document.addEventListener('pointerdown', event => { if (active && !active.wrap.contains(event.target)) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && active) {close();event.preventDefault();} });
  document.addEventListener('scroll', () => {
    if (!active) return;
    const rect = active.button.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) close();
    else position();
  }, true);
  window.addEventListener('resize', position);
})();
