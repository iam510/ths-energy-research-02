import {aiTaskSchema,aiResponse} from "@/lib/ai-service";
import {ModelFailure} from "@/lib/ai-contract";
import {json,sameOrigin,readBody} from "@/lib/http";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:"仅接受同源研究请求"},403);
 try{const input=aiTaskSchema.safeParse(await readBody(request));if(!input.success)return json({error:"研究参数不完整或超出范围，请核对公司、材料和来源。",code:"INVALID_INPUT"},400);return await aiResponse(request,input.data);}
 catch(error){if(error instanceof ModelFailure)return json({error:error.publicMessage,code:error.code},error.httpStatus);if(error instanceof SyntaxError||error instanceof Error&&/长度|JSON|为空/.test(error.message))return json({error:"请求格式错误或超过长度限制。"},400);return json({error:"研究服务暂不可用。"},503);}
}
