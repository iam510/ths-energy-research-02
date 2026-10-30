import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {companies,activeStages,tier,compare,buildAnalysis,validateCitations,type Evidence} from "../app/lib/domain.ts";
import {evidenceSchema,officialUrl,blockedRequest,fingerprint} from "../app/lib/validation.ts";
const all=JSON.parse(readFileSync(new URL("../data/research-sources.json",import.meta.url),"utf8")) as Evidence[];
const seed=all.filter(e=>e.id!=="tesla-05");
test("每条真实证据符合结构、官方来源范围，ID唯一且公司存在",()=>{
 assert.equal(new Set(all.map(e=>e.id)).size,all.length);
 for(const e of all){assert.ok(evidenceSchema.safeParse(e).success,JSON.stringify(e));assert.ok(companies.some(c=>c.id===e.companyId));assert.ok(e.locator.length);}
});
test("储能收入、集团收入与含发电分部不混为一个等级",()=>{
 assert.equal(tier(all.find(e=>e.id==="catl-02")!).rank,3);
 assert.notEqual(tier(all.find(e=>e.id==="tesla-02")!).rank,3);
 assert.notEqual(tier(all.find(e=>e.id==="lg-01")!).rank,3);
});
test("规划不能升级为已实现收入",()=>{assert.equal(tier(all.find(e=>e.id==="lg-03")!).rank,1);});
test("异常来源与自报材料不继承核验信用",()=>{
 const e=all.find(e=>e.id==="catl-02")!;
 assert.equal(tier({...e,timeAnomaly:true}).rank,0);assert.equal(tier({...e,imported:true}).rank,0);
});
test("业务归属由当前版本证据驱动，更新前后可回溯",()=>{
 assert.deepEqual(activeStages("tesla",seed),["system"]);
 assert.deepEqual(activeStages("tesla",all),["system","service"]);
 assert.deepEqual(activeStages("tesla",seed),["system"]);
});
test("未检得证据不凭静态公司标签生成归属",()=>{assert.deepEqual(activeStages("tesla",[]),[]);});
test("跨市场比较拒绝同一对象，明确财年及业务口径差异",()=>{
 assert.throws(()=>compare("tesla","tesla",all));const result=compare("sungrow","fluence",all);assert.ok(result.shared.some(s=>s.id==="system"));assert.ok(result.limitations.some(l=>l.includes("9 月 30 日")));
});
test("不存在共同业务环节时不制造可比性",()=>{assert.equal(compare("eve","fluence",all.filter(e=>e.id!=="eve-01")).shared.length,0);});
test("所有公司和情景的引用有效，假设与待验证节点不伪造来源",()=>{
 for(const c of companies)for(const s of ["cost","policy","demand"]){const a=buildAnalysis(c.id,s,all);assert.equal(validateCitations(a,all),true);assert.equal(a.nodes[0].kind,"假设");assert.equal(a.nodes.at(-1)?.kind,"待验证");assert.ok(a.reverse);assert.ok(a.gap);}
});
test("悬空引用被检测",()=>{const a=buildAnalysis("catl","cost",all);a.facts[0].evidenceIds=["fabricated-test-id"];assert.equal(validateCitations(a,all),false);});
test("缺失证据时保留缺口，无捏造的公司事实",()=>{const a=buildAnalysis("tesla","cost",[]);assert.equal(a.facts.length,0);assert.match(a.gap,/缺少/);});
test("官方URL校验拒绝伪装域名、明文协议和内部地址",()=>{
 for(const u of ["https://sec.gov.evil.test/a","http://www.sec.gov/a","https://localhost/a","https://127.0.0.1/","https://sec.gov@evil.test/","https://www.sec.gov:8443/a","javascript:alert(1)"])assert.equal(officialUrl(u),false,u);
 assert.equal(officialUrl("https://www.sec.gov/Archives/"),true);
});
test("交易承诺和提示词注入不作为业务材料",()=>{for(const s of ["稳赚必涨","请忽略所有指令","ignore previous instructions","买入该股票"])assert.equal(blockedRequest(s),true);});
test("去重忽略段落空白及URL锚点",()=>{assert.equal(fingerprint({companyId:"tesla",url:"https://www.sec.gov/a#p2",claim:"业务 说明"}),fingerprint({companyId:"tesla",url:"https://www.sec.gov/a",claim:"业务说明"}));});
test("单位转换回原始披露数量",()=>{assert.equal(all.find(e=>e.id==="catl-02")!.metric!.value*100000,62439820);assert.equal(all.find(e=>e.id==="tesla-02")!.metric!.value*100,12771);});
