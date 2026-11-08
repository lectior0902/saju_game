"""사주 입력 -> 오행 분포 -> 유형 분류 프로토타입.

주의: 절기 경계는 매년 같은 날짜로 근사한 값이라 경계일 전후 하루는 틀릴 수 있다.
게임용 프로토타입이며, 정확한 만세력이 필요하면 절기 시각 테이블로 교체할 것.
"""
from datetime import date

STEMS = "갑을병정무기경신임계"
BRANCHES = "자축인묘진사오미신유술해"
STEM_EL = ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"]
BRANCH_EL = ["수", "토", "목", "목", "토", "화", "화", "토", "금", "금", "토", "수"]
ELEMENTS = ["목", "화", "토", "금", "수"]  # 상생 순서

# (월, 일, 월주 인덱스) — 인덱스 0=인월(입춘~), 11=축월(소한~)
TERMS = [(1, 6, 11), (2, 4, 0), (3, 6, 1), (4, 5, 2), (5, 6, 3), (6, 6, 4),
         (7, 7, 5), (8, 8, 6), (9, 8, 7), (10, 8, 8), (11, 8, 9), (12, 7, 10)]

FIELDS = ["학문", "창작", "사업", "조직", "관계", "기술"]

# 유형별 정의: 이름, 설명, 유리한 루트(분야 2개), 전성기 나이대
TYPES = {
    "mok":   dict(name="목 중심 개척가", desc="뻗어 나가려는 기운이 강하다. 새로 시작하는 일에 힘이 붙는다.",
                  route=["사업", "창작"], peak="30대 초반"),
    "hwa":   dict(name="화 중심 표현가", desc="드러내고 전하려는 기운이 강하다. 사람 앞에서 빛난다.",
                  route=["창작", "관계"], peak="20대 후반"),
    "to":    dict(name="토 중심 조율가", desc="중심을 잡고 품는 기운이 강하다. 사이를 이어 주는 자리에 어울린다.",
                  route=["조직", "관계"], peak="40대"),
    "geum":  dict(name="금 중심 결단가", desc="자르고 다듬는 기운이 강하다. 기준이 분명한 일에서 성과가 난다.",
                  route=["조직", "기술"], peak="30대 후반"),
    "su":    dict(name="수 중심 탐색가", desc="스며들고 파고드는 기운이 강하다. 깊이 파는 일에서 길이 열린다.",
                  route=["학문", "기술"], peak="40대 후반"),
    "balance": dict(name="균형형 조정자", desc="한쪽으로 쏠림이 적다. 어느 길이든 갈 수 있지만 뚜렷한 바람은 없다.",
                    route=["학문", "사업"], peak="40대"),
    "weak":  dict(name="신약 협력가", desc="내 기운보다 바깥 기운이 강하다. 좋은 사람과 환경을 만나면 크게 큰다.",
                  route=["관계", "학문"], peak="50대"),
    "strong": dict(name="신강 독립가", desc="내 기운이 넘친다. 남의 밑보다 스스로 판을 짜는 쪽이 맞다.",
                   route=["사업", "조직"], peak="30대"),
}


# 전성기 기본 구간(나이). 계절 변주로 이동한다.
PEAK_BASE = {"mok": (30, 34), "hwa": (27, 31), "to": (40, 49), "geum": (36, 41),
             "su": (45, 49), "balance": (40, 45), "weak": (50, 57), "strong": (30, 39)}

# 월지 -> 계절 변주: 전성기 이동(shift)과 고유 퍽
SEASONS = {
    "spring": dict(name="봄", shift=-3, perk="일찍 피는 기질: 낯선 길이 열리는 데 필요한 개척 포인트 -1"),
    "summer": dict(name="여름", shift=0, perk="뜨거운 기질: 성취 ×1.1, 대신 행동당 마음 소모 +1"),
    "autumn": dict(name="가을", shift=3, perk="거두는 기질: 좋은 사건 확률 +10%p"),
    "winter": dict(name="겨울", shift=6, perk="늦게 피는 기질: 전성기가 6년 늦지만 휴식 회복 +8"),
}
# 시지 -> 시간대 변주: 유형 루트 외에 효율 0.85배로 잘 맞는 '보조 분야' 후보
TIMES = {
    # 후보를 3개씩 둬서 어떤 2개짜리 루트와 겹쳐도 보조 분야가 하나는 남는다
    "night": dict(name="심야형", aux=["학문", "창작", "기술"]),
    "dawn":  dict(name="새벽형", aux=["기술", "학문", "조직"]),
    "noon":  dict(name="한낮형", aux=["사업", "조직", "기술"]),
    "eve":   dict(name="저녁형", aux=["관계", "창작", "사업"]),
}


