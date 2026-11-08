// 엔딩 도트 일러스트. 96×64 칸의 작은 캔버스에 직접 찍고, CSS로 키워서 보여 준다(image-rendering: pixelated).
// 외부 이미지 없이 코드로만 그린다. 엔딩 키마다 장면이 하나씩 있다.
const W = 96, H = 64;

function rng(seed) { let a = seed; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }

function kit(ctx) {
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const D = (cx, cy, r, c) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + r * 0.6) R(cx + dx, cy + dy, 1, 1, c); };
  /** 하늘: [색, 높이] 띠를 쌓고 띠 사이는 체크무늬로 섞는다 */
  const sky = (bands) => {
    let y = 0;
    bands.forEach(([c, hh], i) => {
      R(0, y, W, hh, c);
      if (i < bands.length - 1) for (let x = 0; x < W; x++) if ((x + y) % 2 === 0) R(x, y + hh - 1, 1, 1, bands[i + 1][0]);
      y += hh;
    });
  };
  const stars = (n, seed, y1, c = "#fff") => { const r = rng(seed); for (let i = 0; i < n; i++) R(Math.floor(r() * W), Math.floor(r() * y1), 1, 1, r() < 0.3 ? "#ffe9a8" : c); };
  const hill = (base, amp, per, c, ph = 0) => { for (let x = 0; x < W; x++) { const y = Math.round(base + Math.sin(x / per + ph) * amp); R(x, y, 1, H - y, c); } };
  const cloud = (x, y, c = "#fff", s = 1) => { R(x, y + 2 * s, 14 * s, 3 * s, c); R(x + 3 * s, y, 7 * s, 3 * s, c); R(x + 8 * s, y + s, 5 * s, 3 * s, c); };
  const tree = (x, y, s = 1, c = "#2f7a4a", t = "#6b4a2f") => { R(x + 2 * s, y + 6 * s, 2 * s, 4 * s, t); R(x, y + 2 * s, 6 * s, 5 * s, c); R(x + s, y, 4 * s, 3 * s, c); R(x + 4 * s, y + 3 * s, s, s, "#4fa466"); };
  const hero = (x, y, o = {}) => {
    const { shirt = "#3d6fd1", hair = "#2b2118", skin = "#f2c9a0", dir = 1, pose = "stand" } = o;
    if (pose === "sit") {
      R(x + 1, y + 7, 4, 3, shirt); R(x + 1, y + 3, 4, 4, skin); R(x + 1, y + 2, 4, 2, hair); R(x + 3 * (dir > 0 ? 1 : -0.3) + 1, y + 9, 3, 1, "#2a2f45");
      R(x + (dir > 0 ? 4 : 1), y + 5, 1, 1, "#1d2330"); return;
    }
    R(x + 1, y + 8, 2, 2, "#2a2f45"); R(x + 3, y + 8, 2, 2, "#2a2f45");
    R(x + 1, y + 5, 4, 3, shirt); R(x, y + 5, 1, 3, skin); R(x + 5, y + 5, 1, 3, skin);
    R(x + 1, y + 1, 4, 4, skin); R(x + 1, y, 4, 2, hair); R(x + (dir > 0 ? 4 : 1), y + 3, 1, 1, "#1d2330");
  };
  return { R, D, sky, stars, hill, cloud, tree, hero };
}

