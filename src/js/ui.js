/** Small shared UI helpers: escaping, toasts and a themed confirm dialog. */

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function toast(message, { timeout = 3200 } = {}) {
  const host = document.getElementById('toastHost');
  if (!host) return;

  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  host.append(el);

  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    el.classList.add('is-leaving');
    window.setTimeout(() => el.remove(), 260);
  };

  el.addEventListener('click', remove);
  window.setTimeout(remove, timeout);
}

/**
 * Themed promise-based confirmation dialog.
 * @returns {Promise<boolean>}
 */
export function confirmDialog({
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal';
    overlay.innerHTML = `
      <div class="modal__card" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        <div class="modal__actions">
          <button class="btn" type="button" data-answer="cancel">${escapeHtml(cancelLabel)}</button>
          <button class="btn ${danger ? 'btn--danger' : 'btn--accent'}" type="button" data-answer="confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    `;

    const finish = (value) => {
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(value);
    };

    const onKey = (event) => {
      if (event.key === 'Escape') finish(false);
    };

    overlay.addEventListener('click', (event) => {
      const button = event.target.closest('[data-answer]');
      if (button) {
        finish(button.dataset.answer === 'confirm');
      } else if (event.target === overlay) {
        finish(false);
      }
    });

    document.addEventListener('keydown', onKey);
    document.body.append(overlay);
    overlay.querySelector('[data-answer="confirm"]').focus();
  });
}
