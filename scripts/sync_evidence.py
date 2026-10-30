"""Rebuild public seed and update example from the auditable source registry."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
rows=json.loads((root/'data/research-sources.json').read_text())
assert len(rows)==len({e['id'] for e in rows})
example=[e for e in rows if e['id']=='tesla-05']
assert len(example)==1
for name,data in [('evidence.json',[e for e in rows if e['id']!='tesla-05']),('update-example.json',example)]:
 (root/'app/data'/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(f'Seed: {len(rows)-1}; update example: 1')
