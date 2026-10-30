"""Verify the actual quota SQL against isolated SQLite fixtures, with no model calls."""
from pathlib import Path
from datetime import datetime,timedelta,timezone
import sqlite3,re,json,tempfile,concurrent.futures,uuid
ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'app/lib/ai-service.ts').read_text()
statement=re.search(r'prepare\(`(INSERT INTO ai_runs.*?)`\)',source,re.S).group(1)
schema=(ROOT/'app/drizzle/0001_medical_the_hand.sql').read_text()
results=[]
def submit(db,key='test-workspace',minute=0,limit=30):
 now=datetime(2026,10,30,0,0,tzinfo=timezone.utc)+timedelta(minutes=minute)
 at=now.isoformat(timespec='milliseconds').replace('+00:00','Z');since=(now-timedelta(minutes=1)).isoformat(timespec='milliseconds').replace('+00:00','Z')
 params=(str(uuid.uuid4()),key,'2026-10-30','fixture','test-model','test-prompt','[]','pending',at,'2026-10-30',limit,key,'2026-10-30',8,since)
 cur=db.execute(statement,params);db.commit();return cur.rowcount
with sqlite3.connect(':memory:') as db:
 db.executescript(schema)
 assert [submit(db,key=f'test-{i}') for i in range(7)]==[1]*6+[0]
 results.append({'case':'每分钟全站最多6次','status':'passed'})
with sqlite3.connect(':memory:') as db:
 db.executescript(schema)
 assert [submit(db,minute=i*2) for i in range(9)]==[1]*8+[0]
 results.append({'case':'同一空间每日最多8次','status':'passed'})
with sqlite3.connect(':memory:') as db:
 db.executescript(schema)
 assert [submit(db,key=f'test-{i}',minute=i*2,limit=10) for i in range(11)]==[1]*10+[0]
 results.append({'case':'全站日上限不能用新空间绕过','status':'passed'})
(ROOT/'app/.sites-runtime').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(dir=ROOT/'app/.sites-runtime') as tmp:
 db_path=Path(tmp)/'fixture.sqlite'
 with sqlite3.connect(db_path) as db:db.executescript(schema)
 def one(i):
  with sqlite3.connect(db_path,timeout=10) as db:return submit(db,key=f'concurrent-{i}',limit=5)
 with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
  assert sum(executor.map(one,range(20)))==5
 results.append({'case':'20个并发申请不超全站5次测试配额','status':'passed'})
(ROOT/'delivery/调用额度测试.json').write_text(json.dumps({'fixtureOnly':True,'modelCalls':0,'results':results},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(results,ensure_ascii=False))
