/**
 * Chrome Extension Picks.
 *
 * A static page cannot install extensions into a Google account — Google
 * removed silent/inline installs years ago. This window is an honest shortcut:
 * it explains the limit, links every pick to its official Chrome Web Store
 * listing, and points admins at managed force-install policies.
 */

import { toast } from './ui.js';

const STORE = 'https://chromewebstore.google.com/detail';

const PICKS = [
  {
    name: 'uBlock Origin',
    tag: 'Privacy',
    glyph: '🛡️',
    accent: '#48c6ff',
    note: 'Blocks ads, trackers and malicious domains with almost no overhead. Add this one first.',
    id: 'cjpalhdlnbpafiamejdnhcphjbkeiagm'
  },
  {
    name: 'Dark Reader',
    tag: 'Comfort',
    glyph: '🌙',
    accent: '#b28dff',
    note: 'Generates a dark theme for every site, with brightness and contrast you control.',
    id: 'eimadpbcbfnmbkopoojfekhnkhdbieeh'
  },
  {
    name: 'Bitwarden',
    tag: 'Security',
    glyph: '🔐',
    accent: '#6ad8ff',
    note: 'Free open-source password manager that fills logins and syncs across devices.',
    id: 'nngceckbapebfimnlniiiahkandclblb'
  },
  {
    name: 'SponsorBlock',
    tag: 'YouTube',
    glyph: '⏭️',
    accent: '#46e58a',
    note: 'Crowdsourced skipping for sponsor reads, intros and outros on YouTube.',
    id: 'mnjggcdmjocbbbhaepdhchncahnbgone'
  },
  {
    name: 'Privacy Badger',
    tag: 'Privacy',
    glyph: '🦡',
    accent: '#8bff9b',
    note: "EFF's tracker blocker learns which domains follow you and blocks them automatically.",
    id: 'pkehgijcmpdhfbdbbnkijodmdjhbjlgp'
  },
  {
    name: 'Tampermonkey',
    tag: 'Power tools',
    glyph: '🐒',
    accent: '#ff9b3d',
    note: 'Runs userscripts so you can tweak pages, add shortcuts and automate small tasks.',
    id: 'dhdgffkkebhmkfjojejmpbldmpobfkfo'
  },
  {
    name: 'Video Speed Controller',
    tag: 'YouTube',
    glyph: '⏩',
    accent: '#ffd34d',
    note: 'Speed up, slow down and jump through any HTML5 video with keyboard shortcuts.',
    id: 'nffaoalbilbmmfgbnbgppjihopabppdk'
  },
  {
    name: 'Google Translate',
    tag: 'Language',
    glyph: '🌐',
    accent: '#ff8fc7',
    note: 'Translate whole pages or selected text without leaving the tab.',
    id: 'aapbdbdomjkkjkaonfhkkikfgjllcleb'
  }
];

function storeUrl(extension) {
  return `${STORE}/${extension.id}`;
}

export function mountExtensions(body) {
  body.innerHTML = `
    <section class="ext">
      <header class="ext__head">
        <div>
          <p class="eyebrow">Chrome</p>
          <h3 class="app__title">Extension Picks</h3>
          <p class="app__sub">Eight trustworthy add-ons, with the store page for each.</p>
        </div>
        <span class="ext__count"><strong>${PICKS.length}</strong><small>picks</small></span>
      </header>

      <div class="ext__notice" role="note">
        <span class="ext__noticeicon" aria-hidden="true">!</span>
        <div>
          <strong>A website cannot install extensions for you</strong>
          <p>
            Chrome extensions live in a browser profile, not a Google account, and Google blocks silent
            installs. There is no API that lets this page add them for you. Instead, every button below
            opens the official store listing, where you press <em>Add to Chrome</em> once and confirm.
          </p>
        </div>
      </div>

      <div class="ext__actions">
        <a class="btn btn--accent" href="https://chromewebstore.google.com/" target="_blank" rel="noopener noreferrer">
          Open Chrome Web Store
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.4 2.6h4v4"/><path d="M13.4 2.6 7.4 8.6"/><path d="M12 9.6v3a1.4 1.4 0 0 1-1.4 1.4H3.4A1.4 1.4 0 0 1 2 12.6V5.4A1.4 1.4 0 0 1 3.4 4h3"/></svg>
        </a>
        <button class="btn" id="extCopy" type="button">Copy the list</button>
      </div>

      <div class="ext__grid">
        ${PICKS.map((extension) => `
          <article class="ext__card" style="--ext-accent: ${extension.accent}">
            <span class="ext__icon" aria-hidden="true">${extension.glyph}</span>
            <div class="ext__body">
              <div class="ext__name">
                <strong>${extension.name}</strong>
                <span>${extension.tag}</span>
              </div>
              <p>${extension.note}</p>
              <a class="ext__add" href="${storeUrl(extension)}" target="_blank" rel="noopener noreferrer">
                Add to Chrome
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.4 2.6h4v4"/><path d="M13.4 2.6 7.4 8.6"/><path d="M12 9.6v3a1.4 1.4 0 0 1-1.4 1.4H3.4A1.4 1.4 0 0 1 2 12.6V5.4A1.4 1.4 0 0 1 3.4 4h3"/></svg>
              </a>
            </div>
          </article>
        `).join('')}
      </div>

      <div class="ext__sync">
        <h4>Make them follow your Google account</h4>
        <p>
          In Chrome, sign in with the same Google account and turn on sync (Settings → You and Google →
          Sync). Extensions you install then sync to every signed-in device. Without sync they stay in
          the one browser profile.
        </p>
      </div>

      <div class="ext__managed">
        <h4>On a school or work account?</h4>
        <p>
          A regular user cannot push extensions into a managed account. Only a Google Workspace
          administrator can force-install them for everyone from the Admin console, using Chrome
          Enterprise extension policies.
        </p>
        <a class="ext__link" href="https://support.google.com/chrome/a/answer/9296680" target="_blank" rel="noopener noreferrer">
          Read the admin force-install guide
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.4 2.6h4v4"/><path d="M13.4 2.6 7.4 8.6"/><path d="M12 9.6v3a1.4 1.4 0 0 1-1.4 1.4H3.4A1.4 1.4 0 0 1 2 12.6V5.4A1.4 1.4 0 0 1 3.4 4h3"/></svg>
        </a>
      </div>

      <p class="ext__foot">Chrome Web Store listings are provided by Google · Raevix does not host or modify extensions.</p>
    </section>
  `;

  body.querySelector('#extCopy')?.addEventListener('click', async () => {
    const list = PICKS.map((extension) => extension.name).join('\n');

    try {
      await navigator.clipboard.writeText(list);
      toast('Extension list copied to the clipboard.');
    } catch (error) {
      console.warn('[Raevix] clipboard unavailable', error);
      toast('Clipboard is blocked here — open the store and pick them manually.');
    }
  });
}
