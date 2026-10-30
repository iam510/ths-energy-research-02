import {buildAnalysis,validateCitations} from "@/lib/domain";
import {analysisInput} from "@/lib/validation";
import {versions} from "@/lib/repository";
import {json,workspace,sameOrigin,readBody} from "@/lib/http";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
 if(!sameOrigin(request))return json({error:"仅接受同源研究请求"},403);
 try {
  const parsed=analysisInput.safeParse(await readBody(request));if(!parsed.success)return json({error:"请选择有效公司、情景与研究模式。系统不接受交易指令。"},400);
  if(parsed.data.mode==="live")return json({error:"当前交付按用户要求为离线版本，未配置真实模型。请参考模型接入说明；本次没有执行模型调用。",mode:"offline"},503);
  const head=(await versions(workspace(request)))[0];
  const result=buildAnalysis(parsed.data.companyId,parsed.data.scenarioId,head.evidence);
  if(!validateCitations(result,head.evidence))return json({error:"引用校验未通过，未生成正常研究结果。"},422);
  return json({analysis:result,revision:head.revision,model:null,mode:"offline-rules"});
 }catch{return json({error:"研究请求未完成，请检查请求或稍后重试。原研究版本未改变。"},503);}
}
