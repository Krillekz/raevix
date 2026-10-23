/**
 * Anime hub: one shelf for streaming services.
 *
 * Sites that permit framing open in a Private Browser window. Sites that send
 * X-Frame-Options/CSP `frame-ancestors` open in a real tab. This is a directory,
 * not a proxy: Raevix is static and cannot tunnel or rewrite another site.
 */

import { mountBrowser } from './browser.js';
import { toast } from './ui.js';
import { openWindow } from './window-manager.js';

const SITES = [
  {
    id: 'hianime',
    name: 'HiAnime',
    url: 'https://hianime.ms/',
    tag: 'Sub & dub',
    glyph: '🌸',
    accent: '#ff8fc7',
    note: 'Large sub and dub catalog with a fast player.',
    embed: false
  },
  {
    id: 'retrocrush',
    name: 'RetroCrush',
    url: 'https://www.retrocrush.tv/home',
    tag: 'Classic',
    glyph: '📼',
    accent: '#ff9b3d',
    note: 'Retro and classic anime, free with ads.',
    embed: false
  },
  {
    id: 'tubi',
    name: 'Tubi',
    url: 'https://tubitv.com/',
    tag: 'Free TV',
    glyph: '🎬',
    accent: '#ff6a3d',
    note: 'Free movies and TV, including an anime section.',
    embed: false
  },
  {
    id: 'pluto',
    name: 'Pluto TV',
    url: 'https://pluto.tv/',
    tag: 'Live TV',
    glyph: '📺',
    accent: '#ffd34d',
    note: 'Free live channels plus on-demand anime.',
    embed: true
  },
  {
    id: '4anime',
    name: '4anime',
    url: 'https://4anime.com.ro/',
    tag: 'Sub & dub',
    glyph: '🎞️',
    accent: '#46e58a',
    note: 'Anime streaming with English subs and dubs.',
    embed: true
  },
  {
    id: 'animepahe',
    name: 'AnimePahe',
    url: 'https://animepahe.ch/',
    tag: 'Downloads',
    glyph: '🌙',
    accent: '#b28dff',
    note: 'Streaming and download links for current shows.',
    embed: true
  },
  {
    id: 'animeheaven',
    name: 'AnimeHeaven',
    url: 'https://animeheaven.me/',
    tag: 'Catalog',
    glyph: '☁️',
    accent: '#48c6ff',
    note: 'Subbed anime catalog with an airing schedule.',
    embed: true
  },
  {
    id: 'animeflixtv',
    name: 'AnimeFlix TV',
    url: 'https://animeflixtv.com/',
    tag: 'HD',
    glyph: '🔥',
    accent: '#ff2f4d',
    note: 'HD sub and dub streaming with a simple layout.',
    embed: true
  },
  {
    id: 'animixplay',
    name: 'AniMixPlay',
    url: 'https://animixplay.pw/',
    tag: 'Aggregator',
    glyph: '🎧',
    accent: '#ff9b3d',
    note: 'Anime index that pulls from multiple sources.',
    embed: true
  },
  {
    id: '9anime',
    name: '9anime',
    url: 'https://9anime.me.uk/',
    tag: 'Sub & dub',
    glyph: '9️⃣',
    accent: '#8bff9b',
    note: 'Large sub and dub library with a familiar player.',
    embed: true
  }
];

function openInside(site) {
  openWindow({
    key: `browser:anime-${site.id}`,
    title: `Anime · ${site.name}`,
    icon: 'assets/icons/anime.svg',
    width: 1080,
    height: 720,
    flush: true,
    mount: (body) => mountBrowser(body, site.url)
  });
  toast(`${site.name} is loading in a Private Browser window.`);
}

function openOutside(site) {
  const opened = window.open(site.url, '_blank');
  if (!opened) {
    toast(`Your browser blocked the ${site.name} tab. Allow pop-ups and try again.`);
    return;
  }
  try {
    opened.opener = null;
  } catch (error) {
    console.warn('[Raevix] could not detach opener', error);
  }
  toast(`${site.name} opened in a new tab — the site blocks embedding.`);
}

export function mountAnime(body) {
  body.innerHTML = `
    <div class="anime">
      <header class="anime__head">
        <div>
          <p class="eyebrow">Watch</p>
          <h3 class="app__title">Anime</h3>
          <p class="app__sub">Ten streaming services on one shelf. Seven open right inside Raevix.</p>
        </div>
        <span class="anime__count"><strong>${SITES.length}</strong><small>sites</small></span>
      </header>

      <div class="anime__notice" role="note">
        <span class="anime__noticeicon" aria-hidden="true">i</span>
        <div>
          <strong>Embedding depends on the service</strong>
          <p>
            RetroCrush, Tubi and HiAnime refuse to be framed, so they open in a new tab. The other
            seven load in a Private Browser window. This is a link shelf, not a proxy — Raevix is
            static and cannot tunnel traffic or bypass network filters.
          </p>
        </div>
      </div>

      <div class="anime__grid">
        ${SITES.map((site) => `
          <article class="anime-card" data-anime="${site.id}" style="--anime-accent: ${site.accent}">
            <span class="anime-card__glyph" aria-hidden="true">${site.glyph}</span>
            <div class="anime-card__body">
              <div class="anime-card__top">
                <strong>${site.name}</strong>
                <span class="anime-card__mode">${site.embed ? 'In Raevix' : 'New tab'}</span>
              </div>
              <p>${site.note}</p>
              <div class="anime-card__foot">
                <span class="anime-card__tag">${site.tag}</span>
                <button class="anime-card__open" type="button" data-open="${site.id}">
                  ${site.embed ? 'Open in Raevix' : 'Open site'}
                  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.4 2.6h4v4"/><path d="M13.4 2.6 7.4 8.6"/><path d="M12 9.6v3a1.4 1.4 0 0 1-1.4 1.4H3.4A1.4 1.4 0 0 1 2 12.6V5.4A1.4 1.4 0 0 1 3.4 4h3"/></svg>
                </button>
              </div>
            </div>
          </article>
        `).join('')}
      </div>

      <p class="anime__foot">
        Raevix does not host, proxy or control any of these services. Availability, accounts, ads and
        content are handled by each provider.
      </p>
    </div>
  `;

  body.querySelectorAll('[data-open]').forEach((button) => {
    button.addEventListener('click', () => {
      const site = SITES.find((entry) => entry.id === button.dataset.open);
      if (!site) return;
      if (site.embed) openInside(site);
      else openOutside(site);
    });
  });
}
