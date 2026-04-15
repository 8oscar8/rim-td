import os
import json

weapon_images = {
    '단검': 'assets/rimworld/검.webp',
    '단창': 'assets/rimworld/단창.webp',
    '볼트액션 소총': 'assets/rimworld/볼트액션소총.webp',
    '장궁': 'assets/rimworld/장궁.webp',
    '단궁': 'assets/rimworld/곡궁.webp',
    '곤봉': 'assets/rimworld/곤봉.webp',
    '맨손/목재': 'assets/rimworld/목재.webp',
    '전투망치': 'assets/rimworld/전투망치.webp',
    '제우스망치': 'assets/rimworld/제우스망치.webp',
    '엘텍스 지팡이': 'assets/rimworld/엘텍스지팡이.webp',
    '검': 'assets/rimworld/검.webp',
    '창': 'assets/rimworld/창.webp',
    '장검': 'assets/rimworld/장검.webp',
    '파괴용 도끼': 'assets/rimworld/파괴용도끼.webp',
    '트럼보 뿔': 'assets/rimworld/트럼보뿔.webp',
    '알파 트럼보 뿔': 'assets/rimworld/알파 트럼보 뿔.webp',
    '단분자검': 'assets/rimworld/단분자검.webp',
    '플라즈마검': 'assets/rimworld/플라즈마검.webp',
    '투창 다발': 'assets/rimworld/투창다발.webp',
    '곡궁': 'assets/rimworld/곡궁.webp',
    '파쇄 수류탄': 'assets/rimworld/독소수류탄.webp',
    '화염병': 'assets/rimworld/펄스수류탄.webp',
    '리볼버': 'assets/rimworld/리볼버.webp',
    '자동권총': 'assets/rimworld/자동권총.webp',
    '기관단총(SMG)': 'assets/rimworld/기관단총.webp',
    '전투 산탄총': 'assets/rimworld/전투산탄총.webp',
    '펄스 수류탄': 'assets/rimworld/펄스수류탄.webp',
    '돌격소총(AR)': 'assets/rimworld/돌격소총.webp',
    '저격소총': 'assets/rimworld/저격소총.webp',
    '미니건': 'assets/rimworld/미니건.webp',
    '독소 수류탄': 'assets/rimworld/독소수류탄.webp',
    '차지 라이플': 'assets/rimworld/차지라이플.webp',
    '차지 랜스': 'assets/rimworld/차지랜스.webp',
    '빔 그레이저': 'assets/rimworld/빔 그레이저.webp',
    '빔 리피터': 'assets/rimworld/빔 리피터.webp',
    '철퇴': 'assets/rimworld/철퇴.webp',
    '연막 발사기': 'assets/rimworld/연막발사기.webp'
}

missing = []
valid = {}

# 1. 파일 존재 여부 확인
for name, path in weapon_images.items():
    if not os.path.exists(path):
        missing.append({name: path})
    else:
        valid[name] = path

# 2. 고립된 파일(매핑되지 않은 이미지) 확인
asset_dir = 'assets/rimworld'
all_files = [f for f in os.listdir(asset_dir) if f.endswith('.webp') or f.endswith('.png')]
mapped_files = [os.path.basename(p) for p in weapon_images.values()]
orphans = [f for f in all_files if f not in mapped_files]

# 결과 출력
print("--- [MISSING IMAGES] ---")
for m in missing:
    print(m)

print("\n--- [ORPHANED FILES (Not in Mapping)] ---")
for o in orphans:
    print(o)

print("\n--- [DUPLICATED PATHS (Same image for different weapons)] ---")
rev_map = {}
for name, path in weapon_images.items():
    rev_map.setdefault(path, []).append(name)

for path, names in rev_map.items():
    if len(names) > 1:
        print(f"{path}: {names}")
