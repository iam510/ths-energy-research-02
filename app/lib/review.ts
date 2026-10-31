import {z} from "zod";
import {researchEligible,type Evidence} from "./domain.ts";
const metricSchema=z.object({label:z.string().trim().min(2).max(120),value:z.number().finite(),unit:z.string().trim().min(1).max(60),currency:z.enum(["CNY","USD","KRW"]).optional(),scope:z.string().trim().min(5).max(200)}).strict();
export const reviewSchema=z.object({expectedRevision:z.number().int().nonnegative(),evidenceId:z.string().min(1).max(90),action:z.enum(["adopt","withdraw"]),reason:z.string().trim().min(10).max(300),stageIds:z.array(z.enum(["cell","pcs","system","service"])).min(1).max(4),progress:z.enum(["product","plan","revenue","context"]),sourceConfirmed:z.literal(true),excerpt:z.string().trim().min(10).max(500),replacesIds:z.array(z.string().min(1).max(90)).max(8).optional(),metric:metricSchema.optional()}).strict().superRefine((v,ctx)=>{if(v.action==="adopt"&&(v.progress==="revenue"||v.progress==="context")&&!v.metric)ctx.addIssue({code:z.ZodIssueCode.custom,message:"财务复核必须提供完整指标"});});
export type ReviewInput=z.infer<typeof reviewSchema>;
export function planningOnly(text:string){return /拟(?:新建|新增|建设|推出|开展|提供)|计划(?:新建|新增|建设|推出|开展|提供)|规划表态|尚未(?:开展|提供|交付|商业化)|目前尚未|预计未来|计划中|propos(?:ed|al)|not yet|plans? to|intend(?:s|ed)? to/i.test(text);}
function financialCheck(input:ReviewInput){
 const m=input.metric;if(!m)throw new Error("财务指标复核须填写数值、单位及业务范围");
 const normalized=input.excerpt.replace(/,/g,"");
 const tokens=normalized.match(/[（(]\s*\d+(?:\.\d+)?\s*[)）]|[-−]?\s*\d+(?:\.\d+)?/g)||[];
 const numbers=tokens.map(t=>(/[-−(（]/.test(t)?-1:1)*Number(t.replace(/[-−()（）\s]/g,"")));
 if(!numbers.includes(m.value))throw new Error("指标数值和正负号必须原样出现在核对摘录中，不接受换算或推算值");
 const units:Record<string,RegExp>={"%":/%|％|percent/i,"亿元":/亿元|hundred million/i,"万元":/万元|ten thousand/i,"百万元":/百万元|million/i,"亿美元":/亿美元|hundred million/i,"百万美元":/百万美元|million/i,"十亿韩元":/十亿韩元|billion/i};
 if(!(units[m.unit]?.test(input.excerpt)??input.excerpt.includes(m.unit)))throw new Error("摘录须包含原披露单位；不接受缺少单位的数字");
 const currency={CNY:/人民币|CNY|RMB|(?<!美|韩)元/i,USD:/美元|USD|US\$/i,KRW:/韩元|KRW|\bwon\b/i};
 if(/收入|营收|revenue/i.test(m.label)&&!m.currency)throw new Error("收入指标必须确认原披露币种");
 if(m.currency&&!currency[m.currency].test(input.excerpt))throw new Error("摘录须明确支持所选币种");
 if(input.progress==="revenue"&&(!/收入|营收|revenue/i.test(m.label)||/集团|合并|发电|非ESS|total|consolidated/i.test(m.scope)))throw new Error("仅相关业务单独收入可用于收入授信；混合口径请选择指标 / 背景");
}
export function reviewEvidence(list:Evidence[],input:ReviewInput,at=new Date().toISOString()) {
 const target=list.find(e=>e.id===input.evidenceId);
 if(!target||!target.imported)throw new Error("仅能复核当前空间的自定义候选");
 if(target.supersededBy)throw new Error("该材料已被后续材料取代，请先撤回取代它的材料");
 if(target.timeAnomaly&&input.action==="adopt")throw new Error("来源异常材料不能生效，请重新导入更正材料");
 if(input.action==="withdraw"&&target.researchState!=="adopted")throw new Error("只有已生效材料可以撤回");
 if(input.action==="adopt"&&target.researchState==="adopted")throw new Error("该材料已生效");
 const replacing=[...new Set(input.replacesIds||[])];
 if(input.action==="adopt"){
  if(input.progress!=="plan"&&planningOnly(target.claim+"\n"+input.excerpt))throw new Error("材料含未来计划或尚未开展表述，请按研发 / 规划复核；如原文包含已交付业务，请另行导入明确的事实摘录");
  if(input.progress==="revenue"||input.progress==="context")financialCheck(input);
  for(const id of replacing){const old=list.find(e=>e.id===id);if(!old||old.id===target.id||old.companyId!==target.companyId||!researchEligible(old))throw new Error("只能取代同公司当前有效材料，不能取代自身、候选或已停用材料");}
 }
 // Overlay only this workspace's new snapshot; older snapshots and the public seed stay intact.
 return list.map(e=>{
  if(e.id===target.id)return {...e,metric:input.action==="withdraw"?e.metric:(input.progress==="revenue"||input.progress==="context"?input.metric:undefined),stageIds:[...new Set(input.stageIds)],progress:input.progress,researchState:input.action==="adopt"?"adopted" as const:"withdrawn" as const,reviewStatus:input.action==="adopt"?"个人复核生效，未经独立核验":"个人已撤回",review:{at,reason:input.reason,excerpt:input.excerpt,sourceConfirmed:true,replacesIds:input.action==="adopt"?replacing:e.review?.replacesIds}};
  if(input.action==="adopt"&&replacing.includes(e.id))return {...e,supersededBy:target.id};
  if(input.action==="withdraw"&&e.supersededBy===target.id){const {supersededBy:_,...rest}=e;return rest;}
  return e;
 });
}
