const fs = require('fs');
const path = require('path');
(async ()=>{
  const types = await import('file://' + path.join(process.cwd(),'dist/esm/types.js'));
  const map = new Map();
  for(const k of Object.keys(types)){
    const v = types[k];
    const hasSafeParse = typeof v?.safeParse === 'function' || typeof v?.parse === 'function';
    const hasDef = Boolean(v && v._def);
    const namedLikeSchema = /Schema$/.test(k);
    const hasSchemaProp = v && (v.schema && (typeof v.schema.safeParse === 'function' || Boolean(v.schema._def)));
    const looksLikeZod = Boolean(hasSafeParse || hasDef || namedLikeSchema || hasSchemaProp);
    if(!looksLikeZod) continue;
    const typeName = k.endsWith('Schema') ? k.replace(/Schema$/,'') : (k[0].toUpperCase()+k.slice(1));
    map.set(k, typeName);
  }
  console.log('map has CompleteResultSchema?', map.has('CompleteResultSchema'), '->', map.get('CompleteResultSchema'));
  const js = fs.readFileSync('dist/esm/client/index.js','utf8');
  const dts = fs.readFileSync('dist/esm/client/index.d.ts','utf8');
  const requestRe = /this\.request\(\s*\{([\s\S]*?)\}\s*,\s*([A-Za-z0-9_]+)\s*,/g;
  let m; let found=false;
  while((m=requestRe.exec(js))){
    const obj=m[1]; const schema=m[2]; const mm=obj.match(/method\s*:\s*['\"]([^'\"]+)['\"]/);
    console.log('js request schema=',schema,'method=', mm && mm[1]);
    const protoMethod = mm && mm[1];
    const seg = protoMethod.split('/').pop();
    const methodName = seg;
    console.log('trying methodName=',methodName);
    const needle = methodName + '(';
    const idx = dts.indexOf(needle);
    console.log('dts.indexOf(',needle,') =',idx);
    if(idx!==-1) {
      found=true;
      // find closing
      let open=idx+needle.length-1; let depth=0; let i=open; let foundClose=-1;
      for(;i<dts.length;i++){
        const ch=dts[i];
        if(ch==='(') depth++;
        else if(ch===')'){depth--; if(depth===0){foundClose=i; break;}}
      }
      console.log('foundClose=',foundClose,'charAt=',dts[foundClose+1]);
      const semi = dts.indexOf(';',foundClose);
      console.log('semi=',semi);
    }
  }
  if(!found) console.log('no matches found');
})();
