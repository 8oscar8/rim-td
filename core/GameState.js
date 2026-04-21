/**
 * GameState.js
 * 게임의 최소 핵심 자원 및 기본 상태를 관리합니다.
 */
export class GameState {
  constructor() {
    // 1. 기초 화폐 및 자원
    this.silver = 200;
    this.wood = 0;
    this.steel = 0;
    this.plasteel = 0;
    this.uranium = 0;
    this.jade = 0;
    this.component = 0;
    this.food = 0;
    this.foodToNextPop = 100; // 다음 인구 증가를 위한 필요 식량
    this.researchPoints = 0; // 연구 수치 (Tech Points)
    this.mood = 100; // 정착민 무드 (0-100, 100에서 시작)
    this.herbalMedicine = 0; // 약초 (Herbal Medicine)

    this.techLevel = 'primitive'; // primitive -> industrial -> advanced -> spacer -> ultra

    // 2. 인구 및 유닛 관리
    this.population = 3; 
    this.idlePopulation = 3;
    this.maxPopulation = 50;
    this.units = []; // 현재 배치된 유닛들
    
    // 3. 업그레이드 지수 (메운디 핵심)
    this.upgrades = {
      sharp: 0,    // 날붙이 업그레이드
      blunt: 0,    // 둔기 업그레이드
      ranged: 0,   // 원거리 업그레이드
      armor: 0,    // 방어력 관통 업그레이드
      education: 0, // 현대 교육
      artisan: 0,   // 숙련 장인
      farming: 0,   // 선진 농법
      mining: 0,    // 심층 채굴
      logging: 0,   // 기계 벌목
      trade: 0      // 무역 네트워크
    };
    
    // 4. 게임 엔진 상태
    this.waveNumber = 1;
    this.nextWaveTimer = 0; // 다음 웨이브까지 남은 시간
    this.isPaused = false; 
    this.timeScale = 1.0;
    this.score = 0;
    this.totalSellCount = 0; // 누적 판매 횟수 (히든 레시피용)
    this.gameTime = 0; // 총 플레이 시간 (초 단위)
    this.hiddenEventCount = 0; // 히든 인카운터 발생 횟수
    this.combinationFailCount = 0; // 조합 실패 횟수 (히든 레시피용)

    // 5. 작업 할당 및 진행률 (v2)
    this.workers = {
      logging: 0,
      mining: 0,
      farming: 0,
      research: 0,
      trading: 0
    };
    this.workProgress = {
      logging: 0,
      mining: 0,
      farming: 0,
      research: 0,
      trading: 0
    };

    // 6. 소모성 특수 아이템 수량
    this.items = {
        orbital_strike: 0, // 이벤트를 통해서만 획득 가능하도록 수정
        frag_grenade: 0,
        pulse_grenade: 0,
        molotov: 0,
        smoke_launcher: 0,
        toxin_grenade: 0,
        psychic_lance: 0,
        go_juice: 0
    };
    this.itemCooldowns = {
        orbital_strike: 0,
        frag_grenade: 0,
        pulse_grenade: 0,
        molotov: 0,
        smoke_launcher: 0,
        toxin_grenade: 0,
        psychic_lance: 0,
        go_juice: 0,
        herbal_care: 0,
        financial_care: 0
    };

    this.stats = {
        enemiesKilled: 0,
        totalSilverSpent: 0,
        totalResourcesSpent: {
            wood: 0, steel: 0, plasteel: 0, uranium: 0, component: 0, jade: 0, food: 0
        },
        towersBuilt: 0, // 총 건설 횟수
        towerCounts: {}, // 종류별 건설 수 { '단궁': 5, '강철검': 3 ... }
        maxDamage: 0, // 단일 타격 최고 데미지
        maxDamageUnit: '없음', // 최고 데미지를 입힌 유닛명
        totalDamageDealt: 0,   // [New] 누적 총 피해량
        maxPopulationReached: 3, // [New] 역대 최고 인구
        totalResearchCompleted: 0, // [New] 연구 완료 횟수
        moodSum: 0,           // [New] 무드 합계 (평균용)
        moodTicks: 0,          // [New] 무드 측정 횟수
        startTime: Date.now() // 게임 시작 시각
    };

    // 8. 게임 설정 (Persistent Settings)
    this.settings = {
        masterVolume: 1.0,
        bgmVolume: 0.5,
        weaponVolume: 0.5,
        uiVolume: 0.5,
        enemyVolume: 0.5,
        showNotifications: true
    };
  }

  addResource(type, amount) {
    if (this[type] !== undefined) {
      this[type] += amount;
      if (this[type] < 0) this[type] = 0;
    }
  }

  spendResource(type, amount) {
    if (this[type] !== undefined) {
      this[type] -= amount;
      if (this[type] < 0) this[type] = 0;
      
      // 통계 기록
      if (type === 'silver') {
        this.stats.totalSilverSpent += amount;
      }
      if (this.stats.totalResourcesSpent[type] !== undefined) {
        this.stats.totalResourcesSpent[type] += amount;
      } else {
        // 정의되지 않은 자원(연구 등)도 필요시 추정치 저장을 위해 확장 가능
        this.stats.totalResourcesSpent[type] = (this.stats.totalResourcesSpent[type] || 0) + amount;
      }
    }
  }

  // 업그레이드 시 공격력 배율 반환 (티어별 소급 적용 로직)
  getUpgradeMultiplier(type) {
    const level = this.upgrades[type] || 0;
    let rate = 0.1; // 기본 10%

    // 구간별 효율 점프 (소급 적용)
    if (level >= 101) rate = 0.3;      // 101강 이상: 30%
    else if (level >= 51) rate = 0.2;  // 51~100강: 20%

    return 1 + (level * rate); 
  }

  // 인구수에 따른 다음 식량 요구량 동적 업데이트
  updateFoodThreshold() {
    // 기본 100부터 시작하여 (인구-3)승 만큼 1.3배씩 증가
    this.foodToNextPop = Math.floor(100 * Math.pow(1.3, Math.max(0, this.population - 3)));
  }
}
