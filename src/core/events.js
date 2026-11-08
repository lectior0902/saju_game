// 마을에서 마주치는 사건. 해마다 길 위에 표식이 하나 나타나고, 밟으면 선택지가 뜬다.
// 선택지는 안전한 것, 힘을 더 쓰는 것, 운에 맡기는 것(gamble), 그냥 지나치는 것으로 섞여 있다.
// 보상은 일부러 작다: 한 해의 본 행동(미니게임)보다 크지 않게, 끝까지 다 챙겨도 총 성취가 15~20% 안쪽으로 늘게 맞췄다.
import { FIELDS } from "./data.js";
import { bumpPioneer, C } from "./rules.js";

// field: 사건이 걸린 분야(null이면 분야 없는 일상 사건). 보상 xp는 그 분야에 쌓인다.
// 선택지: { label, s(결과 문장), mind, xp, pioneer, gamble: { p, ok:{s,mind,xp,pioneer}, bad:{...} } }
export const EVENTS = [
  { id: "bookshop", field: "학문", text: "길가 헌책방 앞에서 오래 묵은 책 한 권이 눈에 들어온다.", choices: [
    { label: "서서 끝까지 읽는다", mind: -3, xp: 3, pioneer: 1, s: "한 시간이 훌쩍 갔지만 머릿속에 줄거리가 남았다." },
    { label: "한 권만 사 간다", mind: -1, xp: 2, s: "가방이 조금 무거워졌다. 오늘 밤에 읽을 책이다." },
    { label: "지나친다", s: "다음에 다시 오겠다고 생각하며 걸었다." } ] },
  { id: "seminar", field: "학문", text: "벽보에 작은 공개 세미나 공지가 붙어 있다. 오늘 저녁이다.", choices: [
    { label: "질문을 준비해 간다", mind: -4, xp: 2, pioneer: 1, gamble: { p: 0.5, ok: { s: "질문이 좋았다는 말을 들었다.", xp: 5 }, bad: { s: "질문이 빗나갔다. 얼굴이 붉어졌다.", mind: -4 } } },
    { label: "뒷자리에서 듣기만 한다", mind: -1, xp: 1, s: "받아 적은 메모가 쓸 만하다." },
    { label: "지나친다", s: "공지를 사진으로만 남겼다." } ] },
  { id: "painter", field: "창작", text: "광장 모퉁이에서 누군가 즉석 그림을 그리고 있다. 붓 하나를 내민다.", choices: [
    { label: "한 획 보탠다", mind: -2, xp: 2, pioneer: 1, s: "내 획이 그림에 남았다. 이상하게 뿌듯하다." },
    { label: "내 스케치를 보여 준다", mind: -3, gamble: { p: 0.5, ok: { s: "칭찬이 쏟아졌다.", xp: 5 }, bad: { s: "조용히 고개만 끄덕였다. 마음이 가라앉았다.", mind: -4 } } },
    { label: "지나친다", s: "구경하다 돌아섰다." } ] },
  { id: "busker", field: "창작", text: "골목에서 버스킹이 한창이다. 관객 한 명이 빠진 자리가 비어 있다.", choices: [
    { label: "끝까지 듣고 노트에 적는다", mind: -1, xp: 2, s: "가사 한 줄이 떠올랐다." },
    { label: "함께 박자를 맞춘다", mind: -3, xp: 3, pioneer: 1, s: "손뼉이 어색했지만 곧 박자에 올라탔다." },
    { label: "지나친다", s: "노래가 한참 따라왔다." } ] },
  { id: "stall", field: "사업", text: "시장 한쪽 좌판이 비어 있다. 주인이 오늘 하루만 자리를 빌려 주겠다고 한다.", choices: [
    { label: "작게 펼쳐 본다", mind: -4, xp: 2, pioneer: 1, gamble: { p: 0.5, ok: { s: "의외로 잘 팔렸다.", xp: 5 }, bad: { s: "하루 종일 한 개도 못 팔았다.", mind: -4 } } },
    { label: "주인의 장사법을 곁에서 본다", mind: -1, xp: 2, s: "값 부르는 타이밍이 귀에 남았다." },
    { label: "지나친다", s: "발걸음을 돌렸다." } ] },
  { id: "invoice", field: "사업", text: "단골 가게 사장이 장부 정리를 도와 달라고 부탁한다.", choices: [
    { label: "꼼꼼히 정리해 준다", mind: -3, xp: 3, pioneer: 1, s: "사장이 수고비로 간식을 쥐여 주었다." },
    { label: "빠르게 끝낸다", mind: -1, xp: 1, s: "대충이지만 제때 끝냈다." },
    { label: "바쁘다고 거절한다", s: "미안하지만 오늘은 어렵다고 말했다." } ] },
  { id: "meeting", field: "조직", text: "주민센터 앞에서 마을 회의 참가자를 구하고 있다.", choices: [
    { label: "서기를 맡는다", mind: -3, xp: 3, pioneer: 1, s: "받아 적은 기록이 회의 결론이 되었다." },
    { label: "의견만 낸다", mind: -2, xp: 2, s: "한마디가 안건에 올랐다." },
    { label: "지나친다", s: "게시판의 안건만 훑어보았다." } ] },
  { id: "queue", field: "조직", text: "긴 줄이 엉켜 있다. 직원 한 명이 줄 정리를 도와 달라고 손짓한다.", choices: [
    { label: "도와 정리한다", mind: -2, xp: 2, pioneer: 1, s: "질서가 잡히자 직원이 고개를 숙였다." },
    { label: "순서를 새로 짜자고 제안한다", mind: -3, gamble: { p: 0.5, ok: { s: "제안이 받아들여졌다.", xp: 5 }, bad: { s: "더 엉켜 버렸다.", mind: -4 } } },
    { label: "지나친다", s: "내 줄에만 집중했다." } ] },
  { id: "neighbor", field: "관계", text: "이웃이 무거운 짐을 들고 계단 앞에서 멈춰 서 있다.", choices: [
    { label: "같이 들어 준다", mind: -2, xp: 2, pioneer: 1, s: "차 한 잔 마시고 가라는 말을 들었다." },
    { label: "안부만 묻는다", mind: -1, xp: 1, s: "웃음이 오갔다." },
    { label: "지나친다", s: "발걸음이 조금 무거웠다." } ] },
  { id: "party", field: "관계", text: "작은 모임에서 한 사람이 혼자 서 있다. 눈이 마주친다.", choices: [
    { label: "먼저 말을 건다", mind: -3, xp: 2, pioneer: 1, gamble: { p: 0.5, ok: { s: "대화가 오래 이어졌다.", xp: 5 }, bad: { s: "서로 어색한 침묵만 남았다.", mind: -4 } } },
    { label: "가볍게 목례한다", mind: -1, xp: 1, s: "눈인사로도 충분했다." },
    { label: "지나친다", s: "음료만 받아 들고 나왔다." } ] },
  { id: "bike", field: "기술", text: "길가에 체인이 빠진 자전거가 서 있다. 주인이 난감한 표정이다.", choices: [
    { label: "직접 고쳐 본다", mind: -3, xp: 3, pioneer: 1, gamble: { p: 0.6, ok: { s: "체인이 딱 맞물렸다.", xp: 4 }, bad: { s: "기름만 잔뜩 묻혔다.", mind: -3 } } },
    { label: "공구함을 빌려 준다", mind: -1, xp: 1, s: "주인이 알아서 해결했다." },
    { label: "지나친다", s: "자전거가 눈에 오래 남았다." } ] },
  { id: "radio", field: "기술", text: "수리점 앞에 고장 난 라디오가 쌓여 있다. 주인이 \"한번 열어 볼래?\" 하고 묻는다.", choices: [
    { label: "뚜껑을 열어 본다", mind: -3, xp: 3, pioneer: 1, s: "납땜 자국을 따라가며 구조가 보이기 시작했다." },
    { label: "곁에서 구경한다", mind: -1, xp: 1, s: "주인의 손놀림이 인상적이었다." },
    { label: "지나친다", s: "라디오 소리가 한참 귓가에 남았다." } ] },
  { id: "bench", field: null, text: "벤치에 앉은 노인이 옆자리를 두드린다. \"잠깐 앉았다 가요.\"", choices: [
    { label: "앉아서 이야기를 듣는다", mind: 5, s: "옛 이야기를 듣다 보니 마음이 풀렸다." },
    { label: "잠깐 인사만 한다", mind: 2, s: "따뜻한 인사를 받았다." },
    { label: "지나친다", s: "노인의 손짓이 한참 마음에 남았다." } ] },
  { id: "cat", field: null, text: "길고양이가 다리에 몸을 비빈다.", choices: [
    { label: "쓰다듬는다", mind: 4, s: "고양이가 꼬리를 말며 가르랑거렸다." },
    { label: "간식을 나눠 준다", mind: 3, s: "고양이가 순식간에 먹고 사라졌다." },
    { label: "지나친다", s: "고양이가 따라오다 멈췄다." } ] },
  { id: "rain", field: null, text: "갑자기 소나기가 쏟아진다. 처마 밑에 낯선 사람과 나란히 서게 되었다.", choices: [
    { label: "비가 그칠 때까지 기다린다", mind: 3, s: "빗소리를 들으며 숨을 골랐다." },
    { label: "그냥 뛴다", mind: -2, gamble: { p: 0.5, ok: { s: "곧 비가 그쳐 맞은 만큼 개운했다.", mind: 5 }, bad: { s: "흠뻑 젖어 한기가 들었다.", mind: -3 } } },
    { label: "지나친다", s: "우산을 쓰고 걸었다." } ] },
];

