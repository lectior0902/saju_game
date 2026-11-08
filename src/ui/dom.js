// 작은 DOM 도구. 프레임워크 없이 화면을 만든다.
export const $ = (id) => document.getElementById(id);

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, val] of Object.entries(props || {})) {
    if (val === false || val == null) continue;
    if (k === "class") el.className = val;
    else if (k === "style") el.style.cssText = val;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), val);
    else el.setAttribute(k, val === true ? "" : val);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export function sv(tag, props, ...kids) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, val] of Object.entries(props || {})) el.setAttribute(k, val);
  for (const kid of kids) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

export const v = (name) => `var(${name})`;

export function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function show(id) {
  for (const s of document.querySelectorAll(".screen")) s.hidden = s.id !== id;
  window.scrollTo(0, 0);
}
