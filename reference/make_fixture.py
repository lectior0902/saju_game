"""Python 기준 구현(saju.py)으로 대조용 픽스처를 만든다.
JS 코어(src/core/saju.js)가 이 결과와 같은지 tests/saju.test.mjs가 확인한다.
실행: python3 reference/make_fixture.py"""
import json, random, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from saju import analyze

random.seed(20261108)
cases = []
for _ in range(400):
    y, m, d = random.randint(1920, 2025), random.randint(1, 12), random.randint(1, 28)
    h = None if random.random() < 0.2 else random.randint(0, 23)
    r = analyze(y, m, d, h)
    cases.append(dict(y=y, m=m, d=d, hour=h, labels=[p or "-" for p in r["pillars"]], type=r["type_key"],
                      season=r["season_key"], time=r["time_key"] or "-", aux=r["aux"] or "-", peak=list(r["peak"])))
# 절기 경계 근처(근사 규칙이 바뀌면 바로 드러나게)
for y in (1984, 2000, 2024):
    for (m, d) in ((2, 3), (2, 4), (3, 5), (3, 6), (12, 6), (12, 7), (1, 5), (1, 6)):
        r = analyze(y, m, d, 12)
        cases.append(dict(y=y, m=m, d=d, hour=12, labels=[p or "-" for p in r["pillars"]], type=r["type_key"],
                          season=r["season_key"], time=r["time_key"] or "-", aux=r["aux"] or "-", peak=list(r["peak"])))
os.makedirs("tests/fixtures", exist_ok=True)
json.dump(cases, open("tests/fixtures/saju_cases.json", "w", encoding="utf-8"), ensure_ascii=False)
print(len(cases), "cases written")
