// 게임 규칙. 모든 밸런스 숫자는 C에 모아 둔다.
import { FIELDS, ENV_RESOURCE, ENV_REGION, SUPPORT_P, SUPPORT_MIND } from "./data.js";
import { QUEST, stageIndex } from "./quests.js";

export const C = {
  BASE: 10, OFF: 0.65, AUX: 0.85, PEAK: 1.3,
  COST_IN: 4, COST_AUX: 5, COST_OFF: 7, REST: 20, BURN: 20,
  OPEN: 4, OPEN_BONUS: 15, NAT: 3, START: 18, END: 57, STEP: 3,
  PERF: [0.8, 1.0, 1.15, 1.3], // 미니게임 성과 등급(0~3) 배율
  BASE_OPTIONS: 4,
  GRIT_MAX: 2, // 굳은살: 낯선 길에서 0등급을 받을 때마다 +1, 다음 행동의 마음 비용 −1(한 번에 1 소모)
};
export const TURNS = Math.floor((C.END - C.START) / C.STEP) + 1; // 14

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 출발 환경을 정한다. fixed에 값이 있으면 그것을 쓰고, 없으면 무작위. */
export function rollEnv(rng, fixed = {}) {
  const pick = (obj) => Object.keys(obj)[Math.floor(rng() * Object.keys(obj).length)];
  return { resource: fixed.resource || pick(ENV_RESOURCE), region: fixed.region || pick(ENV_REGION) };
}

export function newChar(r, env = { resource: "mid", region: "town" }) {
  const res = ENV_RESOURCE[env.resource];
  return {
    key: r.typeKey, route: r.type.route.slice(), aux: r.aux, season: r.season, peak: r.peak, env,
    xp: Object.fromEntries(FIELDS.map((f) => [f, 0])),
    pioneer: Object.fromEntries(FIELDS.map((f) => [f, 0])),
    grit: Object.fromEntries(FIELDS.map((f) => [f, 0])),
    questLog: Object.fromEntries(FIELDS.map((f) => [f, []])),
    seenEvents: new Set(), encounters: 0, encLog: [],
    history: [], // 한 해마다 한 줄: { turn, age, kind: "act"|"rest", field, mode, tier, gain, mind, peak, burn, opened }
    opened: new Set(), mind: res.startMind, turn: 0, burnTurns: 0, early: 0, late: 0, lastField: null,
    // 환경이 만든 차이(엔딩에서 보여 준다)
    envMind: 0,      // 환경 때문에 더 쓴 마음(음수면 덜 쓴 것)
    envOptions: 0,   // 기본 4개 대비 제시된 분야 수의 누적 차이
    support: 0,      // 지원 제도를 만난 횟수
    routeMisses: 0,  // 가까이에 루트 분야 기회가 없었던 해
    note: "",
  };
}

export const openNeed = (ch) => C.OPEN + ch.season.openDelta;

export function modeOf(ch, f) {
  if (ch.route.includes(f)) return "route";
  if (ch.opened.has(f)) return "open";
  if (f === ch.aux) return "aux";
  return "off";
}

export function info(ch, f, age) {
  const mode = modeOf(ch, f);
  const easy = mode === "route" || mode === "open";
  const mult = easy ? 1 : mode === "aux" ? C.AUX : C.OFF;
  const res = ENV_RESOURCE[ch.env.resource];
  const envDelta = res.allDelta + (easy ? 0 : res.offDelta);
  const gritUse = !easy && (ch.grit?.[f] || 0) > 0 ? 1 : 0; // 굳은살이 있으면 루트 밖 분야의 비용이 1 줄어든다
  const cost = Math.max(1, (easy ? C.COST_IN : mode === "aux" ? C.COST_AUX : C.COST_OFF) + ch.season.costPlus + envDelta - gritUse);
  const peak = easy && age >= ch.peak[0] && age <= ch.peak[1];
  const level = easy ? 0 : mode === "aux" ? 1 : 2; // 미니게임 난이도
  return { mode, easy, mult, cost, peak, level, envDelta, gritUse };
}

/** 이번 턴에 제시할 분야. 지역에 따라 개수가 달라지고, 루트 분야는 최소 1개 포함. */
export function offer(ch, rng) {
  const reg = ENV_REGION[ch.env.region], n = reg.options;
  const shuf = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  ch.envOptions += n - C.BASE_OPTIONS;
  if (reg.routeMissP > 0 && rng() < reg.routeMissP) {
    // 이번 해에는 가까이에 타고난 루트 분야의 기회가 없다
    ch.routeMisses++;
    return shuf(FIELDS.filter((f) => !ch.route.includes(f))).slice(0, n);
  }
  const must = ch.route[Math.floor(rng() * ch.route.length)];
  const rest = shuf(FIELDS.filter((f) => f !== must));
  return shuf([must, ...rest.slice(0, n - 1)]);
}

