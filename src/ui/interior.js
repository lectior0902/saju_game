// 건물 안 장면 삽화. 분야마다 안쪽 풍경이 달라서, 어느 건물에 들어왔는지 한눈에 보인다.
import { sv, v } from "./dom.js";
import { FIELD_VAR } from "./constants.js";

const R = (x, y, w, hh, fill, extra = {}) => sv("rect", { x, y, width: w, height: hh, fill, rx: extra.rx ?? 2, ...(extra.o ? { opacity: extra.o } : {}) });
const C = (cx, cy, r, fill) => sv("circle", { cx, cy, r, fill });
const L = (x1, y1, x2, y2, stroke, w = 2) => sv("line", { x1, y1, x2, y2, stroke, "stroke-width": w, "stroke-linecap": "round" });
const PAL = ["--water", "--fire", "--wood", "--earth", "--tool"].map(v);

const SCENES = {
  학문: () => [0, 1, 2].flatMap((i) => {
    const x = 14 + i * 102, out = [R(x, 8, 92, 62, v("--surface"), { o: 0.9 }), L(x, 29, x + 92, 29, v("--line")), L(x, 49, x + 92, 49, v("--line"))];
    [0, 1, 2].forEach((row) => { for (let b = 0; b < 9; b++) out.push(R(x + 4 + b * 9.6, 11 + row * 20 + (b % 3), 7.5, 16 - (b % 3), PAL[(b + i + row) % 5], { rx: 1 })); });
    return out;
  }),
  창작: () => [
    L(86, 20, 70, 76, v("--fg"), 3), L(86, 20, 102, 76, v("--fg"), 3), L(86, 20, 86, 70, v("--fg"), 3),
    R(56, 14, 62, 44, "#fff"), sv("path", { d: "M62 50 Q75 22 90 40 T112 28", stroke: v("--fire"), "stroke-width": 4, fill: "none", "stroke-linecap": "round" }),
    C(70, 28, 5, v("--water")), C(104, 48, 5, v("--earth")),
    sv("ellipse", { cx: 190, cy: 80, rx: 28, ry: 9, fill: v("--surface") }), C(178, 80, 4, v("--fire")), C(190, 82, 4, v("--wood")), C(202, 79, 4, v("--water")),
    R(236, 14, 62, 46, v("--water"), { o: 0.35 }), L(267, 14, 267, 60, v("--surface"), 3), L(236, 37, 298, 37, v("--surface"), 3),
  ],
  사업: () => [
    R(30, 10, 100, 18, v("--surface"), { o: 0.9 }), ...[0, 1, 2, 3, 4].map((i) => R(36 + i * 19, 12, 14, 14, PAL[i], { rx: 1 })),
    R(150, 6, 120, 18, v("--wood")), sv("text", { x: 210, y: 20, "text-anchor": "middle", fill: "#fff", "font-size": 12, "font-weight": 700 }, "OPEN"),
    R(26, 46, 268, 26, v("--earth"), { o: 0.85 }), R(26, 44, 268, 5, v("--fg"), { o: 0.5 }),
    ...[0, 1, 2, 3].map((i) => C(60 + i * 3, 42 - i * 4, 7, "#f2c94a")), C(240, 40, 8, "#f2c94a"), R(256, 36, 26, 10, v("--surface")),
  ],
  조직: () => [
    C(160, 24, 16, "#fff"), L(160, 24, 160, 14, v("--fg")), L(160, 24, 167, 28, v("--fg")),
    R(20, 8, 48, 62, v("--metal"), { o: 0.7 }), L(20, 29, 68, 29, v("--fg"), 1), L(20, 50, 68, 50, v("--fg"), 1),
    ...[0, 1].flatMap((i) => [R(94 + i * 118, 46, 96, 10, v("--fg"), { o: 0.6 }), R(110 + i * 118, 26, 38, 22, "#2b3446"), R(113 + i * 118, 29, 32, 16, v("--water"), { o: 0.5 }), R(98 + i * 118, 56, 6, 16, v("--fg"), { o: 0.6 }), R(176 + i * 118, 56, 6, 16, v("--fg"), { o: 0.6 })]),
    R(250, 36, 22, 8, "#fff"), R(252, 32, 22, 8, "#fff"), L(298, 6, 298, 44, v("--fg")), R(298, 6, 18, 11, v("--fire")),
  ],
  관계: () => [
    ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => C(20 + i * 35, 10 + (i % 2) * 4, 3.5, ["#ffd25a", "#ff8f6b", "#fff0a8"][i % 3])),
    L(10, 8, 310, 8, v("--fg"), 1),
    sv("ellipse", { cx: 160, cy: 62, rx: 62, ry: 14, fill: v("--earth") }), R(156, 62, 8, 18, v("--fg"), { o: 0.5 }),
    R(132, 48, 12, 12, "#fff", { rx: 3 }), R(176, 48, 12, 12, "#fff", { rx: 3 }),
    R(10, 38, 56, 30, v("--fire"), { o: 0.8 }), R(10, 30, 56, 12, v("--fire")), R(254, 38, 56, 30, v("--tool"), { o: 0.8 }), R(254, 30, 56, 12, v("--tool")),
  ],
  기술: () => [
    R(12, 8, 296, 40, v("--surface"), { o: 0.8 }),
    ...[0, 1, 2, 3, 4, 5].map((i) => R(24 + i * 46, 14, 8, 26 + (i % 3) * 4, v("--metal"), { rx: 3 })),
    R(20, 58, 280, 14, v("--earth"), { o: 0.9 }), R(30, 72, 8, 14, v("--fg"), { o: 0.6 }), R(282, 72, 8, 14, v("--fg"), { o: 0.6 }),
    C(240, 46, 12, v("--tool")), ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => C(240 + Math.cos(i * Math.PI / 4) * 13, 46 + Math.sin(i * Math.PI / 4) * 13, 3.2, v("--tool"))), C(240, 46, 4, v("--surface")),
    L(90, 52, 130, 40, v("--metal"), 5), C(134, 38, 6, v("--metal")),
  ],
  home: () => [R(40, 30, 240, 40, v("--earth"), { o: 0.5 }), R(60, 38, 70, 26, v("--fire"), { o: 0.75 }), C(220, 50, 14, v("--wood")), L(220, 50, 220, 20, v("--fg"), 2)],
};

/** 320×96 삽화(SVG). field는 분야 이름 또는 "home" */
export function interiorSvg(field) {
  const svg = sv("svg", { viewBox: "0 0 320 96", class: "interior", role: "img", "aria-label": `${field === "home" ? "쉼터" : field} 건물 안 풍경` });
  svg.append(R(0, 0, 320, 96, v("--surface2"), { rx: 12 }), R(0, 72, 320, 24, v("--line"), { rx: 0, o: 0.7 }));
  svg.append(...SCENES[field]());
  svg.append(R(0, 90, 320, 6, field === "home" ? v("--earth") : v(FIELD_VAR[field]), { rx: 0, o: 0.8 }));
  return svg;
}
