# 사주 루트

태어난 때가 만든 경사를 따라 걸을지, 거슬러 오를지 고르는 인생 시뮬레이션 게임이에요. 사주(오행 분포)로 유형을 정하고, 월·시로 변주를 주고, 가정 형편·사는 곳이라는 출발 환경을 더해요. 분야를 고를 때마다 미니게임을 하고, 14턴(18~57세) 뒤 엔딩 9개 중 하나로 끝나요.

핵심 메시지는 "경향일 뿐, 선택과 환경이 함께 결과를 만든다"예요. 오락용이며 실제 운세가 아니에요.

## 빠른 시작

```
npm install
npm run dev        # 개발 서버 (http://localhost:5173)
npm test           # 단일 파일 빌드 후 테스트 54개
npm run build      # 배포용 정적 파일 → dist/
npm run preview    # 빌드 결과 로컬 확인
npm run sim        # 플레이 방식·환경별 밸런스 시뮬레이션 표
```

Node 22에서 확인했어요. 배포 방법은 [docs/DEPLOY.md](docs/DEPLOY.md), 규칙과 밸런스는 [docs/design.md](docs/design.md)를 보세요.

## 폴더 구조

```
saju-route/
├─ index.html                 진입 문서(시작 화면 마크업, 메타 태그)
├─ src/
│  ├─ core/                   게임 규칙. DOM에 의존하지 않는 순수 함수
│  │  ├─ data.js              간지·유형·계절·시간대·환경 데이터 표
│  │  ├─ saju.js              간지 계산, 오행 분포, 유형·변주 분류
│  │  ├─ rules.js             밸런스 상수(C), 행동·휴식·한 해 마무리, 환경 효과
│  │  ├─ events.js            마을 사건 15종(선택지, 운에 맡기는 선택, 결과 판정)
│  │  ├─ quests.js            낯선 길 퀘스트 이야기(분야별 4단계, 성공·실패 문장)
│  │  ├─ endings.js           엔딩 9종 정의와 판정
│  │  └─ index.js             위 모듈 재수출
│  ├─ ui/                     화면. 프레임워크 없이 DOM으로 구성
│  │  ├─ main.js              앱 진입점(화면 이동 연결)
│  │  ├─ start.js reveal.js play.js ending.js   네 화면
│  │  ├─ village.js           마을 모드(Phaser). 처음 열 때만 불러옴, 실패하면 카드 모드
│  │  ├─ village-logic.js     마을 지도·길찾기·건물 상태(순수 함수, 테스트 대상)
│  │  ├─ minigames.js         거래 타이밍, 서가 짝 맞추기, 영감 조각 모으기, 서류 분류, 마음 맞추기, 정밀 조립
│  │  ├─ interior.js          건물 안 풍경 삽화(분야별 SVG)
│  │  ├─ terrain.js           경사 지도(SVG)
│  │  ├─ sheet.js dom.js state.js constants.js  시트, DOM 도구, 공유 상태, 문구 상수
│  ├─ styles/main.css         토큰 기반 스타일(다크·라이트 모두)
│  └─ entry-web.js            배포용 진입(폰트 자체 호스팅 + 스타일 + 앱)
├─ public/                    파비콘, PWA 매니페스트, 아이콘, robots.txt
├─ scripts/
│  ├─ sim.mjs                 밸런스 시뮬레이션(테스트도 사용)
│  ├─ build-single.mjs        단일 HTML 두 종류 생성(dist-single/)
│  └─ make-icons.py           PWA 아이콘 생성
├─ reference/                 Python 기준 구현(saju.py)과 대조 픽스처 생성기
├─ tests/                     node:test. 분류기 대조, 규칙, 시뮬레이션, UI 스모크
├─ docs/                      design.md(규칙·밸런스), DEPLOY.md(배포 가이드)
├─ .github/workflows/deploy.yml   GitHub Pages 자동 배포
├─ netlify.toml               Netlify 설정과 기본 보안 헤더
└─ vite.config.js
```

## 빌드 결과물

| 명령 | 결과 | 용도 |
|---|---|---|
| `npm run build` | `dist/` | 정식 배포용. 폰트 자체 호스팅, 파일명 해시, PWA 매니페스트 포함 |
| `npm run build:single` | `dist-single/index.html` | 파일 하나로 어디든 올리는 용도. 폰트는 Google Fonts 링크 |
| 위와 같음 | `dist-single/artifact.html` | claude.ai 아티팩트용 조각 |

## 규칙을 바꿀 때

1. 숫자는 `src/core/rules.js`의 `C`와 `src/core/data.js`의 표에 모여 있어요.
2. `npm run sim`으로 엔딩 분포와 환경별 평균을 확인해요.
3. `npm test`가 9개 엔딩의 도달 가능성, 환경 격차의 범위(3~20%), Python 기준 구현과의 일치를 검사해요.
4. `docs/design.md`의 표를 같이 갱신해요.

## 마을 모드

플레이 화면의 [마을/카드] 토글로 바꿔요. 마을에서는 캐릭터를 걸어 건물 문 앞에 서면 들어가는 확인 창이 뜨고, 이후는 카드 모드와 같은 미니게임 흐름이에요. 그림은 모두 코드로 그려서 외부 이미지가 없어요. 조작은 화면 탭(자동 길찾기), 방향키/WASD, 터치 화면의 십자 버튼이에요. Phaser 3.90.0을 쓰고, 정식 빌드에서는 별도 파일(약 340KB gzip)로 나뉘어 마을 모드를 열 때만 내려받아요. 불러오지 못하면 카드 모드로 대체돼요.

## 사건과 낯선 길 퀘스트

- **길에서 만난 일**: 해마다 마을 길 위에 ✦ 표식이 하나 나타나요. 밟으면 선택지가 뜨고(안전한 쪽, 힘을 더 쓰는 쪽, 운에 맡기는 쪽, 지나치기), 결과는 마음과 해당 분야 성취, 낯선 길 개척 포인트에 반영돼요. 사건을 다 챙기면 총 성취가 평균 약 14% 늘어요(시뮬레이션).
- **낯선 길 퀘스트**: 루트 밖 분야에서 행동할 때마다 분야별 이야기가 한 단계씩 이어져요. 미니게임에서 0등급이 나와도 이야기는 이어지고, 굳은살이 쌓여 다음 행동의 마음 비용이 1 줄어요. 화면 아래 "낯선 길 일지"에서 볼 수 있어요.

## 한계

- 절기를 날짜로 근사해서 절기 당일 전후 하루는 틀릴 수 있어요.
- 유형별 루트, 전성기, 계절 퍽, 환경 효과는 게임용 가정이에요. 명리학이나 사회과학의 정설이 아니에요.
- 마을 모드는 Chromium(데스크톱 크기와 폰 크기)에서 탭 이동·진입·미니게임·다음 해 흐름을 확인했어요. 실제 폰 기기와 Safari는 아직 못 봤어요.
- 미니게임은 jsdom으로 조작 흐름만 검증했어요. 실제 손맛은 기기에서 확인이 필요해요.
