import {post_actions} from './linkedin-ui.js';
import {native_save} from './linkedin-save.js';

export function save_actions(document, posts) {
  const slots = post_actions(document, {label:'Save / unsave post',icon:'bookmark',marker:'data-tap-linkedin-save',
    messages:{pending:'Saving…',completed:'Saved state updated',failed:'Not confirmed — close any menu and retry'}}, posts);
  const save = native_save(document,slots.resolve);
  const base = slots.present;
  function set(element,name,value) {if(element.getAttribute(name)!==value)element.setAttribute(name,value);}
  return {...slots,
    present(binding) {
      const view=base(binding),sync=view.sync,state=view.state;
      function reflect() {
        const value=save.saved(binding);
        if(value===undefined)return;
        set(view.element,'aria-pressed',String(value));
        // Pending/failure feedback keeps its own name and title.
        if(view.element.getAttribute('data-tap-action-state')==='idle') {
          set(view.element,'aria-label',value?'Unsave post':'Save post');
          set(view.element,'title',value?'Remove from saved posts':'Save post');
          set(view.element.querySelector('svg'),'fill',value?'currentColor':'none');
        }
      }
      view.sync=next=>{sync(next);reflect();};
      view.state=name=>{
        state(name);view.element.querySelector('svg').setAttribute('fill','none');reflect();
        if(name==='completed') {
          const text=save.saved(binding)?'Post saved':'Removed from saved posts';
          set(view.element,'title',text);view.element.querySelector('[role="status"]').textContent=text;
        }
      };
      reflect();return view;
    },
    attributes:[...slots.attributes,'aria-expanded'],
    run:(post,event,signal)=>save.toggle(post,signal),
  };
}
