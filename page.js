import {copy_link} from 'tap-pack-sdk/copy';
import {browser_clipboard} from 'tap-pack-sdk/dom';
import {mount_action} from 'tap-pack-sdk/ui';
import {save_actions} from './adapters/linkedin-save-ui.js';
import {post_actions, hide_sidebar_extras, hide_promoted} from './adapters/linkedin-ui.js';
import {site} from './adapters/linkedin.js';
import {observe_pagination} from './adapters/linkedin-stream.js';
import {deduplicate_menu} from './adapters/linkedin-menu.js';

const key = '__tap_linkedin_copy_links';
window[key]?.dispose();
const posts = site(document);
const clipboard = browser_clipboard(navigator, document);
const copy = mount_action({root:document.documentElement, ...post_actions(document, {
  label:'Copy post link', icon:'link', marker:'data-tap-linkedin-copy',
  messages:{pending:'Copying link…',completed:'Post link copied',failed:'Could not copy — try again'},
}, posts),
  run:post => copy_link(() => post.link, clipboard)});

const save = mount_action({root:document.documentElement,...save_actions(document, posts)});
const menu = deduplicate_menu(document);
const promoted = hide_promoted(document, posts);
const stream = observe_pagination(window, posts.ingest, () => {copy.refresh();save.refresh();promoted.refresh();});
const sidebar = hide_sidebar_extras(document);
window[key] = {dispose() {promoted.dispose();sidebar.dispose();stream.dispose();menu.dispose();copy.dispose();save.dispose();}};
