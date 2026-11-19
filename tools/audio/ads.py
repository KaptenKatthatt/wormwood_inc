"""
The sound tracks of the eight made-up ad films (Jonas, 2026-11-19): a Swedish
announcer, music and one sound effect per film, generated through Pollinations
(POLLINATIONS_TOKEN) and mixed with ffmpeg into public/audio/ads/<id>.ogg and .mp3.

  python3 tools/audio/ads.py <workdir> [id ...]

Costs about 0.04 pollen per film. Check each voice by transcribing it before
use: the first take of one film said its name twice.
"""
import json,os,sys,time,urllib.request
T=os.environ['POLLINATIONS_TOKEN']
def bal():
  r=urllib.request.Request('https://gen.pollinations.ai/account/balance',headers={'Authorization':'Bearer '+T})
  return json.load(urllib.request.urlopen(r,timeout=30))['balance']
def speech(model,text,out,**kw):
  b0=bal()
  body=dict(model=model,input=text,response_format='mp3',**kw)
  try:
    r=urllib.request.urlopen(urllib.request.Request('https://gen.pollinations.ai/v1/audio/speech',data=json.dumps(body).encode(),headers={'Authorization':'Bearer '+T,'Content-Type':'application/json'}),timeout=300)
    open(out,'wb').write(r.read()); ok='ok'
  except Exception as e:
    ok='ERR '+str(e)[:100]+' '+(e.read()[:700].decode('utf8','replace') if hasattr(e,'read') else '')
  time.sleep(2); c=round(b0-bal(),4)
  print(json.dumps(dict(out=out,model=model,status=ok,cost=c),ensure_ascii=False),flush=True)
  return ok=='ok',c
BRIAN='nPczCjzI2devNBz1zQrb'; CHARLOTTE='XB0fDUnXU5powFXDhCwa'; ADAM='pNInz6obpgDQGcFmaJgB'; RACHEL='21m00Tcm4TlvDq8ikWAM'; DANIEL='onwK4e9ZLuTAKqWW03F9'
ADS={
 'barplock':dict(voice=RACHEL,fb=CHARLOTTE,say='[cheerful, playful, smiling] Plocka bär i skogen. Fyll korgen före dina vänner. Spela Bärplock, gratis i dag!',
   music='10 second instrumental jingle for a cute casual mobile game ad: bouncy ukulele, glockenspiel and hand claps, happy and light. No vocals.',
   sfx='Cartoon game pop and sparkle chime, cheerful, short'),
 'nordanvind':dict(voice=CHARLOTTE,fb=CHARLOTTE,say='[warm, calm, friendly commercial voice] Kaffe från Brygghuset Nordanvind. Rostat långsamt. Drucket vid havet. Nu i ny förpackning.',
   music='10 second instrumental music for a premium coffee TV commercial: warm acoustic guitar and soft piano, calm morning mood. No vocals.',
   sfx='Coffee being poured into a mug, with distant seagulls and gentle waves'),
 'vassen':dict(voice=DANIEL,fb=BRIAN,say='[warm, calm, trustworthy] Sommarstugor till salu vid sjön. Egen brygga och kvällssol. Visning i helgen. Mäklarhuset Vassen.',
   music='10 second instrumental music for a real estate commercial: gentle piano and soft strings, hopeful and calm summer evening. No vocals.',
   sfx='Calm lake water lapping against a wooden jetty with summer birdsong'),
 'fiskelyckan':dict(voice=ADAM,fb=BRIAN,say='[cheerful, energetic game commercial voice] Kasta ut, och dra upp storfångsten! Vinn fina priser varje dag. Ladda ner Fiskelyckan nu!',
   music='10 second instrumental jingle for a casual mobile fishing game ad: upbeat banjo, whistling and a bouncy bass, sunny and fun. No vocals.',
   sfx='Fishing reel spinning fast, then a big water splash'),
 'guldregn':dict(voice=BRIAN,fb=BRIAN,say='[excited, shouting like a hyped TV commercial announcer] Hundra gratissnurr väntar på dig! Jackpotten växer just nu! Snurra nu, och vinn stort! Guldregn!',
   music='10 second instrumental jingle for a flashy online casino TV commercial: fast pounding EDM beat, bright synth stabs, rising hype, ends with a big hit. Loud and garish. No vocals.',
   sfx='Slot machine jackpot: bells ringing and a cascade of coins pouring out'),
 'fulltraff':dict(voice=ADAM,fb=BRIAN,say='[shouting football commentator, very fast and intense] Matchen börjar nu! Dubbla oddset på ditt första spel! Alla andra har redan spelat. Fullträff!',
   music='10 second instrumental music for an aggressive sports betting TV commercial: hard rock guitar riff, pounding drums, stadium energy, loud. No vocals.',
   sfx='Referee whistle followed by a huge football stadium crowd roaring at a goal'),
 'fyndo':dict(voice=RACHEL,fb=CHARLOTTE,say='[hyper excited, very fast, over the top shopping commercial] Fyndo! Allt för nio kronor! Nittio procent rabatt, bara i dag! Erbjudandet går ut om femtionio sekunder!',
   music='10 second instrumental jingle for a cheap shopping app ad: hyperactive bubblegum pop, fast claps, cartoonish synth melody, annoying and catchy. No vocals.',
   sfx='Cash register ka-ching followed by a fast whoosh and a notification ding'),
 'kungarskrig':dict(voice=BRIAN,fb=BRIAN,say='[deep epic movie trailer voice, dramatic, intense] Bara en procent klarar nivå fem. Din borg brinner. Vad gör du? Ladda ner Kungars Krig, och bevisa det!',
   music='10 second instrumental epic trailer music for a mobile war strategy game ad: thunderous war drums, brass blasts and choir-like pads, dramatic build to a hit. No vocals.',
   sfx='A deep war horn blast followed by swords clashing and a battle cry of an army'),
}

