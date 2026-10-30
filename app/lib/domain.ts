export type Metric = {label:string;value:number;unit:string;currency?:string;scope:string};
export type Evidence = {id:string;companyId:string;title:string;url:string;publishedAt:string|null;period:string;locator:string;excerpt:string;claim:string;sourceType:string;reviewStatus:string;metric?:Metric;imported?:boolean;kind?:string;retrievedAt?:string;timeAnomaly?:boolean;notes?:string;stageIds?:string[];progress?:"revenue"|"product"|"plan"|"context";researchState?:"candidate"|"adopted"|"withdrawn";review?:{at:string;reason:string;excerpt:string;sourceConfirmed:boolean}};
export const stages = [
 {id:"cell",name:"电芯与电池系统",en:"BATTERY",description:"储存电能的核心载体",boundary:"包含储能电芯、电池模组与电池系统；不将动力电池收入计为储能。"},
 {id:"pcs",name:"变流与控制",en:"CONVERSION",description:"连接电池与电网",boundary:"PCS、电力电子与能量管理；有集成产品不代表单独披露 PCS 收入。"},
 {id:"system",name:"系统集成",en:"INTEGRATION",description:"从设备到可交付系统",boundary:"面向工商业及电网的集成储能系统；区分订单、交付和收入。"},
 {id:"service",name:"运营及服务",en:"SERVICES",description:"贯穿项目全生命周期",boundary:"运维、调度和优化服务；提供服务不等于持有电站资产或运营收入。"},
];
export const companies = [
 {id:"catl",name:"宁德时代",english:"CATL",ticker:"300750.SZ / 3750.HK",market:"中国",stages:["cell","system"],initials:"CATL",color:"blue",scope:"储能电池系统",note:"储能与动力电池业务须分别核对。"},
 {id:"eve",name:"亿纬锂能",english:"EVE Energy",ticker:"300014.SZ",market:"中国",stages:["cell","system"],initials:"EVE",color:"orange",scope:"储能电池及系统产品",note:"本数据集未纳入可核验的储能收入，产品证据不能替代收入。"},
 {id:"sungrow",name:"阳光电源",english:"Sungrow",ticker:"300274.SZ",market:"中国",stages:["pcs","system"],initials:"SG",color:"orange",scope:"储能系统",note:"全公司还包含光伏逆变器等业务，不使用集团总收入对标纯储能。"},
 {id:"tesla",name:"特斯拉",english:"Tesla",ticker:"TSLA · NASDAQ",market:"美国",stages:["system","service"],initials:"T",color:"red",scope:"发电与储能分部",note:"分部包含太阳能发电与储能，且包括家用和大型储能。"},
 {id:"fluence",name:"Fluence",english:"Fluence Energy",ticker:"FLNC · NASDAQ",market:"美国",stages:["system","service"],initials:"F",color:"blue",scope:"储能产品、服务及数字业务",note:"财年截至 9 月 30 日；产品收入和服务收入应分开。"},
 {id:"lg",name:"LG 新能源",english:"LG Energy Solution",ticker:"373220 · KRX",market:"韩国",stages:["cell","system","service"],initials:"LG",color:"red",scope:"电池及子公司储能解决方案",note:"子公司Vertech提供集成及服务，集团营收包含其他电池业务；缺少纯储能收入时不估算。"},
];
export const scenarios = [
 {id:"cost",name:"电芯采购成本下降",type:"情景假设",hint:"假设其他条件不变，分析成本下降的传导边界。",stage:"电芯 → 系统集成",metric:"营业成本 / 毛利率 / 存货减值",mechanism:"对采购外部电芯的系统集成业务，采购成本下降可能降低单位成本；对电芯供应业务，售价下降也可能压缩收入与利润。",conditions:"需要确认合同锁价、库存周转、售价调整及交付周期。",reverse:"若系统售价同步下调，成本红利可能让渡给客户；高价存货可能形成减值。",watch:"跟踪单价、单位成本、存货和同口径分部毛利率。"},
 {id:"policy",name:"海外贸易成本上升",type:"情景假设",hint:"不假定具体政策已经生效；需补充地区、产品及生效日期。",stage:"跨境供货 → 项目交付",metric:"营业成本 / 订单 / 现金流",mechanism:"若相关产品及产地被覆盖，额外贸易成本可能提高到岸成本，影响交付安排与项目经济性。",conditions:"核对适用税则、原产地、豁免、合同分担及当地供应链。",reverse:"本地生产、转嫁成本或不适用该政策可能减弱影响。",watch:"跟踪受影响地区收入、项目交付、关税成本及客户订单。"},
 {id:"demand",name:"下游储能需求增长",type:"情景假设",hint:"需求增长不等于所有公司收入和利润同步增长。",stage:"项目需求 → 订单 → 交付",metric:"订单 / 收入 / 应收账款",mechanism:"符合客户技术和地区准入要求的供应商，可能获得更多订单；只有满足交付及收入确认条件才形成当期收入。",conditions:"需要可用产能、融资、并网条件和客户验收支持。",reverse:"价格竞争、项目延期及回款延迟可能抵消需求增长。",watch:"跟踪订单转化、交付、分部收入、应收账款和经营现金流。"},
];
export const getCompany = (id:string) => companies.find(c=>c.id===id);
export const stageSources:Record<string,Record<string,string[]>>={"catl":{"cell":["catl-01","catl-02","catl-04"],"system":["catl-01","catl-02","catl-04"]},"eve":{"system":["eve-01"],"cell":["eve-02","eve-03"]},"sungrow":{"system":["sungrow-01","sungrow-03"],"pcs":["sungrow-03","sungrow-04"]},"tesla":{"system":["tesla-01","tesla-03"],"service":["tesla-05"]},"fluence":{"system":["fluence-01","fluence-04"],"service":["fluence-02"]},"lg":{"cell":["lg-02","lg-03"],"system":["lg-04"],"service":["lg-04"]}};
export function researchEligible(e:Evidence) {return !e.timeAnomaly&&e.researchState!=="withdrawn"&&(!e.imported||e.researchState==="adopted");}
export function evidenceStages(e:Evidence) {return e.stageIds??Object.entries(stageSources[e.companyId]||{}).filter(([,ids])=>ids.includes(e.id)).map(([id])=>id);}
export function activeStages(id:string,evidence:Evidence[]) {return stages.filter(s=>evidence.some(e=>e.companyId===id&&researchEligible(e)&&e.progress!=="plan"&&tier(e).rank>=2&&evidenceStages(e).includes(s.id))).map(s=>s.id);}
export function tier(e:Evidence) {
 if(e.researchState==="withdrawn")return {label:"已撤回",tone:"gray",rank:0};
 if(e.timeAnomaly)return {label:"来源存在异常 · 待复核",tone:"amber",rank:0};
 if(e.imported&&e.researchState!=="adopted")return {label:"候选 · 尚未生效",tone:"amber",rank:0};
 if(e.progress==="context")return {label:e.metric&&/收入|营收/.test(e.metric.label)?"混合口径收入 / 背景":"指标 / 背景材料",tone:"gray",rank:0};
 if(e.progress==="plan"||/属于规划|产能.*目标|规划表态|尚未商业化/.test(e.claim))return {label:"研发 / 规划",tone:"amber",rank:1};
 if(e.metric&&/收入|营收|revenue/i.test(e.metric.label)&&!/集团|total|合计|发电|整体|合并|非ESS/i.test(e.metric.scope))return {label:"已披露相关收入",tone:"green",rank:3};
 return {label:"产品 / 交付等证据",tone:"blue",rank:2};
}
export function companyTier(id:string,evidence:Evidence[]) {const list=evidence.filter(e=>e.companyId===id&&researchEligible(e));return list.length?list.map(tier).sort((a,b)=>b.rank-a.rank)[0]:{label:"当前无有效证据",tone:"gray",rank:0};}
export function relationStatus(companyId:string,stageId:string,evidence:Evidence[]) {
 const list=evidence.filter(e=>e.companyId===companyId&&researchEligible(e)&&evidenceStages(e).includes(stageId)&&tier(e).rank>0);
 const strongest=list.map(tier).sort((a,b)=>b.rank-a.rank)[0]||{label:"本资料范围未检得",tone:"gray",rank:0};
 return {...strongest,evidenceIds:list.map(e=>e.id),hasPlan:list.some(e=>tier(e).rank===1),personal:list.some(e=>e.imported&&e.researchState==="adopted")};
}
export function versionChanges(before:Evidence[],after:Evidence[]) {
 return companies.flatMap(c=>stages.flatMap(s=>{const a=relationStatus(c.id,s.id,before),b=relationStatus(c.id,s.id,after);return a.label===b.label&&a.evidenceIds.join()===b.evidenceIds.join()?[]:[{company:c.name,stage:s.name,before:a.label,after:b.label,beforeCount:a.evidenceIds.length,afterCount:b.evidenceIds.length,evidenceIds:b.evidenceIds}];}));
}
export function compare(a:string,b:string,evidence?:Evidence[]) {
 const ca=getCompany(a),cb=getCompany(b); if(!ca||!cb||a===b) throw new Error("请选择两家不同的有效公司");
 const sa=evidence?activeStages(a,evidence):ca.stages,sb=evidence?activeStages(b,evidence):cb.stages;
 const shared=stages.filter(s=>sa.includes(s.id)&&sb.includes(s.id));
 return {shared,conclusion:shared.length?`可在${shared.map(s=>s.name).join("、")}的业务层面对照；不代表公司整体或财务指标完全可比。`:"当前分类下没有共同业务环节，不建议作为直接同业比较。",limitations:[`${ca.name}口径：${ca.scope}。${ca.note}`,`${cb.name}口径：${cb.scope}。${cb.note}`,"区域、客户结构及收入确认条件需进一步核对，未核验的相似性不当作事实。",a==="fluence"||b==="fluence"?"Fluence 的财年截至 9 月 30 日，与自然年数据存在期间错位。":"即便报告期名称相同，也需核对业务范围和会计口径。","保留原币种；不直接计算未统一期间、汇率与范围的收入倍数。"]};
}
export function buildAnalysis(companyId:string,scenarioId:string,evidence:Evidence[]) {
 const c=getCompany(companyId),s=scenarios.find(s=>s.id===scenarioId); if(!c||!s) throw new Error("无效的公司或情景");
 const refs=evidence.filter(e=>e.companyId===companyId&&researchEligible(e));
 const causal=refs.filter(e=>scenarioId==="cost"?/成本|售价/.test(e.claim):scenarioId==="policy"?/关税|本地生产/.test(e.claim):/订单|交付|部署/.test(e.claim));
 const ordered=[...causal,...refs.filter(e=>!causal.some(r=>r.id===e.id))];
 return {company:c.name,scenario:s.name,activeStageIds:activeStages(companyId,evidence),sourceIds:refs.map(e=>e.id),mode:"offline-rules",promptVersion:"research-v1",facts:ordered.slice(0,3).map(e=>({text:e.claim,evidenceIds:[e.id]})),nodes:[{kind:"假设",title:s.name,text:s.hint,evidenceIds:[] as string[]},{kind:"推断",title:s.stage,text:s.mechanism,evidenceIds:ordered.slice(0,2).map(e=>e.id)},{kind:"推断",title:c.scope,text:`适用范围需与${c.name}的具体产品和合同匹配。${c.note}`,evidenceIds:refs.slice(0,2).map(e=>e.id)},{kind:"待验证",title:s.metric,text:s.watch,evidenceIds:[] as string[]}],conditions:s.conditions,reverse:s.reverse,gap:refs.length?"缺少合同、订单地域与成本敏感性数据，无法量化利润影响。":"缺少公司业务证据，不能形成针对该公司的确定结论。"};
}
export function validateCitations(value:{facts:{evidenceIds:string[]}[];nodes:{evidenceIds:string[]}[]},evidence:Evidence[]) {
 const ids=new Set(evidence.map(e=>e.id));
 return [...value.facts,...value.nodes].every(n=>n.evidenceIds.every(id=>ids.has(id)));
}
