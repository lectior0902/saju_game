// 화면 아래에서 올라오는 시트(미니게임, 결과). 닫을 때 진행 중인 타이머를 정리한다.
import { $, h } from "./dom.js";
import { S } from "./state.js";

export function openSheet(content) {
  const ov = $("overlay");
  ov.textContent = "";
  ov.append(h("div", { class: "sheet", role: "dialog", "aria-modal": "true" }, content));
  ov.hidden = false;
  document.body.classList.add("lock");
}

export function closeSheet() {
  if (S.cleanup) { S.cleanup(); S.cleanup = null; }
  const ov = $("overlay");
  ov.hidden = true; ov.textContent = "";
  document.body.classList.remove("lock");
}