/** 이번 해에 나타날 사건 하나. 이미 본 사건은 되도록 피하고, 절반쯤은 타고난 루트 분야와 닿아 있다. */
export function rollEncounter(ch, rng) {
  ch.seenEvents ||= new Set();
  let pool = EVENTS.filter((e) => !ch.seenEvents.has(e.id));
  if (pool.length < 4) { ch.seenEvents.clear(); pool = EVENTS.slice(); }
  const preferRoute = rng() < 0.5;
  const sub = pool.filter((e) => e.field === null ? false : preferRoute === ch.route.includes(e.field));
  const mix = rng() < 0.2 ? pool.filter((e) => e.field === null) : sub;
  const from = mix.length ? mix : pool;
  const ev = from[Math.floor(rng() * from.length)];
  ch.seenEvents.add(ev.id);
  return ev;
}

function applyEffect(ch, ev, e, log) {
  const f = ev.field;
  if (e.mind) ch.mind = Math.max(0, Math.min(100, ch.mind + e.mind));
  if (e.xp && f) { ch.xp[f] += e.xp; if (ch.turn < Math.ceil(14 / 2)) ch.early += e.xp; else ch.late += e.xp; }
  if (e.pioneer && f && !ch.route.includes(f) && !ch.opened.has(f)) { const o = bumpPioneer(ch, f); log.push({ t: o ? "open" : "info", s: o ? `[${f}] 분야에 길이 열렸어요.` : `낯선 길을 한 걸음 걸었어요. 개척 포인트 ${ch.pioneer[f]}` }); }
}

