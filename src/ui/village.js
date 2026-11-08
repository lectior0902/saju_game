// 마을 장면(Phaser). 외부 이미지 없이 도형으로 타일·건물·캐릭터를 그린다.
// Phaser는 마을 모드를 처음 열 때만 불러온다. 실패하면 호출한 쪽이 카드 모드로 돌아간다.
import { COLS, ROWS, TILE, SPAWN, BUILDINGS, WALK, findPath, tapTarget, stepFrom, doorAt, bodyAt, STATE_LABEL } from "./village-logic.js";

const PAL = { grass: 0x5f9e5a, grass2: 0x569453, path: 0xd8c394, path2: 0xcbb482, flower: 0xf2e6a0, ink: 0x1d2330, skin: 0xf2c9a0, hair: 0x2b2118 };
const FONT = "'Gothic A1', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
const hex = (n) => "#" + n.toString(16).padStart(6, "0");
const SEASONS = [
  { name: "봄", tint: 0xffd6e8, a: 0.10, fall: [0xffc2dc, 0xffffff], n: 14 },
  { name: "여름", tint: 0xfff2a0, a: 0.06, fall: [], n: 0 },
  { name: "가을", tint: 0xff9a3c, a: 0.16, fall: [0xd9731f, 0xf0b13a, 0xb5482a], n: 14 },
  { name: "겨울", tint: 0xbcd6ff, a: 0.22, fall: [0xffffff, 0xe6f0ff], n: 22 },
];
const TREES = [[5, 1], [11, 2], [4, 6], [10, 6], [12, 7], [6, 7], [1, 9], [3, 10], [0, 0], [16, 0], [16, 8], [0, 7]];

