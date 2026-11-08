// 마을 모드의 순수 로직. Phaser와 DOM에 의존하지 않아서 노드에서 바로 테스트한다.
// 좌표는 모두 타일 단위 (x: 열, y: 행).

export const COLS = 17;
export const ROWS = 12;
export const TILE = 32;
export const SPAWN = { x: 5, y: 8 };

// 건물 몸체 3×2, 문은 몸체 바로 아래 가운데 칸. 집은 길 아래쪽에 있고 문이 위쪽이다.
const SLOTS = [
  ["학문", 1, 1], ["창작", 7, 1], ["사업", 13, 1],
  ["조직", 1, 5], ["관계", 7, 5], ["기술", 13, 5],
];
export const BUILDINGS = [
  ...SLOTS.map(([id, x, y]) => ({ id, x, y, w: 3, h: 2, door: { x: x + 1, y: y + 2 } })),
  { id: "home", x: 7, y: 10, w: 3, h: 2, door: { x: 8, y: 9 } },
];
export const BUILDING = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));

/** 길로 쓰는 칸. 가로 길 두 줄(y=4, y=8), 세로 길 두 줄(x=5, x=11), 각 문 앞 칸. */
function buildWalk() {
  const w = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  for (let x = 0; x < COLS; x++) { w[4][x] = true; w[8][x] = true; }
  for (let y = 4; y <= 8; y++) { w[y][5] = true; w[y][11] = true; }
  for (const b of BUILDINGS) w[b.door.y][b.door.x] = true;
  return w;
}
export const WALK = buildWalk();

export const inBounds = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
export const walkable = (x, y) => inBounds(x, y) && WALK[y][x];

/** 이 칸이 어느 건물의 문인지. 아니면 null */
export function doorAt(x, y) {
  const b = BUILDINGS.find((b) => b.door.x === x && b.door.y === y);
  return b ? b.id : null;
}

/** 이 칸이 어느 건물의 몸체인지. 아니면 null */
export function bodyAt(x, y) {
  const b = BUILDINGS.find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
  return b ? b.id : null;
}

/** 칸 단위 최단 경로(너비 우선). from은 제외, to는 포함한 칸 목록. 갈 수 없으면 null, 같은 칸이면 []. */
export function findPath(from, to) {
  if (!walkable(to.x, to.y) || !walkable(from.x, from.y)) return null;
  if (from.x === to.x && from.y === to.y) return [];
  const key = (x, y) => y * COLS + x;
  const prev = new Map([[key(from.x, from.y), null]]);
  const q = [from];
  const D = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    for (const [dx, dy] of D) {
      const nx = c.x + dx, ny = c.y + dy;
      if (!walkable(nx, ny) || prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), c);
      if (nx === to.x && ny === to.y) {
        const path = [{ x: nx, y: ny }];
        for (let p = c; p && !(p.x === from.x && p.y === from.y); p = prev.get(key(p.x, p.y))) path.unshift({ x: p.x, y: p.y });
        return path;
      }
      q.push({ x: nx, y: ny });
    }
  }
  return null;
}

/** 탭한 칸을 도착점으로 바꾼다. 건물 몸체를 누르면 그 건물의 문으로, 길이 아닌 곳이면 null. */
export function tapTarget(x, y) {
  if (!inBounds(x, y)) return null;
  const b = bodyAt(x, y);
  if (b) return { ...BUILDING[b].door };
  return walkable(x, y) ? { x, y } : null;
}

export const DIRS = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };

/** 한 칸 이동. 막혀 있으면 null */
export function stepFrom(pos, dir) {
  const [dx, dy] = DIRS[dir];
  const nx = pos.x + dx, ny = pos.y + dy;
  return walkable(nx, ny) ? { x: nx, y: ny } : null;
}

/**
 * 건물 상태. 올해 제안된 분야가 아니면 closed, 맞으면 modeFn(분야)의 결과(route/aux/open/off).
 * 집은 항상 열려 있다.
 */
export function buildingStates(opts, modeFn) {
  const st = { home: "home" };
  for (const b of BUILDINGS) if (b.id !== "home") st[b.id] = opts.includes(b.id) ? modeFn(b.id) : "closed";
  return st;
}

export const STATE_LABEL = { route: "순풍", open: "열린 길", aux: "보조", off: "낯선 길", closed: "닫힘", home: "쉼터" };

/** 사건 표식을 놓을 칸을 고른다. 문이 아닌 길 칸 중 출발점에서 3칸 이상 떨어진 곳. rng는 0~1 난수 함수. */
export function pickEncounterCell(rng) {
  const cells = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (!WALK[y][x] || doorAt(x, y)) continue;
    const p = findPath(SPAWN, { x, y });
    if (p && p.length >= 3) cells.push({ x, y });
  }
  return cells[Math.floor(rng() * cells.length)];
}
