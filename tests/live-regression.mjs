// Bounded, explicitly real provider calls through the app. No credentials printed or stored here.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const base=process.argv[2]||'http://127.0.0.1:5173';let cookie='';
const results=[];
const seed=JSON.parse(await readFile(new URL('../app/data/evidence.json',import.meta.url),'utf8'));
const plan=seed.find(e=>e.id==='lg-03');
const tasks=[
 {task:'transmission',companyId:'tesla',scenarioId:'cost'},
 {task:'transmission',companyId:'catl',scenarioId:'policy'},
 {task:'transmission',companyId:'fluence',scenarioId:'demand'},
 {task:'compare',left:'sungrow',right:'tesla'},
 {task:'compare',left:'catl',right:'lg'},
 {task:'extract',companyId:'lg',title:plan.title,url:plan.url,publishedAt:plan.publishedAt,period:plan.period,locator:plan.locator,sourceText:plan.claim},
];
for(const input of tasks){
 const r=await fetch(base+'/api/ai',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify({...input,revision:0}),signal:AbortSignal.timeout(55000)});
 const d=await r.json();const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];
 const entry={input,status:r.status,at:new Date().toISOString(),result:d};results.push(entry);
 await writeFile(new URL('../delivery/v7真实AI回归.json',import.meta.url),JSON.stringify({base,note:'真实调用；六个有限样本，不代表全组合质量评测。提取输入来自本研究库lg-03的中文转述，用于验证规划不升级和提交文本内的摘录一致性，不是重新抓取官网原文。失败不得计为通过。',results},null,2)+'\n');
 console.log(JSON.stringify({task:input.task,company:input.companyId||input.left+'/'+input.right,status:r.status,code:d.code,runId:d.receipt?.runId,usage:d.receipt?.usage}));
 if(r.ok){assert.equal(d.receipt.promptVersion,'minimax-research-v7');if(d.comparison){assert.equal(d.comparison.summary,`可比依据：${d.comparison.comparable[0].text}；比较边界：${d.comparison.limitations[0].text}`);}if(d.candidate){assert.equal(d.candidate.imported,true);assert.equal(d.candidate.metric,undefined);}}
}
console.log(`${results.filter(r=>r.status===200).length}/${results.length} live calls returned validated output.`);
