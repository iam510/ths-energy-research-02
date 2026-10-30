import {buildAnalysis,validateCitations} from "@/lib/domain";
import {analysisInput} from "@/lib/validation";
import {versions} from "@/lib/repository";
import {json,workspace,sameOrigin,readBody} from "@/lib/http";
import {aiResponse} from "@/lib/ai-service";
import {ModelFailure} from "@/lib/ai-contract";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
 if(!sameOrigin(request))return json({error:"仅接受同源研究请求"},403);
 try {
  const parsed=analysisInput.safeParse(await readBody(request));if(!parsed.success)return json({error:"请选择有效公司、情景与研究模式。系统不接受交易指令。"},400);
  if(parsed.data.mode==="live")return await aiResponse(request,{task:"transmission",companyId:parsed.data.companyId,scenarioId:parsed.data.scenarioId,revision:parsed.data.revision});
  const history=await versions(workspace(request));
  const head=parsed.data.revision===undefined?history[0]:history.find(v=>v.revision===parsed.data.revision);
  if(!head)return json({error:"所选研究版本不存在"},409);
  const result=buildAnalysis(parsed.data.companyId,parsed.data.scenarioId,head.evidence);
  if(!validateCitations(result,head.evidence))return json({error:"引用校验未通过，未生成正常研究结果。"},422);
  return json({analysis:result,revision:head.revision,model:null,mode:"offline-rules"});
 }catch(error){if(error instanceof ModelFailure)return json({error:error.publicMessage,code:error.code},error.httpStatus);if(error instanceof SyntaxError)return json({error:"JSON 格式错误"},400);if(error instanceof Error&&/长度|JSON|为空/.test(error.message))return json({error:error.message},400);return json({error:"研究请求未完成，请检查请求或稍后重试。原研究版本未改变。"},503);}
}
