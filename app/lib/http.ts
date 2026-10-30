export const json=(body:unknown,status=200,headers:Record<string,string>={})=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff",...headers}});
export function workspace(request:Request) {const value=request.headers.get("cookie")?.split(";").map(c=>c.trim()).find(c=>c.startsWith("research_workspace="))?.slice(19);return value&&/^[a-f0-9-]{36}$/.test(value)?value:null;}
export function sameOrigin(request:Request) {return request.headers.get("origin")===new URL(request.url).origin;}
export async function readBody(request:Request) {
 if(!request.headers.get("content-type")?.includes("application/json")) throw new Error("请提交 JSON 数据");
 if(Number(request.headers.get("content-length")||0)>18000) throw new Error("材料超过长度限制");
 const reader=request.body?.getReader();if(!reader) throw new Error("请求内容为空");let n=0;const chunks:Uint8Array[]=[];
 for(;;){const{done,value}=await reader.read();if(done)break;n+=value.length;if(n>18000){await reader.cancel();throw new Error("材料超过长度限制");}chunks.push(value);}
 const bytes=new Uint8Array(n);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