// ---- 건물 그리기: 96×64 몸체 기준. 문은 가운데 아래(x 40~56). 지붕 장식은 위로 8px까지만 나간다. ----
const DRAW = {
  학문(g) { // 도서관: 푸른 박공 지붕, 기둥, 펼친 책
    g.fillStyle(0xe3e9f4, 1).fillRect(0, 18, 96, 46);
    g.fillStyle(0x2d4678, 1).fillRect(-4, 16, 104, 6);
    g.fillStyle(0x3e5c9a, 1).fillTriangle(-4, 17, 48, -8, 100, 17);
    g.fillStyle(0xffffff, 1).fillCircle(48, 8, 7); g.fillStyle(0x2d4678, 1).fillRect(43, 5, 4.5, 6).fillRect(49.5, 5, 4.5, 6);
    g.fillStyle(0xffffff, 1).fillRect(43.5, 5.5, 3.5, 5).fillRect(50, 5.5, 3.5, 5);
    for (const x of [6, 20, 70, 84]) { g.fillStyle(0xffffff, 1).fillRect(x, 24, 8, 36); g.fillStyle(0xc5cde0, 1).fillRect(x + 6, 24, 2, 36).fillRect(x - 2, 22, 12, 3).fillRect(x - 2, 58, 12, 4); }
    g.fillStyle(0x4a5a7a, 1).fillRoundedRect(40, 36, 16, 28, { tl: 8, tr: 8, bl: 0, br: 0 });
    g.fillStyle(0xc5cde0, 1).fillRect(30, 60, 36, 4);
  },
  창작(g) { // 아틀리에: 알록달록 돔 지붕, 큰 채광창, 이젤
    g.fillStyle(0xf8dcc8, 1).fillRect(0, 20, 96, 44);
    g.fillStyle(0xe8654f, 1).fillEllipse(48, 22, 90, 44);
    g.fillStyle(0xf8dcc8, 1).fillRect(0, 22, 96, 42);
    g.fillStyle(0xe8654f, 1).fillRect(-2, 20, 100, 4);
    g.fillStyle(0xbfe3f2, 1).fillRoundedRect(34, 2, 28, 14, 6); g.fillStyle(0xffffff, 0.7).fillRect(40, 5, 3, 8);
    [[10, 6, 0xf2d04a], [22, 1, 0x4fb184], [72, 1, 0x6396e8], [84, 6, 0xab8be6]].forEach(([x, y, c]) => g.fillStyle(c, 1).fillTriangle(x, y + 4, x + 6, y + 4, x + 3, y + 12));
    [[8, 34, 0xf2d04a], [16, 44, 0x6396e8], [6, 52, 0x4fb184], [28, 38, 0xab8be6]].forEach(([x, y, c]) => g.fillStyle(c, 1).fillCircle(x, y, 4));
    g.fillStyle(0x6b4a2f, 1).fillRect(66, 36, 2, 26).fillRect(80, 36, 2, 26).fillRect(73, 40, 2, 22);
    g.fillStyle(0xffffff, 1).fillRect(64, 28, 20, 18); g.fillStyle(0xe8654f, 1).fillRect(67, 36, 8, 3); g.fillStyle(0x6396e8, 1).fillRect(70, 31, 9, 3);
    g.fillStyle(0x7a3b3b, 1).fillRoundedRect(40, 38, 16, 26, { tl: 8, tr: 8, bl: 0, br: 0 });
  },
  사업(g) { // 상점: 줄무늬 차양, 간판 동전, 진열창, 상자
    g.fillStyle(0xf4ecd0, 1).fillRect(0, 14, 96, 50);
    g.fillStyle(0x3f6b4a, 1).fillRect(0, 12, 96, 8);
    g.fillStyle(0x6b4a2f, 1).fillRoundedRect(26, -4, 44, 18, 3); g.fillStyle(0xf2c94a, 1).fillCircle(48, 5, 6.5); g.fillStyle(0xb88a1a, 1).fillRect(46.5, 2, 3, 6);
    for (let i = 0; i < 8; i++) { g.fillStyle(i % 2 ? 0xffffff : 0x4fb184, 1).fillRect(i * 12, 22, 12, 12); g.fillTriangle(i * 12, 34, i * 12 + 12, 34, i * 12 + 6, 40); }
    g.fillStyle(0xbfe3f2, 1).fillRect(5, 42, 28, 16).fillRect(63, 42, 28, 16);
    [[9, 52, 0xe8654f], [17, 52, 0xf2d04a], [25, 52, 0x6396e8], [67, 52, 0xab8be6], [75, 52, 0x4fb184]].forEach(([x, y, c]) => g.fillStyle(c, 1).fillRect(x, y, 5, 5));
    g.fillStyle(0x6b4a2f, 1).fillRect(40, 40, 16, 24); g.fillStyle(0xf2c94a, 1).fillRect(52, 52, 2, 2);
    g.fillStyle(0xa8794a, 1).fillRect(84, 58, 10, 6).fillRect(80, 62, 8, 2);
  },
  조직(g) { // 관공서: 돌 벽, 성가퀴 지붕, 시계, 깃발, 계단
    g.fillStyle(0xcdd2da, 1).fillRect(0, 14, 96, 50);
    g.fillStyle(0x8a93a3, 1).fillRect(-2, 10, 100, 6);
    for (let x = 0; x < 96; x += 14) g.fillRect(x, 4, 8, 7);
    g.fillStyle(0xffffff, 1).fillCircle(48, 24, 9); g.lineStyle(2, 0x1d2330, 1).strokeCircle(48, 24, 9); g.lineBetween(48, 24, 48, 18).lineBetween(48, 24, 52, 26);
    g.fillStyle(0xaeb8c6, 1).fillRect(80, -8, 2, 20);
    for (const x of [8, 22, 68, 82]) { g.fillStyle(0x5b6578, 1).fillRect(x, 34, 8, 12); g.fillStyle(0xbfe3f2, 1).fillRect(x + 1, 35, 6, 10); }
    g.fillStyle(0x4a5a7a, 1).fillRect(40, 38, 16, 26); g.fillStyle(0x1d2330, 1).fillRect(47.5, 38, 1, 26);
    g.fillStyle(0x8a93a3, 1).fillRect(34, 60, 28, 4).fillRect(30, 62, 36, 2);
  },
  관계(g) { // 모임 카페: 따뜻한 나무 벽, 둥근 창, 하트 간판, 파라솔 탁자
    g.fillStyle(0xf0c9a0, 1).fillRect(0, 20, 96, 44);
    g.fillStyle(0x8a4b34, 1).fillRect(-4, 14, 104, 9).fillRect(2, 8, 92, 8);
    g.fillStyle(0xd6a64b, 1).fillRect(0, 22, 96, 3);
    g.fillStyle(0xe8654f, 1).fillCircle(44.5, 5, 4).fillCircle(51.5, 5, 4).fillTriangle(40.5, 7, 55.5, 7, 48, 15);
    for (const x of [14, 70]) { g.fillStyle(0xf7e3a1, 1).fillCircle(x + 6, 42, 9); g.lineStyle(2, 0x8a4b34, 1).strokeCircle(x + 6, 42, 9); g.lineBetween(x + 6, 33, x + 6, 51).lineBetween(x - 3, 42, x + 15, 42); }
    g.fillStyle(0x6b3a2a, 1).fillRoundedRect(40, 38, 16, 26, { tl: 8, tr: 8, bl: 0, br: 0 });
    g.fillStyle(0x4fb184, 1).fillTriangle(78, 48, 96, 48, 87, 40); g.fillStyle(0x6b4a2f, 1).fillRect(86, 48, 2, 14).fillRect(82, 60, 10, 3);
  },
  기술(g) { // 공방: 벽돌 벽, 톱니 지붕, 굴뚝, 톱니바퀴, 셔터
    g.fillStyle(0x9a6b55, 1).fillRect(0, 18, 96, 46);
    g.fillStyle(0x7e5644, 1); for (let y = 22; y < 64; y += 8) g.fillRect(0, y, 96, 1);
    g.fillStyle(0x4a4f5c, 1).fillTriangle(-2, 18, 0, 2, 40, 18).fillTriangle(38, 18, 40, 2, 82, 18).fillRect(-2, 16, 100, 4);
    g.fillStyle(0x6b6f7a, 1).fillRect(72, -8, 12, 28); g.fillStyle(0x3a3d46, 1).fillRect(70, -10, 16, 4);
    g.fillStyle(0xd0d4dc, 1).fillCircle(20, 34, 9); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; g.fillRect(20 + Math.cos(a) * 10 - 2.5, 34 + Math.sin(a) * 10 - 2.5, 5, 5); }
    g.fillStyle(0x9a6b55, 1).fillCircle(20, 34, 3.5);
    g.fillStyle(0x5b6578, 1).fillRect(36, 34, 24, 30); g.fillStyle(0x7d8799, 1); for (let y = 38; y < 64; y += 5) g.fillRect(36, y, 24, 2);
    g.fillStyle(0x3a3d46, 1).fillRect(72, 56, 16, 4).fillRect(76, 60, 8, 4);
  },
  home(g) { // 쉼터: 작은 오두막, 굴뚝 연기
    g.fillStyle(0xf3dfb4, 1).fillRect(8, 18, 80, 46);
    g.fillStyle(0xc77a3a, 1).fillTriangle(-2, 22, 48, -8, 98, 22);
    g.fillStyle(0x8a4b34, 1).fillRect(66, -2, 8, 14);
    g.fillStyle(0x7a4b3a, 1).fillRect(40, 18, 16, 20); g.fillStyle(0xf4d47a, 1).fillRect(52, 28, 2, 2);
    g.fillStyle(0xfff0b0, 1).fillRect(16, 32, 14, 12).fillRect(66, 32, 14, 12);
  },
};

