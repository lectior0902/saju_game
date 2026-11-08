// 인생 풀이: 한 판의 기록(ch.history 등)을 사주 풀이처럼 초년·중년·말년운과 총평으로 풀어 쓴다.
// 문장은 모두 기록에서 뽑은 숫자와 사실에서만 만든다. 점괘처럼 보이지만 이 게임 안의 해석이다.
import { FIELDS } from "./data.js";
import { ENDINGS } from "./endings.js";
import { C, TURNS } from "./rules.js";

const eul = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c % 28 !== 0 ? "을" : "를"; };
const wa = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c % 28 !== 0 ? "과" : "와"; };
const ERAS = [{ name: "초년운", from: 0, to: 3 }, { name: "중년운", from: 4, to: 8 }, { name: "말년운", from: 9, to: TURNS - 1 }];
const MODE_NAME = { route: "순풍", open: "열린 길", aux: "보조", off: "낯선 길" };

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

function eraText(era, entries, ch) {
  const acts = entries.filter((e) => e.kind === "act"), rests = entries.length - acts.length;
  const out = [];
  if (!acts.length) return `${era.name}에는 대부분 쉬어 갔어요. 달리지 않은 시간도 이 삶의 일부예요.`;
  const byField = {}; acts.forEach((e) => { byField[e.field] = (byField[e.field] || 0) + e.gain; });
  const ranked = Object.keys(byField).sort((a, b) => byField[b] - byField[a]);
  const top = ranked[0], easy = acts.filter((e) => e.mode === "route" || e.mode === "open").length;
  const ratio = easy / acts.length;
  if (ratio >= 0.7) out.push(`[${top}]에 힘을 실었어요. 타고난 결이 받쳐 줘서 걸음이 가벼웠어요.`);
  else if (ratio <= 0.3) out.push(`[${top}] 쪽으로 오르막을 골라 걸었어요. 같은 일에도 마음이 더 들었어요.`);
  else if (ranked.length >= 2) out.push(`[${top}]${wa(top)} [${ranked[1]}]을(를) 오가며 폭을 넓혔어요.`.replace("]을(를)", `]${eul(ranked[1])}`));
  else out.push(`[${top}]에 힘을 쏟았어요.`);
  const opened = acts.filter((e) => e.opened).map((e) => e.field);
  if (opened.length) out.push(`이 시기에 [${opened.join("], [")}]의 길이 열렸어요.`);
  const peaks = acts.filter((e) => e.peak).length;
  if (peaks) out.push(`전성기가 겹쳐 루트 분야가 크게 빛난 해가 ${peaks}번 있었어요.`);
  const burn = acts.filter((e) => e.burn).length;
  if (burn) out.push(`마음이 바닥난 채로 달린 해가 ${burn}번 있었어요. 몸이 먼저 신호를 보낸 때예요.`);
  else if (rests >= 2) out.push(`쉬어 간 해가 ${rests}번 있어 숨을 고를 수 있었어요.`);
  else if (rests === 0 && acts.length >= 4) out.push("한 번도 쉬지 않고 달린 시기예요.");
  const failedOff = acts.filter((e) => e.tier === 0 && (e.mode === "off" || e.mode === "aux")).length;
  if (failedOff >= 2) out.push("뜻대로 안 된 해도 있었지만, 이야기는 끊기지 않고 이어졌어요.");
  return `${era.name}: ` + out.join(" ");
}

