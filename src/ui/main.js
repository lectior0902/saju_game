// 앱 진입점: 화면 이동 함수를 연결하고 시작 화면을 연다.
import { S, nav, loadDex, paintDexCount } from "./state.js";
import { initForm } from "./start.js";
import { startRun } from "./play.js";

nav.startRun = startRun;
loadDex();
paintDexCount();
initForm();

if (location.search.includes("debug")) window.__S = S; // 브라우저 자동 점검용
