// 플레이 화면: 14턴 동안 분야를 고르고, 미니게임을 하고, 결과를 본다.
import { newChar, offer, info, act, rest as restAction, endTurn, mulberry32, C, TURNS, FIELDS, openNeed, modeOf,
  ENV_RESOURCE, ENV_REGION, rollEncounter, resolveEncounter, questView, QUEST } from "../core/index.js";
import { $, h, v, show } from "./dom.js";
import { FIELD_VAR, ACTION_TEXT, GAME_OF, GAME_NAME, GAME_HINT, LEVEL_NAME, TIER_NAME } from "./constants.js";
import { S } from "./state.js";
import { makeTerrain } from "./terrain.js";
import { openSheet, closeSheet } from "./sheet.js";
import { gameTiming, gameMemory, gameOrbs, gameSort, gameEcho, gameGauge } from "./minigames.js";
import { interiorSvg } from "./interior.js";
import { renderEnding } from "./ending.js";
import { buildingStates, pickEncounterCell } from "./village-logic.js";
import { sajuSections } from "./reveal.js";

export function startRun() {
  if (S.village) { try { S.village.destroy(); } catch {} S.village = null; }
  S.ch = newChar(S.r, S.env);
  S.rng = mulberry32((Math.random() * 4294967296) >>> 0);
  S.opts = offer(S.ch, S.rng);
  newEncounter();
  S.mode = S.mode || "village";
  buildPlay();
  renderPlay();
  show("scr-play");
  applyMode();
}

function buildPlay() {
  const el = $("scr-play");
  el.textContent = "";
  const P = (S.play = { terr: makeTerrain() });
  const res = ENV_RESOURCE[S.env.resource], reg = ENV_REGION[S.env.region];
  P.age = h("div", { class: "age" });
  P.mindNum = h("span");
  P.mindFill = h("div", { class: "mind-fill" });
  P.ticks = h("div", { class: "ticks", "aria-hidden": "true" }, Array.from({ length: TURNS }, () => h("i", { class: "tick" })));
  P.notice = h("div", { class: "notice", "aria-live": "polite" });
  P.cards = h("div", { class: "cards" });
  P.cardsWrap = h("div", { class: "cards-wrap" }, h("h2", { class: "sec-title" }, "올해는 어디에 힘을 쓸까요?"), P.cards);
  P.stage = h("div", { class: "village-stage" });
  P.vHint = h("p", { class: "v-hint", "aria-live": "polite" }, "마을을 걸어 건물 문 앞에 서면 들어갈 수 있어요.");
  P.dpad = h("div", { class: "dpad", role: "group", "aria-label": "이동 버튼" },
    [["up", "▲"], ["left", "◀"], ["down", "▼"], ["right", "▶"]].map(([d, t]) =>
      h("button", { class: "dp dp-" + d, type: "button", "aria-label": { up: "위", down: "아래", left: "왼쪽", right: "오른쪽" }[d], onclick: () => S.village && S.village.step(d) }, t)));
  P.villageWrap = h("div", { class: "village-wrap" }, P.stage, P.vHint, P.dpad);
  P.modeBtns = ["village", "card"].map((m) => h("button", { class: "seg", type: "button", "data-mode": m, onclick: () => { S.mode = m; applyMode(); } }, m === "village" ? "마을" : "카드"));
  P.modeBar = h("div", { class: "modebar", role: "group", "aria-label": "화면 방식" }, P.modeBtns);
  P.xp = h("div", { class: "xp-list" });
  P.journal = h("div", { class: "journal" });
  P.encBox = h("div", { class: "enc-banner", hidden: true });
  P.rest = h("button", { class: "btn ghost rest-btn", type: "button", onclick: doRest });
  el.append(
    h("div", { class: "hud" }, P.age,
      h("div", { class: "mind-wrap" }, h("div", { class: "mind-top" }, h("span", {}, "마음"), P.mindNum), h("div", { class: "mind" }, P.mindFill))),
    P.ticks,
    h("p", { class: "env-line" }, h("span", {}, `가정 형편 ${res.name}`), h("span", {}, `사는 곳 ${reg.name}`)),
    P.notice,
    P.encBox,
    P.villageWrap, P.cardsWrap,
    h("div", { class: "play-tools" }, P.modeBar, P.rest),
    h("section", { class: "saju-panel" },
      h("h2", { class: "panel-title" }, "내 사주 풀이"),
      h("p", { class: "small muted" }, "화면 위에서 걷는 마을이 이 풀이를 바탕으로 돌아가요."),
      ...sajuSections(),
      h("div", { class: "terrain-box" }, P.terr.el,
        h("p", { class: "map-cap" }, "낮은 곳이 수월한 길이에요. 높은 곳으로 가려면 더 힘이 들지만, 같은 길을 네 번쯤 오르면 길이 열려요.")),
      h("h2", { class: "sec-title" }, "낯선 길 일지"),
      h("p", { class: "small muted" }, "타고난 루트 밖의 분야에 힘을 쓸 때마다 이야기가 한 칸씩 이어져요. 미니게임이 잘 안 돼도 이야기는 이어지고, 굳은살이 생겨 다음 비용이 줄어요."),
      P.journal,
      h("h2", { class: "sec-title" }, "지금까지 쌓은 것"), P.xp));
}

