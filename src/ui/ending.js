// 엔딩 화면: 도트 그림 → 제목 → 숫자 요약 → 삶의 흐름 → 시기별 풀이 → 총평 → 다시 하기 → 상세(분야별, 환경, 도감).
import { judge, FIELDS, ENDINGS, ENDING_ORDER, C, modeOf, rollEnv, ENV_RESOURCE, ENV_REGION, readLife } from "../core/index.js";
import { $, h, v, show } from "./dom.js";
import { FIELD_VAR, EL_VAR } from "./constants.js";
import { S, nav, saveDex, paintDexCount } from "./state.js";
import { endingCanvas } from "./ending-art.js";

const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `${n}` : "0");

function envSummary(ch) {
  const mind = Math.round(ch.envMind);
  const opts = ch.envOptions;
  return [
    h("div", { class: "fact" }, h("dt", {}, "마음"), h("dd", {},
      mind === 0 ? "환경 때문에 달라진 마음 소모는 없어요." : `환경 때문에 마음을 ${Math.abs(mind)}만큼 ${mind > 0 ? "더" : "덜"} 썼어요.`)),
    h("div", { class: "fact" }, h("dt", {}, "선택지"), h("dd", {},
      opts === 0 ? "기본 4개와 같았어요." : `기본 4개보다 누적 ${signed(opts)}개 ${opts > 0 ? "많았어요" : "적었어요"}.`,
      ch.routeMisses ? h("span", { class: "small muted" }, `타고난 루트 분야가 선택지에 없던 해가 ${ch.routeMisses}번 있었어요.`) : null)),
    h("div", { class: "fact" }, h("dt", {}, "지원"), h("dd", {},
      ch.support ? `지역 지원 제도를 ${ch.support}번 만났어요.` : "지원 제도를 만나지 못했어요.")),
  ];
}

/** 삶의 흐름: 한 해가 한 칸. 높이는 그해의 성취, 색은 분야, 쉰 해는 달 모양. */
function flowStrip(rd) {
  const MAXG = 26;
  const cols = rd.timeline.map((e) => {
    const tip = e.kind === "rest" ? `${e.age}세 · 쉬어 간 해`
      : `${e.age}세 · ${e.field}(${rd.mode[e.mode]}) +${e.gain.toFixed(0)}${e.opened ? " · 길이 열림" : ""}${e.burn ? " · 지쳐서 성과 절반" : ""}`;
    const bar = e.kind === "rest"
      ? h("i", { class: "fl-rest", "aria-hidden": "true" }, "☾")
      : h("i", { class: "fl-bar" + (e.mode === "off" || e.mode === "aux" ? " hard" : ""), style: `height:${Math.max(8, Math.min(100, (e.gain / MAXG) * 100))}%;background:${v(FIELD_VAR[e.field])}` });
    return h("div", { class: "fl-col", title: tip, "aria-label": tip, role: "img" },
      h("span", { class: "fl-mark" }, e.opened ? "★" : e.burn ? "!" : ""), h("div", { class: "fl-track" }, bar), h("span", { class: "fl-age" }, e.age));
  });
  const used = [...new Set(rd.timeline.filter((e) => e.kind === "act").map((e) => e.field))];
  return h("div", { class: "flow" },
    h("div", { class: "fl-cols" }, cols),
    h("div", { class: "fl-legend" },
      used.map((f) => h("span", {}, h("i", { class: "dot", style: `background:${v(FIELD_VAR[f])}` }), f)),
      h("span", {}, "☾ 쉼"), h("span", {}, "★ 길이 열림"), h("span", {}, "! 지쳐서 성과 절반")),
    h("p", { class: "small muted" }, "줄무늬가 있는 막대는 루트 밖(낯선 길·보조)에서 힘을 쓴 해예요. 숫자는 나이예요."));
}

