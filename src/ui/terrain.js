// 경사 지도: 여섯 분야를 가로로 놓고 땅 높이로 난이도를, 깃발 높이로 성취를 보여 준다.
import { FIELDS, modeOf, openNeed } from "../core/index.js";
import { sv, v } from "./dom.js";
import { FIELD_VAR } from "./constants.js";

export function makeTerrain() {
  const W = 360, H = 176, X = (i) => 30 + i * 60;
  const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, class: "terrain", role: "img", "aria-label": "여섯 분야의 경사 지도. 낮은 곳일수록 수월한 길이에요." });
  const ground = sv("path", { class: "t-ground" });
  const line = sv("path", { class: "t-line" });
  const flags = FIELDS.map((f) => sv("rect", { class: "t-flag", width: 8, rx: 3, style: `fill:${v(FIELD_VAR[f])}` }));
  const ball = sv("g", { class: "t-ball" }, sv("circle", { r: 8 }));
  const names = FIELDS.map((f, i) => sv("text", { class: "t-name", x: X(i), y: 152, "text-anchor": "middle" }, f));
  const states = FIELDS.map((f, i) => sv("text", { class: "t-state", x: X(i), y: 168, "text-anchor": "middle" }, ""));
  svg.append(ground, line, ...flags, ball, ...names, ...states);

  const yOf = (ch, f) => { const m = modeOf(ch, f); return m === "route" || m === "open" ? 112 : m === "aux" ? 88 : 60; };
  const firstRoute = (ch) => FIELDS.findIndex((f) => ch.route.includes(f));

  function update(ch) {
    const ys = FIELDS.map((f) => yOf(ch, f));
    const P = [[0, ys[0]], ...FIELDS.map((f, i) => [X(i), ys[i]]), [W, ys[5]]];
    let d = `M${P[0][0]},${P[0][1]}`;
    for (let i = 1; i < P.length; i++) {
      const mx = (P[i - 1][0] + P[i][0]) / 2;
      d += ` C${mx},${P[i - 1][1]} ${mx},${P[i][1]} ${P[i][0]},${P[i][1]}`;
    }
    line.setAttribute("d", d);
    ground.setAttribute("d", d + ` L${W},134 L0,134 Z`);
    let bx = X(firstRoute(ch)), by = ys[firstRoute(ch)] - 11;
    FIELDS.forEach((f, i) => {
      const hgt = Math.min(54, ch.xp[f] * 0.45);
      flags[i].setAttribute("x", X(i) - 4); flags[i].setAttribute("y", ys[i] - hgt); flags[i].setAttribute("height", Math.max(hgt, 0.01));
      const m = modeOf(ch, f);
      states[i].setAttribute("class", "t-state " + m);
      states[i].textContent = m === "route" ? "순풍" : m === "open" ? "열린 길" : m === "aux" ? "보조" : `낯섦 ${ch.pioneer[f]}/${openNeed(ch)}`;
      if (ch.lastField === f) { bx = X(i); by = ys[i] - hgt - 11; }
    });
    ball.style.transform = `translate(${bx}px, ${by}px)`;
  }
  return { el: svg, update };
}
