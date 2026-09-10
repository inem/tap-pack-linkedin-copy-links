// Native LinkedIn save operation: no credentials or service API duplication.
// Observed SDUI portal: expanded<SUFFIX> card -> feedControlMenu<SUFFIX>.
// Save/Unsave menu items carry bookmark-outline/fill-medium respectively.
export function save_item(portal) {
  if (!portal) return null;
  const items = [...portal.querySelectorAll('[role="menuitem"], .feed-shared-control-menu__dropdown-item[role="button"]')].flatMap(element => {
    const outline = element.querySelector('svg[id="bookmark-outline-medium"], svg[data-test-icon="bookmark-outline-medium"]');
    const filled = element.querySelector('svg[id="bookmark-fill-medium"], svg[data-test-icon="bookmark-fill-medium"]');
    return outline !== null && filled === null ? [{element,saved:false}]
      : filled !== null && outline === null ? [{element,saved:true}] : [];
  });
  return items.length === 1 ? items[0] : null;
}
export function native_save(document, resolve) {
  const win = document.defaultView, known = new Map();
  let busy = false;
  function popup(binding) {
    if (binding.object.hasAttribute('data-urn')) return binding.anchor.closest('.artdeco-dropdown')?.querySelector('.feed-shared-control-menu__content');
    const key = binding.object.getAttribute('componentkey');
    return key?.startsWith('expanded') ? document.getElementById('feedControlMenu'+key.slice(8)) : null;
  }
  function current(binding) {
    const now = resolve(binding.object);
    return now?.key === binding.key && now.anchor === binding.anchor && binding.anchor.isConnected;
  }
  function saved(binding) {
    if (current(binding) && binding.anchor.getAttribute('aria-expanded') === 'true') {
      const item = save_item(popup(binding));
      if (item) known.set(binding.key,item.saved);
    }
    return known.get(binding.key);
  }
  async function toggle(binding, signal) {
    if (busy) throw new Error('Another post menu is busy');
    if (!current(binding) || !(binding.object.hasAttribute('data-urn') || binding.object.getAttribute('componentkey')?.startsWith('expanded'))) throw new Error('Post unavailable');
    // Do not take over a menu the user already has open.
    if (document.querySelector('button[componentkey][aria-expanded="true"], button.feed-shared-control-menu__trigger[aria-expanded="true"]')) throw new Error('Close the open menu and retry');
    busy = true;
    const focus = document.activeElement, hidden = new Map();
    // SDUI scrolls its workspace, not window. Native portal autofocus must not
    // move the feed while the shortcut privately invokes and checks the menu.
    const scrolls=[];
    for(let node=binding.anchor;node;node=node.parentElement) {
      if(node.scrollHeight>node.clientHeight || node.scrollWidth>node.clientWidth)
        scrolls.push({node,top:node.scrollTop,left:node.scrollLeft});
    }
    const restoreScroll=()=>{for(const s of scrolls){s.node.scrollTop=s.top;s.node.scrollLeft=s.left;}};
    function conceal() {
      const p = popup(binding);
      if (p && !hidden.has(p)) {
        hidden.set(p,{value:p.style.getPropertyValue('visibility'),priority:p.style.getPropertyPriority('visibility')});
        p.style.setProperty('visibility','hidden','important');
        restoreScroll();
      }
    }
    const hideObserver = new win.MutationObserver(conceal);
    hideObserver.observe(document.documentElement,{subtree:true,childList:true});
    function wait(read) {
      return new Promise((yes,no) => {
        let observer,timer,done=false;
        function end(error,value) {
          if(done)return;done=true;observer?.disconnect();win.clearTimeout(timer);signal?.removeEventListener('abort',abort);
          error?no(error):yes(value);
        }
        const abort=()=>end(new Error('Action cancelled'));
        function check() {
          if(signal?.aborted || !current(binding))return abort();
          conceal();
          const value=read();if(value)end(null,value);
        }
        observer=new win.MutationObserver(check);
        observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-expanded','componentkey','id']});
        timer=win.setTimeout(()=>end(new Error('LinkedIn did not confirm save state')),5000);
        signal?.addEventListener('abort',abort,{once:true});check();
      });
    }
    try {
      if(signal?.aborted)throw new Error('Action cancelled');
      binding.anchor.click();
      const before=await wait(()=>binding.anchor.getAttribute('aria-expanded')==='true' && save_item(popup(binding)));
      known.set(binding.key,before.saved);
      if(signal?.aborted || !current(binding))throw new Error('Post changed');
      before.element.click();
      await wait(()=>binding.anchor.getAttribute('aria-expanded')==='false');
      // SDUI can return a stale menu immediately after the write. Retry only
      // the READ, never the save command, until its state is observable.
      const deadline=Date.now()+5000;
      do {
        await new Promise((yes,no)=>{
          const abort=()=>{win.clearTimeout(timer);signal?.removeEventListener('abort',abort);no(new Error('Action cancelled'));};
          const timer=win.setTimeout(()=>{signal?.removeEventListener('abort',abort);yes();},350);
          signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
        });
        if(signal?.aborted || !current(binding))throw new Error('Post changed');
        binding.anchor.click();
        const after=await wait(()=>binding.anchor.getAttribute('aria-expanded')==='true' && save_item(popup(binding)));
        if(after.saved!==before.saved) {known.set(binding.key,after.saved);return after.saved;}
        binding.anchor.click();
        await wait(()=>binding.anchor.getAttribute('aria-expanded')==='false');
      } while(Date.now()<deadline);
      throw new Error('LinkedIn did not confirm save state');

    } finally {
      hideObserver.disconnect();
      if(current(binding) && binding.anchor.getAttribute('aria-expanded')==='true')binding.anchor.click();
      for(const [p,previous] of hidden) {
        if(previous.value)p.style.setProperty('visibility',previous.value,previous.priority);
        else p.style.removeProperty('visibility');
      }
      if(focus?.isConnected)focus.focus({preventScroll:true});
      restoreScroll();win.requestAnimationFrame(restoreScroll);
      busy=false;
    }
  }
  return {saved,toggle};
}