export function renderEnding() {
  const { ch, r, env } = S, res = judge(ch), el = $("scr-end");
  el.textContent = "";
  const isNew = !S.dex.has(res.key);
  S.dex.add(res.key);
  saveDex();
  const rd = readLife(ch, res, r);
  const rs = ENV_RESOURCE[env.resource], rg = ENV_REGION[env.region];

  el.append(
    h("div", { class: "end-hero" },
      endingCanvas(res.key),
      h("span", { class: "stamp end-stamp" }, isNew ? "새 엔딩" : "다시 만난 엔딩")),
    h("div", { style: "display:grid;gap:8px" },
      h("p", { class: "eyebrow" }, `${C.START}~${C.END}세의 인생 풀이 · ${r.variant}`),
      h("h2", { class: "end-title" }, res.title),
      h("p", { class: "end-headline" }, rd.headline),
      h("p", {}, res.text)),
    h("div", { class: "stat-grid" }, rd.stats.map((s) => h("div", { class: "stat" }, h("span", { class: "stat-v" }, s.value), h("span", { class: "stat-l" }, s.label)))),
    h("section", { class: "end-sec" }, h("h3", { class: "sec-title" }, "삶의 흐름"), flowStrip(rd)),
    h("section", { class: "end-sec" }, h("h3", { class: "sec-title" }, "시기별 풀이"),
      h("div", { class: "eras" }, rd.eras.map((e) => h("div", { class: "era" + (e.strongest ? " best" : "") },
        h("div", { class: "era-top" }, h("b", {}, e.name), h("span", { class: "small muted" }, e.range), h("span", { class: "era-tag " + e.tone }, e.tag),
          e.strongest ? h("span", { class: "era-best" }, "가장 빛난 시기") : null),
        h("p", { class: "era-motto", title: e.motto.gloss }, h("b", {}, `${e.motto.kr}(${e.motto.hanja})`), h("span", {}, e.motto.gloss)),
        h("p", {}, e.text))))),
    h("section", { class: "end-sec" }, h("h3", { class: "sec-title" }, "인생의 세운"),
      h("p", { class: "small muted" }, "삶의 결을 바꾼 해를 뽑았어요."),
      h("ol", { class: "years" }, rd.years.map((y) => h("li", { class: "yr " + y.kind }, h("b", {}, y.label), h("span", {}, y.text))))),
    rd.hook ? h("section", { class: "end-sec" }, h("h3", { class: "sec-title" }, rd.hook.title), h("p", { class: "hook" }, rd.hook.text)) : null,
    h("section", { class: "end-sec" }, h("h3", { class: "sec-title" }, "기운의 쓰임"),
      h("div", { class: "el-rows" }, rd.balance.rows.map((row) => h("div", { class: "el-row" },
        h("span", { class: "el-name" }, `${row.el}(${row.hanja})`),
        row.innate != null ? h("div", { class: "el-bar", "aria-label": `타고난 ${row.innate}%` }, h("i", { class: "innate", style: `width:${row.innate}%;background:${v(EL_VAR[row.el])}` })) : null,
        h("div", { class: "el-bar", "aria-label": `쓴 ${row.used}%` }, h("i", { style: `width:${row.used}%;background:${v(EL_VAR[row.el])}` })),
        h("span", { class: "el-num small muted" }, row.innate != null ? `${row.innate}% → ${row.used}%` : `${row.used}%`)))),
      h("p", { class: "small muted" }, "위 막대는 타고난 오행, 아래 막대는 이번 생에 쓴 기운이에요."),
      ...rd.balance.lines.map((l) => h("p", {}, l)),
      h("p", { class: "small muted" }, `${rd.balance.lack.el}(${rd.balance.lack.hanja}) — ${rd.balance.lack.hint}.`)),
    h("section", { class: "end-sec" }, h("h3", { class: "sec-title" }, "총평"),
      h("ul", { class: "overall" }, rd.overall.map((s) => h("li", {}, s))),
      h("blockquote", { class: "advice" }, h("b", {}, "풀이 한마디"), h("p", {}, rd.advice))),
    h("div", { class: "btn-row" },
      h("button", { class: "btn", type: "button", onclick: () => nav.startRun() }, "같은 사주·환경으로 다시"),
      h("button", { class: "btn ghost", type: "button", onclick: rerollEnv }, "환경만 바꿔서 다시"),
      h("button", { class: "btn ghost", type: "button", onclick: () => { paintDexCount(); show("scr-start"); } }, "다른 사주 넣기")),
    h("section", { class: "end-sec" }, h("h3", { class: "sec-title" }, "분야별 성취"),
      h("div", { class: "xp-list" }, FIELDS.slice().sort((a, b) => ch.xp[b] - ch.xp[a]).map((f) => {
        const m = modeOf(ch, f);
        return h("div", { class: "xp-row", style: "grid-template-columns:3em 1fr 6em" }, h("span", {}, f),
          h("div", { class: "xp-bar" }, h("i", { style: `width:${Math.min(100, ch.xp[f] / 1.6)}%;background:${v(FIELD_VAR[f])}` })),
          h("span", { class: "xp-num" }, `${ch.xp[f].toFixed(0)} ${m === "route" ? "루트" : m === "open" ? "개척" : m === "aux" ? "보조" : ""}`));
      }))),
    h("section", { class: "end-sec" }, h("p", { class: "sub-head" }, `환경이 만든 차이 · ${rs.name}, ${rg.name}`),
      h("dl", { class: "facts", style: "margin:0" }, envSummary(ch))),
    h("section", { class: "end-sec" },
      h("h3", { class: "sec-title" }, `엔딩 도감 ${S.dex.size} / ${ENDING_ORDER.length}`),
      h("div", { class: "dex" }, ENDING_ORDER.map((k) => {
        const got = S.dex.has(k);
        return h("div", { class: "dex-item " + (got ? "got" : "lock") + (k === res.key ? " now" : "") },
          got ? endingCanvas(k) : h("div", { class: "end-art lockbox" }, "?"),
          h("b", {}, got ? ENDINGS[k].title : "???"), h("span", {}, ENDINGS[k].hint));
      }))),
    h("p", { class: "note" }, "사주는 출발선의 경향일 뿐이에요. 이 풀이는 이번 판의 기록(어느 길을 골랐는지, 어떤 환경에서 걸었는지, 미니게임 솜씨)으로 만든 게임 속 해석이고, 실제 운세가 아니에요."));
}

function rerollEnv() {
  const cur = S.env;
  let next = cur;
  for (let i = 0; i < 20 && next.resource === cur.resource && next.region === cur.region; i++) next = rollEnv(Math.random);
  S.env = next;
  nav.startRun();
}
