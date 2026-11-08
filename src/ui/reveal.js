// 사주 공개 화면: 여덟 글자, 오행 분포, 변주, 출발 환경, 경사 지도.
import { newChar, ELEMENTS, STEMS, BRANCHES, STEM_EL, BRANCH_EL, ENV_RESOURCE, ENV_REGION } from "../core/index.js";
import { $, h, v, show } from "./dom.js";
import { EL_VAR, FIELD_VAR } from "./constants.js";
import { S, nav } from "./state.js";
import { makeTerrain } from "./terrain.js";

function pillarCard(label, p, me) {
  return h("div", { class: "pillar" + (me ? " me" : "") },
    h("div", { class: "p-label" }, me ? `${label} · 나` : label),
    p
      ? [h("div", { class: "p-stem", style: `color:${v(EL_VAR[STEM_EL[p[0]]])}` }, STEMS[p[0]]),
        h("div", { class: "p-branch", style: `color:${v(EL_VAR[BRANCH_EL[p[1]]])}` }, BRANCHES[p[1]]),
        h("div", { class: "p-el" }, `${STEM_EL[p[0]]} · ${BRANCH_EL[p[1]]}`)]
      : [h("div", { class: "p-stem muted" }, "–"), h("div", { class: "p-branch muted" }, "–"), h("div", { class: "p-el" }, "시를 몰라요")]);
}

export function chipField(f, extra) {
  return h("span", { class: "chip" }, h("i", { class: "dot", style: `background:${v(FIELD_VAR[f])}` }), f, extra ? ` ${extra}` : "");
}

/** 사주 풀이 섹션들(여덟 글자, 오행, 루트·보조·전성기·계절, 출발 환경). 사주 공개 화면과 플레이 화면 아래 설명이 같이 쓴다. */
export function sajuSections() {
  const { r, env } = S;
  const res = ENV_RESOURCE[env.resource], reg = ENV_REGION[env.region];
  const [yp, mp, dp, hp] = r.pillars;
  return [
    h("div", { style: "display:grid;gap:8px" },
      h("p", { class: "eyebrow" }, `${S.birth.y}.${S.birth.m}.${S.birth.d} · 일간 ${r.dayMaster}`),
      h("h2", { class: "variant" }, r.variant),
      h("p", { class: "lede" }, r.type.desc)),
    h("div", { class: "pillars", role: "group", "aria-label": "사주 여덟 글자" },
      pillarCard("시주", hp), pillarCard("일주", dp, true), pillarCard("월주", mp), pillarCard("년주", yp)),
    h("div", { style: "display:grid;gap:10px" },
      h("div", { class: "ebar", role: "img", "aria-label": "오행 분포" },
        ELEMENTS.map((e) => h("span", { style: `flex:${r.share[e]};background:${v(EL_VAR[e])}` }))),
      h("div", { class: "legend" },
        ELEMENTS.map((e) => h("span", {}, h("i", { class: "dot", style: `background:${v(EL_VAR[e])}` }), `${e} ${Math.round(r.share[e] * 100)}%`)))),
    h("dl", { class: "facts", style: "margin:0" },
      h("div", { class: "fact" }, h("dt", {}, "타고난 루트"), h("dd", {}, h("div", { class: "chips" }, r.type.route.map((f) => chipField(f, "효율 100%"))))),
      h("div", { class: "fact" }, h("dt", {}, "보조 분야"), h("dd", {}, r.aux
        ? h("div", { class: "chips" }, chipField(r.aux, "효율 85%"), h("span", { class: "small muted", style: "align-self:center" }, `${r.time.name}이라서`))
        : h("span", { class: "muted" }, "태어난 시간을 넣지 않아서 없어요"))),
      h("div", { class: "fact" }, h("dt", {}, "전성기"), h("dd", {}, `${r.peak[0]}~${r.peak[1]}세 · 이때 루트 분야는 ×1.3`)),
      h("div", { class: "fact" }, h("dt", {}, `${r.season.name}의 기질`), h("dd", {}, r.season.perk))),
    h("div", { style: "display:grid;gap:6px" },
      h("p", { class: "sub-head" }, "출발 환경 · 사주와 별개로, 내가 고르지 않은 조건"),
      h("dl", { class: "facts", style: "margin:0" },
        h("div", { class: "fact" }, h("dt", {}, "가정 형편"), h("dd", {}, `${res.name}. ${res.desc}`, h("span", { class: "small muted" }, res.effect))),
        h("div", { class: "fact" }, h("dt", {}, "사는 곳"), h("dd", {}, `${reg.name}. ${reg.desc}`, h("span", { class: "small muted" }, reg.effect)))))];
}

export function renderReveal() {
  const { r, env } = S, el = $("scr-reveal");
  el.textContent = "";
  const terr = makeTerrain();
  terr.update(newChar(r, env));
  el.append(
    ...sajuSections(),
    h("div", { class: "terrain-box" }, terr.el,
      h("p", { class: "map-cap" }, "낮은 곳이 수월한 길이에요. 높은 곳으로 가려면 더 힘이 들지만, 같은 길을 네 번쯤 오르면 길이 열려요.")),
    h("div", { class: "btn-row" },
      h("button", { class: "btn", type: "button", onclick: () => nav.startRun() }, "이 사주로 인생 시작"),
      h("button", { class: "btn ghost", type: "button", onclick: () => show("scr-start") }, "다시 입력")),
    h("p", { class: "note" }, "경향일 뿐이에요. 루트를 벗어나도 되고, 대신 더 많이 힘들어요."));
}
