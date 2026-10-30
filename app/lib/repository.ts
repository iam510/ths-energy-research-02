import {env} from "cloudflare:workers";
import seed from "@/data/evidence.json";
import example from "@/data/update-example.json";
import type {Evidence} from "./domain";
export const seedEvidence=seed as Evidence[];
export const updateExample=(example as Evidence[])[0];
export type Version={id:string;revision:number;evidence:Evidence[];reason:string;createdAt:string};
type Row={id:string;revision:number;evidence_json:string;reason:string;created_at:string};
const base:Version={id:"seed-v1",revision:0,evidence:seedEvidence,reason:"官方披露核验快照 · 2026-10-30",createdAt:"2026-10-30T00:00:00.000Z"};
const fromRow=(r:Row):Version=>({id:r.id,revision:r.revision,evidence:JSON.parse(r.evidence_json),reason:r.reason,createdAt:r.created_at});
export async function versions(workspaceId:string|null) {
 if(!workspaceId) return [base];
 if(!env.DB) throw new Error("持久存储未配置");
 const rows=await env.DB.prepare("SELECT id,revision,evidence_json,reason,created_at FROM research_versions WHERE workspace_id=? ORDER BY revision DESC LIMIT 30").bind(workspaceId).all<Row>();
 return [...rows.results.map(fromRow),base];
}
export async function save(workspaceId:string,revision:number,evidence:Evidence[],reason:string) {
 if(!env.DB) throw new Error("持久存储未配置");
 const v:Version={id:crypto.randomUUID(),revision,evidence,reason,createdAt:new Date().toISOString()};
 await env.DB.prepare("INSERT INTO research_versions(id,workspace_id,revision,evidence_json,reason,created_at) VALUES(?,?,?,?,?,?)").bind(v.id,workspaceId,revision,JSON.stringify(evidence),reason,v.createdAt).run();
 return v;
}
