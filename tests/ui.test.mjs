// 빌드된 단일 HTML(dist-single/index.html)을 jsdom에서 실제로 조작해 본다. `npm test`가 먼저 build:single을 실행한다.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";

const html = fs.readFileSync(new URL("../dist-single/index.html", import.meta.url), "utf8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function boot() {
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: "dangerously", pretendToBeVisual: true, url: "https://example.com/",
    beforeParse(w) { w.scrollTo = () => {}; w.addEventListener("error", (e) => errors.push(e.message)); },
  });
  const w = dom.window, d = w.document;
  const $ = (s) => d.querySelector(s), $$ = (s) => [...d.querySelectorAll(s)];
  const click = (el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  const visible = (id) => !d.getElementById(id).hidden;
  const submit = () => d.getElementById("birth-form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  const fill = ({ y = "1999", m = "3", d: day = "14", h = "6", r = "", g = "" } = {}) => {
    $("#inY").value = y; $("#inM").value = m; $("#inD").value = day; $("#inH").value = h; $("#inR").value = r; $("#inG").value = g;
  };
  return { w, d, $, $$, click, visible, submit, fill, errors };
}

test("시작 화면에 입력칸과 환경 선택이 있다", () => {
  const t = boot();
  assert.ok(t.visible("scr-start"));
  assert.equal(t.$$("#inH option").length, 13);
  assert.equal(t.$$("#inR option").length, 4); // 무작위 + 3
  assert.equal(t.$$("#inG option").length, 4);
  assert.match(t.$("#dex-count").textContent, /0 \/ 9/);
});

test("잘못된 날짜는 막는다", () => {
  const t = boot();
  t.fill({ m: "2", d: "30" }); t.submit();
  assert.ok(t.visible("scr-start"));
  assert.match(t.$("#form-err").textContent, /없어요/);
  t.fill({ y: "1800" }); t.submit();
  assert.match(t.$("#form-err").textContent, /1900/);
});

test("사주 공개 화면: 여덟 글자, 변주, 선택한 환경이 보인다", () => {
  const t = boot();
  t.fill({ r: "tight", g: "rural" }); t.submit();
  assert.ok(t.visible("scr-reveal"));
  assert.equal(t.$$(".pillar").length, 4);
  assert.match(t.$(".variant").textContent, /봄에 난 새벽형/);
  assert.equal(t.$$(".ebar span").length, 5);
  const text = t.$("#scr-reveal").textContent;
  assert.match(text, /빠듯/); assert.match(text, /외곽·농촌/);
  assert.match(text, /쉬어도 회복 -4/);
  assert.equal(t.$$(".t-name").length, 6);
});

test("외곽 환경은 매 턴 분야 3개, 대도시는 5개를 보여 준다", () => {
  for (const [g, n] of [["rural", 3], ["metro", 5], ["town", 4]]) {
    const t = boot();
    t.fill({ g }); t.submit();
    t.click(t.$$("#scr-reveal .btn")[0]);
    assert.ok(t.visible("scr-play"));
    assert.equal(t.$$(".act").length, n, `${g}`);
  }
});

