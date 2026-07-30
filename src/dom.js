/* DOM 유틸. 다른 모듈에 의존하지 않는다. */

export const $ = id => document.getElementById(id);

export const esc = s => String(s == null ? '' : s)
  .replace(/[<>&"]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;' }[c]));

/* 악보 영역에서 그 마디가 (헤더·하단바에 가리지 않고) 보이는지 */
export function inView(e){
  const r = e.getBoundingClientRect();
  const footer = document.querySelector('footer');
  return r.top > 60 && r.bottom < window.innerHeight - (footer.offsetHeight + 10);
}

/* 재생 중인 마디 강조 */
export function hlBar(bi){
  document.querySelectorAll('.ms.play').forEach(e => e.classList.remove('play'));
  const e = document.querySelector(`.ms[data-bar="${bi}"]`);
  if(e){
    e.classList.add('play');
    if(!inView(e)) e.scrollIntoView({ block:'center', behavior:'smooth' });
  }
}
export const clearBarHl = () =>
  document.querySelectorAll('.ms.play').forEach(e => e.classList.remove('play'));

/* ══════════ 시트 ══════════ */
export function openSheet(html){
  const box = $('sbox');
  box.innerHTML = html;
  delete box.dataset.sec;
  $('sheet').classList.add('open');
}
export const closeSheet = () => $('sheet').classList.remove('open');

/* ══════════ 토스트 ══════════ */
let $t;
export function toast(m){
  if(!$t){
    $t = document.createElement('div');
    Object.assign($t.style, {
      position:'fixed', left:'50%', top:'72px', transform:'translateX(-50%)',
      background:'var(--ink)', color:'var(--paper)', padding:'9px 15px',
      borderRadius:'20px', fontSize:'13px', zIndex:99,
      transition:'opacity .3s', pointerEvents:'none',
    });
    document.body.append($t);
  }
  $t.textContent = m;
  $t.style.opacity = 1;
  clearTimeout($t._x);
  $t._x = setTimeout(() => { $t.style.opacity = 0; }, 1300);
}