function renderPlay(keepPos = false) {
  const { ch } = S, P = S.play, age = C.START + ch.turn * C.STEP;
  P.age.textContent = "";
  P.age.append(String(age), h("small", {}, "세"));
  P.mindNum.textContent = `${ch.mind} / 100`;
  P.mindFill.style.width = `${ch.mind}%`;
  P.mindFill.classList.toggle("low", ch.mind <= C.BURN);
  [...P.ticks.children].forEach((t, i) => { t.className = "tick" + (i < ch.turn ? " done" : i === ch.turn ? " now" : ""); });

  // 알림: 지원 제도, 루트 기회 부재, 지침, 전성기
  P.notice.textContent = "";
  if (ch.note) P.notice.append(h("p", { class: "good" }, ch.note));
  if (!S.opts.some((f) => ch.route.includes(f))) P.notice.append(h("p", { class: "warn" }, "올해는 가까이에 타고난 루트 분야의 기회가 없어요."));
  if (ch.mind <= C.BURN) P.notice.append(h("p", { class: "bad" }, "지쳐 있어요. 이 상태로 행동하면 성과가 절반이에요."));
  else if (age >= ch.peak[0] && age <= ch.peak[1]) P.notice.append(h("p", { class: "warn" }, `전성기예요(${ch.peak[0]}~${ch.peak[1]}세). 루트 분야가 ×1.3이에요.`));

  P.terr.update(ch);
  P.cards.textContent = "";
  S.opts.forEach((f) => {
    const inf = info(ch, f, age);
    const tag = inf.mode === "route" ? "순풍" : inf.mode === "open" ? "열린 길" : inf.mode === "aux" ? "보조 ×0.85" : `낯선 길 ${ch.pioneer[f]}/${openNeed(ch)}`;
    P.cards.append(h("button", { class: "act", type: "button", onclick: () => openGame(f, inf, age) },
      h("div", { class: "act-top" },
        h("span", { class: "act-name" }, h("i", { class: "dot", style: `background:${v(FIELD_VAR[f])};margin:0` }), f),
        h("span", { class: "tag " + inf.mode }, tag)),
      h("p", { class: "act-desc" }, ACTION_TEXT[f]),
      h("div", { class: "act-meta" },
        h("span", {}, `마음 −${inf.cost}`),
        h("span", {}, `${GAME_NAME[GAME_OF[f]]} · ${LEVEL_NAME[inf.level]}`),
        inf.peak ? h("span", { style: "color:var(--warn)" }, "전성기 ×1.3") : null)));
  });
  syncVillage(keepPos);
  renderEncBox();
  renderJournal();
  const res = ENV_RESOURCE[S.env.resource];
  P.rest.textContent = `쉬어 가요 (마음 +${Math.max(0, C.REST + ch.season.restPlus + res.restDelta)})`;
  P.xp.textContent = "";
  FIELDS.slice().sort((a, b) => ch.xp[b] - ch.xp[a]).forEach((f) => {
    P.xp.append(h("div", { class: "xp-row" }, h("span", {}, f),
      h("div", { class: "xp-bar" }, h("i", { style: `width:${Math.min(100, ch.xp[f] / 1.6)}%;background:${v(FIELD_VAR[f])}` })),
      h("span", { class: "xp-num" }, ch.xp[f].toFixed(0))));
  });
}

