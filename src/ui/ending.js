// 엔딩 화면: 판정 결과, 분야별 성취, 환경이 만든 차이, 도감.
import { judge, FIELDS, ENDINGS, ENDING_ORDER, C, modeOf, rollEnv, ENV_RESOURCE, ENV_REGION } from "../core/index.js";
import { $, h, v, show } from "./dom.js";
import { FIELD_VAR } from "./constants.js";
import { S, nav, saveDex, paintDexCount } from "./state.js";
import { chipField } from "./reveal.js";

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

export function renderEnding() {
  const { ch, r, env } = S, res = judge(ch), el = $("scr-end");
  el.textContent = "";
  const isNew = !S.dex.has(res.key);
  S.dex.add(res.key);
  saveDex();
  const opened = [...ch.opened];
  const rs = ENV_RESOURCE[env.resource], rg = ENV_REGION[env.region];

  el.append(
    h("div", { style: "display:grid;gap:12px" },
      h("span", { class: "stamp" }, isNew ? "새 엔딩" : "다시 만난 엔딩"),
      h("p", { class: "eyebrow" }, `${C.END}세까지의 기록 · ${r.variant}`),
      h("h2", { class: "end-title" }, res.title),
      h("p", {}, res.text)),
    h("dl", { class: "facts", style: "margin:0" },
      h("div", { class: "fact" }, h("dt", {}, "가장 깊은 길"), h("dd", {}, chipField(res.top, `${ch.xp[res.top].toFixed(0)}점`))),
      h("div", { class: "fact" }, h("dt", {}, "새로 연 길"), h("dd", {}, opened.length ? h("div", { class: "chips" }, opened.map((f) => chipField(f))) : h("span", { class: "muted" }, "없어요"))),
      h("div", { class: "fact" }, h("dt", {}, "총 성취"), h("dd", {}, `${res.total.toFixed(0)}점`))),
    h("div", { class: "xp-list" }, FIELDS.slice().sort((a, b) => ch.xp[b] - ch.xp[a]).map((f) => {
      const m = modeOf(ch, f);
      return h("div", { class: "xp-row", style: "grid-template-columns:3em 1fr 6em" }, h("span", {}, f),
        h("div", { class: "xp-bar" }, h("i", { style: `width:${Math.min(100, ch.xp[f] / 1.6)}%;background:${v(FIELD_VAR[f])}` })),
        h("span", { class: "xp-num" }, `${ch.xp[f].toFixed(0)} ${m === "route" ? "루트" : m === "open" ? "개척" : m === "aux" ? "보조" : ""}`));
    })),
    h("div", { style: "display:grid;gap:6px" },
      h("p", { class: "sub-head" }, `환경이 만든 차이 · ${rs.name}, ${rg.name}`),
      h("dl", { class: "facts", style: "margin:0" }, envSummary(ch))),
    h("div", { style: "display:grid;gap:10px" },
      h("h3", { class: "sec-title" }, `엔딩 도감 ${S.dex.size} / ${ENDING_ORDER.length}`),
      h("div", { class: "dex" }, ENDING_ORDER.map((k) => {
        const got = S.dex.has(k);
        return h("div", { class: "dex-item " + (got ? "got" : "lock") + (k === res.key ? " now" : "") },
          h("b", {}, got ? ENDINGS[k].title : "???"), h("span", {}, ENDINGS[k].hint));
      }))),
    h("div", { class: "btn-row" },
      h("button", { class: "btn", type: "button", onclick: () => nav.startRun() }, "같은 사주·환경으로 다시"),
      h("button", { class: "btn ghost", type: "button", onclick: rerollEnv }, "환경만 바꿔서 다시"),
      h("button", { class: "btn ghost", type: "button", onclick: () => { paintDexCount(); show("scr-start"); } }, "다른 사주 넣기")),
    h("p", { class: "note" }, "사주는 출발선의 경향일 뿐이에요. 같은 선택도 환경에 따라 드는 비용이 달라요. 이 결말은 어느 길을 골랐는지, 어떤 환경에서 걸었는지, 미니게임 솜씨가 함께 만들었어요."));
}

function rerollEnv() {
  const cur = S.env;
  let next = cur;
  for (let i = 0; i < 20 && next.resource === cur.resource && next.region === cur.region; i++) next = rollEnv(Math.random);
  S.env = next;
  nav.startRun();
}
