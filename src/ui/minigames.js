// 미니게임 3종. 각 함수는 (stage, level, field, finish)를 받고, 정리(cleanup) 함수를 돌려준다.
// finish(tier)의 tier는 성과 등급 0~3이다. level은 0 쉬움, 1 보통, 2 어려움.
import { h, v, shuffle } from "./dom.js";
import { FIELD_VAR } from "./constants.js";

/** 1. 타이밍 잡기(사업·조직): 움직이는 막대를 밝은 구간에서 멈춘다. 3회. */
export function gameTiming(stage, level, f, finish) {
  const P = [{ w: 0.28, v: 0.85 }, { w: 0.21, v: 1.2 }, { w: 0.15, v: 1.6 }][level];
  let round = 0, hits = 0, pos = 0, dir = 1, last = performance.now(), zone = 0, raf = 0, running = true, timer = 0;
  const zoneEl = h("div", { class: "zone" }), mk = h("div", { class: "marker" });
  const track = h("div", { class: "track" }, zoneEl, mk);
  const dots = [0, 1, 2].map(() => h("i"));
  const msg = h("p", { class: "game-msg" }, "밝은 구간에서 멈춰요");
  const btn = h("button", { class: "btn big", type: "button" }, "멈추기");
  stage.append(h("div", { class: "dots" }, dots), track, msg, btn);

  function newZone() { zone = 0.06 + Math.random() * (0.88 - P.w); zoneEl.style.left = `${zone * 100}%`; zoneEl.style.width = `${P.w * 100}%`; }
  function tick(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    pos += dir * P.v * dt;
    if (pos >= 1) { pos = 1; dir = -1; }
    if (pos <= 0) { pos = 0; dir = 1; }
    mk.style.left = `${pos * 100}%`;
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    if (!running) return;
    const hit = pos >= zone && pos <= zone + P.w;
    if (hit) hits++;
    dots[round].className = hit ? "hit" : "miss";
    msg.textContent = hit ? "좋아요" : "빗나갔어요";
    round++;
    if (round >= 3) { running = false; cancelAnimationFrame(raf); btn.disabled = true; timer = setTimeout(() => finish(hits), 600); }
    else newZone();
  }
  btn.addEventListener("click", stop);
  track.addEventListener("pointerdown", stop);
  newZone();
  raf = requestAnimationFrame(tick);
  return () => { running = false; cancelAnimationFrame(raf); clearTimeout(timer); };
}

/** 2. 짝 맞추기(학문·기술): 잠깐 보고 외운 뒤 짝을 찾는다. 실수는 5번까지. */
export function gameMemory(stage, level, f, finish) {
  const P = [{ pairs: 3, peek: 1600, cols: 3 }, { pairs: 4, peek: 1200, cols: 4 }, { pairs: 5, peek: 900, cols: 5 }][level];
  const LIMIT = 5;
  const glyphs = f === "학문" ? ["가", "나", "다", "라", "마"] : ["◆", "●", "▲", "■", "★"];
  const colors = ["--wood", "--fire", "--earth", "--water", "--tool"];
  const deck = shuffle(Array.from({ length: P.pairs * 2 }, (_, i) => i % P.pairs));
  let first = null, locked = true, mistakes = 0, matched = 0, t1 = 0, t2 = 0;
  const infoLine = h("div", { class: "score-line" }, h("span", {}, "외울 시간이에요"), h("span", {}));
  const grid = h("div", { class: "mgrid", style: `grid-template-columns:repeat(${P.cols},1fr)` });
  const cards = deck.map((k, i) => {
    const c = h("button", { class: "mcard open", type: "button", style: `--c:${v(colors[k])}`, "aria-label": `카드 ${i + 1}` }, glyphs[k]);
    c.addEventListener("click", () => flip(i));
    grid.append(c);
    return c;
  });
  stage.append(infoLine, grid);
  const setLeft = () => { infoLine.lastChild.textContent = `남은 실수 ${LIMIT - mistakes}`; };
  t1 = setTimeout(() => {
    cards.forEach((c) => c.classList.remove("open"));
    locked = false; infoLine.firstChild.textContent = "같은 짝을 찾아요"; setLeft();
  }, P.peek);

  function flip(i) {
    const c = cards[i];
    if (locked || c.classList.contains("open") || c.classList.contains("matched")) return;
    c.classList.add("open");
    if (first === null) { first = i; return; }
    const a = first; first = null; locked = true;
    if (deck[a] === deck[i]) {
      cards[a].classList.add("matched"); c.classList.add("matched"); matched++; locked = false;
      if (matched === P.pairs) { locked = true; t2 = setTimeout(() => finish(mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1), 500); }
    } else {
      mistakes++; setLeft();
      t2 = setTimeout(() => {
        cards[a].classList.remove("open"); c.classList.remove("open"); locked = false;
        if (mistakes >= LIMIT) { locked = true; infoLine.firstChild.textContent = "기회를 모두 썼어요"; t2 = setTimeout(() => finish(0), 700); }
      }, 650);
    }
  }
  return () => { clearTimeout(t1); clearTimeout(t2); };
}

