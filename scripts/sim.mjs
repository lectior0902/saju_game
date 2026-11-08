// 밸런스 시뮬레이션. 미니게임 성과는 난이도별 확률분포로 가정한다.
// 사용: npm run sim            (전체 표)
//       import { simulate } from "./sim.mjs"   (테스트에서 사용)
import { rollEncounter, resolveEncounter, chooseEncounter, analyze, newChar, offer, info, act, rest, endTurn, judge, mulberry32, rollEnv, C, TURNS, FIELDS, ENDINGS, ENV_RESOURCE, ENV_REGION } from "../src/core/index.js";

const DIST = [[0.15, 0.35, 0.30, 0.20], [0.25, 0.35, 0.25, 0.15], [0.30, 0.40, 0.20, 0.10]];
function tier(level, rng) { const p = DIST[level]; let x = rng(), a = 0; for (let i = 0; i < 4; i++) { a += p[i]; if (x < a) return i; } return 3; }

export const POLICIES = ["route", "stubborn", "focus", "late", "rebel", "burn", "burnoff", "random"];

export function runOne(policy, seed, fixedEnv = {}, enc = "none") {
  const rng = mulberry32(seed);
  const y = 1950 + Math.floor(rng() * 60), m = 1 + Math.floor(rng() * 12), d = 1 + Math.floor(rng() * 28);
  const h = rng() < 0.04 ? null : Math.floor(rng() * 24);
  const r = analyze(y, m, d, h);
  const env = rollEnv(rng, fixedEnv);
  const ch = newChar(r, env);
  const offs = FIELDS.filter((f) => !ch.route.includes(f));
  const stub = offs[Math.floor(rng() * offs.length)];
  for (let t = 0; t < TURNS; t++) {
    const age = C.START + t * C.STEP;
    const opts = offer(ch, rng);
    if (enc !== "none") { const ev = rollEncounter(ch, rng); resolveEncounter(ch, ev, chooseEncounter(ev, enc, rng), rng); }
    // 외곽에서는 루트 분야가 선택지에 없는 해가 있다. 그때는 보조 분야, 없으면 첫 선택지로 대체
    const routeF = opts.find((f) => ch.route.includes(f)) ?? opts.find((f) => f === ch.aux) ?? opts[0];
    const tired = ch.mind < 35;
    let pick;
    switch (policy) {
      case "route": pick = tired ? "rest" : routeF; break;
      case "stubborn": pick = tired ? "rest" : (opts.includes(stub) ? stub : routeF); break;
      case "focus": pick = tired ? "rest" : (opts.includes(ch.route[0]) ? ch.route[0] : opts.includes(ch.route[1]) ? ch.route[1] : opts[0]); break;
      case "late": pick = t < 6 ? (ch.mind < 70 ? "rest" : opts.find((f) => !ch.route.includes(f)) || opts[0]) : (tired ? "rest" : routeF); break;
      case "burn": pick = routeF; break;
      case "burnoff": { const o = opts.filter((f) => !ch.route.includes(f)); pick = o.length ? (o.includes(stub) ? stub : o[0]) : routeF; break; }
      case "rebel": { const o = opts.filter((f) => !ch.route.includes(f)); pick = tired ? "rest" : (o.length ? (o.includes(stub) ? stub : o[0]) : routeF); break; }
      default: { const k = Math.floor(rng() * (opts.length + 1)); pick = k === opts.length ? "rest" : opts[k]; }
    }
    if (pick === "rest") rest(ch); else act(ch, pick, age, tier(info(ch, pick, age).level, rng), rng);
    endTurn(ch, rng);
  }
  return { ...judge(ch), ch };
}

export function simulate({ policy, n = 2000, env = {}, enc = "none" }) {
  const endings = {}; let total = 0, envMind = 0, support = 0;
  for (let s = 1; s <= n; s++) {
    const e = runOne(policy, s * 7919, env, enc);
    endings[e.key] = (endings[e.key] || 0) + 1; total += e.total; envMind += e.ch.envMind; support += e.ch.support;
  }
  return { avg: total / n, endings, envMind: envMind / n, support: support / n, n };
}

const pct = (c, n) => Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${ENDINGS[k].title} ${Math.round((v / n) * 100)}%`).join(", ");

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  const N = 3000;
  console.log("== 플레이 방식별 (환경 무작위) ==");
  for (const p of POLICIES) { const r = simulate({ policy: p, n: N }); console.log(p.padEnd(9), "평균", r.avg.toFixed(0).padStart(3), "|", pct(r.endings, N)); }
  console.log("\n== 마을 사건 효과 (route / rebel 평균 총 성취) ==");
  for (const enc of ["none", "random", "best"]) {
    const a = simulate({ policy: "route", n: 2000, enc }), b = simulate({ policy: "rebel", n: 2000, enc });
    console.log(enc.padEnd(7), "route", a.avg.toFixed(0).padStart(3), "rebel", b.avg.toFixed(0).padStart(3));
  }
  console.log("\n== 환경별 평균 총 성취 (route / stubborn) ==");
  for (const rk of Object.keys(ENV_RESOURCE)) for (const gk of Object.keys(ENV_REGION)) {
    const a = simulate({ policy: "route", n: 1500, env: { resource: rk, region: gk } });
    const b = simulate({ policy: "stubborn", n: 1500, env: { resource: rk, region: gk } });
    console.log(`${ENV_RESOURCE[rk].name}·${ENV_REGION[gk].name}`.padEnd(12), "route", a.avg.toFixed(0).padStart(3), "stubborn", b.avg.toFixed(0).padStart(3),
      "| 환경 마음비용", a.envMind.toFixed(1).padStart(5), "지원 연결", a.support.toFixed(2));
  }
}
