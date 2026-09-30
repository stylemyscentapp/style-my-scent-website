(() => {
  const form = document.getElementById('waitlist-form');
  const input = document.getElementById('waitlist-email');
  const status = document.getElementById('waitlist-status');
  if (!form || !input || !status) return;
  const button = form.querySelector('button[type="submit"]');
  let pending = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending) return;
    input.value = input.value.trim();
    if (!form.reportValidity()) return;
    pending = true;
    form.setAttribute('aria-busy', 'true');
    if (button) button.disabled = true;
    status.textContent = 'Adding you…';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('https://kdspdaffkbxxxgxlfnjo.supabase.co/functions/v1/website-launch-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: input.value }),
        signal: controller.signal
      });
      if (!response.ok) {
        status.textContent = response.status === 429
          ? 'Too many attempts. Please wait a moment and try again.'
          : 'We couldn’t confirm your signup. Your email is still here—please try again.';
        return;
      }
      status.textContent = 'You’re on the list—we’ll send you Style My Scent app updates.';
      form.reset();
    } catch (error) {
      status.textContent = error.name === 'AbortError'
        ? 'We couldn’t confirm your signup in time. Your email is still here—please try again.'
        : 'We couldn’t connect. Check your connection and try again.';
    } finally {
      clearTimeout(timer);
      pending = false;
      form.removeAttribute('aria-busy');
      if (button) button.disabled = false;
    }
  });
})();