/** 3. 조각 모으기(창작·관계): 8초 동안 나타났다 사라지는 조각을 누른다. */
export function gameOrbs(stage, level, f, finish) {
  const P = [{ gap: 760, life: 1500 }, { gap: 660, life: 1150 }, { gap: 560, life: 900 }][level];
  const DUR = 8000;
  let caught = 0, spawnT = 0, endT = 0, startT = 0, alive = true;
  const bar = h("i"), count = h("span", {}, "0개");
  const arena = h("div", { class: "arena" });
  const label = h("span", {}, "곧 시작해요");
  stage.append(h("div", { class: "score-line" }, label, count), h("div", { class: "timebar" }, bar), arena);
  const spawns = [];

  function spawn() {
    if (!alive) return;
    const o = h("button", { class: "orb", type: "button", "aria-label": "조각",
      style: `left:${12 + Math.random() * 76}%;top:${14 + Math.random() * 72}%;--c:${v(FIELD_VAR[f])}` });
    let gone = false;
    o.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (gone || !alive) return;
      gone = true; caught++; count.textContent = `${caught}개`;
      o.classList.add("pop"); setTimeout(() => o.remove(), 260);
    });
    arena.append(o);
    spawns.push(setTimeout(() => { if (gone) return; gone = true; o.classList.add("gone"); setTimeout(() => o.remove(), 260); }, P.life));
    spawnT = setTimeout(spawn, P.gap * (0.8 + Math.random() * 0.4));
  }
  startT = setTimeout(() => {
    label.textContent = "조각을 눌러요";
    bar.style.transition = `transform ${DUR}ms linear`;
    requestAnimationFrame(() => { bar.style.transform = "scaleX(0)"; });
    spawn();
    endT = setTimeout(() => {
      alive = false; clearTimeout(spawnT); label.textContent = "끝!";
      setTimeout(() => finish(caught >= 9 ? 3 : caught >= 6 ? 2 : caught >= 3 ? 1 : 0), 700);
    }, DUR);
  }, 700);
  return () => { alive = false; clearTimeout(startT); clearTimeout(spawnT); clearTimeout(endT); spawns.forEach(clearTimeout); };
}

/** 4. 서류 분류(조직): 한 장씩 나오는 서류를 모양에 맞는 서류함에 넣는다. 10장. */
export function gameSort(stage, level, f, finish) {
  const MS = [2300, 1700, 1250][level], N = 10;
  const KINDS = [{ sym: "▲", name: "결재", c: "--water" }, { sym: "●", name: "보관", c: "--fire" }];
  const TITLES = ["휴가 신청서", "회의록", "예산안", "영수증", "출장 보고서", "계약 사본", "민원 접수", "교육 일정표", "비품 요청", "연간 보고서"];
  let i = 0, ok = 0, kind = 0, timer = 0, running = true, bar;
  const count = h("span", {}, `0 / ${N}`), label = h("span", {}, "서류를 알맞은 함에 넣어요");
  const card = h("div", { class: "doc-card" });
  const timebar = h("div", { class: "timebar" }, (bar = h("i")));
  const bins = KINDS.map((k, ki) => h("button", { class: "btn big sort-btn", type: "button", style: `border-color:${v(k.c)}`, onclick: () => answer(ki) },
    h("span", { style: `color:${v(k.c)};margin-right:8px` }, k.sym), k.name));
  stage.append(h("div", { class: "score-line" }, label, count), timebar, card, h("div", { class: "bins" }, bins));
  function next() {
    if (!running) return;
    if (i >= N) { running = false; label.textContent = "끝!"; timer = setTimeout(() => finish(ok >= 9 ? 3 : ok >= 7 ? 2 : ok >= 5 ? 1 : 0), 500); return; }
    kind = Math.random() < 0.5 ? 0 : 1;
    const k = KINDS[kind];
    card.textContent = ""; card.append(h("span", { class: "doc-sym", style: `color:${v(k.c)}` }, k.sym), h("span", {}, TITLES[i % TITLES.length]));
    card.dataset.kind = String(kind);
    bar.style.transition = "none"; bar.style.transform = "scaleX(1)";
    requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.transition = `transform ${MS}ms linear`; bar.style.transform = "scaleX(0)"; }));
    clearTimeout(timer); timer = setTimeout(() => answer(-1), MS);
  }
  function answer(choice) {
    if (!running) return;
    clearTimeout(timer);
    if (choice === kind) ok++;
    i++; count.textContent = `${ok} / ${N}`;
    next();
  }
  next();
  return () => { running = false; clearTimeout(timer); };
}

