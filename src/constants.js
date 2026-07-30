/* 악기 정의와 고정 상수. 다른 모듈에 의존하지 않는다. */

/* p = 오선 위치(맨 아래 줄이 0, 반 칸마다 1). head = 음표머리 모양. sp = 특수 주법 */
export const INSTS = [
  { id:'CR', ko:'크래쉬',    p:12, head:'x', sp:null, spko:null },
  { id:'HH', ko:'하이햇',    p:10, head:'x', sp:'o',  spko:'오픈' },
  { id:'RD', ko:'라이드',    p:8,  head:'x', sp:'b',  spko:'벨' },
  { id:'TT', ko:'탐탐',      p:7,  head:'n', sp:null, spko:null },
  { id:'SN', ko:'스네어',    p:5,  head:'n', sp:'g',  spko:'고스트' },
  { id:'FT', ko:'플로어탐',  p:3,  head:'n', sp:null, spko:null },
  { id:'BD', ko:'베이스',    p:1,  head:'n', sp:null, spko:null },
  { id:'HF', ko:'하이햇페달', p:-2, head:'x', sp:null, spko:null },
];

export const IX = {};
INSTS.forEach(i => { IX[i.id] = i; });

/* INSTS 는 오선 위→아래 순서(그리기·안내용).
   하단 칩은 카피할 때 자주 쓰는 순서로 따로 배치한다. */
export const CHIPORDER = ['HH','SN','BD','CR','RD','TT','FT','HF'];

/* 칩은 좁으니 짧은 이름으로 (안내·악보 라벨은 원래 이름 그대로) */
export const SHORT = {
  HH:'하이햇', SN:'스네어', BD:'베이스', CR:'크래쉬',
  RD:'라이드', TT:'탐탐', FT:'플로어', HF:'HH페달',
};

export const UPPER = ['CR','HH','RD','TT','SN','FT'];   // 손 → 기둥 위
export const LOWER = ['BD','HF'];                       // 발 → 기둥 아래
export const LEDGER = { CR:12, HF:-2 };                 // 덧줄이 필요한 위치

/* 음표 타입 → 표시 기호 */
export const SYM = { n:'', a:'>', o:'○', g:'( )', b:'◆' };

/* 분할수 → 틱 라벨 */
export const TICKLBL = {
  1:['1'], 2:['1','&'], 3:['1','2','3'],
  4:['1','e','&','a'], 6:['1','2','3','4','5','6'],
};

/* 리듬 팔레트. 자주 쓰는 것부터.
   16비트 첫 줄 = 16분연타 · 8분 · 4분 · 쉼표 */
export const FAMS = [
  { id:4, ko:'16비트', pats:['1111','1010','1000','0000',
                             '0010','1100','1011','1101',
                             '1110','0111','1001','0101',
                             '0110','0011','0100','0001'] },
  { id:2, ko:'8비트',  pats:['11','10','01','00'] },
  { id:1, ko:'4분',    pats:['1','0'] },
  { id:3, ko:'셋잇단', pats:['111','100','110','011','101','010','001','000'] },
  { id:6, ko:'6연음',  pats:['111111','101010','100100','110110','101101','111000','000111','110011'] },
];

export const KEY   = 'drumcopy.v4.songs';
export const LASTK = 'drumcopy.v4.last';
export const THKEY = 'drumcopy.theme';
