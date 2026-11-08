// 인생 풀이: 한 판의 기록(ch.history 등)을 사주 풀이처럼 초년·중년·말년운, 세운, 일간 풀이, 기운 풀이, 총평으로 풀어 쓴다.
// 문장은 모두 기록에서 뽑은 숫자와 사실에서만 만든다. 점괘처럼 보이지만 이 게임 안의 해석이다.
// 표현은 reading-data.js의 문장 풀에서 골라 쓰고, 고르는 값은 판의 기록으로 정해서 같은 판은 늘 같은 풀이가 나온다.
import { FIELDS, ELEMENTS } from "./data.js";
import { C, TURNS, mulberry32 } from "./rules.js";
import { LEAD, FRAG, MOTTO, YEAR, BALANCE, ADVICES, STEM_IMAGE, STEM_LINK, FIELD_EL, EL_INFO, josa } from "./reading-data.js";

const ERAS = [{ name: "초년운", from: 0, to: 3 }, { name: "중년운", from: 4, to: 8 }, { name: "말년운", from: 9, to: TURNS - 1 }];
const MODE_NAME = { route: "순풍", open: "열린 길", aux: "보조", off: "낯선 길" };
const ERA_CLOSE = {
  초년운: ["아직 정해지지 않은 길이 많아서 더 가볍게도, 더 불안하게도 느껴졌던 때예요.", "첫걸음의 시기라 결과보다 방향이 더 크게 남아요.", "무엇이든 처음이라 작은 성공도 오래 기억에 남는 시기예요."],
  중년운: ["한창 힘을 쓰는 때라 선택 하나하나의 무게가 커요.", "쌓아 온 것을 확인하게 되는 시기예요.", "가장 바쁘고, 가장 많이 흔들리고, 가장 많이 이루는 때예요."],
  말년운: ["지나온 길이 한눈에 보이기 시작하는 때예요.", "속도보다 방향과 마음의 무게를 돌아보게 되는 시기예요.", "지금까지의 선택이 하나로 이어지는 때예요."],
};
export const HEADLINE = {
  wind: "물 흐르듯 가는 삶", pioneer: "길을 열며 걸은 삶", twopaths: "두 갈래를 모두 걸은 삶", master: "한 우물을 깊이 판 삶", late: "뒤늦게 환해진 삶",
  rebel: "경사를 거슬러 오른 삶", burnout: "불꽃처럼 타오른 삶", calm: "자기 속도로 걸은 삶", drift: "바다를 떠돈 삶",
};
// 이전 버전과의 호환: 대표 조언(첫 번째 문장)
export const ADVICE = Object.fromEntries(Object.keys(HEADLINE).map((k) => [k, { headline: HEADLINE[k], advice: ADVICES[k][0] }]));

const strHash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/** 한 해마다 한 칸: 그림으로 그릴 수 있게 정리한 흐름 */
export function timeline(ch) {
  return Array.from({ length: TURNS }, (_, t) => {
    const e = ch.history.find((x) => x.turn === t);
    const age = C.START + t * C.STEP;
    return e ? { ...e, age } : { turn: t, age, kind: "rest", field: null, mode: null, tier: null, gain: 0, mind: null, peak: false, burn: false, opened: false };
  });
}

function mood(entries) {
  const acts = entries.filter((e) => e.kind === "act");
  if (!acts.length) return { tag: "쉼", tone: "calm" };
  const avg = acts.reduce((s, e) => s + e.gain, 0) / acts.length;
  const burn = acts.filter((e) => e.burn).length;
  if (burn >= 2) return { tag: "고비", tone: "bad" };
  if (avg >= 13) return { tag: "상승", tone: "good" };
  if (avg >= 9) return { tag: "순탄", tone: "good" };
  return { tag: "오르막", tone: "warn" };
}

/** 시기의 분위기를 사자성어로. [한글, 한자, 뜻] */
function motto(era, ents, strongest, endKey) {
  const acts = ents.filter((e) => e.kind === "act"), rests = ents.length - acts.length;
  if (!acts.length) return MOTTO.quiet;
  const easy = acts.filter((e) => e.mode === "route" || e.mode === "open").length / acts.length;
  const avg = acts.reduce((s, e) => s + e.gain, 0) / acts.length;
  const burn = acts.filter((e) => e.burn).length, opened = acts.filter((e) => e.opened).length;
  const failed = acts.filter((e) => e.tier === 0 && (e.mode === "off" || e.mode === "aux")).length;
  const kinds = new Set(acts.map((e) => e.field)).size;
  if (burn >= 2) return MOTTO.excess;
  if (endKey === "late" && era.name === "말년운" && strongest) return MOTTO.bloom;
  if (opened && easy < 0.6) return MOTTO.climb;
  if (failed >= 2) return MOTTO.retry;
  if (easy >= 0.7 && avg >= 12) return MOTTO.breeze;
  if (strongest && avg >= 11) return MOTTO.rise;
  if (rests >= 2) return MOTTO.leisure;
  if (kinds >= 3) return MOTTO.busy;
  if (avg < 8) return MOTTO.quiet;
  return MOTTO.steady;
}