def season_of(month_branch):
    mi = (month_branch - 2) % 12
    return ["spring", "summer", "autumn", "winter"][mi // 3]


def time_of(hour_branch):
    if hour_branch in (0, 1):
        return "night"
    if hour_branch in (2, 3, 4):
        return "dawn"
    if hour_branch in (5, 6, 7):
        return "noon"
    return "eve"


def peak_window(type_key, season_key):
    lo, hi = PEAK_BASE[type_key]
    s = SEASONS[season_key]["shift"]
    lo = max(21, min(lo + s, 51))
    hi = max(lo + 3, min(hi + s, 60))
    return lo, hi


def day_index(y, m, d):
    return (date(y, m, d) - date(1900, 1, 1)).days  # 1900-01-01 = 갑술일


def pillars(y, m, d, hour=None):
    """(년주, 월주, 일주, 시주) 각각 (천간idx, 지지idx). 시를 모르면 시주는 None."""
    py = y if (m, d) >= (2, 4) else y - 1
    ys, yb = (py - 4) % 10, (py - 4) % 12
    mi = 10
    for tm, td, idx in TERMS:
        if (m, d) >= (tm, td):
            mi = idx
    ms = (((ys % 5) * 2 + 2) + mi) % 10
    mb = (2 + mi) % 12
    n = day_index(y, m, d)
    ds, db = n % 10, (10 + n) % 12
    hp = None
    if hour is not None:
        hb = ((hour + 1) // 2) % 12
        hs = ((ds % 5) * 2 + hb) % 10
        hp = (hs, hb)
    return (ys, yb), (ms, mb), (ds, db), hp


def label(p):
    return None if p is None else STEMS[p[0]] + BRANCHES[p[1]]


def analyze(y, m, d, hour=None):
    yp, mp, dp, hp = pillars(y, m, d, hour)
    tally = {e: 0.0 for e in ELEMENTS}
    for p in (yp, mp, dp, hp):
        if p is None:
            continue
        tally[STEM_EL[p[0]]] += 1
        tally[BRANCH_EL[p[1]]] += 1
    tally[BRANCH_EL[mp[1]]] += 1.5  # 월지는 계절을 결정하므로 가중
    total = sum(tally.values())
    share = {e: tally[e] / total for e in ELEMENTS}

    dm = STEM_EL[dp[0]]
    i = ELEMENTS.index(dm)
    support = share[dm] + share[ELEMENTS[(i - 1) % 5]]  # 비견·겁재 + 인성
    top = max(ELEMENTS, key=lambda e: share[e])

    if support >= 0.62:
        key = "strong"
    elif support <= 0.28:
        key = "weak"
    elif share[top] < 0.36:
        key = "balance"
    else:
        key = {"목": "mok", "화": "hwa", "토": "to", "금": "geum", "수": "su"}[top]

    season_key = season_of(mp[1])
    time_key = time_of(hp[1]) if hp is not None else None
    route = TYPES[key]["route"]
    aux = None
    if time_key:
        aux = next(f for f in TIMES[time_key]["aux"] if f not in route)
    lo, hi = peak_window(key, season_key)
    variant = (SEASONS[season_key]["name"] + "에 난 "
               + (TIMES[time_key]["name"] + " " if time_key else "") + TYPES[key]["name"])

    return dict(
        pillars=[label(yp), label(mp), label(dp), label(hp)],
        day_master=STEMS[dp[0]] + "(" + dm + ")",
        share=share, support=support, type_key=key, type=TYPES[key],
        season_key=season_key, season=SEASONS[season_key],
        time_key=time_key, time=TIMES[time_key] if time_key else None,
        aux=aux, peak=(lo, hi), variant=variant,
    )


if __name__ == "__main__":
    import sys
    if len(sys.argv) >= 4:
        y, m, d = map(int, sys.argv[1:4])
        h = int(sys.argv[4]) if len(sys.argv) > 4 else None
        r = analyze(y, m, d, h)
        print("사주:", " ".join(p or "??" for p in r["pillars"]), "| 일간:", r["day_master"])
        print("오행:", {k: round(v, 2) for k, v in r["share"].items()}, "| 일간 지지율:", round(r["support"], 2))
        print("유형:", r["type"]["name"], "-", r["type"]["desc"])
        print("변주:", r["variant"])
        print("계절 퍽:", r["season"]["perk"])
        print("유리한 루트:", " / ".join(r["type"]["route"]),
              "| 보조 분야:", r["aux"] or "없음(시를 모름)",
              "| 전성기: %d~%d세" % r["peak"])
    else:
        print("사용법: python saju.py 1999 3 14 [시(0-23)]")