/** 5. 마음 맞추기(관계): 깜박이는 순서를 그대로 따라 누른다. 3판. */
export function gameEcho(stage, level, f, finish) {
  const LEN = [3, 4, 5][level], ROUNDS = 3;
  const MOODS = [{ n: "기쁨", c: "--earth" }, { n: "슬픔", c: "--water" }, { n: "놀람", c: "--tool" }, { n: "걱정", c: "--wood" }];
  let round = 0, passed = 0, seq = [], pos = 0, accepting = false, running = true; const timers = [];
  const after = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); };
  const dots = [0, 1, 2].map(() => h("i"));
  const msg = h("p", { class: "game-msg" }, "잘 보고 따라 해요");
  const pads = MOODS.map((m, k) => h("button", { class: "pad", type: "button", style: `--c:${v(m.c)}`, onclick: () => press(k) }, m.n));
  stage.append(h("div", { class: "dots" }, dots), msg, h("div", { class: "pads" }, pads));
  const light = (k, ms = 380) => { pads[k].classList.add("lit"); after(() => pads[k].classList.remove("lit"), ms); };
  function start() {
    if (!running) return;
    seq = Array.from({ length: LEN }, () => Math.floor(Math.random() * 4)); pos = 0; accepting = false;
    msg.textContent = `${round + 1}번째 · 잘 봐요`;
    seq.forEach((k, i) => after(() => light(k), 600 + i * 620));
    after(() => { accepting = true; msg.textContent = "이제 따라 해요"; }, 600 + LEN * 620);
  }
  function press(k) {
    if (!accepting || !running) return;
    light(k, 200);
    if (k !== seq[pos]) { accepting = false; dots[round].className = "miss"; msg.textContent = "순서가 달랐어요"; end(); return; }
    pos++;
    if (pos === LEN) { accepting = false; passed++; dots[round].className = "hit"; msg.textContent = "맞았어요"; end(); }
  }
  function end() { round++; if (round >= ROUNDS) { running = false; after(() => finish(passed), 700); } else after(start, 900); }
  after(start, 500);
  return () => { running = false; timers.forEach(clearTimeout); };
}

/** 6. 정밀 조립(기술): 버튼을 누르고 있으면 게이지가 차오르고, 밝은 구간에서 놓는다. 3회. */
export function gameGauge(stage, level, f, finish) {
  const P = [{ w: 0.24, v: 0.55 }, { w: 0.17, v: 0.78 }, { w: 0.12, v: 1.0 }][level];
  let round = 0, hits = 0, val = 0, holding = false, last = 0, raf = 0, zone = 0, running = true, timer = 0;
  const dots = [0, 1, 2].map(() => h("i"));
  const zoneEl = h("div", { class: "zone" }), fill = h("div", { class: "gfill" });
  const track = h("div", { class: "track gauge" }, zoneEl, fill);
  const msg = h("p", { class: "game-msg" }, "누르고 있다가 밝은 구간에서 놓아요");
  const btn = h("button", { class: "btn big hold", type: "button" }, "누르고 있기");
  stage.append(h("div", { class: "dots" }, dots), track, msg, btn);
  const newZone = () => { zone = 0.3 + Math.random() * (0.68 - P.w); zoneEl.style.left = `${zone * 100}%`; zoneEl.style.width = `${P.w * 100}%`; };
  function tick(t) {
    if (!running) return;
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    if (holding) { val = Math.min(1, val + P.v * dt); fill.style.width = `${val * 100}%`; if (val >= 1) release(); }
    raf = requestAnimationFrame(tick);
  }
  function press() { if (!running || holding) return; holding = true; val = 0; last = performance.now(); fill.style.width = "0%"; btn.textContent = "지금 놓기"; }
  function release() {
    if (!running || !holding) return;
    holding = false; btn.textContent = "누르고 있기";
    const hit = val >= zone && val <= zone + P.w;
    if (hit) hits++;
    dots[round].className = hit ? "hit" : "miss"; msg.textContent = hit ? "딱 맞았어요" : val > zone + P.w ? "넘쳤어요" : "모자랐어요";
    round++;
    if (round >= 3) { running = false; cancelAnimationFrame(raf); btn.disabled = true; timer = setTimeout(() => finish(hits), 600); }
    else { newZone(); timer = setTimeout(() => { val = 0; fill.style.width = "0%"; }, 400); }
  }
  btn.addEventListener("pointerdown", (e) => { e.preventDefault(); press(); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => btn.addEventListener(ev, release));
  newZone(); raf = requestAnimationFrame(tick);
  return () => { running = false; cancelAnimationFrame(raf); clearTimeout(timer); };
}
