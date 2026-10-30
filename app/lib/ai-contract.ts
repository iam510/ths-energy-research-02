import {z} from "zod";
import {companies,type Evidence} from "./domain.ts";

const text=z.string().trim().min(1).max(900);
const refs=z.array(z.string().max(90)).max(8);
export const transmissionSchema=z.object({
 nodes:z.array(z.object({kind:z.enum(["假设","推断","待验证"]),title:text,text,evidenceIds:refs}).strict()).length(4),
 conditions:text,reverse:text,gap:text,
}).strict();
export const comparisonSchema=z.object({
 summary:text,
 comparable:z.array(z.object({text,evidenceIds:refs.min(1)}).strict()).min(1).max(4),
 limitations:z.array(z.object({text,evidenceIds:refs}).strict()).min(1).max(5),
 gaps:z.array(text).min(1).max(4),
}).strict();
export const extractionSchema=z.object({claim:text,excerpt:z.string().max(240)}).strict();
export class ModelFailure extends Error {
 code:string;publicMessage:string;httpStatus:number;
 constructor(code:string,publicMessage:string,httpStatus=502){super(publicMessage);this.name="ModelFailure";this.code=code;this.publicMessage=publicMessage;this.httpStatus=httpStatus;}
}
export function parseModelJson(raw:string):unknown {
 const clean=raw.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
 if(clean.length>24000)throw new ModelFailure("INVALID_OUTPUT","模型结果超过允许长度，请缩小研究范围。",422);
 try{return JSON.parse(clean);}catch{throw new ModelFailure("INVALID_JSON","模型未返回完整有效的JSON；未使用离线结果替代。请重试。",422);}
}
function canonicalNumber(n:string) {
 const [whole,fraction]=n.replace(/,/g,"").split(".");
 const integer=whole.replace(/^0+(?=\d)/,"");
 const decimal=fraction?.replace(/0+$/,"");
 return decimal?`${integer}.${decimal}`:integer;
}
export function checkGrounding(value:unknown,evidence:Evidence[],extraSource="") {
 const all=evidence.map(e=>e.claim+e.period+JSON.stringify(e.metric||{})).join("\n")+extraSource;
 const allowed=new Set((all.match(/\d+(?:[,.]\d+)*/g)||[]).map(canonicalNumber));
 const ids=new Set(evidence.map(e=>e.id));
 function walk(item:unknown,key="") {
  if(Array.isArray(item)){if(key==="evidenceIds"){for(const id of item)if(typeof id!=="string"||!ids.has(id))throw new ModelFailure("INVALID_CITATION","模型引用了未提供的证据，结果未通过校验。",422);}else item.forEach(i=>walk(i));}
  else if(item&&typeof item==="object")Object.entries(item).forEach(([k,v])=>walk(v,k));
  else if(typeof item==="string"&&key!=="evidenceIds"){
   if(/必涨|稳赚|保证收益|目标价|建议买入|建议卖出|推荐买入|推荐卖出/i.test(item))throw new ModelFailure("UNSAFE_OUTPUT","模型结果超出研究边界，已拒绝展示。",422);
   for(const n of item.match(/\d+(?:[,.]\d+)*/g)||[])if(!allowed.has(canonicalNumber(n)))throw new ModelFailure("UNSUPPORTED_NUMBER","模型新增了材料中没有的数字，已拒绝展示。",422);
  }
 }
 walk(value);
}
function statementGrounding(text:string,ids:string[],evidence:Evidence[]) {
 const refs=evidence.filter(e=>ids.includes(e.id));
 checkGrounding({text},refs);
 const compact=text.toLowerCase().replace(/\s/g,"");
 for(const c of companies){const aliases=[c.name,c.english,...(c.id==="catl"?["CATL"]:[])];if(aliases.some(a=>compact.includes(a.toLowerCase().replace(/\s/g,"")))){if(!refs.some(e=>e.companyId===c.id))throw new ModelFailure("COMPANY_ATTRIBUTION","模型陈述中的公司与引用材料不匹配，结果已拒绝。",422);}}
 if(/\d/.test(text)&&/收入|营收|成本|利润|金额/.test(text)){
  const currencies=[{pattern:/美元|USD/i,code:"USD"},{pattern:/人民币|CNY|RMB/i,code:"CNY"},{pattern:/韩元|KRW/i,code:"KRW"}];
  for(const c of currencies)if(c.pattern.test(text)&&!refs.some(e=>e.metric?.currency===c.code))throw new ModelFailure("FINANCIAL_UNIT","数值陈述的币种未由该条引用支持，已拒绝。",422);
 }
 const statedYear=text.match(/(?:FY)?(20\d{2})\s*年?度?[^。；]{0,25}(?:收入|营收|毛利率)/i)?.[1];
 if(statedYear&&refs.some(e=>e.metric)&&!refs.some(e=>e.metric&&e.period.match(/20\d{2}/)?.[0]===statedYear))throw new ModelFailure("FINANCIAL_PERIOD","财务陈述的报告年度与引用材料不匹配，已拒绝。",422);
 const assertedScope=text.replace(/(?:不能|不可|不应|不得|并非|不等于|不代表|无法|不是)[^。；，]{0,18}(?:纯储能收入|储能独立收入|单独储能收入)/g,"");
 if(/纯储能收入|储能独立收入|单独储能收入/.test(assertedScope)&&refs.some(e=>e.metric&&/发电|合并|集团|非ESS/.test(e.metric.scope)))throw new ModelFailure("FINANCIAL_SCOPE","模型把混合业务口径当作单独储能收入，已拒绝。",422);
}
export function validateTransmission(raw:unknown,evidence:Evidence[]) {
 const parsed=transmissionSchema.safeParse(raw);
 if(!parsed.success)throw new ModelFailure("INVALID_SCHEMA","模型传导结果结构不完整，未生成正常结论。",422);
 const v=parsed.data;const kinds=["假设","推断","推断","待验证"];
 if(v.nodes.some((n,i)=>n.kind!==kinds[i])||v.nodes.slice(1,3).some(n=>!n.evidenceIds.length))throw new ModelFailure("INVALID_REASONING","模型未区分假设、推断与待验证节点，或缺少业务引用。",422);
 checkGrounding(v,evidence);
 for(const n of v.nodes.slice(1))statementGrounding(n.title+" "+n.text,n.evidenceIds,evidence);
 return v;
}
export function validateComparison(raw:unknown,evidence:Evidence[],allowPartial=false) {
 const parsed=comparisonSchema.safeParse(raw);if(!parsed.success)throw new ModelFailure("INVALID_SCHEMA","模型比较结果结构不完整。",422);
 const v=parsed.data;checkGrounding(v,evidence);
 const expected=new Set(evidence.map(e=>e.companyId));let dropped=0;
 const validateItem=(item:{text:string;evidenceIds:string[]},both:boolean)=>{
  if(both){const covered=new Set(evidence.filter(e=>item.evidenceIds.includes(e.id)).map(e=>e.companyId));if([...expected].some(id=>!covered.has(id)))throw new ModelFailure("COMPARISON_COVERAGE","可比性结论必须同时引用双方材料，已拒绝单边依据。",422);}
  if(item.evidenceIds.length)statementGrounding(item.text,item.evidenceIds,evidence);else if(/\d|已披露|营收|收入为|毛利率为/.test(item.text))throw new ModelFailure("MISSING_SUPPORT","事实或数值陈述缺少引用，已拒绝。",422);
 };
 const retain=(items:typeof v.comparable,both:boolean)=>items.filter(item=>{try{validateItem(item,both);return true;}catch(e){if(!allowPartial||!(e instanceof ModelFailure)||e.code==="UNSAFE_OUTPUT")throw e;dropped++;return false;}});
 const comparable=retain(v.comparable,true),limitations=retain(v.limitations,false);
 if(!comparable.length||!limitations.length)throw new ModelFailure("INSUFFICIENT_GROUNDED_OUTPUT","通过证据校验的可比项或边界不足，本次结果未展示。",422);
 if(/\d/.test(v.summary+v.gaps.join("")))throw new ModelFailure("UNSUPPORTED_NUMBER","比较摘要与资料缺口不得新增数值，请查看有来源的指标表。",422);
 return {...v,comparable,limitations,validationWarnings:dropped?[`有${dropped}项模型陈述未通过公司、数字或口径校验，已移除；仅展示剩余有效条目。`]:[]};
}
export function validateExtraction(raw:unknown,source:string) {
 const parsed=extractionSchema.safeParse(raw);if(!parsed.success)throw new ModelFailure("INVALID_SCHEMA","模型提取结果结构不完整。",422);
 checkGrounding(parsed.data,[],source);
 if(parsed.data.excerpt&&!source.replace(/\s/g,"").includes(parsed.data.excerpt.replace(/\s/g,"")))throw new ModelFailure("INVALID_QUOTE","模型摘录不在提交材料中，候选未通过校验。",422);
 return parsed.data;
}
export function providerFailure(status:number,code?:number) {
 if(status===401||status===403||[1004,2049].includes(code||0))return new ModelFailure("AUTH_ERROR","MiniMax密钥鉴权失败，请检查服务端配置。",502);
 if(status===402||code===1008)return new ModelFailure("INSUFFICIENT_BALANCE","MiniMax账户余额不足，未完成模型调用。",402);
 if(status===429||[1002,2056,2062,2067].includes(code||0))return new ModelFailure("PROVIDER_LIMIT","MiniMax限流或额度不足，请稍后重试。",429);
 if([2022,2069].includes(code||0))return new ModelFailure("MODEL_UNAVAILABLE","当前密钥无法访问配置的模型，请检查模型权限或可用状态。",502);
 return new ModelFailure("PROVIDER_ERROR","MiniMax接口暂不可用，本次未生成正常研究结果。",502);
}
