import { ENDINGS, ENDING_ORDER } from "../core/index.js";
import { $ } from "./dom.js";

// 화면 전체가 공유하는 상태. nav는 순환 import를 피하려고 main.js가 채우는 화면 이동 함수 모음이다.
export const S = { birth: null, r: null, env: null, ch: null, rng: null, opts: [], dex: new Set(), cleanup: null, play: null, mode: "village", village: null, villageFailed: false };
export const nav = {};

const KEY = "saju-route-dex";
export function loadDex() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (Array.isArray(a)) a.forEach((k) => { if (ENDINGS[k]) S.dex.add(k); });
  } catch (e) { /* 저장소를 못 쓰면 이번 방문 동안만 기록한다 */ }
}
export function saveDex() {
  try { localStorage.setItem(KEY, JSON.stringify([...S.dex])); } catch (e) { /* 무시 */ }
}
export function paintDexCount() {
  const el = $("dex-count");
  if (el) el.textContent = `발견한 엔딩 ${S.dex.size} / ${ENDING_ORDER.length}`;
}
