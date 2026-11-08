// 엔딩 9종. 위에서부터 먼저 걸리는 조건으로 판정한다(judge 참고).
import { FIELDS } from "./data.js";

export const ENDINGS = {
  wind: { title: "순풍의 삶", hint: "타고난 루트에서 가장 높은 성취를 이룬다", text: (c) => `타고난 결을 따라 [${c.top}] 분야에서 깊이 자리 잡았어요. 큰 저항 없이 오래 달린 만큼, 중간에 기웃거린 길이 있었다면 어땠을지 궁금해지기도 해요.` },
  pioneer: { title: "개척자의 삶", hint: "루트 밖 분야를 열어 가장 높은 성취를 이룬다", text: (c) => `정해진 길이 아닌 [${c.top}] 분야에서 길을 직접 열어 냈어요. 같은 시간에 더 많이 힘들었지만, 그 길은 이제 온전히 당신의 것이에요.` },
  twopaths: { title: "두 길을 걸은 사람", hint: "루트 한 분야와 개척한 분야 둘 다 높이 쌓는다", text: (c) => `주어진 길 [${c.route1}]과 스스로 연 길 [${c.open1}]을 함께 걸었어요. 어느 쪽도 버리지 않은 삶은 두 배로 바빴지만 두 배로 넓어요.` },
  master: { title: "한 우물", hint: "한 분야가 전체 성취의 72% 이상을 차지한다", text: (c) => `[${c.top}] 한 분야에 삶의 대부분을 쏟았어요. 깊이만큼은 누구에게도 뒤지지 않아요. 좁지만 깊게 판 우물에서 물이 솟아요.` },
  late: { title: "늦게 핀 꽃", hint: "후반부에 성취가 크게 몰린다", text: () => "초반에는 더디고 돌아가는 것처럼 보였어요. 하지만 쌓아 둔 것들이 뒤늦게 서로 이어지면서 인생의 후반이 가장 환해졌어요." },
  rebel: { title: "운명을 거스른 사람", hint: "타고난 루트를 거의 쓰지 않고도 높은 성취를 이룬다", text: () => "타고난 경사를 거의 밟지 않고, 오르막만 골라 걸었어요. 사주가 가리킨 방향과는 다른 곳에서, 노력만으로 만든 삶이에요." },
  burnout: { title: "타버린 불꽃", hint: "마음이 바닥난 채로 행동한 적이 3번 이상", text: () => "쉬지 못한 채 달려온 시간이 쌓였어요. 어떤 길이든 쉬어 가는 칸이 있어야 끝까지 갈 수 있어요." },
  calm: { title: "잔잔한 삶", hint: "총 성취가 낮은 채로 여러 분야를 거닌다", text: () => "큰 파도는 없었지만, 쉬어 가며 자기 속도로 걸어왔어요. 한 가지에 깊이 닿지는 못했어도 이 삶에도 고유한 결이 있어요." },
  drift: { title: "표류하는 삶", hint: "어느 분야도 깊게 쌓지 못한다 (최고 분야 성취 40 미만)", text: () => "여러 길을 기웃거렸지만 어느 분야에도 깊이 닿지 못했어요. 개척에는 문턱이 있어서, 한 길을 몇 번 반복해야 열려요." },
};
export const ENDING_ORDER = ["wind", "pioneer", "twopaths", "master", "late", "rebel", "burnout", "calm", "drift"];

export function judge(ch) {
  const total = FIELDS.reduce((s, f) => s + ch.xp[f], 0);
  const sorted = FIELDS.slice().sort((a, b) => ch.xp[b] - ch.xp[a]);
  const top = sorted[0], second = sorted[1];
  const nonRoute = FIELDS.filter((f) => !ch.route.includes(f)).reduce((s, f) => s + ch.xp[f], 0);
  const ctx = { top, route1: null, open1: null, total };
  const twoR = [top, second].find((f) => ch.route.includes(f));
  const twoO = [top, second].find((f) => ch.opened.has(f));
  let key;
  if (ch.burnTurns >= 3) key = "burnout";
  else if (total >= 140 && nonRoute / total >= 0.85) key = "rebel";
  else if (total >= 150 && ch.xp[top] / total >= 0.72) key = "master";
  else if (total >= 130 && ch.late / Math.max(1, ch.early + ch.late) >= 0.65) key = "late";
  else if (total >= 130 && ch.xp[top] >= 55 && ch.xp[second] >= 55 && twoR && twoO) { key = "twopaths"; ctx.route1 = twoR; ctx.open1 = twoO; }
  else if (ch.xp[top] < 40) key = "drift";
  else if (total < 130) key = "calm";
  else if (ch.route.includes(top)) key = "wind";
  else if (ch.opened.has(top)) key = "pioneer";
  else key = "wind";
  return { key, title: ENDINGS[key].title, text: ENDINGS[key].text(ctx), total, top };
}
