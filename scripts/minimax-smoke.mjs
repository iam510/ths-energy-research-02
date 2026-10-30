import {readFile} from 'node:fs/promises';
import {generateText} from '../app/node_modules/ai/dist/index.js';
import {createMinimaxOpenAI} from '../app/node_modules/@minimax-ai/ai-sdk-provider/dist/index.mjs';
const config=Object.fromEntries((await readFile(new URL('../app/.dev.vars',import.meta.url),'utf8')).split(/\r?\n/).filter(l=>l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
let code=null;
const p=createMinimaxOpenAI({apiKey:config.MINIMAX_API_KEY,baseURL:'https://api.minimax.cn/v1',fetch:async(i,n)=>{const r=await fetch(i,n);const data=await r.clone().json();code=data.base_resp?.status_code??r.status;return r;}});
try{const r=await generateText({model:p(config.MINIMAX_MODEL),prompt:'仅返回JSON：{"ok":true}。不要其他内容。',maxOutputTokens:1024,maxRetries:0,abortSignal:AbortSignal.timeout(30000),providerOptions:{minimax:{reasoningEffort:'low'}}});console.log(JSON.stringify({connected:r.text.includes('true'),model:config.MINIMAX_MODEL,status:code,finishReason:r.finishReason,usage:r.usage,outputIsJson:r.text.trim().startsWith('{')}));}catch{console.log(JSON.stringify({connected:false,status:code,error:'MiniMax真实调用未成功；未输出原始异常或密钥。'}));process.exitCode=1;}