const SCENES = {
  // 순풍의 삶: 내리막 길을 바람을 타고 걷는다
  wind(k) {
    const { R, D, sky, hill, cloud, tree, hero } = k;
    sky([["#7fc3ee", 14], ["#a8dcf6", 14], ["#d6f0fb", 14]]); D(78, 13, 6, "#fff3a0"); D(78, 13, 4, "#ffe36a");
    cloud(10, 8); cloud(44, 16, "#f6fcff"); hill(40, 3, 9, "#5aa860", 1);
    for (let x = 0; x < W; x++) { const y = Math.round(30 + x * 0.3); R(x, y, 1, H - y, "#4a9a58"); R(x, y, 1, 2, "#e8d49a"); }
    tree(6, 22, 1); tree(16, 25, 1); tree(76, 42, 1.2);
    for (const [x, y] of [[20, 30], [34, 34], [52, 38], [66, 42]]) R(x, y, 5, 1, "#fff");
    for (const [x, y] of [[28, 24], [50, 30], [70, 36]]) { R(x, y, 2, 1, "#7bd68a"); R(x + 1, y + 1, 1, 1, "#4fb184"); }
    hero(41, 31, { dir: 1 });
  },
  // 개척자의 삶: 가파른 산을 올라 정상에 깃발을 꽂는다
  pioneer(k) {
    const { R, D, sky, stars, hero } = k;
    sky([["#2d2b5a", 12], ["#8a4b7a", 12], ["#e8805a", 14], ["#ffc46b", 12]]); stars(14, 7, 12, "#fff"); D(20, 46, 7, "#ffe9a8");
    for (let y = 14; y < H; y++) { const half = (y - 14) * 0.95; R(Math.round(70 - half), y, Math.round(half * 2), 1, y < 22 ? "#f4f4ff" : y < 40 ? "#6a6f8c" : "#4a4f6c"); }
    for (let y = 14; y < H; y += 1) { const half = (y - 14) * 0.95; R(Math.round(70 - half), y, Math.max(1, Math.round(half * 0.5)), 1, y < 22 ? "#dfe4ff" : "#7d82a0"); }
    R(70, 6, 1, 10, "#2a2f45"); R(71, 6, 7, 4, "#e8654f"); R(71, 8, 7, 1, "#fff");
    for (const [x, y] of [[44, 56], [50, 50], [56, 46], [60, 40], [64, 34], [66, 28]]) R(x, y, 2, 1, "#ffe36a");
    hero(46, 44, { dir: 1 });
    R(0, 58, W, 6, "#2a2f45");
  },
  // 두 길을 걸은 사람: 갈림길 앞, 양쪽 끝에서 각각 불빛이 난다
  twopaths(k) {
    const { R, D, sky, stars, hill, tree, hero } = k;
    sky([["#3b2f6b", 16], ["#7a4b8a", 14], ["#d6806a", 14]]); stars(16, 3, 16); hill(40, 2, 10, "#3a6b4a", 2);
    for (let y = 40; y < H; y++) { const t = (y - 40) / 24; R(Math.round(48 - 6 - t * 12), y, Math.round(12 + t * 24), 1, "#d8c394"); }
    for (let y = 30; y < 40; y++) { R(Math.round(48 - (40 - y) * 1.9) - 2, y, 4, 1, "#d8c394"); R(Math.round(48 + (40 - y) * 1.9) - 2, y, 4, 1, "#d8c394"); }
    R(14, 24, 10, 8, "#f1e7d0"); R(13, 21, 12, 4, "#7a4b3a"); R(17, 27, 3, 5, "#ffd25a"); D(19, 18, 3, "#ffe9a8");
    R(72, 14, 3, 18, "#ddd"); R(70, 11, 7, 4, "#e8654f"); D(73, 8, 2, "#ffe9a8"); tree(82, 24, 1);
    R(36, 48, 1, 10, "#6b4a2f"); R(32, 48, 9, 3, "#e8d49a"); R(56, 50, 1, 8, "#6b4a2f"); R(52, 50, 9, 3, "#e8d49a");
    hero(45, 44, { dir: 1 });
  },
  // 한 우물: 한 곳을 깊이 판 우물에서 빛이 솟는다
  master(k) {
    const { R, D, sky, stars, hero } = k;
    sky([["#0e1a3a", 16], ["#16305a", 16], ["#1f4a6a", 14]]); stars(26, 11, 28);
    R(0, 50, W, 14, "#3a2f2a"); R(0, 50, W, 2, "#5a4a3a");
    for (let y = 0; y < 50; y++) { const w = 8 + Math.round((50 - y) * 0.12); R(48 - w / 2 - 5, y, w + 10, 1, "rgba(255,226,150,0.14)"); R(48 - w / 2, y, w, 1, "rgba(255,236,170,0.34)"); }
    R(32, 42, 32, 10, "#7a7f8c"); R(34, 40, 28, 4, "#a8adb8"); R(36, 42, 24, 3, "#ffe9a8");
    for (let i = 0; i < 6; i++) { R(32 + i * 5, 44, 4, 3, i % 2 ? "#6a6f7c" : "#8a8f9c"); R(32 + i * 5 + 2, 48, 4, 3, i % 2 ? "#8a8f9c" : "#6a6f7c"); }
    for (let i = 0; i < 12; i++) R(40 + (i * 7) % 18, 10 + ((i * 13) % 28), 1, 2, "#fff6c8");
    D(48, 36, 2, "#fff6c8");
    R(70, 42, 8, 2, "#c64f3a"); R(70, 44, 8, 2, "#3d6fd1"); R(71, 46, 8, 2, "#4fb184");
    hero(18, 41, { dir: 1 });
  },
  // 늦게 핀 꽃: 눈이 녹은 자리에 큰 꽃 한 송이
  late(k) {
    const { R, D, sky, cloud, hill, hero } = k;
    sky([["#7a6a9a", 10], ["#d68aa0", 12], ["#ffc48a", 16], ["#ffe8b0", 10]]); D(80, 30, 8, "#fff0b0"); cloud(8, 10, "#e8c8d8"); hill(46, 2, 8, "#6a9a5a", 0.5);
    R(0, 50, W, 14, "#4a8a50"); for (const [x, w] of [[2, 14], [20, 8], [8, 12]]) R(x, 51 + (x % 3), w, 2, "#f4f8ff");
    R(61, 24, 2, 28, "#3a8a4a"); R(54, 38, 7, 2, "#3a8a4a"); R(63, 32, 8, 2, "#3a8a4a");
    for (const [dx, dy] of [[0, -6], [6, -2], [-6, -2], [4, 5], [-4, 5], [0, 5]]) D(62 + dx, 22 + dy, 4, "#f38cb4");
    D(62, 22, 3, "#ffd25a");
    for (const [x, y] of [[40, 50], [78, 52], [86, 49]]) { R(x, y, 1, 4, "#3a8a4a"); D(x, y - 1, 1, "#f6b3cc"); }
    for (const [x, y] of [[48, 20], [70, 40], [52, 34], [76, 28]]) R(x, y, 2, 1, "#f6b3cc");
    hero(40, 42, { dir: 1, shirt: "#5aa8d6" }); R(47, 46, 4, 3, "#6a9ad6"); R(50, 45, 3, 1, "#6a9ad6");
  },
  // 운명을 거스른 사람: 폭포를 거슬러 오른다
  rebel(k) {
    const { R, D, sky, hero, cloud } = k;
    sky([["#3a3f5a", 18], ["#6a7090", 16], ["#9aa6c0", 14]]); cloud(6, 6, "#4a4f6a", 2); cloud(48, 12, "#5a6080", 1);
    R(66, 0, 30, 14, "#ffe9a8"); D(84, 8, 6, "#fff3c0");
    R(0, 20, 28, 44, "#4a4f5a"); R(68, 20, 28, 44, "#4a4f5a");
    for (let y = 14; y < H; y++) { R(28, y, 40, 1, y % 4 < 2 ? "#6ab4e8" : "#a8d8f6"); }
    for (let x = 30; x < 66; x += 5) for (let y = 14; y < H; y += 9) R(x + ((y / 9) % 2) * 2, y, 1, 6, "#fff");
    for (const [x, y] of [[36, 24], [56, 34], [44, 44], [62, 54]]) { R(x, y, 6, 1, "#fff"); R(x + 1, y + 1, 4, 1, "#fff"); }
    R(34, 40, 12, 4, "#6a6f7c"); R(38, 32, 8, 3, "#5a5f6c");
    hero(38, 31, { dir: 1, shirt: "#e8654f" });
    for (const [x, y] of [[32, 10], [60, 8]]) { R(x, y, 6, 1, "#fff"); R(x + 1, y + 1, 4, 1, "#fff"); R(x + 2, y + 2, 2, 1, "#fff"); }
  },
  // 타버린 불꽃: 거의 꺼진 모닥불 곁에서 고개를 숙인다
  burnout(k) {
    const { R, D, sky, stars, hero } = k;
    sky([["#0b0c18", 18], ["#15162a", 16], ["#241a2e", 14]]); stars(18, 5, 24, "#8a8fb0"); D(80, 12, 5, "#8a8fa0"); D(82, 11, 4, "#15162a");
    R(0, 50, W, 14, "#241f24");
    R(36, 46, 22, 4, "#3a2a22"); R(40, 44, 14, 3, "#4a352a"); R(42, 42, 10, 3, "#2a1f1a");
    R(42, 38, 3, 5, "#e8654f"); R(48, 36, 3, 7, "#ffb347"); R(52, 40, 2, 3, "#e8654f"); R(46, 40, 3, 4, "#ffe36a");
    for (const [x, y, c] of [[38, 30, "#ffb347"], [54, 26, "#e8654f"], [46, 22, "#ffe36a"], [58, 34, "#ff8f6b"], [34, 36, "#e8654f"], [50, 14, "#ffb347"]]) R(x, y, 1, 1, c);
    for (const y of [20, 16, 12, 8]) R(44 + (y % 3), y, 3, 2, "#3a3d52");
    hero(66, 42, { dir: -1, pose: "sit", shirt: "#6a6f8c" }); R(66, 41, 3, 1, "#2b2118");
    R(20, 48, 4, 2, "#5a5f6c"); R(12, 49, 5, 1, "#3a3d4c");
  },
  // 잔잔한 삶: 호숫가 오두막과 낚시
  calm(k) {
    const { R, D, sky, cloud, hill, tree, hero } = k;
    sky([["#ffd7a0", 14], ["#ffb48a", 14], ["#e88a8a", 14]]); D(48, 28, 9, "#fff0b8"); hill(34, 2, 12, "#6a8a6a", 0); cloud(10, 8, "#ffe8d0"); cloud(64, 14, "#ffe0d0");
    R(0, 36, W, 28, "#6a9ad0"); for (let x = 0; x < W; x += 6) R(x + (x % 12 === 0 ? 0 : 3), 40 + (x % 5) * 3, 4, 1, "#b8d8f0");
    R(40, 36, 16, 1, "#fff0b8"); R(42, 40, 12, 1, "#ffe0a0"); R(44, 44, 8, 1, "#ffe0a0");
    R(0, 34, 30, 8, "#5a8a58"); R(8, 24, 14, 10, "#f1e7d0"); R(6, 20, 18, 5, "#8a4b3a"); R(10, 28, 4, 6, "#7a4b3a"); R(17, 27, 4, 4, "#ffd25a"); R(19, 14, 3, 6, "#8a4b3a");
    for (const y of [12, 8, 5]) R(20 + (y % 3), y, 3, 2, "#e8d8d0");
    tree(2, 24, 1);
    R(30, 46, 36, 3, "#8a6a4a"); R(30, 49, 2, 5, "#6b4a2f"); R(48, 49, 2, 5, "#6b4a2f"); R(64, 49, 2, 5, "#6b4a2f");
    hero(52, 37, { dir: -1, pose: "sit" }); R(44, 36, 8, 1, "#6b4a2f"); R(44, 37, 1, 8, "#ddd");
    R(70, 52, 4, 2, "#fff"); R(73, 51, 2, 1, "#ffb347");
  },
  // 표류하는 삶: 안개 낀 밤바다의 작은 뗏목
  drift(k) {
    const { R, D, sky, stars, hero } = k;
    sky([["#0b1530", 16], ["#13264a", 14], ["#1d3a62", 12]]); stars(30, 9, 30); D(76, 12, 5, "#e8ecff"); D(78, 11, 4, "#13264a");
    R(0, 42, W, 22, "#1a4a7a");
    for (let y = 42; y < H; y += 3) for (let x = (y % 6 === 0 ? 0 : 4); x < W; x += 8) R(x, y, 4, 1, "#3a74a8");
    R(60, 38, 2, 5, "#e8e8f0"); R(59, 36, 4, 2, "#ffe36a"); R(62, 37, 6, 1, "rgba(255,227,106,0.4)");
    for (const y of [36, 46, 54]) for (let x = 0; x < W; x += 2) if ((x + y) % 4 === 0) R(x, y, 2, 1, "rgba(200,215,235,0.35)");
    R(26, 52, 30, 3, "#8a6a4a"); R(28, 55, 26, 1, "#6b4a2f"); for (let x = 28; x < 56; x += 6) R(x, 52, 1, 3, "#5a3f2a");
    R(41, 40, 1, 12, "#6b4a2f"); R(42, 40, 8, 8, "#e8e0d0"); R(42, 40, 8, 1, "#bfb8a8");
    hero(34, 42, { dir: 1, pose: "sit" }); R(38, 47, 2, 2, "#ffd25a");
  },
};

/** 엔딩 키에 맞는 도트 일러스트 캔버스 */
export function endingCanvas(key) {
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H; cv.className = "end-art";
  cv.setAttribute("role", "img");
  cv.dataset.scene = key;
  let ctx = null;
  try { ctx = cv.getContext("2d"); } catch { /* 일부 환경에서는 캔버스를 쓸 수 없다 */ }
  if (ctx && SCENES[key]) { ctx.imageSmoothingEnabled = false; SCENES[key](kit(ctx)); }
  return cv;
}

export const SCENE_KEYS = Object.keys(SCENES);
