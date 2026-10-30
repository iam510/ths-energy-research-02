import test from 'node:test';
import assert from 'node:assert/strict';
import {parseModelJson,validateTransmission,validateComparison,validateExtraction,providerFailure,ModelFailure} from '../app/lib/ai-contract.ts';
import {callMinimax} from '../app/lib/minimax.ts';
import type {Evidence} from '../app/lib/domain.ts';
// Explicit test fixture; these figures are not real company disclosures.
const evidence:Evidence[]=[{id:'test-01',companyId:'tesla',title:'测试夹具',url:'https://www.sec.gov/test',publishedAt:'2026-01-01',period:'2025年度',locator:'测试定位',excerpt:'',claim:'测试业务收入100元，合同条件未披露。',sourceType:'test-fixture',reviewStatus:'test-only'}];
const valid=()=>({nodes:[{kind:'假设',title:'成本下降',text:'假设采购成本下降',evidenceIds:[]},{kind:'推断',title:'业务环节',text:'相关业务可能受影响',evidenceIds:['test-01']},{kind:'推断',title:'具体业务',text:'需核实合同条件',evidenceIds:['test-01']},{kind:'待验证',title:'营业成本',text:'需要进一步核验',evidenceIds:[]}],conditions:'需合同支持',reverse:'售价调整可能抵消',gap:'缺少敏感性数据'});
test('完整JSON与仅包裹的代码围栏可解析，额外散文拒绝',()=>{assert.deepEqual(parseModelJson('```json\n{"ok":true}\n```'),{ok:true});assert.throws(()=>parseModelJson('以下是结果：{"ok":true}'),ModelFailure);});
test('合格条件路径通过，事实不会由模型改写',()=>{assert.equal(validateTransmission(valid(),evidence).nodes.length,4);});
test('悬空引用拒绝',()=>{const v=valid();v.nodes[1].evidenceIds=['fake'];assert.throws(()=>validateTransmission(v,evidence),/引用/);});
test('没有依据的推断节点拒绝',()=>{const v=valid();v.nodes[2].evidenceIds=[];assert.throws(()=>validateTransmission(v,evidence),/引用/);});
test('模型新增材料没有的数字拒绝',()=>{const v=valid();v.nodes[1].text='利润增长120%';assert.throws(()=>validateTransmission(v,evidence),/数字/);});
test('模型股价承诺拒绝',()=>{const v=valid();v.nodes[1].text='股价必涨';assert.throws(()=>validateTransmission(v,evidence),/边界/);});
test('缺少必要边界字段拒绝',()=>{const v=valid() as Record<string,unknown>;delete v.reverse;assert.throws(()=>validateTransmission(v,evidence),/结构/);});
test('业务比较必须有依据及不可比项',()=>{assert.equal(validateComparison({summary:'业务部分可比',comparable:[{text:'存在相关业务',evidenceIds:['test-01']}],limitations:[{text:'口径待核对',evidenceIds:[]}],gaps:['缺少合同']},evidence).comparable.length,1);});
test('伪造的比较引用拒绝',()=>{assert.throws(()=>validateComparison({summary:'比较',comparable:[{text:'相同',evidenceIds:['fake']}],limitations:[{text:'业务不同',evidenceIds:[]}],gaps:['数据不足']},evidence),/引用/);});
test('提取只能引用实际提交的连续文本',()=>{assert.equal(validateExtraction({claim:'公司提供储能产品，收入未在摘录披露。',excerpt:'提供储能产品'},'公司提供储能产品，收入未在摘录披露。').excerpt,'提供储能产品');assert.throws(()=>validateExtraction({claim:'公司业务存在。',excerpt:'已确认独立收入'},'公司提供储能产品，收入未披露'),/摘录/);});
test('提取不能发明新数字',()=>{assert.throws(()=>validateExtraction({claim:'收入达到500亿元。',excerpt:''},'公司未在本段披露收入。'),/数字/);});
test('余额、鉴权、限流和模型权限错误有明确分类',()=>{assert.equal(providerFailure(402).code,'INSUFFICIENT_BALANCE');assert.equal(providerFailure(200,1008).httpStatus,402);assert.equal(providerFailure(401).code,'AUTH_ERROR');assert.equal(providerFailure(429).httpStatus,429);assert.equal(providerFailure(200,2022).code,'MODEL_UNAVAILABLE');});
test('未配置密钥不发出外部请求',async()=>{await assert.rejects(callMinimax({apiKey:''},'测试'),e=>e instanceof ModelFailure&&e.code==='NOT_CONFIGURED');});
test('官方SDK请求参数、JSON解析及usage正确（模拟传输）',async()=>{const previous=globalThis.fetch;let captured:Record<string,unknown>={};globalThis.fetch=async(input,init)=>{assert.equal(String(input),'https://api.minimax.cn/v1/chat/completions');captured=JSON.parse(String(init?.body));return Response.json({id:'test-request',object:'chat.completion',created:1,model:'MiniMax-M3.1-Flash',choices:[{index:0,message:{role:'assistant',content:'{"ok":true}'},finish_reason:'stop'}],usage:{prompt_tokens:10,completion_tokens:5,total_tokens:15}});};try{const result=await callMinimax({apiKey:'test-only-not-real'},'测试');assert.deepEqual(result.value,{ok:true});assert.equal(captured.model,'MiniMax-M3.1-Flash');assert.equal(captured.reasoning_effort,'low');assert.equal(result.receipt.usage.totalTokens,15);}finally{globalThis.fetch=previous;}});
test('HTTP200业务错误不是成功，且不返回原始请求信息',async()=>{const previous=globalThis.fetch;globalThis.fetch=async()=>Response.json({base_resp:{status_code:1008,status_msg:'test-only'}});try{await assert.rejects(callMinimax({apiKey:'test-only-not-real'},'测试'),e=>e instanceof ModelFailure&&e.code==='INSUFFICIENT_BALANCE'&&!e.message.includes('test-only'));}finally{globalThis.fetch=previous;}});
test('超时明确504',async()=>{const previous=globalThis.fetch;globalThis.fetch=async()=>{throw new DOMException('test','AbortError');};try{await assert.rejects(callMinimax({apiKey:'test-only-not-real'},'测试'),e=>e instanceof ModelFailure&&e.httpStatus===504);}finally{globalThis.fetch=previous;}});

test('真实比较暴露的超量条目仍拒绝，不能静默截断',()=>{const item={text:'口径需要核对',evidenceIds:['test-01']};assert.throws(()=>validateComparison({summary:'比较',comparable:[item],limitations:Array(6).fill(item),gaps:Array(5).fill('数据不足')},evidence),/结构/);});

test('日期前导零与小数尾零不构成新增数字',()=>{const dated=[{...evidence[0],period:'2025-09-30',claim:'测试金额17.80元'}];assert.doesNotThrow(()=>validateExtraction({claim:'材料日期2025年9月30日，金额17.8元',excerpt:''},dated[0].period+dated[0].claim));});
test('数值归一化不放过四舍五入或改变数量',()=>{assert.throws(()=>validateExtraction({claim:'金额17.9元',excerpt:''},'原文金额17.80元'),/数字/);});
