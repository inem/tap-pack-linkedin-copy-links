// Keep native handlers available to Save, but omit actions already on the card.
export function deduplicate_menu(document) {
  const hidden = new Map();
  const restore = (item, previous) => {
    if (previous.value) item.style.setProperty('display', previous.value, previous.priority);
    else item.style.removeProperty('display');
  };
  function refresh() {
    const wanted = new Set();
    for (const card of document.querySelectorAll('[data-testid="mainFeed"] [role="listitem"][componentkey]')) {
      const key = card.getAttribute('componentkey');
      if (!key.startsWith('expanded')) continue;
      const portal = document.getElementById('feedControlMenu' + key.slice(8));
      if (!portal) continue;
      const copy = card.querySelector('[data-tap-linkedin-copy]');
      const save = card.querySelector('[data-tap-linkedin-save]');
      for (const item of portal.querySelectorAll('[role="menuitem"]')) {
        if ((copy && item.querySelector('svg[id="link-medium"]')) ||
            (save && item.querySelector('svg[id="bookmark-outline-medium"], svg[id="bookmark-fill-medium"]'))) {
          wanted.add(item);
        }
      }
    }
    for (const card of document.querySelectorAll('[role="article"][data-urn]')) {
      for (const item of card.querySelectorAll('.feed-shared-control-menu__item')) {
        if (item.closest('[data-urn]') !== card) continue;
        if ((card.querySelector('[data-tap-linkedin-copy]') && item.classList.contains('option-share-via')) ||
            (card.querySelector('[data-tap-linkedin-save]') && item.querySelector('[data-test-icon="bookmark-outline-medium"], [data-test-icon="bookmark-fill-medium"]'))) wanted.add(item);
      }
    }
    for (const [item, previous] of hidden) {
      if (!wanted.has(item)) {restore(item, previous);hidden.delete(item);}
    }
    for (const item of wanted) {
      if (!hidden.has(item)) hidden.set(item, {
        value:item.style.getPropertyValue('display'), priority:item.style.getPropertyPriority('display'),
      });
      item.style.setProperty('display', 'none', 'important');
    }
  }
  const observer = new document.defaultView.MutationObserver(refresh);
  observer.observe(document.documentElement, {subtree:true,childList:true,attributes:true,attributeFilter:['componentkey']});
  refresh();
  return {dispose() {observer.disconnect();for (const [item, previous] of hidden) restore(item, previous);hidden.clear();}};
}
