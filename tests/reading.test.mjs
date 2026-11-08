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
  assert.match(readLife(fake, judge(ch)).eras[0].text, /쉬어 (갔|가는)/);
});

import { analyze } from "../src/core/index.js";

test("같은 판은 늘 같은 풀이, 다른 판은 표현이 갈린다", () => {
  const a = runOne("route", 11, {}, "none").ch, b = runOne("route", 11, {}, "none").ch;
  assert.deepEqual(readLife(a, judge(a)).eras.map((e) => e.text), readLife(b, judge(b)).eras.map((e) => e.text));
  const seen = new Set();
  for (let s = 1; s <= 120; s++) { const { ch } = runOne("route", s * 17, {}, "none"); readLife(ch, judge(ch)).eras.forEach((e) => seen.add(e.text)); }
  assert.ok(seen.size > 200, `서로 다른 시기 문장 ${seen.size}개`);
});

test("사주 풀이 요소: 일간 풀이, 기운 풀이, 세운, 시기별 사자성어", () => {
  for (let s = 1; s <= 60; s++) {
    const { ch } = runOne(POLICIES[s % POLICIES.length], s * 29, {}, "random");
    const r = analyze(1970 + (s % 40), 1 + (s % 12), 1 + (s % 27), s % 24), end = judge(ch), rd = readLife(ch, end, r);
    assert.ok(rd.hook && rd.hook.title.includes("일간") && rd.hook.text.length > 30, "일간 풀이");
    assert.equal(rd.balance.rows.length, 5); assert.ok(rd.balance.lines.length === 2); assert.ok(rd.balance.lack.hint.includes("기운"));
    assert.ok(rd.years.length >= 1 && rd.years.every((y) => y.text && y.label));
    for (const e of rd.eras) { assert.ok(e.motto.kr && /[一-鿿]/.test(e.motto.hanja) && e.motto.gloss); }
    assert.ok(!/undefined|NaN|\[null\]|\[\]/.test(JSON.stringify(rd)), `s=${s}`);
  }
  // r 없이도 동작
  const { ch } = runOne("route", 3, {}, "none"); const rd = readLife(ch, judge(ch));
  assert.equal(rd.hook, null); assert.ok(rd.balance.lines.length === 2);
});

test("조사가 어색하지 않다: 받침 유무에 따라 을/를, 과/와", async () => {
  const { josa } = await import("../src/core/reading-data.js");
  assert.equal(josa("학문", "을를"), "을"); assert.equal(josa("사업", "과와"), "과"); assert.equal(josa("관계", "과와"), "와"); assert.equal(josa("기술", "이가"), "이");
});