function eraText(era, ents, ch, pick) {
  const acts = ents.filter((e) => e.kind === "act"), rests = ents.length - acts.length, key = era.name;
  if (!acts.length) return pick(`${key}-allrest`, ["이 시기에는 대부분 쉬어 갔어요. 달리지 않은 시간도 이 삶의 일부예요.", "이 시기에는 쉬어 가는 쪽을 택했어요. 멈춘 시간이 삶의 숨이 되었어요."]);
  const byField = {}; acts.forEach((e) => { byField[e.field] = (byField[e.field] || 0) + e.gain; });
  const ranked = Object.keys(byField).sort((a, b) => byField[b] - byField[a]);
  const top = ranked[0], easy = acts.filter((e) => e.mode === "route" || e.mode === "open").length / acts.length;
  const out = [];
  if (easy >= 0.7) out.push(pick(`${key}-lead`, LEAD.easy)(top));
  else if (easy <= 0.3) out.push(pick(`${key}-lead`, LEAD.hard)(top));
  else if (ranked.length >= 2) out.push(pick(`${key}-lead`, LEAD.mixed)(top, ranked[1]));
  else out.push(pick(`${key}-lead`, LEAD.single)(top));
  const opened = acts.filter((e) => e.opened).map((e) => `[${e.field}]`);
  if (opened.length) out.push(pick(`${key}-open`, FRAG.opened)(opened.join(", ")));
  const peaks = acts.filter((e) => e.peak).length;
  if (peaks) out.push(pick(`${key}-peak`, FRAG.peak)(peaks));
  const burn = acts.filter((e) => e.burn).length;
  if (burn) out.push(pick(`${key}-burn`, FRAG.burn)(burn));
  else if (rests >= 2) out.push(pick(`${key}-rest`, FRAG.rest)(rests));
  else if (rests === 0 && acts.length >= 4) out.push(pick(`${key}-norest`, FRAG.norest));
  if (acts.filter((e) => e.tier === 0 && (e.mode === "off" || e.mode === "aux")).length >= 2) out.push(pick(`${key}-fail`, FRAG.failed));
  out.push(pick(`${key}-close`, ERA_CLOSE[key]));
  return out.join(" ");
}

/** 세운: 인생을 바꾼 해를 몇 개 뽑는다 */
function turningYears(ch, tl, pick) {
  const acts = tl.filter((e) => e.kind === "act"), items = [];
  const best = acts.slice().sort((a, b) => b.gain - a.gain)[0];
  if (best) items.push({ turn: best.turn, kind: "best", label: "가장 빛난 해", text: pick("y-best", YEAR.best)(best.age, best.field, best.gain.toFixed(0)) });
  acts.filter((e) => e.opened).slice(0, 2).forEach((e) => items.push({ turn: e.turn, kind: "open", label: "길이 열린 해", text: pick(`y-open${e.turn}`, YEAR.open)(e.age, e.field) }));
  const burnY = acts.find((e) => e.burn);
  const hard = burnY || acts.filter((e) => e.mode === "off" || e.mode === "aux").sort((a, b) => a.gain - b.gain)[0];
  if (hard) items.push({ turn: hard.turn, kind: "hard", label: "가장 버거웠던 해", text: pick("y-hard", YEAR.hard)(hard.age, hard.field) });
  const rest = tl.find((e) => e.kind === "rest");
  if (rest) items.push({ turn: rest.turn, kind: "rest", label: "쉬어 간 해", text: pick("y-rest", YEAR.rest)(rest.age) });
  const g = (ch.encLog || []).find((e) => e.gamble);
  if (g) items.push({ turn: g.turn, kind: "gamble", label: "운에 맡긴 해", text: pick("y-gamble", YEAR.gamble)(C.START + g.turn * C.STEP, g.field) });
  const seen = new Set();
  return items.filter((i) => (seen.has(i.turn + i.kind) ? false : seen.add(i.turn + i.kind))).sort((a, b) => a.turn - b.turn).slice(0, 5);
}

