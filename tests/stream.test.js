import {test,expect} from 'bun:test';
import {observe_pagination} from '../adapters/linkedin-stream.js';
const path='/flagship-web/rsc-action/actions/pagination';
const settle=()=>new Promise(r=>setTimeout(r,20));
function environment(response){const original=()=>Promise.resolve(response);return {fetch:original,TextDecoder,setTimeout,clearTimeout,location:{href:'https://www.linkedin.com/feed/',origin:'https://www.linkedin.com'}};}
test('observes pagination without consuming the page response, restores fetch',async()=>{
 const win=environment(new Response('a:{"material":1}\n'));const original=win.fetch,seen=[];let changes=0;
 const observer=observe_pagination(win,s=>{seen.push(s);return 1;},()=>changes++);
 const response=await win.fetch(path);
 expect(await response.text()).toBe('a:{"material":1}\n');await settle();
 expect(seen).toEqual(['a:{"material":1}\n']);expect(changes).toBe(1);
 observer.dispose();expect(win.fetch).toBe(original);
});
test('unrelated origins and oversized bodies do not produce material',async()=>{
 const win=environment(new Response('123456789'));const seen=[];
 const observer=observe_pagination(win,s=>seen.push(s),()=>{}, {maxBytes:4});
 await win.fetch('https://another.example'+path);await settle();expect(seen).toEqual([]);
 const response=await win.fetch(path);expect(await response.text()).toBe('123456789');await settle();expect(seen).toEqual([]);observer.dispose();
});
test('dispose cancels late observations without cancelling original response',async()=>{
 let controller;const response=new Response(new ReadableStream({start(c){controller=c;}}));
 const win=environment(response),seen=[];const observer=observe_pagination(win,s=>seen.push(s),()=>{});
 const original=await win.fetch(path);await settle();observer.dispose();controller.enqueue(new TextEncoder().encode('a:{}\n'));controller.close();
 expect(await original.text()).toBe('a:{}\n');await settle();expect(seen).toEqual([]);
});
