// 사주 입력 → 간지 → 오행 분포 → 유형·변주 분류. DOM에 의존하지 않는 순수 함수.
import { STEMS, BRANCHES, STEM_EL, BRANCH_EL, ELEMENTS, TERMS, TYPES, SEASONS, TIMES } from "./data.js";

const mod = (a, n) => ((a % n) + n) % n;

export function seasonOf(monthBranch) {
  return ["spring", "summer", "autumn", "winter"][Math.floor(mod(monthBranch - 2, 12) / 3)];
}
export function timeOf(hourBranch) {
  return hourBranch <= 1 ? "night" : hourBranch <= 4 ? "dawn" : hourBranch <= 7 ? "noon" : "eve";
}
export function peakWindow(typeKey, seasonKey) {
  let [lo, hi] = TYPES[typeKey].peak;
  const s = SEASONS[seasonKey].shift;
  lo = Math.max(21, Math.min(lo + s, 51));
  hi = Math.max(lo + 3, Math.min(hi + s, 60));
  return [lo, hi];
}

/** [년주, 월주, 일주, 시주]. 각 항목은 [천간idx, 지지idx]. 시를 모르면 시주는 null. */
export function pillars(y, m, d, hour) {
  const py = m * 100 + d >= 204 ? y : y - 1; // 입춘(근사) 전이면 전년도
  const ys = mod(py - 4, 10), yb = mod(py - 4, 12);
  let mi = 10;
  for (const [tm, td, idx] of TERMS) if (m * 100 + d >= tm * 100 + td) mi = idx;
  const ms = mod(mod(ys, 5) * 2 + 2 + mi, 10), mb = mod(2 + mi, 12);
  const n = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 1)) / 86400000); // 1900-01-01 = 갑술일
  const ds = mod(n, 10), db = mod(10 + n, 12);
  let hp = null;
  if (hour !== null && hour !== undefined) {
    const hb = Math.floor((hour + 1) / 2) % 12;
    hp = [mod(mod(ds, 5) * 2 + hb, 10), hb];
  }
  return [[ys, yb], [ms, mb], [ds, db], hp];
}
export const label = (p) => (p ? STEMS[p[0]] + BRANCHES[p[1]] : null);

export function analyze(y, m, d, hour) {
  const [yp, mp, dp, hp] = pillars(y, m, d, hour);
  const tally = Object.fromEntries(ELEMENTS.map((e) => [e, 0]));
  for (const p of [yp, mp, dp, hp]) {
    if (!p) continue;
    tally[STEM_EL[p[0]]] += 1;
    tally[BRANCH_EL[p[1]]] += 1;
  }
  tally[BRANCH_EL[mp[1]]] += 1.5; // 월지는 계절을 정하므로 가중
  const total = ELEMENTS.reduce((s, e) => s + tally[e], 0);
  const share = Object.fromEntries(ELEMENTS.map((e) => [e, tally[e] / total]));
  const dm = STEM_EL[dp[0]];
  const support = share[dm] + share[ELEMENTS[(ELEMENTS.indexOf(dm) + 4) % 5]]; // 비견·겁재 + 인성
  const top = ELEMENTS.reduce((a, b) => (share[b] > share[a] ? b : a));

  let key;
  if (support >= 0.62) key = "strong";
  else if (support <= 0.28) key = "weak";
  else if (share[top] < 0.36) key = "balance";
  else key = { 목: "mok", 화: "hwa", 토: "to", 금: "geum", 수: "su" }[top];

  const seasonKey = seasonOf(mp[1]);
  const timeKey = hp ? timeOf(hp[1]) : null;
  const route = TYPES[key].route;
  const aux = timeKey ? TIMES[timeKey].aux.find((f) => !route.includes(f)) : null;
  const variant = SEASONS[seasonKey].name + "에 난 " + (timeKey ? TIMES[timeKey].name + " " : "") + TYPES[key].name;
  return {
    pillars: [yp, mp, dp, hp], labels: [label(yp), label(mp), label(dp), label(hp)],
    dayMaster: STEMS[dp[0]] + "(" + dm + ")", share, support, typeKey: key, type: TYPES[key],
    seasonKey, season: SEASONS[seasonKey], timeKey, time: timeKey ? TIMES[timeKey] : null,
    aux, peak: peakWindow(key, seasonKey), variant,
  };
}