/** 기운 풀이: 타고난 오행과 이번 생에 쓴 오행을 견준다. r이 없으면 쓴 기운만 말한다. */
function balanceReading(ch, r, pick) {
  const used = Object.fromEntries(ELEMENTS.map((e) => [e, 0]));
  FIELDS.forEach((f) => { used[FIELD_EL[f]] += ch.xp[f]; });
  const usedTotal = ELEMENTS.reduce((s, e) => s + used[e], 0) || 1;
  const rows = ELEMENTS.map((e) => ({ el: e, hanja: EL_INFO[e].hanja, innate: r ? Math.round(r.share[e] * 100) : null, used: Math.round((used[e] / usedTotal) * 100) }));
  const usedTop = ELEMENTS.slice().sort((a, b) => used[b] - used[a])[0];
  const lines = [];
  if (r) {
    const innateTop = ELEMENTS.slice().sort((a, b) => r.share[b] - r.share[a])[0];
    lines.push(innateTop === usedTop ? pick("b-match", BALANCE.match)(`${usedTop}(${EL_INFO[usedTop].hanja})`) : pick("b-differ", BALANCE.differ)(`${innateTop}(${EL_INFO[innateTop].hanja})`, `${usedTop}(${EL_INFO[usedTop].hanja})`));
  } else lines.push(`이번 생에 가장 많이 쓴 기운은 ${usedTop}(${EL_INFO[usedTop].hanja})이에요.`);
  // 비어 있는 기운: 타고난 몫과 쓴 몫을 합쳐 가장 적은 오행
  const lack = ELEMENTS.slice().sort((a, b) => (r ? r.share[a] : 0) + used[a] / usedTotal - ((r ? r.share[b] : 0) + used[b] / usedTotal))[0];
  const info = EL_INFO[lack], f = pick("b-tip", info.fields);
  lines.push(pick("b-tip2", BALANCE.tip)(`${lack}(${info.hanja})`, f));
  return { rows, lines, lack: { el: lack, hanja: info.hanja, field: f, hint: `${info.dir} · ${info.color} · ${info.season}의 기운이에요` }, usedTop };
}

/** 인생 풀이 전체. ending은 judge(ch)의 결과, r은 사주 분석(없어도 동작). */
export function readLife(ch, ending, r) {
  const tl = timeline(ch);
  const seed = strHash(ch.history.map((e) => `${e.field || "_"}${Math.round(e.gain)}${e.tier ?? ""}`).join("|") + ch.route.join(""));
  const pick = (salt, pool) => pool[Math.floor(mulberry32((seed ^ strHash(salt)) >>> 0)() * pool.length)];

  const total = FIELDS.reduce((s, f) => s + ch.xp[f], 0) || 1;
  const routeXp = FIELDS.filter((f) => ch.route.includes(f)).reduce((s, f) => s + ch.xp[f], 0);
  const eras = ERAS.map((era) => {
    const ents = tl.slice(era.from, era.to + 1);
    return { name: era.name, range: `${ents[0].age}~${Math.min(C.END, ents[ents.length - 1].age + C.STEP - 1)}세`, ...mood(ents), text: eraText(era, ents, ch, pick), gain: ents.reduce((s, e) => s + e.gain, 0), entries: ents };
  });
  const strongest = eras.reduce((b, e) => (e.gain > b.gain ? e : b), eras[0]);
  eras.forEach((e) => { e.strongest = e === strongest; const m = motto(ERAS.find((x) => x.name === e.name), e.entries, e.strongest, ending.key); e.motto = { kr: m[0], hanja: m[1], gloss: m[2] }; });

  const overall = [];
  overall.push(`쌓은 성취의 ${Math.round((routeXp / total) * 100)}%는 타고난 루트에서, ${Math.round(((total - routeXp) / total) * 100)}%는 루트 밖에서 나왔어요.`);
  const opened = [...ch.opened];
  overall.push(opened.length ? `스스로 연 길은 ${opened.map((f) => `[${f}]`).join(", ")}이에요.` : "새로 연 길은 없었어요. 낯선 길은 같은 길을 몇 번 걸어야 열려요.");
  const rests = tl.filter((e) => e.kind === "rest").length;
  overall.push(rests ? `쉬어 간 해는 ${rests}번이에요.` : "쉰 해는 한 번도 없었어요.");
  if (ch.encLog && ch.encLog.length) {
    const g = ch.encLog.filter((e) => e.gamble).length, pass = ch.encLog.filter((e) => e.pass).length;
    overall.push(`길에서 만난 일 ${ch.encLog.length}번 중 ${g}번은 운에 맡기는 선택을, ${pass}번은 지나치는 선택을 했어요.`);
  }
  const grit = ch.history.filter((e) => e.tier === 0 && (e.mode === "off" || e.mode === "aux")).length;
  if (grit) overall.push(`낯선 길에서 뜻대로 안 된 해가 ${grit}번 있었지만 이야기는 이어졌어요.`);

  let hook = null;
  const stem = r && r.dayMaster ? r.dayMaster[0] : null;
  if (stem && STEM_IMAGE[stem]) hook = { title: `${STEM_IMAGE[stem][0]} 일간으로 읽으면`, text: `${STEM_IMAGE[stem][1]} ${pick("hook", STEM_LINK[ending.key])}` };

  return {
    headline: HEADLINE[ending.key], advice: pick("advice", ADVICES[ending.key]),
    timeline: tl, eras, overall, mode: MODE_NAME, hook, years: turningYears(ch, tl, pick), balance: balanceReading(ch, r, pick),
    stats: [
      { label: "총 성취", value: `${ending.total.toFixed(0)}점` },
      { label: "가장 깊은 길", value: ending.top },
      { label: "새로 연 길", value: `${opened.length}곳` },
      { label: "쉰 해", value: `${rests}번` },
    ],
  };
}
export { MODE_NAME, josa };
