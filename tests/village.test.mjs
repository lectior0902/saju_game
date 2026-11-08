import test from "node:test";
import assert from "node:assert/strict";
import { BUILDINGS, SPAWN, WALK, COLS, ROWS, findPath, tapTarget, doorAt, bodyAt, stepFrom, buildingStates, walkable } from "../src/ui/village-logic.js";

test("건물 7채, 문은 모두 길이고 몸체는 길이 아니다", () => {
  assert.equal(BUILDINGS.length, 7);
  for (const b of BUILDINGS) {
    assert.ok(walkable(b.door.x, b.door.y), `${b.id} 문`);
    assert.equal(doorAt(b.door.x, b.door.y), b.id);
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
      assert.equal(WALK[y][x], false, `${b.id} 몸체 ${x},${y}`);
      assert.equal(bodyAt(x, y), b.id);
    }
  }
});

test("건물끼리 겹치지 않고 지도 안에 있다", () => {
  const seen = new Set();
  for (const b of BUILDINGS) for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
    assert.ok(x >= 0 && y >= 0 && x < COLS && y < ROWS);
    const k = `${x},${y}`; assert.ok(!seen.has(k), k); seen.add(k);
  }
});

test("출발점에서 모든 문까지 길이 있고 경로의 모든 칸이 걸을 수 있다", () => {
  for (const b of BUILDINGS) {
    const p = findPath(SPAWN, b.door);
    assert.ok(p && p.length > 0, b.id);
    assert.deepEqual(p[p.length - 1], b.door);
    let prev = SPAWN;
    for (const c of p) {
      assert.ok(walkable(c.x, c.y));
      assert.equal(Math.abs(c.x - prev.x) + Math.abs(c.y - prev.y), 1, "한 칸씩");
      prev = c;
    }
  }
});

test("문에서 문으로도, 같은 칸이면 빈 경로, 길이 아니면 null", () => {
  assert.ok(findPath(BUILDINGS[0].door, BUILDINGS[5].door));
  assert.deepEqual(findPath(SPAWN, SPAWN), []);
  assert.equal(findPath(SPAWN, { x: 2, y: 1 }), null);
});

test("길은 건물 몸체를 가로지르지 않는다(최단 경로가 문을 거치지 않음)", () => {
  const p = findPath(BUILDINGS[0].door, BUILDINGS[2].door);
  const doors = p.slice(0, -1).filter((c) => doorAt(c.x, c.y));
  assert.equal(doors.length, 0);
});

test("탭 대상: 건물 몸체는 문으로, 길은 그대로, 풀밭은 null", () => {
  assert.deepEqual(tapTarget(1, 1), BUILDINGS[0].door);
  assert.deepEqual(tapTarget(5, 6), { x: 5, y: 6 });
  assert.equal(tapTarget(0, 6), null);
  assert.equal(tapTarget(-1, 0), null);
});

test("한 칸 이동은 막히면 null", () => {
  assert.deepEqual(stepFrom(SPAWN, "left"), { x: 4, y: 8 });
  assert.deepEqual(stepFrom(SPAWN, "up"), { x: 5, y: 7 });
  assert.equal(stepFrom(SPAWN, "down"), null);
  assert.equal(stepFrom({ x: 0, y: 8 }, "left"), null);
});

test("출발점 옆 칸은 문이 아니다(실수로 들어가지 않게)", () => {
  for (const d of ["up", "left", "right", "down"]) { const n = stepFrom(SPAWN, d); if (n) assert.equal(doorAt(n.x, n.y), null); }
});

test("건물 상태: 제안되지 않은 분야는 닫힘, 나머지는 모드를 따른다", () => {
  const st = buildingStates(["학문", "사업"], (f) => (f === "학문" ? "route" : "off"));
  assert.equal(st.학문, "route"); assert.equal(st.사업, "off");
  assert.equal(st.창작, "closed"); assert.equal(st.home, "home");
});
