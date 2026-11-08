import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate, POLICIES } from "../scripts/sim.mjs";
import { ENDING_ORDER } from "../src/core/index.js";

test("9개 엔딩이 모두 실제 플레이 방식으로 도달 가능하다", () => {
  const seen = new Set();
  for (const policy of POLICIES) for (const k of Object.keys(simulate({ policy, n: 1200 }).endings)) seen.add(k);
  const missing = ENDING_ORDER.filter((k) => !seen.has(k));
  assert.deepEqual(missing, [], `도달하지 못한 엔딩: ${missing}`);
});

test("가장 불리한 환경(빠듯·외곽)에서도 높은 성취 엔딩에 도달할 수 있다", () => {
  const r = simulate({ policy: "route", n: 1500, env: { resource: "tight", region: "rural" } });
  assert.ok(r.avg > 150, `평균 ${r.avg}`);
  assert.ok((r.endings.wind || 0) + (r.endings.master || 0) > 1500 * 0.5, JSON.stringify(r.endings));
});

test("같은 플레이에서 환경이 불리할수록 평균 성취가 낮아지되, 격차가 지나치지 않다", () => {
  const best = simulate({ policy: "route", n: 3000, env: { resource: "rich", region: "metro" } });
  const worst = simulate({ policy: "route", n: 3000, env: { resource: "tight", region: "rural" } });
  const gap = (best.avg - worst.avg) / best.avg;
  assert.ok(gap > 0.03, `격차 ${gap}`);   // 환경이 체감될 만큼
  assert.ok(gap < 0.20, `격차 ${gap}`);   // 노력이 무의미해질 만큼은 아니게
});

test("루트를 따르는 플레이는 무작위 선택보다 평균 성취가 높다", () => {
  const a = simulate({ policy: "route", n: 1500 }), b = simulate({ policy: "random", n: 1500 });
  assert.ok(a.avg > b.avg * 1.3, `${a.avg} vs ${b.avg}`);
});

test("루트 밖을 끝까지 파면 개척자 계열 엔딩이 나오고 평균 성취는 루트 플레이와 큰 차이가 없다", () => {
  const a = simulate({ policy: "route", n: 1500 }), b = simulate({ policy: "stubborn", n: 1500 });
  const pioneerish = (b.endings.pioneer || 0) + (b.endings.twopaths || 0) + (b.endings.rebel || 0);
  assert.ok(pioneerish > 1500 * 0.4, JSON.stringify(b.endings));
  assert.ok(b.avg > a.avg * 0.88, `${b.avg} vs ${a.avg}`);
});

test("쉬지 않고 루트 밖만 파면 번아웃 엔딩이 흔하다", () => {
  const r = simulate({ policy: "burnoff", n: 1500 });
  assert.ok((r.endings.burnout || 0) > 1500 * 0.2, JSON.stringify(r.endings));
});
