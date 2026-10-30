import {reviewSchema,reviewEvidence} from "@/lib/review";
import {versions,save} from "@/lib/repository";
import {workspace,sameOrigin,readBody,json} from "@/lib/http";
import {blockedRequest} from "@/lib/validation";
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:"仅接受同源复核"},403);
 try{
  const key=workspace(request);if(!key)return json({error:"请先保存候选至当前研究空间"},400);
  const parsed=reviewSchema.safeParse(await readBody(request));if(!parsed.success)return json({error:"请选择环节和业务进展，核对来源并填写至少10字复核理由与原文摘录。"},400);
  if(blockedRequest(parsed.data.reason+parsed.data.excerpt))return json({error:"复核说明仅接受业务事实，不接受交易承诺或指令"},422);
  const head=(await versions(key))[0];if(head.revision!==parsed.data.expectedRevision)return json({error:"版本已变化，请刷新后复核"},409);
  if(head.revision>=25)return json({error:"演示空间已达版本上限"},429);
  let evidence;try{evidence=reviewEvidence(head.evidence,parsed.data);}catch(e){return json({error:e instanceof Error?e.message:"不能复核该材料"},400);}
  const version=await save(key,head.revision+1,evidence,`${parsed.data.action==="adopt"?"复核生效":"撤回材料"}：${parsed.data.reason}`);
  return json({version},201);
 }catch(e){if(e instanceof SyntaxError)return json({error:"JSON格式错误"},400);return json({error:"复核未完成；请刷新确认版本后重试"},503);}
}