function openGame(f, inf, age) {
  const kind = GAME_OF[f];
  const stage = h("div", { class: "stage" });
  let finished = false;
  const done = (tier) => { if (finished) return; finished = true; resolveAction(f, age, tier); };
  openSheet([
    interiorSvg(f),
    h("div", {}, h("p", { class: "eyebrow" }, `${age}세 · ${f} · 난이도 ${LEVEL_NAME[inf.level]}`), h("h2", {}, GAME_NAME[kind])),
    h("p", { class: "small muted" }, GAME_HINT[kind]),
    stage,
    h("div", { style: "text-align:center" }, h("button", { class: "linkish", type: "button", onclick: () => done(1) }, "건너뛰기 (성과 무난)")),
  ]);
  const fn = { timing: gameTiming, memory: gameMemory, orbs: gameOrbs, sort: gameSort, echo: gameEcho, gauge: gameGauge }[kind];
  S.cleanup = fn(stage, inf.level, f, done);
}

function resolveAction(f, age, tier) {
  if (S.cleanup) { S.cleanup(); S.cleanup = null; }
  const before = S.ch.mind;
  const res = act(S.ch, f, age, tier, S.rng);
  showResult({
    eyebrow: `${age}세 · ${f}`, big: `+${res.gain.toFixed(1)}`,
    sub: `성과 ${TIER_NAME[tier]} (×${C.PERF[tier].toFixed(2)}) · 마음 ${before} → ${S.ch.mind}`, log: res.log,
  });
}

function doRest() {
  const age = C.START + S.ch.turn * C.STEP, before = S.ch.mind;
  restAction(S.ch);
  showResult({ eyebrow: `${age}세 · 쉬어 가요`, big: `+${S.ch.mind - before}`, sub: `마음 ${before} → ${S.ch.mind}`, log: [{ t: "info", s: "잠시 멈추고 숨을 골랐어요." }] });
}

function showResult(o) {
  const last = S.ch.turn + 1 >= TURNS;
  openSheet([
    h("div", {}, h("p", { class: "eyebrow" }, o.eyebrow)),
    h("div", {}, h("div", { class: "gain" }, o.big), h("p", { class: "muted", style: "margin-top:8px" }, o.sub)),
    h("ul", { class: "log", "aria-live": "polite" }, o.log.map((l) => h("li", { class: l.t }, l.s))),
    h("button", { class: "btn", type: "button", onclick: nextTurn }, last ? "엔딩 보기" : `${C.START + (S.ch.turn + 1) * C.STEP}세로 넘어가요`),
  ]);
}

function nextTurn() {
  closeSheet();
  endTurn(S.ch, S.rng);
  if (S.ch.turn >= TURNS) { renderEnding(); show("scr-end"); return; }
  S.opts = offer(S.ch, S.rng);
  newEncounter();
  renderPlay();
  window.scrollTo(0, 0);
}

// ---- 마을 모드 ----
function modeFn(f) { return info(S.ch, f, C.START + S.ch.turn * C.STEP).mode; }

function syncVillage(keepPos = false) {
  if (!S.village) return;
  S.village.setStates(buildingStates(S.opts, modeFn));
  if (!keepPos) S.village.reset();
  S.village.setEncounter(S.enc && !S.enc.done ? S.enc.cell : null);
  S.village.setSeason(S.ch.turn % 4);
  S.play.vHint.textContent = S.enc && !S.enc.done ? "길 위에 ✦ 표식이 있어요. 밟아 보면 무슨 일이 있는지 알 수 있어요." : "마을을 걸어 건물 문 앞에 서면 들어갈 수 있어요.";
}

