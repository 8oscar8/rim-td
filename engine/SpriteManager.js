export class SpriteManager {
  static init() {
    this.images = {};
    const weaponImages = {
      '단검': 'assets/dagger.png',
      '단창': 'assets/rimworld/단창.webp',
      '볼트액션 소총': 'assets/rifle.png',
      '장궁': 'assets/rimworld/장궁.webp',
      '단궁': 'assets/shortbow.png',
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
      '파쇄 수류탄': 'assets/파쇄수류탄.webp', 
      '화염병': 'assets/molotov.png', 
      '리볼버': 'assets/rimworld/리볼버.webp',
      '자동권총': 'assets/rimworld/자동권총.webp',
      '기관단총(SMG)': 'assets/rimworld/기관단총.webp',
      '전투 산탄총': 'assets/rimworld/전투산탄총.webp',
      '펄스 수류탄': 'assets/empgrenades.webp',
      '돌격소총(AR)': 'assets/rimworld/돌격소총.webp',
      '저격소총': 'assets/rimworld/저격소총.webp',
      '미니건': 'assets/rimworld/미니건.webp',
      '독소 수류탄': 'assets/toxingrenade.webp',
      '차지 라이플': 'assets/rimworld/차지라이플.webp',
      '차지 랜스': 'assets/rimworld/차지랜스.webp',
      '빔 그레이저': 'assets/rimworld/빔 그레이저.webp',
      '빔 리피터': 'assets/rimworld/빔 리피터.webp',
      '철퇴': 'assets/rimworld/철퇴.webp',
      '연막 발사기': 'assets/smokelauncher.webp',
      '999강 나무몽둥이': 'assets/rimworld/목재.webp',
      '전설의 꽁치검': 'assets/saury_sword.png',
      '결속 단분자검': 'assets/rimworld/단분자검.webp'
    };

    for (const [name, src] of Object.entries(weaponImages)) {
      const img = new Image();
      img.src = src;
      // 로딩 실패 시 확장자 교환 폴백 (.webp <-> .png)
      img.onerror = () => {
        if (!img.dataset.triedFallback) {
          img.dataset.triedFallback = 'true';
          if (img.src.endsWith('.webp')) {
            img.src = img.src.replace('.webp', '.png');
          } else if (img.src.endsWith('.png')) {
            img.src = img.src.replace('.png', '.webp');
          }
        }
      };
      this.images[name] = img;
    }

    this.colors = {
      awful: '#808080',
      normal: '#ffffff',
      excellent: '#9b59b6',
      legendary: '#f1c40f',
      enemy: '#e74c3c',
      slate: '#7f8c8d' // 전설의 암석색 (Slate)
    };
  }

  static getColor(gradeOrMaterial) {
    const key = String(gradeOrMaterial).toLowerCase();
    return this.colors[key] || this.colors[gradeOrMaterial] || '#ffffff';
  }

  static getImage(weaponName) {
    return this.images[weaponName] || null;
  }
}