const GOOD = {
  학문: ["오래 붙잡던 개념이 한순간에 이어진다.", "발표를 들은 선배가 연구에 관심을 보인다."],
  창작: ["올린 작업이 뜻밖에 입소문을 탄다.", "우연히 본 풍경에서 다음 작품이 떠오른다."],
  사업: ["첫 단골이 지인을 데려온다.", "거래처가 다음 분기 계약을 먼저 제안한다."],
  조직: ["맡은 일이 잘 풀려 신뢰가 쌓인다.", "윗사람이 중요한 자리에 이름을 올려 준다."],
  관계: ["모임에서 만난 사람이 오래 가는 친구가 된다.", "어려울 때 먼저 손을 내미는 사람이 생긴다."],
  기술: ["몇 번을 실패하던 작업이 손에 익는다.", "익힌 기술로 다른 사람의 문제를 풀어 준다."],
};
const BAD = ["일이 꼬이고 사소한 오해가 쌓인다.", "몸이 먼저 신호를 보낸다.", "믿었던 계획이 틀어져 한동안 허탈하다."];

/** perf: 미니게임 성과 등급 0~3. 반환: { log, gain, openedNow } */
export function act(ch, f, age, perf, rng) {
  const log = [];
  const i = info(ch, f, age);
  let gain = C.BASE * i.mult * ch.season.gainMult * C.PERF[perf];
  if (i.peak) { gain *= C.PEAK; log.push({ t: "peak", s: "전성기의 순풍을 탔어요." }); }
  if (ch.mind <= C.BURN) { gain *= 0.5; ch.burnTurns++; log.push({ t: "bad", s: "지쳐서 성과가 반으로 줄었어요." }); }
  ch.mind = Math.max(0, ch.mind - i.cost);
  ch.envMind += i.envDelta;
  let openedNow = false;
  if (i.gritUse) { ch.grit[f]--; log.push({ t: "info", s: "굳은살 덕분에 마음이 덜 들었어요." }); }
  if (!i.easy) {
    const need = openNeed(ch);
    openedNow = bumpPioneer(ch, f);
    const k = ch.pioneer[f];
    const st = QUEST[f].stages[stageIndex(k, need)];
    const failed = perf === 0;
    ch.questLog[f][k - 1] = { tier: perf, text: failed ? st.fail : st.ok };
    log.push({ t: "quest", s: `${QUEST[f].title} ${k}/${need} · ${st.t} — ${failed ? st.fail : st.ok}` });
    if (failed) {
      ch.grit[f] = Math.min(C.GRIT_MAX, ch.grit[f] + 1);
      log.push({ t: "info", s: "이번엔 잘 안 됐지만 이야기는 이어져요. 굳은살이 생겨 다음엔 마음이 덜 들어요." });
    } else log.push({ t: "info", s: `낯선 길이라 더 힘들어요. 개척 포인트 ${k}/${need}` });
    if (openedNow) { gain += C.OPEN_BONUS; log.push({ t: "open", s: `[${f}] 분야에 길이 열렸어요. 이제 이 분야도 수월해요.` }); }
  }
  if (rng() < 0.5) {
    const p = (i.easy ? 0.55 : i.mode === "aux" ? 0.45 : 0.35) + ch.season.goodPlus;
    if (rng() < p) { gain += 6; log.push({ t: "good", s: GOOD[f][Math.floor(rng() * 2)] }); }
    else { ch.mind = Math.max(0, ch.mind - 8); log.push({ t: "bad", s: BAD[Math.floor(rng() * BAD.length)] }); }
  }
  ch.xp[f] += gain;
  if (ch.turn < Math.ceil(TURNS / 2)) ch.early += gain; else ch.late += gain;
  ch.lastField = f;
  ch.history.push({ turn: ch.turn, age, kind: "act", field: f, mode: i.mode, tier: perf, gain, mind: ch.mind, peak: i.peak, burn: log.some((l) => l.s.startsWith("지쳐서")), opened: openedNow });
  return { log, gain, openedNow };
}

/** 낯선 길 개척 포인트를 1 올린다. 필요한 만큼 모이면 분야가 열리고 true를 돌려준다. */
export function bumpPioneer(ch, f) {
  ch.pioneer[f]++;
  if (ch.pioneer[f] >= openNeed(ch)) { ch.opened.add(f); return true; }
  return false;
}

export function rest(ch) {
  const res = ENV_RESOURCE[ch.env.resource];
  ch.mind = Math.min(100, ch.mind + C.REST + ch.season.restPlus + res.restDelta);
  ch.envMind += -res.restDelta;
  ch.lastField = null;
  ch.history.push({ turn: ch.turn, age: C.START + ch.turn * C.STEP, kind: "rest", field: null, mode: null, tier: null, gain: 0, mind: ch.mind, peak: false, burn: false, opened: false });
}

/** 한 해를 마무리한다. 불리한 환경 하나당 지원 제도를 만날 확률이 있다. */
export function endTurn(ch, rng) {
  ch.mind = Math.min(100, ch.mind + C.NAT);
  ch.turn++;
  ch.note = "";
  const p = (ch.env.resource === "tight" ? SUPPORT_P : 0) + (ch.env.region === "rural" ? SUPPORT_P : 0);
  if (p > 0 && rng && rng() < p) {
    ch.mind = Math.min(100, ch.mind + SUPPORT_MIND);
    ch.support++;
    ch.note = `지역 지원 제도와 장학 같은 도움을 만나 마음이 +${SUPPORT_MIND} 돌아왔어요.`;
  }
}
