import {test,expect} from 'bun:test';
import {save_item} from '../adapters/linkedin-save.js';
const item = (outline,fill)=>({querySelector:selector=>selector.includes('outline')?(outline?{}:null):(fill?{}:null)});
const portal = items=>({querySelectorAll:()=>items});
test('native save distinguishes Save, Unsave and unavailable/ambiguous items',()=>{
 expect(save_item(portal([item(true,false)])).saved).toBe(false);
 expect(save_item(portal([item(false,true)])).saved).toBe(true);
 expect(save_item(null)).toBe(null);
 expect(save_item(portal([item(false,false)]))).toBe(null);
 expect(save_item(portal([item(true,true)]))).toBe(null);
 expect(save_item(portal([item(true,false),item(false,true)]))).toBe(null);
});
