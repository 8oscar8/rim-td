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
    this.component = 0;
    this.food = 0;
    this.foodToNextPop = 100; // 다음 인구 증가를 위한 필요 식량
    this.researchPoints = 0; // 연구 수치 (Tech Points)

    this.techLevel = 'primitive'; // primitive -> advanced -> spacer -> ultra

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
      armor: 0     // 방어력 관통 업그레이드
    };
    
    // 4. 게임 엔진 상태
    this.waveNumber = 1;
    this.nextWaveTimer = 0; // 다음 웨이브까지 남은 시간
    this.isPaused = false; 
    this.timeScale = 1.0;
    this.score = 0;

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
  }

  addResource(type, amount) {
    if (this[type] !== undefined) {
      this[type] += amount;
      if (this[type] < 0) this[type] = 0;
    }
  }

  // 업그레이드 시 공격력 배율 반환
  getUpgradeMultiplier(type) {
    const level = this.upgrades[type] || 0;
    return 1 + (level * 0.1); // 레벨당 10% 증가
  }
}
