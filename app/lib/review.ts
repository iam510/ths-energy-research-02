import {z} from "zod";
import type {Evidence} from "./domain.ts";
export const reviewSchema=z.object({expectedRevision:z.number().int().nonnegative(),evidenceId:z.string().min(1).max(90),action:z.enum(["adopt","withdraw"]),reason:z.string().trim().min(10).max(300),stageIds:z.array(z.enum(["cell","pcs","system","service"])).min(1).max(4),progress:z.enum(["product","plan"]),sourceConfirmed:z.literal(true),excerpt:z.string().trim().min(10).max(500)}).strict();
export type ReviewInput=z.infer<typeof reviewSchema>;
export function reviewEvidence(list:Evidence[],input:ReviewInput,at=new Date().toISOString()) {
 const target=list.find(e=>e.id===input.evidenceId);
 if(!target||!target.imported)throw new Error("仅能复核当前空间的自定义候选");
 if(target.timeAnomaly&&input.action==="adopt")throw new Error("来源异常材料不能生效，请重新导入更正材料");
 if(input.action==="withdraw"&&target.researchState!=="adopted")throw new Error("只有已生效材料可以撤回");
 if(input.action==="adopt"&&target.researchState==="adopted")throw new Error("该材料已生效");
 return list.map(e=>e.id!==target.id?e:{...e,metric:undefined,stageIds:[...new Set(input.stageIds)],progress:input.progress,researchState:input.action==="adopt"?"adopted" as const:"withdrawn" as const,reviewStatus:input.action==="adopt"?"个人复核生效，未经独立核验":"个人已撤回",review:{at,reason:input.reason,excerpt:input.excerpt,sourceConfirmed:true}});
}