test("처음부터 엔딩까지: 미니게임 2종 실제 조작, 쉬기, 환경 요약, 도감, 다시 하기", async () => {
  const t = boot();
  t.fill({ r: "tight", g: "rural" }); t.submit();
  t.click(t.$$("#scr-reveal .btn")[0]);
  const next = () => t.click(t.$(".sheet .btn"));
  const played = { timing: false, memory: false };
  let turns = 0, rested = false;

  while (t.visible("scr-play") && turns < 20) {
    turns++;
    const acts = t.$$(".act");
    const pickBy = (fields) => acts.find((a) => fields.includes(a.querySelector(".act-name").textContent));
    const timing = !played.timing && pickBy(["사업"]);
    const memory = !played.memory && pickBy(["학문"]);
    if (turns === 2 && !rested) { t.click(t.$(".rest-btn")); rested = true; assert.ok(t.$(".gain")); next(); continue; }
    if (timing) {
      played.timing = true; t.click(timing);
      for (let i = 0; i < 3; i++) { t.click(t.$(".stage .btn.big")); await sleep(20); }
      await sleep(800);
    } else if (memory) {
      played.memory = true; t.click(memory);
      await sleep(2000);
      const cards = t.$$(".mcard"), groups = {};
      cards.forEach((c, i) => (groups[c.textContent] ||= []).push(i));
      for (const idxs of Object.values(groups)) for (const i of idxs) { t.click(cards[i]); await sleep(5); }
      await sleep(700);
    } else {
      t.click(acts[0]);
      assert.ok(!t.$("#overlay").hidden, "미니게임 시트가 열려야 한다");
      t.click(t.$(".linkish")); // 건너뛰기
    }
    assert.ok(t.$(".gain"), `턴 ${turns}: 결과 시트`);
    next();
    if (t.visible("scr-end")) break;
  }
  assert.ok(played.timing && played.memory, "두 미니게임을 모두 조작했다");
  assert.ok(t.visible("scr-end"), "엔딩 화면에 도달");
  assert.equal(t.$$(".dex-item").length, 9);
  assert.equal(t.$$(".dex-item.got").length, 1);
  assert.equal(JSON.parse(t.w.localStorage.getItem("saju-route-dex")).length, 1);
  const end = t.$("#scr-end").textContent;
  assert.match(end, /환경이 만든 차이/); assert.match(end, /빠듯, 외곽·농촌/);
  assert.match(end, /마음을 \d+만큼 더 썼어요|환경 때문에/);

  // 같은 사주·환경으로 다시
  t.click(t.$$("#scr-end .btn")[0]);
  assert.ok(t.visible("scr-play")); assert.ok(t.$(".age").textContent.startsWith("18"));
  assert.match(t.$(".env-line").textContent, /빠듯/);
  assert.deepEqual(t.errors, []);
});

test("환경만 바꿔서 다시 하면 환경이 달라진다", async () => {
  const t = boot();
  t.fill({ r: "tight", g: "rural" }); t.submit();
  t.click(t.$$("#scr-reveal .btn")[0]);
  // 엔딩까지 빠르게(모두 건너뛰기)
  for (let i = 0; i < 14; i++) {
    t.click(t.$$(".act")[0]); t.click(t.$(".linkish")); t.click(t.$(".sheet .btn"));
  }
  assert.ok(t.visible("scr-end"));
  const before = t.$(".env-line") ? null : null;
  t.click(t.$$("#scr-end .btn")[1]); // 환경만 바꿔서 다시
  assert.ok(t.visible("scr-play"));
  const line = t.$(".env-line").textContent;
  assert.ok(!(/빠듯/.test(line) && /외곽·농촌/.test(line)), `환경이 그대로: ${line}`);
  assert.deepEqual(t.errors, []);
});

test("길에서 만난 일: 카드 모드에 배너가 뜨고, 선택하면 결과가 나오고, 해마다 새 사건이 생긴다", async () => {
  const t = boot();
  t.fill({}); t.submit();
  t.click(t.$$("#scr-reveal .btn")[0]);
  // jsdom에는 캔버스가 없어 마을이 실패하고 카드 모드로 돌아온다(비동기)
  await sleep(800);
  const banner = () => t.$(".enc-banner");
  assert.ok(banner() && !banner().hidden, "사건 배너");
  t.click(banner().querySelector(".btn"));
  const choices = t.$$(".enc-choice");
  assert.equal(choices.length, 3);
  t.click(choices[2]); // 지나친다
  assert.ok(t.$(".gain"), "결과 시트");
  t.click(t.$(".sheet .btn")); // 계속 걸어요
  assert.ok(banner().hidden, "해결한 사건 배너는 숨겨진다");
  // 한 해를 넘기면 새 사건
  t.click(t.$(".rest-btn")); t.click(t.$(".sheet .btn"));
  assert.ok(!banner().hidden, "다음 해의 새 사건");
  assert.deepEqual(t.errors.filter((e) => !/getContext|fillStyle|canvas/i.test(String(e))), []);
});

test("낯선 길 일지: 루트 밖 분야마다 카드가 있고 단계 목록이 있다", () => {
  const t = boot();
  t.fill({}); t.submit();
  t.click(t.$$("#scr-reveal .btn")[0]);
  const cards = t.$$(".q-card");
  assert.ok(cards.length >= 4 && cards.length <= 5, `${cards.length}`);
  assert.ok(cards[0].querySelectorAll(".q-steps li").length >= 3);
});