async function applyMode() {
  const P = S.play;
  if (S.mode === "village" && !S.village && !S.villageFailed) {
    P.vHint.textContent = "마을을 불러오는 중이에요…";
    P.villageWrap.hidden = false; P.cardsWrap.hidden = true;
    try {
      const { createVillage } = await import("./village.js");
      S.village = await createVillage(P.stage, { onEnter: enterBuilding, onEncounter: openEncounter });
      S.village.setStates(buildingStates(S.opts, modeFn));
      S.village.setSeason(S.ch.turn % 4);
      S.village.setEncounter(S.enc && !S.enc.done ? S.enc.cell : null);
      P.vHint.textContent = "마을을 걸어 건물 문 앞에 서면 들어갈 수 있어요. 길 위의 ✦ 표식도 밟아 보세요.";
    } catch (e) {
      console.warn("마을 모드를 불러오지 못했어요", e);
      S.villageFailed = true; S.mode = "card";
      P.notice.append(h("p", { class: "warn" }, "마을 화면을 불러오지 못해서 카드 화면으로 보여 드려요."));
    }
  }
  const village = S.mode === "village" && !!S.village;
  P.villageWrap.hidden = !village;
  P.cardsWrap.hidden = village;
  P.modeBtns.forEach((b) => { const on = b.dataset.mode === S.mode; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
  if (S.villageFailed) P.modeBar.hidden = true;
  renderEncBox();
}

function enterBuilding(id) {
  const P = S.play, ch = S.ch, age = C.START + ch.turn * C.STEP;
  if (id === "home") {
    const gain = Math.max(0, C.REST + ch.season.restPlus + ENV_RESOURCE[S.env.resource].restDelta);
    openSheet([
      interiorSvg("home"),
      h("div", {}, h("p", { class: "eyebrow" }, `${age}세 · 쉼터`), h("h2", {}, "잠시 쉬어 갈까요?")),
      h("p", { class: "small muted" }, `이번 해를 쉬면서 보내요. 마음 +${gain}`),
      h("div", { class: "btn-row" },
        h("button", { class: "btn", type: "button", onclick: () => { closeSheet(); doRest(); } }, "쉬어 가요"),
        h("button", { class: "btn ghost", type: "button", onclick: closeSheet }, "돌아가기"))]);
    return;
  }
  if (!S.opts.includes(id)) {
    P.vHint.textContent = `${id} 건물은 올해 문이 닫혀 있어요. 올해 열린 건물만 들어갈 수 있어요.`;
    return;
  }
  const inf = info(ch, id, age), kind = GAME_OF[id];
  const tag = inf.mode === "route" ? "순풍" : inf.mode === "open" ? "열린 길" : inf.mode === "aux" ? "보조 ×0.85" : `낯선 길 ${ch.pioneer[id]}/${openNeed(ch)}`;
  openSheet([
    interiorSvg(id),
    h("div", {}, h("p", { class: "eyebrow" }, `${age}세 · ${id}`), h("h2", {}, `${id}에 들어갈까요?`)),
    h("p", { class: "small muted" }, ACTION_TEXT[id]),
    questLine(id, inf),
    h("div", { class: "act-meta" },
      h("span", { class: "tag " + inf.mode }, tag), h("span", {}, `마음 −${inf.cost}`),
      h("span", {}, `${GAME_NAME[kind]} · ${LEVEL_NAME[inf.level]}`),
      inf.peak ? h("span", { style: "color:var(--warn)" }, "전성기 ×1.3") : null),
    h("div", { class: "btn-row" },
      h("button", { class: "btn", type: "button", onclick: () => openGame(id, inf, age) }, "들어가기"),
      h("button", { class: "btn ghost", type: "button", onclick: closeSheet }, "돌아가기"))]);
}

// ---- 사건과 낯선 길 퀘스트 ----
function newEncounter() {
  S.enc = { ev: rollEncounter(S.ch, S.rng), cell: pickEncounterCell(S.rng), done: false };
}

function hintOf(ev, c) {
  const bits = [], e = c.gamble ? c : c;
  if (e.mind) bits.push(`마음 ${e.mind > 0 ? "+" : "−"}${Math.abs(e.mind)}`);
  if (ev.field && (e.xp || c.gamble)) bits.push(`${ev.field} 성취`);
  if (c.pioneer && ev.field && !S.ch.route.includes(ev.field) && !S.ch.opened.has(ev.field)) bits.push("낯선 길 +1");
  if (c.gamble) bits.push("운에 달렸어요");
  return bits.join(" · ") || "아무 일도 일어나지 않아요";
}

function renderEncBox() {
  const P = S.play, e = S.enc;
  const show = e && !e.done && S.mode === "card";
  P.encBox.hidden = !show;
  P.encBox.textContent = "";
  if (!show) return;
  P.encBox.append(h("b", {}, "✦ 길에서 만난 일"), h("p", { class: "small" }, e.ev.text),
    h("button", { class: "btn ghost", type: "button", onclick: openEncounter }, "살펴보기"));
}

function openEncounter() {
  const e = S.enc;
  if (!e || e.done) return;
  const ev = e.ev;
  openSheet([
    h("div", {}, h("p", { class: "eyebrow" }, ev.field ? `✦ ${ev.field}와 닿은 일` : "✦ 길에서 만난 일"), h("h2", {}, "어떻게 할까요?")),
    h("p", {}, ev.text),
    h("div", { class: "enc-choices" }, ev.choices.map((c, i) =>
      h("button", { class: "enc-choice", type: "button", onclick: () => chooseEncounter(i) }, c.label, h("small", {}, hintOf(ev, c)))))]);
}

function chooseEncounter(i) {
  const e = S.enc, before = S.ch.mind;
  const r = resolveEncounter(S.ch, e.ev, i, S.rng);
  e.done = true;
  openSheet([
    h("div", {}, h("p", { class: "eyebrow" }, "✦ 길에서 만난 일")),
    h("div", {}, h("div", { class: "gain" }, r.xp > 0 ? `+${r.xp.toFixed(0)}` : r.mind > 0 ? `마음 +${r.mind}` : "…"),
      h("p", { class: "muted", style: "margin-top:8px" }, `마음 ${before} → ${S.ch.mind}${r.xp > 0 ? ` · 성취 +${r.xp.toFixed(0)}` : ""}`)),
    h("ul", { class: "log", "aria-live": "polite" }, r.log.map((l) => h("li", { class: l.t }, l.s))),
    h("button", { class: "btn", type: "button", onclick: () => { closeSheet(); renderPlay(true); } }, "계속 걸어요")]);
}

function questLine(id, inf) {
  if (inf.easy) return null;
  const need = openNeed(S.ch), q = questView(S.ch, id, need), next = q.stages[q.done];
  return h("div", { class: "q-note" },
    h("b", {}, `${q.title} ${q.done}/${need}`), next ? ` · 다음 이야기: ${next.title}` : "",
    inf.gritUse ? " · 굳은살이 있어 마음이 1 덜 들어요" : " · 잘 안 돼도 이야기는 이어져요");
}

function renderJournal() {
  const P = S.play, ch = S.ch, need = openNeed(ch);
  P.journal.textContent = "";
  FIELDS.filter((f) => !ch.route.includes(f)).forEach((f) => {
    const q = questView(ch, f, need);
    P.journal.append(h("div", { class: "q-card" },
      h("div", { class: "q-head" }, h("b", {}, `${f} · ${q.title}`),
        h("span", { class: "small muted" }, q.open ? "길이 열렸어요" : `${q.done}/${need}${ch.grit[f] ? ` · 굳은살 ${ch.grit[f]}` : ""}`)),
      h("ul", { class: "q-steps" }, q.stages.map((st) => h("li", { class: st.state },
        h("span", {}, st.state === "done" ? "✓" : st.state === "now" ? "▸" : "·"),
        h("span", {}, st.title, st.log ? h("small", {}, st.log.text) : null))))));
  });
}
