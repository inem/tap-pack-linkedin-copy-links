import {action_button} from 'tap-pack-sdk/ui';
import {site} from './linkedin.js';
import {promoted_badge} from './linkedin-promoted.js';

// Keep LinkedIn's right-rail slot and original three-column geometry, while
// removing the site's own filler. Future TAP content can opt into the reserved
// rail with data-tap-linkedin-aside. CSS also covers SPA navigation.
export function hide_sidebar_extras(document) {
  const style = document.createElement('style');
  style.textContent = `
    aside[aria-label="Aside"] > :not([data-tap-linkedin-aside]),
    [componentkey="feedRightNavGamesComponentRef"],
    div:has(> [componentkey="feedRightNavGamesComponentRef"]:only-child),
    section.ad-banner-container:has(> iframe[data-ad-banner]),
    iframe[componentkey="MainFeedDesktopNav_feed_ad"],
    div:has(> iframe[componentkey="MainFeedDesktopNav_feed_ad"]),
    div:has(> div:only-child > iframe[componentkey="MainFeedDesktopNav_feed_ad"])
    { display: none !important; }
  `;
  (document.head || document.documentElement).append(style);
  return {dispose() {style.remove();}};
}

// LinkedIn SDUI feed, observed 2026-09-09. The native menu is a 32px icon
// button containing span > svg. Borrow only live presentation classes, which
// carry theme/hover/focus. Never clone componentkey, menu ARIA, IDs or handlers.
function appearance(menu) {
  const content = menu.firstElementChild;
  const icon = content?.querySelector('svg');
  return {buttonClass:menu.className, contentClass:content?.className || '',
    iconClass:icon?.getAttribute('class') || '', iconSize:icon?.getAttribute('width') || 16};
}
export function post_actions(document, action, posts=site(document)) {
  return {
    targets:posts.cards,
    resolve(post) {
      const found = posts.selected(post);
      return found && {key:found.url, anchor:found.menu, link:found.url, object:post};
    },
    present(binding) {
      const view = action_button(document, {...action, appearance:appearance(binding.anchor)});
      if (action.marker) view.element.setAttribute(action.marker,'');
      view.sync = next => view.appearance(appearance(next.anchor));
      return view;
    },
    attributes:['componentkey','role','data-testid','class','data-urn'],
  };
}


// Model/badge-bound hiding also covers pagination and recycled DOM cards.
export function hide_promoted(document, posts) {
  const marker = 'data-tap-linkedin-promoted';
  const style = document.createElement('style');
  style.textContent = '[' + marker + '] { display:none !important; }';
  (document.head || document.documentElement).append(style);
  const marked = new Set();
  let pending = false, disposed = false;
  function refresh() {
    if (disposed) return;
    const current = new Set(posts.cards().filter(card => posts.promoted(card) || promoted_badge(card)));
    for (const card of marked) if (!current.has(card)) {card.removeAttribute(marker);marked.delete(card);}
    for (const card of current) if (!marked.has(card)) {card.setAttribute(marker, '');marked.add(card);}
  }
  const observer = new document.defaultView.MutationObserver(() => {
    if (pending || disposed) return;
    pending = true;
    queueMicrotask(() => {pending = false;refresh();});
  });
  observer.observe(document.documentElement, {subtree:true, childList:true, attributes:true,
    attributeFilter:['componentkey','role','data-testid']});
  refresh();
  return {refresh, dispose() {disposed=true;observer.disconnect();style.remove();
    for (const card of marked) card.removeAttribute(marker);marked.clear();}};
}
