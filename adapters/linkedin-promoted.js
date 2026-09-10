// LinkedIn feed promotion metadata observed on the live SDUI feed, 2026-09-09.
// Inspect only the card header metadata; never search arbitrary post prose.
export function promoted_badge(card) {
  return [...card.querySelectorAll('p[componentkey], span[componentkey], div[componentkey]')].some(label => {
    if (label.closest('[role="listitem"][componentkey]') !== card) return false;
    const text = label.textContent.trim().replace(/\s+/g, ' ');
    const direct = [...label.childNodes]
      .filter(node => node.nodeType === 3)
      .map(node => node.textContent).join(' ').trim().replace(/\s+/g, ' ');
    const sponsorLinks = [...label.querySelectorAll('a[href]')].filter(link =>
      /^https:\/\/www\.linkedin\.com\/(company|showcase)\//.test(link.href));
    // New form: direct text "Promoted by" followed by one company link.
    if (direct === 'Promoted by' && /^Promoted by\s+\S/.test(text) && sponsorLinks.length === 1) return true;
    if (text !== 'Promoted') return false;
    const actor = label.parentElement?.parentElement;
    if (!actor || actor === card) return false;
    const links = [...actor.querySelectorAll('a[href]')];
    return links.length === 2 && links[0].href === links[1].href &&
      /^https:\/\/www\.linkedin\.com\/(company|in|showcase)\//.test(links[0].href) &&
      actor.querySelectorAll('p').length <= 4;
  });
}
