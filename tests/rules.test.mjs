import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, newChar, offer, info, act, rest, endTurn, judge, mulberry32, rollEnv, modeOf, openNeed, C, TURNS, FIELDS,
  ENV_RESOURCE, ENV_REGION, ENDINGS, ENDING_ORDER } from "../src/core/index.js";

const mk = (env, y = 1999, m = 3, d = 14, h = 6) => newChar(analyze(y, m, d, h), env);
const MID = { resource: "mid", region: "town" };

test("턴 수는 14, 시작 나이는 18", () => { assert.equal(TURNS, 14); assert.equal(C.START, 18); });

test("루트 분야와 낯선 길의 마음 소모와 효율이 다르다", () => {
  const ch = mk(MID);
  const route = ch.route[0], off = FIELDS.find((f) => modeOf(ch, f) === "off");
  const a = info(ch, route, 20), b = info(ch, off, 20);
  assert.equal(a.mult, 1); assert.equal(b.mult, C.OFF);
  assert.ok(b.cost > a.cost);
  assert.equal(a.level, 0); assert.equal(b.level, 2);
});

test("낯선 길을 4번 반복하면 열리고 이후 루트와 같은 효율이 된다", () => {
  const ch = mk(MID, 1999, 8, 20, 6); // 가을(봄이 아님)
  assert.equal(ch.season.openDelta, 0);
  const off = FIELDS.find((f) => modeOf(ch, f) === "off");
  const rng = mulberry32(1);
  for (let i = 0; i < openNeed(ch); i++) act(ch, off, 30, 1, rng);
  assert.ok(ch.opened.has(off));
  assert.equal(modeOf(ch, off), "open");
  assert.equal(info(ch, off, 30).mult, 1);
});

test("봄 출생은 개척 문턱이 3이다", () => {
  const ch = mk(MID, 1999, 3, 14, 6);
  assert.equal(ch.season.name, "봄");
  assert.equal(openNeed(ch), 3);
});

test("번아웃(마음 20 이하)에서 행동하면 성취가 절반이고 번아웃 횟수가 오른다", () => {
  const a = mk(MID), b = mk(MID);
  const f = a.route[0]; b.mind = C.BURN;
  const r1 = act(a, f, 20, 1, () => 0.99), r2 = act(b, f, 20, 1, () => 0.99);
  assert.ok(Math.abs(r2.gain - r1.gain / 2) < 1e-9);
  assert.equal(b.burnTurns, 1);
});

test("미니게임 성과 등급이 성취 배율에 곱해진다", () => {
  const f = (t) => { const ch = mk(MID); return act(ch, ch.route[0], 18, t, () => 0.99).gain; };
  assert.ok(Math.abs(f(3) / f(0) - C.PERF[3] / C.PERF[0]) < 1e-9);
});

test("환경: 빠듯은 모든 행동의 마음 소모가 늘고 쉬어도 덜 회복된다", () => {
  const mid = mk(MID), tight = mk({ resource: "tight", region: "town" });
  const r = mid.route[0];
  assert.equal(info(tight, r, 20).cost, info(mid, r, 20).cost + 1);
  mid.mind = 50; tight.mind = 50; rest(mid); rest(tight);
  assert.equal(mid.mind - tight.mind, 4);
  assert.equal(tight.mind, 50 + C.REST + tight.season.restPlus - 4);
  assert.equal(tight.envMind, 4);
});

test("환경: 넉넉은 낯선 길의 마음 소모가 줄고 시작 마음이 더 높다", () => {
  const mid = mk(MID), rich = mk({ resource: "rich", region: "town" });
  const off = FIELDS.find((f) => modeOf(mid, f) === "off");
  assert.equal(info(rich, off, 20).cost, info(mid, off, 20).cost - 1);
  assert.ok(rich.mind > mid.mind);
});

test("환경: 지역에 따라 제시 분야 수가 달라진다", () => {
  const rng = mulberry32(5);
  for (const [k, reg] of Object.entries(ENV_REGION)) {
    const ch = mk({ resource: "mid", region: k });
    for (let i = 0; i < 40; i++) assert.equal(offer(ch, rng).length, reg.options);
  }
});

