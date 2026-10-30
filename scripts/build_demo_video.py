"""Encode actual CUA screen samples with explanatory captions; never fabricate UI."""
from pathlib import Path
import json, sys, subprocess
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'delivery/tools'))
import imageio_ffmpeg
meta=json.loads((ROOT/'delivery/录制元数据.json').read_text())
frames=meta['frames'];fps=meta['fps'];target=ROOT/'delivery/演示视频.mp4'
w,h=Image.open(frames[0]['file']).size
width=(w+1)//2*2;height=(h+92+1)//2*2
font_path='/System/Library/Fonts/STHeiti Medium.ttc'
font=ImageFont.truetype(font_path,19);small=ImageFont.truetype(font_path,12)
cmd=[imageio_ffmpeg.get_ffmpeg_exe(),'-y','-f','rawvideo','-vcodec','rawvideo','-s',f'{width}x{height}','-pix_fmt','rgb24','-r',str(fps),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',str(target)]
p=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
for i,f in enumerate(frames):
 im=Image.open(f['file']).convert('RGB');canvas=Image.new('RGB',(width,height),'#14262d');canvas.paste(im,(0,0));draw=ImageDraw.Draw(canvas)
 draw.text((22,h+16),f['phase'],font=font,fill='#cbe6d6')
 draw.text((22,h+51),meta.get('footer','储能研究台 / 真实本地页面分段操作演示 · 离线规则模式 · 无运行时模型调用'),font=small,fill='#9bb7ad')
 draw.rectangle((0,height-4,(i+1)/len(frames)*width,height),fill='#74b393')
 p.stdin.write(canvas.tobytes())
p.stdin.close();err=p.stderr.read();status=p.wait()
if status: raise RuntimeError(err.decode()[-3000:])
result={'file':target.name,'durationSeconds':len(frames)/fps,'width':width,'height':height,'fps':fps,'frames':len(frames),'bytes':target.stat().st_size,'method':'CUA实际页面屏幕采样分段录制，添加说明字幕，未伪造UI状态。'}
(ROOT/'delivery/视频校验.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
