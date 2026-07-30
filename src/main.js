/* 진입점 — 테마 적용 → 마지막 악보 복원 → 렌더 → 이벤트 연결 */
import './style.css';
import { LASTK, THKEY } from './constants.js';
import { app, clone, resetHist } from './state.js';
import { render } from './render.js';
import { wire } from './ui.js';
import { allSongs, setTheme } from './sheets.js';

setTheme(localStorage.getItem(THKEY) === 'light' ? 'light' : 'dark');

const last = allSongs().find(s => s.id === localStorage.getItem(LASTK));
if(last) app.song = clone(last);

resetHist();
render();
wire();