/** 선택지를 고른 결과. 반환: { log, mind(변화량), xp(변화량) } */
export function resolveEncounter(ch, ev, idx, rng) {
  const c = ev.choices[idx], log = [];
  const m0 = ch.mind, x0 = FIELDS.reduce((a, f) => a + ch.xp[f], 0);
  if (c.gamble) {
    applyEffect(ch, ev, { mind: c.mind, xp: c.xp, pioneer: c.pioneer }, log);
    const win = rng() < c.gamble.p, o = win ? c.gamble.ok : c.gamble.bad;
    applyEffect(ch, ev, o, log);
    log.unshift({ t: win ? "good" : "bad", s: o.s });
  } else {
    applyEffect(ch, ev, c, log);
    log.unshift({ t: "info", s: c.s });
  }
  ch.encounters = (ch.encounters || 0) + 1;
  return { log, mind: ch.mind - m0, xp: FIELDS.reduce((a, f) => a + ch.xp[f], 0) - x0 };
}

/** 시뮬레이션용: 정책에 따라 선택지를 고른다 */
export function chooseEncounter(ev, how, rng) {
  if (how === "random") return Math.floor(rng() * ev.choices.length);
  // best: 마음을 쓰는 만큼 얻는 것이 큰 쪽(기대값)
  const score = (c) => {
    const ex = (o) => (o.xp || 0) * 1.2 + (o.mind || 0) * 0.3 + (o.pioneer || 0) * 0.8;
    return c.gamble ? ex(c) + c.gamble.p * ex(c.gamble.ok) + (1 - c.gamble.p) * ex(c.gamble.bad) : ex(c);
  };
  return ev.choices.reduce((b, c, i) => (score(c) > score(ev.choices[b]) ? i : b), 0);
}
