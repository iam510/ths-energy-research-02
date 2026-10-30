"""Create the complete 02 submission without local runtime state or credentials."""
from pathlib import Path
from datetime import datetime,timezone
import json,zipfile,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
SKIP={'.git','.site-source-git','node_modules','dist','.next','.vinext','.wrangler','.sites-runtime','__pycache__','tools','recording-frames','outputs'}
def eligible(p):
 rel=p.relative_to(ROOT)
 if any(part in SKIP for part in rel.parts):return False
 if not p.is_file() or p.is_symlink():return False
 if p.name=='.DS_Store' or p.suffix in {'.zip','.sqlite','.db','.pem'} or p.name.endswith('.tsbuildinfo'):return False
 if p.name.startswith(('.env','.dev.vars')) and p.name!='.env.example':return False
 if p.name.endswith('-deployment.tar.gz') or p.name=='录制元数据.json':return False
 return True
files=sorted(p for p in ROOT.rglob('*') if eligible(p) and p.name!='提交文件清单.json')
patterns=[rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',rb'\b(?:sk-[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{24,})\b']
for p in files:
 if p.suffix in {'.png','.jpg','.mp4','.svg'}:continue
 content=p.read_bytes()
 if any(re.search(pattern,content) for pattern in patterns):raise SystemExit(f'Possible secret; package stopped: {p.relative_to(ROOT)}')
required=['README.md','app/package.json','app/package-lock.json','app/app/page.tsx','app/drizzle/0000_material_celestials.sql','app/.env.example','data/research-sources.json','docs/测试说明.md','docs/AI使用与验证记录.md','delivery/演示视频.mp4','delivery/提交清单.md']
for name in required:
 if ROOT/name not in files:raise SystemExit(f'Missing required delivery: {name}')
manifest={'generatedAt':datetime.now(timezone.utc).isoformat(),'root':ROOT.name,'files':[{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files],'note':'清单自身不记录自身哈希；排除本地凭据、运行数据库、依赖、构建缓存、Git元数据、录制原始帧与工具二进制。'}
manifest_path=ROOT/'delivery/提交文件清单.json';manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');files.append(manifest_path)
archive=ROOT/'02_产业链跨市场与公司研究_提交包.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for p in files:z.write(p,str(Path(ROOT.name)/p.relative_to(ROOT)))
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 assert all(name.startswith(ROOT.name+'/') for name in z.namelist())
 print(json.dumps({'archive':str(archive),'files':len(z.namelist()),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest()},ensure_ascii=False))
