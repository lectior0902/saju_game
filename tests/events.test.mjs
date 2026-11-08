import test from "node:test";
import assert from "node:assert/strict";
import { analyze, newChar, act, info, endTurn, mulberry32, EVENTS, QUEST, rollEncounter, resolveEncounter, chooseEncounter, questView, openNeed, FIELDS, C } from "../src/core/index.js";
import { simulate } from "../scripts/sim.mjs";

const mk = () => newChar(analyze(1999, 3, 14, 7), { resource: "mid", region: "town" });
const offField = (ch) => FIELDS.find((f) => !ch.route.includes(f) && f !== ch.aux);

test("사건 데이터: 모든 선택지가 문장과 효과를 갖고, 마지막에 '지나친다' 계열이 있다", () => {
  assert.ok(EVENTS.length >= 14);
  for (const e of EVENTS) {
    assert.ok(e.text && e.choices.length === 3, e.id);
    for (const c of e.choices) { assert.ok(c.label, e.id); assert.ok(c.s || c.gamble, e.id); }
    assert.ok(!e.choices[2].mind && !e.choices[2].xp, `${e.id}: 세 번째 선택지는 아무 일도 없다`);
    if (e.field) assert.ok(FIELDS.includes(e.field));
  }
});

test("사건 선택: 결과 로그가 있고 마음은 0~100 안에 머문다", () => {
  const rng = mulberry32(3);
  for (let i = 0; i < 200; i++) {
    const ch = mk(); ch.mind = i % 2 ? 2 : 99;
    const ev = rollEncounter(ch, rng), r = resolveEncounter(ch, ev, i % 3, rng);
    assert.ok(r.log.length >= 1); assert.ok(ch.mind >= 0 && ch.mind <= 100);
  }
});

test("사건: 낯선 길 분야 선택지는 개척 포인트를, 루트 분야는 올리지 않는다", () => {
  const ch = mk(), of = offField(ch), rf = ch.route[0];
  const evO = { field: of, choices: [{ label: "x", s: "s", pioneer: 1, xp: 1 }] };
  const evR = { field: rf, choices: [{ label: "x", s: "s", pioneer: 1, xp: 1 }] };
  resolveEncounter(ch, evO, 0, () => 0.5); resolveEncounter(ch, evR, 0, () => 0.5);
  assert.equal(ch.pioneer[of], 1); assert.equal(ch.pioneer[rf], 0);
  assert.equal(ch.xp[of], 1); assert.equal(ch.xp[rf], 1);
});

test("같은 사건은 한 판에서 되도록 반복되지 않는다", () => {
  const ch = mk(), rng = mulberry32(9), seen = new Set();
  for (let i = 0; i < 10; i++) { const e = rollEncounter(ch, rng); assert.ok(!seen.has(e.id), e.id); seen.add(e.id); }
});

test("퀘스트: 낯선 길 행동마다 이야기가 한 단계씩 이어지고, 실패(0등급)에도 이어진다", () => {
  const ch = mk(), f = offField(ch), rng = mulberry32(1), need = openNeed(ch);
  const logs = [];
  for (let k = 1; k <= need; k++) {
    const r = act(ch, f, 18, 0, rng); // 계속 실패해도
    logs.push(r.log.find((l) => l.t === "quest"));
    assert.equal(ch.pioneer[f], k);
    assert.ok(logs[k - 1], `단계 ${k} 이야기`);
    endTurn(ch, rng);
  }
  assert.ok(ch.opened.has(f), "실패만 해도 이야기는 끝까지 가서 길이 열린다");
  assert.equal(questView(ch, f, need).stages.every((s) => s.state === "done"), true);
});

test("굳은살: 실패하면 쌓이고, 다음 행동의 마음 비용이 1 줄고 1 소모된다", () => {
  const ch = mk(), f = offField(ch), rng = mulberry32(2);
  const c0 = info(ch, f, 18).cost;
  act(ch, f, 18, 0, rng);
  assert.equal(ch.grit[f], 1);
  assert.equal(info(ch, f, 18).cost, Math.max(1, c0 - 1));
  const before = ch.mind; act(ch, f, 21, 3, rng);
  assert.ok(ch.grit[f] === 0);
  assert.ok(before - ch.mind <= c0 - 1 + 8, "비용 감소가 반영된다"); // 나쁜 사건 −8 가능성 포함
});

test("굳은살은 상한이 있다", () => {
  const ch = mk(), f = offField(ch), rng = mulberry32(5);
  for (let i = 0; i < 2; i++) { ch.opened.delete(f); ch.pioneer[f] = 0; act(ch, f, 18, 0, rng); }
  assert.ok(ch.grit[f] <= C.GRIT_MAX);
});

test("퀘스트 문구: 모든 분야에 4단계 성공·실패 문장이 있다", () => {
  for (const f of FIELDS) { assert.equal(QUEST[f].stages.length, 4); for (const s of QUEST[f].stages) assert.ok(s.t && s.ok && s.fail); }
});

test("밸런스: 사건을 최선으로 다 챙겨도 총 성취 증가가 25% 이내, 무작위 선택은 0~15%", () => {
  const base = simulate({ policy: "route", n: 1500 }).avg;
  const best = simulate({ policy: "route", n: 1500, enc: "best" }).avg;
  const rnd = simulate({ policy: "route", n: 1500, enc: "random" }).avg;
  assert.ok(best / base < 1.25, `best ${best / base}`); assert.ok(rnd / base > 1.0 && rnd / base < 1.15, `random ${rnd / base}`);
});

test("사건이 있어도 9개 엔딩이 모두 도달 가능하다", async () => {
  const { POLICIES } = await import("../scripts/sim.mjs");
  const { ENDING_ORDER } = await import("../src/core/index.js");
  const seen = new Set();
  for (const policy of POLICIES) for (const enc of ["random", "best"]) for (const k of Object.keys(simulate({ policy, n: 800, enc }).endings)) seen.add(k);
  assert.deepEqual(ENDING_ORDER.filter((k) => !seen.has(k)), []);
});