import subprocess
work=sys.argv[1]; os.makedirs(work,exist_ok=True); os.chdir(work)
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','public','audio','ads')
for n in sys.argv[2:] or list(ADS):
  a=ADS[n]
  if not speech('elevenlabs/eleven-v4',a['say'],f'{n}-voice.mp3',voice=a['voice'])[0]: speech('elevenlabs/eleven-v4',a['say'],f'{n}-voice.mp3',voice=a['fb'])
  speech('elevenlabs/music-v2.5',a['music'],f'{n}-music.mp3',duration=10)
  speech('elevenlabs/eleven-text-to-sound-v3',a['sfx'],f'{n}-sfx.mp3',duration=3)
  loud=n in ('guldregn','fulltraff','fyndo','kungarskrig'); mv,sv=(0.42,0.55) if loud else (0.30,0.40)
  # effect first, the voice comes in after 0.9 s over the music
  f=f"[0:a]volume={mv},afade=t=in:d=0.15,afade=t=out:st=9.6:d=0.4[m];[1:a]loudnorm=I=-15:TP=-1.5,adelay=900|900[v];[2:a]volume={sv},afade=t=out:st=2.2:d=0.8[s];[m][v][s]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.95[o]"
  subprocess.run(['ffmpeg','-v','error','-y','-i',f'{n}-music.mp3','-i',f'{n}-voice.mp3','-i',f'{n}-sfx.mp3','-filter_complex',f,'-map','[o]','-ac','2','-ar','44100','-t','10.03',f'{n}.wav'],check=True)
  subprocess.run(['ffmpeg','-v','error','-y','-i',f'{n}.wav','-c:a','libvorbis','-q:a','4',f'{OUT}/{n}.ogg'],check=True)
  subprocess.run(['ffmpeg','-v','error','-y','-i',f'{n}.wav','-c:a','libmp3lame','-q:a','4',f'{OUT}/{n}.mp3'],check=True)
