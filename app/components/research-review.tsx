"use client";
import {useState,useEffect} from "react";
import {companies,stages,relationStatus,tier,researchEligible,type Evidence} from "@/lib/domain";
type Version={id:string;revision:number;evidence:Evidence[];reason:string;createdAt:string};
export function EvidenceMatrix({evidence,onCompany}:{evidence:Evidence[];onCompany:(id:string)=>void}){
 return <section className="panel evidence-matrix"><div className="section-heading"><div><h2>公司 × 业务环节可信度</h2><p>按具体业务分别判断；规划不计为已开展业务，未检得不代表没有。</p></div></div><div className="table-scroll"><table><thead><tr><th>公司</th>{stages.map(s=><th key={s.id}>{s.name}</th>)}</tr></thead><tbody>{companies.map(c=><tr key={c.id}><th><button className="text-link" onClick={()=>onCompany(c.id)}>{c.name}</button></th>{stages.map(s=>{const r=relationStatus(c.id,s.id,evidence);return <td key={s.id}><button className={`relation-cell ${r.tone}`} onClick={()=>onCompany(c.id)} aria-label={`${c.name} ${s.name} ${r.label}`}><strong>{r.label}</strong>{r.hasPlan&&r.rank>1&&<small>另有规划，需跟踪兑现</small>}{r.personal&&<small>含个人复核材料</small>}<small>{r.evidenceIds.length?`${r.evidenceIds.length}条支持材料`:"本研究库 / 截至2026-10-30"}</small></button></td>;})}</tr>)}</tbody></table></div><p className="muted small">资料主要为2025年度公开披露及当前空间新增材料；未检得仅指本研究库范围，未进行全网穷尽检索。同一收入披露可涉及多个环节，不代表各环节有单独收入。个人复核生效不会改变公共样本的独立核验状态。</p></section>;
}
export function ReviewQueue({version,disabled,onVersion}:{version:Version;disabled:boolean;onVersion:(v:Version)=>void}){
 const list=version.evidence.filter(e=>e.imported),[selected,setSelected]=useState(""),[stageIds,setStageIds]=useState<string[]>([]),[progress,setProgress]=useState(""),[excerpt,setExcerpt]=useState(""),[reason,setReason]=useState(""),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[replacesIds,setReplacesIds]=useState<string[]>([]);
 const [metric,setMetric]=useState({label:"",value:"",unit:"",currency:"",scope:""});
 const target=list.find(e=>e.id===selected)||list[0];
 const financial=progress==="revenue"||progress==="context";
 useEffect(()=>{setStageIds(target?.stageIds||[]);setProgress(target?.researchState==="adopted"?target.progress||"":"");setExcerpt(target?.review?.excerpt||target?.excerpt||"");setReason("");setConfirmed(false);setError("");setReplacesIds([]);const m=target?.metric;setMetric({label:m?.label||"",value:m?String(m.value):"",unit:m?.unit||"",currency:m?.currency||"",scope:m?.scope||""});},[target?.id,version.revision]);
 async function submit(action:"adopt"|"withdraw"){
  if(!target)return;setBusy(true);setError("");
  try{
   const body={expectedRevision:version.revision,evidenceId:target.id,action,stageIds,progress,excerpt,reason,sourceConfirmed:confirmed,replacesIds,metric:financial?{...metric,value:metric.value.trim()?Number(metric.value):null,currency:metric.currency||undefined}:undefined};
   const r=await fetch("/api/review",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   const data=await r.json() as {error?:string;version:Version};if(!r.ok)throw new Error(data.error||"复核失败");onVersion(data.version);
  }catch(e){setError(e instanceof Error?e.message:"复核失败");}finally{setBusy(false);}
 }
 return <section className="panel review-queue">
  <div className="section-heading"><div><h2>候选 → 复核生效 → 更正 / 撤回</h2><p>在当前空间更新归属、财务指标和引用；被取代材料保留原文与历史，停止参与当前研究。</p></div></div>
  {!target?<p className="muted">先保存一条新候选，再在这里核对原文、选择支持的业务环节。</p>:<>
   <label className="form-label">复核材料<select value={target.id} onChange={e=>setSelected(e.target.value)}>{list.map(e=><option key={e.id} value={e.id}>{companies.find(c=>c.id===e.companyId)?.name} · {tier(e).label} · {e.id.slice(0,18)}</option>)}</select></label>
   <p className="claim">{target.claim}</p><p className="small"><a className="text-link" href={target.url} target="_blank" rel="noreferrer">打开原始材料 ↗</a> · {target.locator} · {target.period}</p>
   <p className="small">当前状态：<strong>{tier(target).label}</strong></p>
   <fieldset disabled={disabled||busy||!!target.supersededBy} className="review-fields">
    <fieldset className="review-stages"><legend>原文支持的业务环节</legend>{stages.map(s=><label key={s.id}><input type="checkbox" checked={stageIds.includes(s.id)} onChange={e=>setStageIds(v=>e.target.checked?[...v,s.id]:v.filter(id=>id!==s.id))}/>{s.name}</label>)}</fieldset>
    <label className="form-label">业务进展<select value={progress} onChange={e=>setProgress(e.target.value)}><option value="" disabled>请选择原文支持的进展</option><option value="product">产品 / 交付等证据</option><option value="plan">研发 / 规划</option><option value="revenue">已披露相关业务收入</option><option value="context">财务指标 / 混合口径背景</option></select></label>
    <p className="muted small">“拟新增、预计未来、尚未开展”等材料只能记为规划。含规划与已开展业务的混合段落，请拆成明确事实。个人复核不等于独立核验。</p>
    {financial&&<div className="review-financial"><p className="small">逐项抄录原披露值，不换算币种或单位。摘录须包含数值、单位及币种；报告期沿用本条材料。</p>{[{key:"label",label:"指标名称"},{key:"value",label:"原披露数值"},{key:"unit",label:"原披露单位（如 百万美元、%）"},{key:"scope",label:"具体业务范围（至少5字符）"}].map(f=><label className="form-label" key={f.key}>{f.label}<input value={metric[f.key as keyof typeof metric]} onChange={e=>setMetric(v=>({...v,[f.key]:e.target.value}))}/></label>)}<label className="form-label">币种<select value={metric.currency} onChange={e=>setMetric(v=>({...v,currency:e.target.value}))}><option value="">无币种（如毛利率）</option><option value="CNY">人民币 CNY</option><option value="USD">美元 USD</option><option value="KRW">韩元 KRW</option></select></label></div>}
    <label className="form-label">核对的原文摘录<textarea value={excerpt} onChange={e=>setExcerpt(e.target.value)} maxLength={500} placeholder="至少10字符；对照原文，财务指标保留数值及原单位"/></label>
    {target.researchState!=="adopted"&&<fieldset className="review-stages"><legend>更正或冲突：取代哪些旧依据（可选）</legend><p className="muted small">仅列同公司当前有效材料。选择后旧依据在新版本停用；撤回本条会恢复它们。仅新增补充材料时不勾选。</p>{version.evidence.filter(e=>e.companyId===target.companyId&&e.id!==target.id&&researchEligible(e)).map(e=><label key={e.id}><input type="checkbox" checked={replacesIds.includes(e.id)} onChange={event=>setReplacesIds(v=>event.target.checked?[...v,e.id]:v.filter(id=>id!==e.id))}/><span>[{e.id}] {e.claim.slice(0,100)}</span></label>)}</fieldset>}
    {target.review?.replacesIds?.length? <p className="banner warning">撤回将恢复被本条取代的依据：{target.review.replacesIds.join("、")}。如旧依据仍有问题，请导入新的更正材料。</p>:null}
    <label className="form-label">复核、更正或撤回理由<textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={300} placeholder="至少10字符；更正须说明新旧材料的冲突及选择依据"/></label>
    <label className="confirm-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>我已对照来源核对公司、报告期、单位与业务范围；仅在我的研究空间生效。</label>
    <button className="button primary" disabled={!confirmed||!stageIds.length||!progress||reason.trim().length<10||excerpt.trim().length<10} onClick={()=>submit(target.researchState==="adopted"?"withdraw":"adopt")}>{busy?"正在保存复核…":target.researchState==="adopted"?"撤回这条材料":"复核通过并生效"}</button>
   </fieldset>
   {error&&<div role="alert" className="banner warning">{error}</div>}{disabled&&<p className="muted">历史版本只读，请返回最新版本复核。</p>}{target.supersededBy&&<p className="banner warning">已被 [{target.supersededBy}] 取代。需先撤回后续材料才能操作。</p>}
  </>}
 </section>;
}
