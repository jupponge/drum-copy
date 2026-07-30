/* WebAudio 합성음 + 재생 (도돌이표 반영) */
import { INSTS } from './constants.js';
import { app, secOf } from './state.js';
import { $, hlBar, clearBarHl } from './dom.js';

let AC = null;
const ac = () => AC || (AC = new (window.AudioContext || window.webkitAudioContext)());

function noise(d){
  const c = ac(), n = Math.max(1, c.sampleRate * d);
  const b = c.createBuffer(1, n, c.sampleRate), a = b.getChannelData(0);
  for(let i=0; i<n; i++) a[i] = Math.random()*2 - 1;
  const s = c.createBufferSource();
  s.buffer = b;
  return s;
}
function envg(g, t, pk, d){
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(pk, t + .002);
  g.gain.exponentialRampToValueAtTime(.0001, t + d);
}
function drum(t, f0, f1, dur, vel, type){
  const c = ac(), o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur*.55);
  envg(g, t, vel, dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + .02);
}
function hats(t, hz, dur, vel){
  const c = ac(), f = c.createBiquadFilter(), g = c.createGain();
  f.type = 'highpass'; f.frequency.value = hz;
  const n = noise(dur + .02);
  n.connect(f); f.connect(g); g.connect(c.destination);
  envg(g, t, vel, dur);
  n.start(t);
}

/* 한 음 내기. when = 지금부터 몇 초 뒤 */
export function tick(id, type, when){
  const c = ac(), t = c.currentTime + (when || 0);
  const vel = type === 'a' ? 1 : type === 'g' ? .28 : .7;
  if(id === 'BD') drum(t, 145, 48, .20, vel*.95);
  else if(id === 'TT') drum(t, 240, 130, .28, vel*.8);
  else if(id === 'FT') drum(t, 150, 80, .36, vel*.85);
  else if(id === 'SN'){ hats(t, 1400, .17, vel*.6); drum(t, 190, 175, .09, vel*.22, 'triangle'); }
  else if(id === 'HH') hats(t, 7000, type === 'o' ? .34 : .045, vel*.34);
  else if(id === 'HF') hats(t, 5200, .05, vel*.26);
  else if(id === 'RD'){
    hats(t, type === 'b' ? 4200 : 6000, type === 'b' ? .5 : .75, vel*.22);
    if(type === 'b') drum(t, 880, 820, .35, vel*.16, 'triangle');
  }
  else if(id === 'CR') hats(t, 3200, 1.05, vel*.4);
  else if(id === 'CLK'){
    const g = c.createGain(), o = c.createOscillator();
    o.type = 'square';
    o.frequency.value = type === 'hi' ? 1600 : 900;
    envg(g, t, .09, .04);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + .05);
  }
}

let playing = false, timers = [], range = null;

/* 재생할 마디 순서 — 섹션 반복(도돌이표)을 펼친다 */
export function playOrder(from, to){
  const order = [];
  for(let s = Math.floor(from/4); s < Math.ceil(to/4); s++){
    const rep = 1 + (secOf(s).rep || 0);
    for(let k=0; k<rep; k++)
      for(let b = s*4; b < s*4+4; b++)
        if(b >= from && b < to) order.push(b);
  }
  return order;
}

export function play(from, to){
  if(playing){ stop(); return; }
  ac().resume();
  range = [from ?? 0, to ?? app.song.bars.length];
  playing = true;
  $('play').textContent = '■';
  schedule();
}

function schedule(){
  const order = playOrder(range[0], range[1]), spb = 60 / app.song.bpm;
  let t = ac().currentTime + .15;
  timers.forEach(clearTimeout); timers = [];
  order.forEach(bi => {
    const st = t;
    timers.push(setTimeout(() => hlBar(bi), Math.max(0, (st - ac().currentTime) * 1000)));
    app.song.bars[bi].beats.forEach((beat, ei) => {
      if(app.metroOn) tick('CLK', ei === 0 ? 'hi' : 'lo', t - ac().currentTime);
      INSTS.forEach(i => {
        const o = beat[i.id];
        o.s.forEach((v, k) => { if(v) tick(i.id, v, (t + spb*k/o.d) - ac().currentTime); });
      });
      t += spb;
    });
  });
  timers.push(setTimeout(() => {
    if(app.loopOn && playing) schedule(); else stop();
  }, (t - ac().currentTime) * 1000));
}

export function stop(){
  playing = false;
  timers.forEach(clearTimeout); timers = [];
  $('play').textContent = '▶';
  clearBarHl();
}
