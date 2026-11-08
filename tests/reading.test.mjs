import test from "node:test";
import assert from "node:assert/strict";
import { readLife, timeline, judge, TURNS, ENDING_ORDER, ADVICE, FIELDS } from "../src/core/index.js";
import { runOne, POLICIES } from "../scripts/sim.mjs";

test("모든 판에서 기록이 14칸 타임라인이 되고, 한 해에 한 줄이다", () => {
  for (const policy of POLICIES) for (let s = 1; s <= 30; s++) {
    const { ch } = runOne(policy, s * 101, {}, "random");
    assert.equal(ch.history.length, TURNS, `${policy} ${s}`);
    assert.equal(timeline(ch).length, TURNS);
    assert.deepEqual(ch.history.map((e) => e.turn), Array.from({ length: TURNS }, (_, i) => i));
  }
});

test("인생 풀이: 세 시기, 총평, 조언, 숫자 요약이 항상 채워진다", () => {
  for (const policy of POLICIES) for (let s = 1; s <= 40; s++) {
    const { ch } = runOne(policy, s * 313, {}, s % 2 ? "best" : "none");
    const end = judge(ch), rd = readLife(ch, end);
    assert.equal(rd.eras.length, 3);
    assert.deepEqual(rd.eras.map((e) => e.name), ["초년운", "중년운", "말년운"]);
    for (const e of rd.eras) { assert.ok(e.text.length > 10); assert.ok(e.tag); assert.ok(e.range.endsWith("세")); }
    assert.equal(rd.eras.filter((e) => e.strongest).length, 1);
    assert.ok(rd.overall.length >= 3); assert.ok(rd.advice); assert.ok(rd.headline);
    assert.equal(rd.stats.length, 4);
    assert.ok(!/undefined|NaN|\[null\]/.test(JSON.stringify(rd)), `${policy} ${s}`);
  }
});

test("모든 엔딩에 한마디와 조언이 있다", () => {
  for (const k of ENDING_ORDER) { assert.ok(ADVICE[k]?.headline && ADVICE[k]?.advice, k); }
});

test("시기 문장: 쉬기만 한 시기, 개척이 열린 시기, 한 번도 안 쉰 시기가 구분된다", () => {
  const { ch } = runOne("rebel", 77, { resource: "mid", region: "town" });
  const rd = readLife(ch, judge(ch));
  const all = rd.eras.map((e) => e.text).join(" ");
  assert.ok(/오르막|\[.+\]/.test(all));
  const fake = { ...ch, history: ch.history.map((e) => ({ ...e, kind: "rest", field: null, mode: null, gain: 0, tier: null })) };
  assert.match(readLife(fake, judge(ch)).eras[0].text, /쉬어 갔어요/);
});
