(() => {
  const config = window.lawEntry;
  const form = document.querySelector('#entry-form');
  const input = document.querySelector('#password');
  const error = document.querySelector('#entry-error');
  const submit = document.querySelector('.entry-submit');
  const reveal = document.querySelector('.password-reveal');
  const next = config.destination(new URLSearchParams(location.search).get('next'));
  reveal.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    reveal.textContent = show ? 'Hide' : 'Show';
    reveal.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    reveal.setAttribute('aria-pressed', String(show));
  });
  input.addEventListener('input', () => { error.textContent = ''; input.removeAttribute('aria-invalid'); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled) return;
    submit.disabled = true;
    error.textContent = '';
    try {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input.value));
      const hash = [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
      if (hash !== config.passwordHash) {
        error.textContent = 'That password didn’t match. Please try again.';
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
      }
      sessionStorage.setItem(config.storageKey, config.passwordHash);
      document.body.classList.add('is-entering');
      setTimeout(() => location.replace(next), matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240);
    } catch (_) {
      error.textContent = 'Please allow browser storage and open this page over HTTPS or localhost.';
    } finally { submit.disabled = false; }
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motion = document.querySelector('.entry-motion');
  let playing = !reduced.matches;
  const sync = () => {
    window.lawMotionPlaying = playing;
    motion.textContent = playing ? 'Pause animation' : 'Resume animation';
    motion.setAttribute('aria-pressed', String(playing));
    window.dispatchEvent(new CustomEvent('law-motion', {detail:{playing}}));
  };
  motion.addEventListener('click', () => { playing = !playing; sync(); });
  reduced.addEventListener('change', event => { if (event.matches) { playing = false; sync(); } });
  sync();
})();
