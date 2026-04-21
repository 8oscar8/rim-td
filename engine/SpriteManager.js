import { FIXED_MONSTER_LIST } from '../game/MonsterData.js';

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
      '결속 단분자검': 'assets/rimworld/단분자검.webp',
      '인공자아핵': 'assets/인공자아핵.webp',
      '신경석궁': 'assets/신경석궁.webp',
      '시원한 은행가는 길': 'assets/시원한은행가는길.webp',
      '궤도 폭격': 'assets/궤도폭격기.webp',
      '정신충격창': 'assets/정신충격창.webp',
      '고주스': 'assets/고주스.webp'
    };

    // [Helper] 경로 인코딩 (한글 및 특수문자 대응)
    const encodePath = (p) => p.split('/').map(s => encodeURIComponent(s)).join('/').replace(/%3A/g, ':');

    // 무기/아이템 로드
    for (const [name, src] of Object.entries(weaponImages)) {
      const img = new Image();
      img.src = encodePath(src);
      img.onerror = () => this.handleError(img);
      this.images[name] = img;
    }

    // [New] 몬스터 이미지 로드
    FIXED_MONSTER_LIST.forEach(mon => {
      if (mon.img) {
          const img = new Image();
          const encodePath = (p) => p.split('/').map(s => encodeURIComponent(s)).join('/').replace(/%3A/g, ':');
          img.src = encodePath(`assets/monster/${mon.img}`);
          img.onerror = () => this.handleError(img);
          this.images[`monster_${mon.img}`] = img;
      }
    });

    // [New] 특수 인카운터 몬스터 이미지 로드
    const specialMonsters = [
        '메가스카라브.webp', '메가스파이더.webp', '스펠로피드.webp', 
        '알파트럼보.webp', '암흑모노리스.webp', '제국근위대장.webp', 
        '제국정예병.webp', '상단경호원.webp'
    ];
    specialMonsters.forEach(filename => {
        const img = new Image();
        const encodePath = (p) => p.split('/').map(s => encodeURIComponent(s)).join('/').replace(/%3A/g, ':');
        img.src = encodePath(`assets/specialmonster/${filename}`);
        img.onerror = () => this.handleError(img);
        this.images[`special_${filename}`] = img;
    });

    this.colors = {
      awful: '#808080',
      normal: '#ffffff',
      excellent: '#9b59b6',
      legendary: '#f1c40f',
      enemy: '#e74c3c',
      slate: '#7f8c8d'
    };
  }

  static handleError(img) {
    if (!img.dataset.triedFallback) {
        img.dataset.triedFallback = 'true';
        if (img.src.endsWith('.webp')) img.src = img.src.replace('.webp', '.png');
        else if (img.src.endsWith('.png')) img.src = img.src.replace('.png', '.webp');
    }
  }

  static getColor(gradeOrMaterial) {
    const key = String(gradeOrMaterial).toLowerCase();
    return this.colors[key] || this.colors[gradeOrMaterial] || '#ffffff';
  }

  static getImage(key) {
    return this.images[key] || null;
  }
}
