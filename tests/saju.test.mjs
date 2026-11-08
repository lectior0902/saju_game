import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { analyze, pillars, label } from "../src/core/index.js";

const cases = JSON.parse(fs.readFileSync(new URL("./fixtures/saju_cases.json", import.meta.url), "utf8"));

test("Python 기준 구현과 JS 분류기가 모든 픽스처에서 일치한다", () => {
  const bad = [];
  for (const c of cases) {
    const r = analyze(c.y, c.m, c.d, c.hour);
    const got = { labels: r.labels.map((x) => x || "-"), type: r.typeKey, season: r.seasonKey, time: r.timeKey || "-", aux: r.aux || "-", peak: r.peak };
    const exp = { labels: c.labels, type: c.type, season: c.season, time: c.time, aux: c.aux, peak: c.peak };
    if (JSON.stringify(got) !== JSON.stringify(exp)) bad.push({ in: [c.y, c.m, c.d, c.hour], got, exp });
  }
  assert.equal(bad.length, 0, JSON.stringify(bad.slice(0, 2)));
  assert.ok(cases.length >= 400);
});

test("알려진 날짜: 2000-01-01은 무오일", () => {
  const [, , dp] = pillars(2000, 1, 1, 12);
  assert.equal(label(dp), "무오");
});

test("입춘 전에는 전년도 간지를 쓴다", () => {
  const [yp] = pillars(2024, 2, 3, 12);
  const [yp2] = pillars(2024, 2, 4, 12);
  assert.equal(label(yp), "계묘"); // 2023
  assert.equal(label(yp2), "갑진"); // 2024
});

test("시를 모르면 시주와 보조 분야가 없다", () => {
  const r = analyze(1999, 3, 14, null);
  assert.equal(r.pillars[3], null);
  assert.equal(r.aux, null);
  assert.equal(r.time, null);
});

test("모든 유형과 시간대 조합에서 보조 분야가 루트와 겹치지 않는다", () => {
  const seen = new Set();
  for (let y = 1950; y < 2010; y++) for (let m = 1; m <= 12; m++) for (const hour of [0, 4, 12, 20]) {
    const r = analyze(y, m, 14, hour);
    assert.ok(r.aux, "보조 분야가 있어야 한다");
    assert.ok(!r.type.route.includes(r.aux));
    seen.add(`${r.typeKey}/${r.timeKey}`);
  }
  assert.equal(seen.size, 8 * 4);
});

test("전성기는 21~60세 범위 안이고 폭이 3 이상이다", () => {
  for (let y = 1950; y < 2010; y += 3) for (let m = 1; m <= 12; m++) {
    const [lo, hi] = analyze(y, m, 10, 8).peak;
    assert.ok(lo >= 21 && lo <= 51 && hi <= 60 && hi - lo >= 3, `${lo}-${hi}`);
  }
});
