import {test, expect} from 'bun:test';
import {page_rows, post_bindings} from '../adapters/linkedin.js';
import {promoted_badge} from '../adapters/linkedin-promoted.js';
const identity = id => ({updateUrnActivityUrn:{activityUrn:{activityId:id}}});
const request = id => ({requestId:'feedUpdateControlMenuRequest',requestedArguments:{payload:{updateKey:{items:[{feedUpdateUrn:identity(id)}]}}}});
const card = (key,id) => ({role:'listitem',componentkey:key,children:{buttonProps:{componentkey:`menu-${key}`},triggers:[{action:{actions:[request(id)]}}]}});
const envelope = rows => `window.__como_rehydration__ = ${JSON.stringify([rows.map((r,i)=>`${i.toString(16)}:${JSON.stringify(r)}\n`).join('')])};`;
test('resolve the card menu, ignoring unrelated URNs', () => {
 const model=card('a','1234567890123456789');model.comment={thread:'urn:li:activity:9999999999999999999'};
 expect(post_bindings(page_rows(envelope([model]))).get('a')).toEqual({menuKey:'menu-a',url:'https://www.linkedin.com/feed/update/urn:li:activity:1234567890123456789/'});
});
test('sponsored, malformed, multiple identities and duplicate models are unavailable', () => {
 const sponsored=card('ad','1234567890123456789');
 sponsored.children.triggers[0].action.actions[0].requestedArguments.payload.updateKey.items[0].feedUpdateUrn={updateUrnSponsoredContentV2Urn:{sponsoredEntity:'urn:li:activity:1234567890123456789'}};
 expect(post_bindings([sponsored]).get('ad')).toEqual({menuKey:'menu-ad',promoted:true});
 expect(post_bindings([card('a','../../escape')]).get('a')).toBeNull();
 const multi=card('a','1234567890123456789');multi.children.triggers[0].action.actions.push(request('9876543210987654321'));
 expect(post_bindings([multi]).get('a')).toBeNull();
 expect(post_bindings([card('a','1234567890123456789'),card('a','9876543210987654321')]).get('a')).toBeNull();
});
test('parse data only, tolerate non-JSON RSC and chunk boundaries', () => {
 expect(page_rows('window.__como_rehydration__ = (globalThis.executed = true)')).toEqual([]);
 expect(globalThis.executed).toBeUndefined();
 const row='a:'+JSON.stringify(card('b','1234567890123456789'))+'\n';
 expect(post_bindings(page_rows('window.__como_rehydration__ = '+JSON.stringify(['1:I["module"]\n'+row.slice(0,15),row.slice(15)]))).has('b')).toBe(true);
});

test('removing the hydration script preserves known bindings, never authorizes another menu', async () => {
 const {site}=await import('../adapters/linkedin.js');
 let source={textContent:envelope([card('a','1234567890123456789')])},menuKey='menu-a';
 const menu={getAttribute:()=>menuKey,closest:()=>domCard};
 const domCard={isConnected:true,matches:()=>true,getAttribute:()=> 'a',querySelectorAll:()=>[menu]};
 const adapter=site({getElementById:()=>source});
 expect(adapter.selected(domCard)?.url).toContain('1234567890123456789');
 source=null;
 expect(adapter.selected(domCard)?.url).toContain('1234567890123456789');
 menuKey='another-menu';expect(adapter.selected(domCard)).toBeNull();
 menuKey='menu-a';source={textContent:'broken replacement'};expect(adapter.selected(domCard)).toBeNull();
});

test('pagination supplies later identities while preserving initial cards', async () => {
 const {site}=await import('../adapters/linkedin.js');
 const elements=new Map();
 function dom(key){const object={isConnected:true,matches:()=>true,getAttribute:()=>key,querySelectorAll:()=>[{getAttribute:()=>`menu-${key}`,closest:()=>object}]};elements.set(key,object);return object;}
 const first=dom('initial'),later=dom('later');
 const adapter=site({getElementById:()=>({textContent:envelope([card('initial','1111111111111111111')])})});
 expect(adapter.selected(later)).toBeNull();
 expect(adapter.ingest('1:I["module"]\na:'+JSON.stringify(card('later','2222222222222222222'))+'\n')).toBe(1);
 expect(adapter.selected(later)?.url).toContain('2222222222222222222');
 expect(adapter.selected(first)?.url).toContain('1111111111111111111');
 adapter.ingest('a:'+JSON.stringify(card('later','../../bad'))+'\n');
 expect(adapter.selected(later)).toBeNull();
});

test('promoted pagination is hidden only while its native menu matches', async () => {
 const {site}=await import('../adapters/linkedin.js');
 let menuKey='menu-ad';
 const domCard={isConnected:true,matches:()=>true,getAttribute:()=> 'ad',
   querySelectorAll:()=>[{getAttribute:()=>menuKey,closest:()=>domCard}]};
 const adapter=site({getElementById:()=>null});
 const ad=card('ad','1234567890123456789');
 ad.children.triggers[0].action.actions[0].requestedArguments.payload.updateKey.items[0].feedUpdateUrn={
   updateUrnSponsoredContentV2Urn:{sponsoredEntity:'urn:li:activity:1234567890123456789'}};
 adapter.ingest('a:'+JSON.stringify(ad)+'\n');
 expect(adapter.promoted(domCard)).toBe(true);
 expect(adapter.selected(domCard)).toBeNull();
 menuKey='another-post';expect(adapter.promoted(domCard)).toBe(false);
 menuKey='menu-ad';
 const organic=card('ad','1234567890123456789');organic.text='I was promoted today';
 adapter.ingest('b:'+JSON.stringify(organic)+'\n');
 expect(adapter.promoted(domCard)).toBe(false);
 expect(adapter.selected(domCard)).not.toBeNull();
});

test('Promoted by company metadata is an ad, ordinary post prose is not', () => {
 const domCard={};
 const sponsor={href:'https://www.linkedin.com/company/example/'};
 const label={textContent:'Promoted by Example',childNodes:[{nodeType:3,textContent:'Promoted by '},sponsor],
   closest:()=>domCard,querySelectorAll:()=>[sponsor]};
 domCard.querySelectorAll=()=>[label];
 expect(promoted_badge(domCard)).toBe(true);
 label.textContent='I was promoted by Example';
 label.childNodes=[{nodeType:3,textContent:'I was promoted by '},sponsor];
 expect(promoted_badge(domCard)).toBe(false);
});
