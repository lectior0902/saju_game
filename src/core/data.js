// 게임 데이터 테이블. 규칙(숫자)은 rules.js, 판정은 endings.js에 둔다.
export const STEMS = "갑을병정무기경신임계";
export const BRANCHES = "자축인묘진사오미신유술해";
export const STEM_EL = ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"];
export const BRANCH_EL = ["수", "토", "목", "목", "토", "화", "화", "토", "금", "금", "토", "수"];
export const ELEMENTS = ["목", "화", "토", "금", "수"]; // 상생 순서

// [월, 일, 월주 인덱스]. 0=인월(입춘~), 11=축월(소한~). 절기는 매년 같은 날짜로 근사한 값.
export const TERMS = [[1, 6, 11], [2, 4, 0], [3, 6, 1], [4, 5, 2], [5, 6, 3], [6, 6, 4],
  [7, 7, 5], [8, 8, 6], [9, 8, 7], [10, 8, 8], [11, 8, 9], [12, 7, 10]];

export const FIELDS = ["학문", "창작", "사업", "조직", "관계", "기술"];

export const TYPES = {
  mok: { name: "목 중심 개척가", desc: "뻗어 나가려는 기운이 강해요. 새로 시작하는 일에 힘이 붙어요.", route: ["사업", "창작"], peak: [30, 34] },
  hwa: { name: "화 중심 표현가", desc: "드러내고 전하려는 기운이 강해요. 사람 앞에서 빛나요.", route: ["창작", "관계"], peak: [27, 31] },
  to: { name: "토 중심 조율가", desc: "중심을 잡고 품는 기운이 강해요. 사이를 이어 주는 자리에 어울려요.", route: ["조직", "관계"], peak: [40, 49] },
  geum: { name: "금 중심 결단가", desc: "자르고 다듬는 기운이 강해요. 기준이 분명한 일에서 성과가 나요.", route: ["조직", "기술"], peak: [36, 41] },
  su: { name: "수 중심 탐색가", desc: "스며들고 파고드는 기운이 강해요. 깊이 파는 일에서 길이 열려요.", route: ["학문", "기술"], peak: [45, 49] },
  balance: { name: "균형형 조정자", desc: "한쪽으로 쏠림이 적어요. 어느 길이든 갈 수 있지만 뚜렷한 바람은 없어요.", route: ["학문", "사업"], peak: [40, 45] },
  weak: { name: "신약 협력가", desc: "내 기운보다 바깥 기운이 강해요. 좋은 사람과 환경을 만나면 크게 커요.", route: ["관계", "학문"], peak: [50, 57] },
  strong: { name: "신강 독립가", desc: "내 기운이 넘쳐요. 남의 밑보다 스스로 판을 짜는 쪽이 맞아요.", route: ["사업", "조직"], peak: [30, 39] },
};

// 계절 변주: 전성기 이동(shift)과 고유 퍽
export const SEASONS = {
  spring: { name: "봄", shift: -3, perk: "일찍 피는 기질. 낯선 길이 열리는 데 필요한 개척 포인트 -1", openDelta: -1, gainMult: 1, costPlus: 0, goodPlus: 0, restPlus: 0 },
  summer: { name: "여름", shift: 0, perk: "뜨거운 기질. 성취 ×1.1, 대신 행동마다 마음 소모 +1", openDelta: 0, gainMult: 1.1, costPlus: 1, goodPlus: 0, restPlus: 0 },
  autumn: { name: "가을", shift: 3, perk: "거두는 기질. 좋은 사건이 생길 확률 +10%p", openDelta: 0, gainMult: 1, costPlus: 0, goodPlus: 0.1, restPlus: 0 },
  winter: { name: "겨울", shift: 6, perk: "늦게 피는 기질. 전성기가 6년 늦지만 쉬면 마음이 +8 더 돌아와요", openDelta: 0, gainMult: 1, costPlus: 0, goodPlus: 0, restPlus: 8 },
};

// 시간대 변주: 유형 루트 밖에서 효율 0.85배로 맞는 보조 분야 후보(루트와 겹치면 다음 후보)
export const TIMES = {
  night: { name: "심야형", aux: ["학문", "창작", "기술"] },
  dawn: { name: "새벽형", aux: ["기술", "학문", "조직"] },
  noon: { name: "한낮형", aux: ["사업", "조직", "기술"] },
  eve: { name: "저녁형", aux: ["관계", "창작", "사업"] },
};

// 출발 환경: 사주와 별개로, 본인이 고르지 않은 구조적 조건.
// 효과는 모두 '비용과 선택지'로만 표현한다. 어떤 환경도 성취의 상한을 막지 않는다.
// allDelta: 모든 행동의 마음 소모 보정, offDelta: 루트 밖(낯선 길·보조 분야)에서 추가 보정
export const ENV_RESOURCE = {
  rich: { name: "넉넉", desc: "실패해도 되는 여유와 배울 기회가 가까이 있어요.", startMind: 85, allDelta: 0, offDelta: -1, restDelta: 0,
    effect: "시작 마음 85 · 낯선 길과 보조 분야의 마음 소모 -1" },
  mid: { name: "보통", desc: "특별히 유리하지도 불리하지도 않아요.", startMind: 80, allDelta: 0, offDelta: 0, restDelta: 0,
    effect: "시작 마음 80 · 추가 보정 없음" },
  tight: { name: "빠듯", desc: "생계와 시행착오에 쓸 여유가 적어서, 쉬어도 덜 회복돼요.", startMind: 75, allDelta: 1, offDelta: 1, restDelta: -4,
    effect: "시작 마음 75 · 모든 행동의 마음 소모 +1(낯선 길과 보조 분야는 +2) · 쉬어도 회복 -4" },
};
// routeMissP: 타고난 루트 분야가 이번 턴 선택지에 아예 없을 확률(가까이에 그 길의 기회가 없는 해)
export const ENV_REGION = {
  metro: { name: "대도시권", desc: "모임, 일자리, 배울 곳이 가까이 있어요.", options: 5, routeMissP: 0, effect: "매 턴 분야 5개 제시" },
  town: { name: "중소도시", desc: "보통 수준의 기회가 가까이 있어요.", options: 4, routeMissP: 0, effect: "매 턴 분야 4개 제시" },
  rural: { name: "외곽·농촌", desc: "가까이 닿는 기회가 적어요. 대신 지역 지원 제도를 만날 수 있어요.", options: 3, routeMissP: 0.25, effect: "매 턴 분야 3개 제시 · 4번에 1번쯤 타고난 루트 분야가 선택지에 없어요" },
};
// 불리한 쪽 환경 하나당 매 턴 지원 제도를 만날 확률. 만나면 마음 +10.
export const SUPPORT_P = 0.10;
export const SUPPORT_MIND = 10;
