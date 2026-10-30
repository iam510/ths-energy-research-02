import {versions,save,updateExample} from "@/lib/repository";
import {updateSchema,fingerprint,blockedRequest} from "@/lib/validation";
import {json,workspace,sameOrigin,readBody} from "@/lib/http";
export const dynamic="force-dynamic";
export async function GET(request:Request) {try {return json({versions:await versions(workspace(request)),example:updateExample,mode:"offline",asOf:"2026-10-30",classificationVersion:"storage-v1"});}catch {return json({error:"无法读取研究版本；持久存储暂不可用。请重试，不会自动覆盖历史数据。"},503);}}
export async function POST(request:Request) {
 if(!sameOrigin(request)) return json({error:"仅接受同源提交"},403);
 try {
  const parsed=updateSchema.safeParse(await readBody(request));if(!parsed.success)return json({error:parsed.error.issues.map(i=>`${i.path.join(".")}: ${i.message}`).join("；")},400);
  const {evidence,expectedRevision,reason}=parsed.data;
  if(blockedRequest(evidence.claim+evidence.excerpt)) return json({error:"材料含交易建议或指令性内容，请仅提交业务事实与出处。"},422);
  const existing=workspace(request),key=existing||crypto.randomUUID(),head=(await versions(existing))[0];
  if(head.revision!==expectedRevision)return json({error:"研究版本已变化，请刷新后重新复核。"},409);
  if(head.revision>=25) return json({error:"当前演示空间已达到 25 个版本上限。"},429);
  if(head.evidence.some(e=>e.id===evidence.id||fingerprint(e)===fingerprint(evidence)))return json({error:"该材料已存在，未创建重复版本。"},409);
  // Only the exact curated example inherits independent verification. User content cannot self-assign trust.
  const curated=updateExample&&fingerprint(evidence)===fingerprint(updateExample)&&JSON.stringify(evidence.metric)===JSON.stringify(updateExample.metric)&&evidence.id===updateExample.id&&evidence.title===updateExample.title&&evidence.period===updateExample.period&&evidence.publishedAt===updateExample.publishedAt&&evidence.locator===updateExample.locator&&evidence.excerpt===updateExample.excerpt;
  const accepted=curated?updateExample:{...evidence,id:`user-${crypto.randomUUID()}`,metric:undefined,imported:true,reviewStatus:"用户已复核，未经独立核验",sourceType:"用户提交的官方来源材料"};
  const next=await save(key,head.revision+1,[...head.evidence,accepted],reason);
  const secure=new URL(request.url).protocol==="https:"?"; Secure":"";
  return json({version:next},201,{"Set-Cookie":`research_workspace=${key}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000${secure}`});
 }catch(error) {if(error instanceof SyntaxError)return json({error:"JSON 格式错误"},400);if(error instanceof Error&&/长度|JSON|为空/.test(error.message))return json({error:error.message},400);return json({error:"更新未完成，可能是并发冲突或存储故障；请刷新确认状态后重试。"},503);}
}
