import { analyze, rollEnv, ENV_RESOURCE, ENV_REGION } from "../core/index.js";
import { $, h, show } from "./dom.js";
import { HOURS } from "./constants.js";
import { S } from "./state.js";
import { renderReveal } from "./reveal.js";

export function initForm() {
  const mSel = $("inM"), dSel = $("inD"), hSel = $("inH"), rSel = $("inR"), gSel = $("inG");
  for (let m = 1; m <= 12; m++) mSel.append(h("option", { value: m }, `${m}월`));
  for (let d = 1; d <= 31; d++) dSel.append(h("option", { value: d }, `${d}일`));
  for (const [val, name] of HOURS) hSel.append(h("option", { value: val }, name));
  rSel.append(h("option", { value: "" }, "무작위"));
  for (const [k, e] of Object.entries(ENV_RESOURCE)) rSel.append(h("option", { value: k }, e.name));
  gSel.append(h("option", { value: "" }, "무작위"));
  for (const [k, e] of Object.entries(ENV_REGION)) gSel.append(h("option", { value: k }, e.name));
  mSel.value = "3"; dSel.value = "14"; hSel.value = "6";

  $("birth-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const y = parseInt($("inY").value, 10), m = parseInt(mSel.value, 10), d = parseInt(dSel.value, 10);
    const hour = hSel.value === "" ? null : parseInt(hSel.value, 10);
    const err = $("form-err");
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (!(y >= 1900 && y <= 2030)) { err.textContent = "태어난 해는 1900년부터 2030년 사이로 넣어 주세요."; return; }
    if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) { err.textContent = `${y}년 ${m}월에는 ${d}일이 없어요.`; return; }
    err.textContent = "";
    S.birth = { y, m, d, hour };
    S.r = analyze(y, m, d, hour);
    S.env = rollEnv(Math.random, { resource: rSel.value || undefined, region: gSel.value || undefined });
    renderReveal();
    show("scr-reveal");
  });
}
