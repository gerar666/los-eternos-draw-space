(function(global){
  'use strict';
  function chunks(text,max=220){
    const result=[];
    for(const sentence of text.match(/[^.!?]+(?:[.!?]+\s*|$)/g)||[text]){
      let part='';
      for(const word of sentence.trim().split(/\s+/)){
        if(!word)continue;
        if(part.length+word.length+1>max&&part){result.push(part);part='';}
        if(word.length>max){if(part){result.push(part);part='';}for(let i=0;i<word.length;i+=max)result.push(word.slice(i,i+max));}
        else part+=(part?' ':'')+word;
      }
      if(part)result.push(part);
    }
    return result;
  }
  class Narrator{
    constructor(synth,Utterance,onState=()=>{}){this.synth=synth;this.Utterance=Utterance;this.onState=onState;this.token=0;this.state='idle';this.current=null;this.queue=[];this.index=0;this.rate=1;}
    update(state,message){this.state=state;this.onState(state,message);}
    stop(message='Narración detenida.'){this.token++;this.current=null;this.queue=[];this.index=0;this.synth.cancel();this.update('idle',message);}
    play(texts,voice,rate=1){
      this.stop();
      if(!voice){this.update('idle','No hay una voz en español disponible. Puedes leer la historia en texto.');return;}
      this.voice=voice;this.rate=rate;this.queue=texts.flatMap(t=>chunks(t));
      if(!this.queue.length){this.update('idle','No hay texto disponible para esta selección.');return;}
      this.update('playing','Reproduciendo la historia.');this.next(this.token);
    }
    next(token){
      if(token!==this.token||this.state!=='playing')return;
      if(this.index>=this.queue.length){this.current=null;this.update('idle','Narración finalizada.');return;}
      const utterance=new this.Utterance(this.queue[this.index++]);
      this.current=utterance;utterance.lang=this.voice.lang||'es-PE';utterance.voice=this.voice;utterance.rate=this.rate;
      utterance.onend=()=>{if(token!==this.token||this.current!==utterance)return;this.current=null;if(this.state==='playing')this.next(token);};
      utterance.onerror=e=>{if(token!==this.token||this.current!==utterance)return;this.stop(e.error==='not-allowed'?'El navegador bloqueó la voz. Pulsa Reproducir para intentarlo de nuevo.':'La narración se interrumpió. Puedes reiniciar el capítulo o continuar leyendo el texto.');};
      try{this.synth.speak(utterance);}catch{this.stop('No se pudo iniciar la voz. Continúa con la lectura en texto.');}
    }
    pause(){if(this.state!=='playing')return;this.update('paused','Narración en pausa.');this.synth.pause();}
    resume(){if(this.state!=='paused')return;this.update('playing','Narración reanudada.');if(this.current)this.synth.resume();else this.next(this.token);}
  }
  global.EternosVoice={Narrator,chunks};
  if(typeof document==='undefined')return;
  const $=id=>document.getElementById(id),status=$('voice-status'),play=$('play'),pause=$('pause'),resume=$('resume'),stop=$('stop'),voices=$('voice-select'),selection=$('chapter-select'),speed=$('speed');
  if(!('speechSynthesis' in global)||!('SpeechSynthesisUtterance' in global)){
    status.textContent='Tu navegador no dispone de narración por voz. Puedes leer la historia completa en texto.';voices.innerHTML='<option>Voz no disponible</option>';return;
  }
  const data=JSON.parse($('comic-data').textContent),synth=global.speechSynthesis;
  let spanish=[];
  const narrator=new Narrator(synth,global.SpeechSynthesisUtterance,(state,message)=>{
    status.textContent=message;
    play.disabled=!spanish.length||state!=='idle';pause.disabled=state!=='playing';resume.disabled=state!=='paused';stop.disabled=state==='idle';
  });
  function priority(v){const lang=v.lang.toLowerCase().replace('_','-');return lang==='es-pe'?0:/^es-(mx|ar|cl|co|ec|bo|uy|ve|us|cr|do|gt|hn|ni|pa|pr|py|sv)$/.test(lang)?1:2;}
  function loadVoices(){
    const old=voices.value;spanish=synth.getVoices().filter(v=>/^es(?:[-_]|$)/i.test(v.lang)).sort((a,b)=>priority(a)-priority(b));
    voices.replaceChildren();
    for(const [i,v] of spanish.entries()){const opt=document.createElement('option');opt.value=v.voiceURI||String(i);opt.textContent=`${v.name} (${v.lang})`;voices.append(opt);}
    if(spanish.some((v,i)=>(v.voiceURI||String(i))===old))voices.value=old;
    if(!spanish.length){const opt=document.createElement('option');opt.textContent='No hay voces españolas disponibles';voices.append(opt);if(narrator.state!=='idle')narrator.stop();status.textContent='No se encontró una voz en español. Puedes instalar una voz española en tu dispositivo o leer la historia en texto.';}
    else if(narrator.state==='idle')status.textContent='Voz lista. Elige un capítulo y pulsa Reproducir.';
    voices.disabled=!spanish.length;play.disabled=!spanish.length||narrator.state!=='idle';
  }
  function texts(){
    if(selection.value==='dedicatoria')return ['Dedicatoria.',data.dedication];
    const chapters=selection.value==='all'?data.chapters:data.chapters.filter(c=>c.id===selection.value);
    return chapters.flatMap(c=>[`${c.number?'Capítulo '+c.number+'. ':''}${c.title}.`,...c.pages.flatMap(p=>[`Página ${p.storyPage}. ${p.title}.`,...p.panels.map(v=>`Viñeta ${v.order}. ${v.narration}`)])]);
  }
  play.addEventListener('click',()=>narrator.play(texts(),spanish[voices.selectedIndex],Number(speed.value)));
  pause.addEventListener('click',()=>narrator.pause());resume.addEventListener('click',()=>narrator.resume());stop.addEventListener('click',()=>narrator.stop());
  selection.addEventListener('change',()=>narrator.stop('Selección cambiada. Pulsa Reproducir para comenzar.'));
  voices.addEventListener('change',()=>narrator.stop('Voz cambiada. Pulsa Reproducir para comenzar.'));
  speed.addEventListener('change',()=>{narrator.rate=Number(speed.value);status.textContent='Velocidad actualizada. Se aplicará al siguiente fragmento.';});
  global.addEventListener('pagehide',()=>narrator.stop());
  synth.addEventListener('voiceschanged',loadVoices);loadVoices();setTimeout(loadVoices,1500);
})(typeof window==='undefined'?globalThis:window);
