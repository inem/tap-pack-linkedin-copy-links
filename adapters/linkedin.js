// Observed in eight captured SDUI main-feed documents, 2026-09-08.
// Bind a card to ITS menu request; nested comment/reshare URNs are not its identity.
export const cards = '[data-testid="mainFeed"] [role="listitem"][componentkey], article[data-urn], [role="article"][data-urn]';
const assignment = /^\s*window\.__como_rehydration__\s*=\s*([\s\S]*?)\s*;?\s*$/;
const MAX_SOURCE = 16 * 1024 * 1024;

function* objects(root) {
  const pending = [root];
  let remaining = 300000;
  while (pending.length) {
    if (--remaining < 0) throw new Error('Page model exceeds inspection limit');
    const value = pending.pop();
    if (!value || typeof value !== 'object') continue;
    yield value;
    for (const child of Object.values(value)) {
      if (child && typeof child === 'object') pending.push(child);
    }
  }
}

export function page_rows(source) {
  if (typeof source !== 'string' || source.length > MAX_SOURCE) return [];
  try {
    const match = source.match(assignment);
    if (!match) return [];
    const chunks = JSON.parse(match[1]);
    if (!Array.isArray(chunks) || chunks.some(x => typeof x !== 'string')) return [];
    return stream_rows(chunks.join(''));
  } catch { return []; }
}

// Pagination sends the same data rows directly, without the HTML assignment.
export function stream_rows(source) {
  if (typeof source !== 'string' || source.length > MAX_SOURCE) return [];
  const rows = [];
  for (const line of source.split('\n')) {
    const colon = line.indexOf(':');
    if (colon < 1 || !/^[0-9a-f]+$/i.test(line.slice(0, colon))) continue;
    try { rows.push(JSON.parse(line.slice(colon + 1))); } catch { /* Non-JSON RSC row. */ }
  }
  return rows;
}

export function post_bindings(rows) {
  const index = new Map();
  try {
    for (const card of objects(rows)) {
      if (card.role !== 'listitem' || typeof card.componentkey !== 'string') continue;
      const candidates = [];
      for (const carrier of objects(card)) {
        const menuKey = carrier.buttonProps?.componentkey;
        if (!menuKey || !carrier.triggers) continue;
        for (const request of objects(carrier.triggers)) {
          if (request.requestId !== 'feedUpdateControlMenuRequest') continue;
          const items = request.requestedArguments?.payload?.updateKey?.items;
          const identity = items?.length === 1 ? items[0]?.feedUpdateUrn : null;
          // A sponsored identity is enough to hide its own card, not to derive a URL.
          if (identity && Object.keys(identity).length === 1 &&
              identity.updateUrnSponsoredContentV2Urn &&
              typeof identity.updateUrnSponsoredContentV2Urn === 'object') {
            candidates.push({menuKey, promoted:true});
            continue;
          }
          const id = identity && Object.keys(identity).length === 1
            ? identity.updateUrnActivityUrn?.activityUrn?.activityId : null;
          candidates.push(typeof id === 'string' && /^\d{10,25}$/.test(id)
            ? {menuKey, url: `https://www.linkedin.com/feed/update/urn:li:activity:${id}/`} : null);
        }
      }
      // Duplicate/conflicting models and unknown variants must not produce a guessed link.
      const binding = candidates.length === 1 ? candidates[0] : null;
      if (index.has(card.componentkey)) index.set(card.componentkey, null);
      else index.set(card.componentkey, binding);
    }
  } catch { return new Map(); }
  return index;
}

export function site(document) {
  let previous, index = new Map();
  function refresh() {
    // LinkedIn removes its bootstrap script after hydration. Keep only the
    // already resolved bindings; their native menu keys still gate each card.
    const element = document.getElementById('rehydrate-data');
    if (!element) return;
    const source = element.textContent || '';
    if (source !== previous) { previous = source; index = post_bindings(page_rows(source)); }
  }
  function binding_for(card) {
    refresh();
    if (!card?.isConnected || !card.matches(cards)) return null;
    const binding = index.get(card.getAttribute('componentkey'));
    if (!binding) return null;
    const menu = [...card.querySelectorAll('button[componentkey]')].find(button =>
      button.getAttribute('componentkey') === binding.menuKey && button.closest('[role="listitem"][componentkey]') === card);
    return menu ? {...binding, menu} : null;
  }
  function selected(card) {
    if (card?.isConnected && card.getAttribute('data-urn')?.startsWith('urn:li:') && card.matches('[role="article"][data-urn], article[data-urn]')) {
      const id = /^urn:li:activity:(\d{10,25})$/.exec(card.getAttribute('data-urn'))?.[1];
      const menus = [...card.querySelectorAll('button.feed-shared-control-menu__trigger:not([data-tap-linkedin-copy]):not([data-tap-linkedin-save])')].filter(b => b.closest('[data-urn]') === card);
      if (id && menus.length === 1) return {menu:menus[0], url:`https://www.linkedin.com/feed/update/urn:li:activity:${id}/`};
      return null;
    }
    const binding = binding_for(card);
    return binding && !binding.promoted ? {menu:binding.menu, url:binding.url} : null;
  }
  function promoted(card) { return binding_for(card)?.promoted === true; }
  function ingest(source) {
    refresh();
    const incoming = post_bindings(stream_rows(source));
    for (const [key, binding] of incoming) {index.delete(key);index.set(key, binding);}
    // Keep a bounded index, never response bodies or unrelated feed material.
    while (index.size > 5000) index.delete(index.keys().next().value);
    return incoming.size;
  }
  return {selected, promoted, ingest, cards: () => [...document.querySelectorAll(cards)]};
}