test("환경: 대도시·중소도시는 매 턴 루트 분야가 최소 1개 포함된다", () => {
  const rng = mulberry32(9);
  for (const region of ["metro", "town"]) {
    const ch = mk({ resource: "mid", region });
    for (let i = 0; i < 200; i++) assert.ok(offer(ch, rng).some((f) => ch.route.includes(f)));
  }
});

test("환경: 외곽에서는 약 4번에 1번 루트 분야가 선택지에 없다", () => {
  const rng = mulberry32(11), ch = mk({ resource: "mid", region: "rural" });
  let miss = 0; const N = 4000;
  for (let i = 0; i < N; i++) if (!offer(ch, rng).some((f) => ch.route.includes(f))) miss++;
  assert.ok(Math.abs(miss / N - 0.25) < 0.03, `miss=${miss / N}`);
  assert.equal(ch.routeMisses, miss);
});

test("환경: 불리한 환경에서만 지원 제도를 만나고 마음이 회복된다", () => {
  const good = mk({ resource: "rich", region: "metro" }), bad = mk({ resource: "tight", region: "rural" });
  let g = 0, b = 0;
  const rng = mulberry32(3);
  for (let i = 0; i < 2000; i++) { good.mind = 50; bad.mind = 50; endTurn(good, rng); endTurn(bad, rng); if (good.note) g++; if (bad.note) b++; }
  assert.equal(g, 0);
  assert.ok(Math.abs(b / 2000 - 0.2) < 0.03, `p=${b / 2000}`); // 빠듯 0.1 + 외곽 0.1
  assert.equal(bad.mind > 50, true);
});

test("환경 롤: 고정값은 그대로 쓰고 나머지는 무작위", () => {
  const rng = mulberry32(2);
  for (let i = 0; i < 50; i++) {
    const e = rollEnv(rng, { resource: "tight" });
    assert.equal(e.resource, "tight");
    assert.ok(e.region in ENV_REGION);
  }
});

test("엔딩 9종의 제목·힌트·문구 정의가 빠짐없이 있다", () => {
  assert.equal(ENDING_ORDER.length, 9);
  for (const k of ENDING_ORDER) {
    assert.ok(ENDINGS[k].title && ENDINGS[k].hint);
    assert.ok(typeof ENDINGS[k].text({ top: "사업", route1: "사업", open1: "관계" }) === "string");
  }
});

test("엔딩 판정: 직접 만든 상태가 기대한 엔딩이 된다", () => {
  const set = (xp, extra = {}) => { const ch = mk(MID); Object.assign(ch.xp, xp); Object.assign(ch, extra); return ch; };
  const route = mk(MID).route;
  const off = FIELDS.filter((f) => !route.includes(f));
  assert.equal(judge(set({ [route[0]]: 100, [route[1]]: 45 })).key, "wind");
  assert.equal(judge(set({ [off[0]]: 150 }, { opened: new Set([off[0]]), early: 75, late: 75 })).key, "rebel");
  assert.equal(judge(set({ [route[0]]: 170, [route[1]]: 20 })).key, "master");
  assert.equal(judge(set({ [route[0]]: 70, [route[1]]: 70 }, { early: 20, late: 120 })).key, "late");
  assert.equal(judge(set({ [route[0]]: 30, [off[0]]: 20 })).key, "drift");
  assert.equal(judge(set({ [route[0]]: 60, [route[1]]: 20 })).key, "calm");
  assert.equal(judge(set({ [route[0]]: 100 }, { burnTurns: 3 })).key, "burnout");
  assert.equal(judge(set({ [route[0]]: 70, [off[0]]: 70 }, { opened: new Set([off[0]]), early: 70, late: 70 })).key, "twopaths");
  assert.equal(judge(set({ [route[0]]: 45, [off[0]]: 60, [off[1]]: 50 }, { opened: new Set([off[0]]), early: 80, late: 80 })).key, "pioneer");
});