/** 인생 풀이 전체. ending은 judge(ch)의 결과. */
export function readLife(ch, ending, r) {
  const tl = timeline(ch);
  const total = FIELDS.reduce((s, f) => s + ch.xp[f], 0) || 1;
  const routeXp = FIELDS.filter((f) => ch.route.includes(f)).reduce((s, f) => s + ch.xp[f], 0);
  const eras = ERAS.map((era) => {
    const ents = tl.slice(era.from, era.to + 1);
    return { name: era.name, range: `${ents[0].age}~${Math.min(C.END, ents[ents.length - 1].age + C.STEP - 1)}세`, ...mood(ents), text: eraText(era, ents, ch), gain: ents.reduce((s, e) => s + e.gain, 0), entries: ents };
  });
  const strongest = eras.reduce((b, e) => (e.gain > b.gain ? e : b), eras[0]);
  eras.forEach((e) => { e.strongest = e === strongest; });

  const overall = [];
  overall.push(`쌓은 성취의 ${Math.round((routeXp / total) * 100)}%는 타고난 루트에서, ${Math.round(((total - routeXp) / total) * 100)}%는 루트 밖에서 나왔어요.`);
  const opened = [...ch.opened];
  if (opened.length) overall.push(`스스로 연 길은 ${opened.map((f) => `[${f}]`).join(", ")}이에요.`);
  else overall.push("새로 연 길은 없었어요. 낯선 길은 같은 길을 몇 번 걸어야 열려요.");
  const rests = tl.filter((e) => e.kind === "rest").length;
  overall.push(rests ? `쉬어 간 해는 ${rests}번이에요.` : "쉰 해는 한 번도 없었어요.");
  if (ch.encLog && ch.encLog.length) {
    const g = ch.encLog.filter((e) => e.gamble).length, pass = ch.encLog.filter((e) => e.pass).length;
    overall.push(`길에서 만난 일 ${ch.encLog.length}번 중 ${g}번은 운에 맡기는 선택을, ${pass}번은 지나치는 선택을 했어요.`);
  }
  const grit = ch.history.filter((e) => e.tier === 0 && (e.mode === "off" || e.mode === "aux")).length;
  if (grit) overall.push(`낯선 길에서 뜻대로 안 된 해가 ${grit}번 있었지만 이야기는 이어졌어요.`);

  return {
    headline: ADVICE[ending.key].headline, advice: ADVICE[ending.key].advice,
    timeline: tl, eras, overall, mode: MODE_NAME,
    stats: [
      { label: "총 성취", value: `${ending.total.toFixed(0)}점` },
      { label: "가장 깊은 길", value: ending.top },
      { label: "새로 연 길", value: `${opened.length}곳` },
      { label: "쉰 해", value: `${rests}번` },
    ],
  };
}

const ADVICE = {
  wind: { headline: "물 흐르듯 가는 삶", advice: "순풍일수록 일부러 기웃거린 길 하나가 다음 해의 씨앗이 돼요. 한 번쯤 낯선 길에도 발을 들여 보세요." },
  pioneer: { headline: "길을 열며 걸은 삶", advice: "열어 둔 길은 이제 당신의 것이에요. 쉬는 칸을 지켜야 그 길을 오래 쓸 수 있어요." },
  twopaths: { headline: "두 갈래를 모두 걸은 삶", advice: "두 길을 함께 걷는 건 두 배의 체력이 필요해요. 어느 한쪽을 쉬는 해를 일부러 만들어 보세요." },
  master: { headline: "한 우물을 깊이 판 삶", advice: "깊이는 충분해요. 이제는 우물 곁에 작은 길 하나를 내어 보면 물이 더 멀리 흘러요." },
  late: { headline: "뒤늦게 환해진 삶", advice: "초반의 느림은 헛걸음이 아니었어요. 기다림을 견딘 만큼 후반이 밝아요." },
  rebel: { headline: "경사를 거슬러 오른 삶", advice: "타고난 결과 다른 길을 걸은 만큼 더 힘들었을 거예요. 쉼을 죄책감 없이 쓰는 법을 익히세요." },
  burnout: { headline: "불꽃처럼 타오른 삶", advice: "불은 장작을 아껴야 오래 타요. 마음이 바닥나기 전에 쉬어 가는 해를 먼저 잡아 두세요." },
  calm: { headline: "자기 속도로 걸은 삶", advice: "깊이는 반복에서 나와요. 마음이 가는 한 길을 정해 서너 해만 이어 걸어 보세요." },
  drift: { headline: "바다를 떠돈 삶", advice: "개척에는 문턱이 있어요. 한 길을 정해 몇 번 반복해야 길이 열려요. 다음에는 한 곳에 닻을 내려 보세요." },
};
export { ADVICE, MODE_NAME };