export async function createVillage(parent, cb) {
  const mod = await import("phaser");
  const Phaser = mod.default || mod;
  let states = {}, seasonIdx = 0, api;

  class Village extends Phaser.Scene {
    constructor() { super("village"); }

    create() {
      this.cell = { ...SPAWN }; this.moving = false; this.queue = []; this.pending = null;
      this.makeTextures(); this.drawMap(); this.drawTrees(); this.drawPond(); this.drawBuildings();
      this.hero = this.add.image(this.cell.x * TILE, this.cell.y * TILE, "hero_down").setOrigin(0);
      this.npcs = [["npcA", 0xd1604f, 0x6b3a2a], ["npcB", 0x4fb184, 0xd9b44a], ["npcC", 0xab8be6, 0x1d2330]].map(([k, sh, hr], i) => this.makeWalker(k, sh, hr, i));
      this.weather = this.add.container(0, 0).setDepth(5000);
      this.tintLayer = this.add.rectangle(0, 0, COLS * TILE, ROWS * TILE, 0xffffff, 0).setOrigin(0).setDepth(4000);
      this.input.on("pointerdown", (p) => { this.downAt = this.time.now; this.onTap(p); });
      const k = this.input.keyboard; k.disableGlobalCapture();
      this.keys = k.addKeys({ up: "UP", down: "DOWN", left: "LEFT", right: "RIGHT", w: "W", a: "A", s: "S", d: "D" });
      this.applyStates(); this.applySeason();
      this.drift();
      api = {
        setStates: (s) => { states = s; if (this.sys.isActive()) this.applyStates(); },
        setEncounter: (cell) => this.setEncounter(cell),
        hold: (d) => { this.holdDir = d; },
        setSeason: (i) => { seasonIdx = i; if (this.sys.isActive()) this.applySeason(); },
        reset: () => this.resetPlayer(), step: (d) => this.pushStep(d),
        destroy: () => this.game.destroy(true), pos: () => ({ ...this.cell }), busy: () => this.moving,
      };
    }

    // 길 위의 사건 표식: 통통 튀는 "✦" 말풍선
    setEncounter(cell) {
      if (this.encMark) { this.tweens.killTweensOf(this.encMark); this.encMark.destroy(); this.encMark = null; }
      this.encCell = cell || null;
      if (!cell) return;
      const m = this.add.text(cell.x * TILE + 16, cell.y * TILE + 4, "✦", { fontFamily: FONT, fontSize: "20px", fontStyle: "bold", color: "#6b3fd4", backgroundColor: "#fff3b8", padding: { x: 5, y: 1 } })
        .setOrigin(0.5, 1).setDepth(3500).setResolution(2);
      this.tweens.add({ targets: m, y: m.y - 6, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.encMark = m;
    }

    makeChar(prefix, shirt, hair) {
      const g = this.make.graphics({ x: 0, y: 0, add: false }), T = TILE;
      ["down", "up", "left", "right"].forEach((dir) => {
        g.clear();
        g.fillStyle(0x000000, 0.22).fillEllipse(16, 28, 16, 6);
        g.fillStyle(shirt, 1).fillRoundedRect(9, 15, 14, 12, 3);
        g.fillStyle(PAL.skin, 1).fillRoundedRect(9, 4, 14, 13, 4);
        g.fillStyle(hair, 1);
        if (dir === "up") g.fillRoundedRect(8, 3, 16, 12, 4); else g.fillRoundedRect(8, 3, 16, 7, 4);
        g.fillStyle(PAL.ink, 1);
        if (dir === "down") g.fillRect(12, 11, 2, 3).fillRect(18, 11, 2, 3);
        if (dir === "left") g.fillRect(10, 11, 2, 3);
        if (dir === "right") g.fillRect(20, 11, 2, 3);
        g.generateTexture(`${prefix}_${dir}`, T, T);
      });
      g.destroy();
    }

    makeTextures() {
      const g = this.make.graphics({ x: 0, y: 0, add: false }), T = TILE;
      [["grass0", PAL.grass, PAL.grass2], ["grass1", PAL.grass2, PAL.grass]].forEach(([key, a, b]) => {
        g.clear(); g.fillStyle(a, 1).fillRect(0, 0, T, T);
        g.fillStyle(b, 1); [[4, 6], [20, 10], [11, 22], [26, 26]].forEach(([x, y]) => g.fillRect(x, y, 3, 3));
        g.generateTexture(key, T, T);
      });
      g.clear(); g.fillStyle(PAL.grass, 1).fillRect(0, 0, T, T); g.fillStyle(0xf2e6a0, 1).fillRect(8, 8, 4, 4).fillStyle(0xf59cc0, 1).fillRect(21, 19, 4, 4);
      g.fillStyle(0xffffff, 1).fillRect(9, 9, 2, 2); g.generateTexture("flower", T, T);
      g.clear(); g.fillStyle(PAL.path, 1).fillRect(0, 0, T, T); g.fillStyle(PAL.path2, 1).fillRect(6, 7, 4, 3).fillRect(19, 20, 5, 3).fillRect(24, 6, 3, 3);
      g.generateTexture("path", T, T);
      g.clear(); g.fillStyle(0x000000, 0.45).fillRect(0, 0, T * 3, T * 2); g.generateTexture("shade", T * 3, T * 2);
      g.clear(); g.fillStyle(0xffffff, 1).fillCircle(4, 4, 4); g.generateTexture("dot", 8, 8);
      g.clear(); g.fillStyle(0x000000, 0.2).fillEllipse(18, 40, 32, 10); g.fillStyle(0x6b4a2f, 1).fillRect(15, 24, 6, 16);
      g.fillStyle(0x3f8a4a, 1).fillCircle(18, 16, 15); g.fillStyle(0x56a85c, 1).fillCircle(13, 12, 8).fillCircle(24, 14, 6);
      g.generateTexture("tree", 36, 44);
      g.destroy();
      this.makeChar("hero", 0x3d6fd1, PAL.hair);
      [["npcA", 0xd1604f, 0x6b3a2a], ["npcB", 0x4fb184, 0xd9b44a], ["npcC", 0xab8be6, 0x1d2330]].forEach(([k, s, h]) => this.makeChar(k, s, h));
    }

    drawMap() {
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        let key = WALK[y][x] ? "path" : (x * 7 + y * 13) % 5 === 0 ? "grass1" : "grass0";
        if (!WALK[y][x] && (x * 11 + y * 5) % 17 === 0) key = "flower";
        this.add.image(x * TILE, y * TILE, key).setOrigin(0);
      }
    }

    drawTrees() {
      this.trees = TREES.filter(([x, y]) => !WALK[y][x] && !bodyAt(x, y)).map(([x, y]) => {
        const t = this.add.image(x * TILE + 16, y * TILE + 36, "tree").setOrigin(0.5, 1).setDepth(y * TILE + 36);
        this.tweens.add({ targets: t, angle: { from: -1.5, to: 1.5 }, duration: 1800 + ((x * 7 + y * 3) % 5) * 250, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        return t;
      });
    }

    drawPond() {
      const g = this.add.graphics().setDepth(2);
      g.fillStyle(0x3f7fb0, 1).fillEllipse(14.2 * TILE, 10.6 * TILE, 4.2 * TILE, 2.2 * TILE);
      g.fillStyle(0x6fb2dc, 1).fillEllipse(14.2 * TILE, 10.5 * TILE, 3.6 * TILE, 1.7 * TILE);
      g.fillStyle(0xffffff, 0.5).fillRect(13 * TILE, 10.2 * TILE, 14, 2).fillRect(14.4 * TILE, 10.7 * TILE, 10, 2);
      g.fillStyle(0x4fb184, 1).fillCircle(15.2 * TILE, 10.9 * TILE, 6).fillCircle(12.9 * TILE, 10.8 * TILE, 5);
    }

    drawBuildings() {
      this.bld = {};
      for (const b of BUILDINGS) {
        const W = b.w * TILE, H = b.h * TILE, cont = this.add.container(b.x * TILE, b.y * TILE).setDepth(b.y * TILE + H);
        const g = this.add.graphics();
        g.fillStyle(0x000000, 0.2).fillRect(3, H - 2, W, 6);
        DRAW[b.id](g);
        const shade = this.add.image(0, 0, "shade").setOrigin(0).setVisible(false);
        cont.add([g, shade]);
        const label = this.add.text(b.id === "home" ? b.x * TILE - 30 : b.x * TILE + W / 2, b.id === "home" ? b.y * TILE + 36 : b.y * TILE - 16, b.id === "home" ? "쉼터" : b.id,
          { fontFamily: FONT, fontSize: "13px", fontStyle: "bold", color: "#fff", backgroundColor: hex(PAL.ink), padding: { x: 6, y: 2 } }).setOrigin(0.5).setDepth(3000).setResolution(2);
        const glow = this.add.ellipse(b.door.x * TILE + 16, b.door.y * TILE + 22, 30, 12, 0xffe27a, 0.5).setDepth(3).setVisible(false);
        this.tweens.add({ targets: glow, alpha: { from: 0.15, to: 0.7 }, scaleX: { from: 0.85, to: 1.2 }, duration: 800, yoyo: true, repeat: -1 });
        this.bld[b.id] = { cont, shade, label, glow };
        this.animate(b, cont);
      }
    }

    // 건물별 움직임: 굴뚝 연기, 깃발, 반짝이는 등
    animate(b, cont) {
      const bx = b.x * TILE, by = b.y * TILE;
      if (b.id === "기술" || b.id === "home") {
        const sx = bx + (b.id === "home" ? 70 : 78), sy = by + (b.id === "home" ? -4 : -10);
        this.time.addEvent({ delay: 650, loop: true, callback: () => {
          const p = this.add.image(sx, sy, "dot").setDepth(2500).setTint(0xe8e8ec).setAlpha(0.7).setScale(0.8);
          this.tweens.add({ targets: p, y: sy - 26, x: sx + 8, alpha: 0, scale: 1.8, duration: 1800, onComplete: () => p.destroy() });
        } });
      }
      if (b.id === "조직") {
        const f = this.add.graphics({ x: bx + 82, y: by - 8 }).setDepth(b.y * TILE + 70);
        f.fillStyle(0xe8654f, 1).fillRect(0, 0, 13, 8).fillStyle(0xffffff, 1).fillRect(0, 3, 13, 2);
        this.tweens.add({ targets: f, scaleX: { from: 0.55, to: 1 }, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      }
      if (b.id === "관계") {
        const cols = [0xffd25a, 0xff8f6b, 0xfff0a8];
        for (let i = 0; i < 9; i++) {
          const d = this.add.circle(bx + 8 + i * 10, by + 27 + (i % 2) * 2, 2.3, cols[i % 3]).setDepth(b.y * TILE + 70);
          this.tweens.add({ targets: d, alpha: { from: 0.25, to: 1 }, duration: 600 + i * 70, yoyo: true, repeat: -1, delay: i * 90 });
        }
      }
      if (b.id === "창작") {
        this.time.addEvent({ delay: 900, loop: true, callback: () => {
          const c = [0xe8654f, 0xf2d04a, 0x6396e8, 0x4fb184, 0xab8be6][Math.floor(Math.random() * 5)];
          const p = this.add.image(bx + 20 + Math.random() * 56, by + 8, "dot").setTint(c).setDepth(2500).setScale(0.6);
          this.tweens.add({ targets: p, y: by - 14, alpha: 0, duration: 1400, onComplete: () => p.destroy() });
        } });
      }
      if (b.id === "학문") {
        this.time.addEvent({ delay: 1400, loop: true, callback: () => {
          const p = this.add.text(bx + 30 + Math.random() * 36, by + 4, "✦", { fontSize: "10px", color: "#bcd2f5" }).setDepth(2500).setResolution(2);
          this.tweens.add({ targets: p, y: by - 16, alpha: 0, duration: 1500, onComplete: () => p.destroy() });
        } });
      }
      if (b.id === "사업") {
        this.time.addEvent({ delay: 1600, loop: true, callback: () => {
          const p = this.add.image(bx + 48, by + 2, "dot").setTint(0xf2c94a).setDepth(2500).setScale(0.7);
          this.tweens.add({ targets: p, y: by - 12, alpha: 0, scaleX: 0.2, duration: 900, onComplete: () => p.destroy() });
        } });
      }
    }

    applyStates() {
      for (const b of BUILDINGS) {
        const o = this.bld[b.id], st = states[b.id] || "closed", closed = st === "closed";
        o.shade.setVisible(closed);
        o.cont.setAlpha(closed ? 0.9 : 1);
        o.glow.setVisible(st === "route" || st === "open");
        o.glow.setFillStyle(st === "route" ? 0xffe27a : 0xbfe3f2, 0.5);
        if (b.id === "home") continue;
        const bg = closed ? 0x8a93a3 : st === "route" ? 0xa8e6c1 : st === "open" ? 0xf2e08a : st === "aux" ? 0xbcd2f5 : 0xf5c0b0;
        o.label.setText(`${b.id} · ${STATE_LABEL[st]}`).setColor("#101010").setBackgroundColor(hex(bg));
      }
    }

    applySeason() {
      const s = SEASONS[seasonIdx % 4];
      this.tintLayer.setFillStyle(s.tint, s.a);
      this.weather.removeAll(true);
      for (let i = 0; i < s.n; i++) {
        const c = s.fall[i % s.fall.length];
        const p = this.add.image(Math.random() * COLS * TILE, -10, "dot").setTint(c).setScale(seasonIdx % 4 === 3 ? 0.4 : 0.5);
        this.weather.add(p);
        this.tweens.add({
          targets: p, y: ROWS * TILE + 10, x: p.x + 40 - Math.random() * 80, duration: 5000 + Math.random() * 4000, delay: Math.random() * 5000,
          repeat: -1, onRepeat: () => { p.x = Math.random() * COLS * TILE; p.y = -10; },
        });
      }
    }

    // 마을 사람들이 길을 돌아다닌다
    makeWalker(key, shirt, hair, i) {
      const cells = []; WALK.forEach((row, y) => row.forEach((ok, x) => { if (ok && !doorAt(x, y)) cells.push({ x, y }); }));
      const spot = cells[(i * 37 + 11) % cells.length];
      const w = { key, cell: spot, img: this.add.image(spot.x * TILE, spot.y * TILE, `${key}_down`).setOrigin(0), busy: false };
      const go = () => {
        const to = cells[Math.floor(Math.random() * cells.length)], path = findPath(w.cell, to) || [];
        const step = () => {
          const n = path.shift();
          if (!n) { this.time.delayedCall(800 + Math.random() * 2200, go); return; }
          const dx = n.x - w.cell.x, dy = n.y - w.cell.y;
          w.img.setTexture(`${key}_${dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up"}`);
          this.tweens.add({ targets: w.img, x: n.x * TILE, y: n.y * TILE, duration: 300, onComplete: () => { w.cell = n; step(); } });
        };
        step();
      };
      this.time.delayedCall(500 + i * 700, go);
      return w;
    }

    drift() { /* 구름 그림자 */
      for (let i = 0; i < 3; i++) {
        const c = this.add.ellipse(-80, 40 + i * 120, 120, 40, 0x000000, 0.07).setDepth(3900);
        this.tweens.add({ targets: c, x: COLS * TILE + 100, duration: 38000 + i * 9000, delay: i * 6000, repeat: -1 });
      }
    }

    resetPlayer() {
      this.holdDir = null;
      this.tweens.killTweensOf(this.hero); this.queue = []; this.moving = false; this.pending = null; this.cell = { ...SPAWN };
      this.hero.setPosition(this.cell.x * TILE, this.cell.y * TILE).setTexture("hero_down");
    }

    pushStep(dir) {
      if (this.moving) return;
      const n = stepFrom(this.cell, dir);
      this.face(dir);
      if (n) this.queue = [n];
      this.pump();
    }

    face(dir) { this.hero.setTexture("hero_" + dir); }

    onTap(p) {
      const x = Math.floor(p.worldX / TILE), y = Math.floor(p.worldY / TILE), t = tapTarget(x, y);
      if (!t) return;
      if (t.x === this.cell.x && t.y === this.cell.y) { const id = doorAt(t.x, t.y); if (id) cb.onEnter(id); return; }
      if (this.moving) { this.queue = []; this.pending = t; return; }
      const path = findPath(this.cell, t);
      if (path) { this.queue = path; this.pump(); }
    }

    pump() {
      if (this.moving) return;
      const next = this.queue.shift();
      if (!next) {
        if (this.pending) { const path = findPath(this.cell, this.pending); this.pending = null; if (path && path.length) { this.queue = path; this.pump(); } }
        return;
      }
      const dx = next.x - this.cell.x, dy = next.y - this.cell.y;
      this.face(dx > 0 ? "right" : dx < 0 ? "left" : dy > 0 ? "down" : "up");
      this.moving = true;
      this.tweens.add({
        targets: this.hero, x: next.x * TILE, y: next.y * TILE, duration: 130, ease: "Linear",
        onComplete: () => {
          this.cell = next; this.moving = false;
          if (this.encCell && next.x === this.encCell.x && next.y === this.encCell.y) { this.queue = []; this.pending = null; cb.onEncounter(); return; }
          const id = doorAt(next.x, next.y);
          if (id && !this.queue.length && !this.pending) { cb.onEnter(id); return; }
          this.pump();
        },
      });
    }

    update() {
      this.hero.setDepth(this.hero.y + 32);
      this.npcs.forEach((n) => n.img.setDepth(n.img.y + 32));
      const ptr = this.input.activePointer;
      // 화면을 꾹 누르고 있으면 누른 쪽으로 계속 걷는다(길게 누르면 탭 이동 경로는 취소)
      if (ptr.isDown && this.downAt != null && this.time.now - this.downAt > 220 && !document.body.classList.contains("lock")) {
        const dx = ptr.worldX - (this.hero.x + 16), dy = ptr.worldY - (this.hero.y + 16);
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          this.queue = []; this.pending = null;
          if (!this.moving) this.pushStep(Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
        }
        return;
      }
      if (this.holdDir && !this.moving && !this.queue.length && !document.body.classList.contains("lock")) { this.pushStep(this.holdDir); return; }
      if (this.moving || this.queue.length) return;
      if (document.body.classList.contains("lock") || this.game.canvas.offsetParent === null) return;
      const k = this.keys;
      const dir = k.up.isDown || k.w.isDown ? "up" : k.down.isDown || k.s.isDown ? "down" : k.left.isDown || k.a.isDown ? "left" : k.right.isDown || k.d.isDown ? "right" : null;
      if (dir) this.pushStep(dir);
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO, parent, width: COLS * TILE, height: ROWS * TILE, backgroundColor: hex(PAL.grass),
    pixelArt: true, roundPixels: true, audio: { noAudio: true }, banner: false,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
    scene: Village,
  });
  await new Promise((res, rej) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (api) { clearInterval(iv); res(); } else if (Date.now() - t0 > 8000) { clearInterval(iv); rej(new Error("village timeout")); }
    }, 30);
  });
  api.destroy = () => game.destroy(true);
  api.game = game;
  return api;
}
