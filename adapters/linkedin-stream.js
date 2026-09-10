// Observe the response the page already requested; do not fetch or replay it.
const PAGINATION = '/flagship-web/rsc-action/actions/pagination';
export function observe_pagination(win, ingest, changed, {maxBytes=16*1024*1024, timeoutMs=15000}={}) {
  const original = win.fetch;
  const readers = new Set();
  let disposed = false;
  async function inspect(response) {
    if (disposed || !response.ok || readers.size >= 2) return;
    let reader, timer;
    try {
      reader = response.clone().body?.getReader();
      if (!reader) return;
      readers.add(reader);
      let expired = false, size = 0, text = '';
      const decoder = new win.TextDecoder();
      timer = win.setTimeout(() => {expired=true;reader.cancel().catch(()=>{});}, timeoutMs);
      while (!disposed && !expired) {
        const {value, done} = await reader.read();
        if (disposed || expired) return;
        if (done) {
          text += decoder.decode();
          if (ingest(text)) changed();
          return;
        }
        size += value.byteLength;
        if (size > maxBytes) {reader.cancel().catch(()=>{});return;}
        text += decoder.decode(value, {stream:true});
      }
    } catch { /* Observation must never reject the page's own request. */ }
    finally {win.clearTimeout(timer);if(reader)readers.delete(reader);}
  }
  function fetch(...args) {
    const result = Reflect.apply(original, this, args);
    try {
      const input=args[0];
      const url=new URL(typeof input==='string'||input instanceof URL ? input : input.url, win.location.href);
      if (!disposed && url.origin===win.location.origin && url.pathname===PAGINATION) {
        Promise.resolve(result).then(response=>inspect(response),()=>{});
      }
    } catch { /* Unknown fetch input is owned by the original fetch. */ }
    return result;
  }
  win.fetch=fetch;
  return {dispose() {
    disposed=true;
    if(win.fetch===fetch)win.fetch=original;
    for(const reader of readers)reader.cancel().catch(()=>{});
    readers.clear();
  }};
}
