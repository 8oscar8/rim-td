import { GameState } from './core/GameState.js';
import { GameLoop } from './engine/GameLoop.js';
import { Renderer } from './engine/Renderer.js';
import { UIManager } from './ui/UIManager.js';
import { WaveManager } from './game/WaveManager.js';
import { Tower } from './game/Tower.js';
import { SpriteManager } from './engine/SpriteManager.js';
import { SoundManager } from './engine/SoundManager.js';
import { GachaSystem } from './game/GachaSystem.js';
import { EncounterManager } from './game/EncounterManager.js';
import { HiddenEventManager } from './game/HiddenEventManager.js';

/**
 * Main Application Class
 * 림월드 TD의 모든 핵심 시스템을 제어합니다.
 */
class App {
  constructor() {
    window.app = this; // 전역 접근 허용 (UI 이벤트용)
    window.GachaSystem = GachaSystem; // 콘솔 테스트용 노출
    this.state = new GameState();
    this.renderer = new Renderer('game-canvas');
    this.ui = new UIManager(this);

    // 1. 매니저 클래스 초기화
    SpriteManager.init();
    SoundManager.init();
    
    // 2. 경로(Waypoints) 초기화 (나중에 init에서 정교화)
    this.waypoints = [];
    
    // 3. 게임 오브젝트 관리
    this.enemies = [];
    this.units = [];
    this.projectiles = [];
    this.fieldEffects = [];
    
    // 4. 배치 모드 및 자원 관련 상태
    this.placementMode = false;
    this.pendingGachaResult = null;
    this.mousePos = { x: 0, y: 0 };
    this.passiveSilverTimer = 0; // 2초당 1은 지급을 위한 타이머

    // 5. 인카운터(이벤트) 매니저
    this.encounterManager = new EncounterManager(this);
    this.hiddenEventManager = new HiddenEventManager(this);

    // 6. 게임 루프 설정
    this.loop = new GameLoop(
      (dt) => this.update(dt),
      () => this.render()
    );

    // 6. 입력 이벤트 (타워 선택 및 배치)
    this.renderer.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.renderer.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.renderer.canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.handleCanvasRightClick(e);
    });
    
    // [New] 특수 적 스폰 이벤트 수신
    document.addEventListener('spawnSpecial', (e) => {
        if (e.detail) this.enemies.push(e.detail);
    });

    this.init();
  }

  /**
   * 정착민 파견 작업 진행 및 자원 획득 로직
   */
  updateWorkDispatch(dt) {
    const state = this.state;
    // 인카운터 보너스 반영 (독성 낙진 등)
    const efficiency = this.encounterManager.getGlobalWorkEfficiency();
    const effectiveDt = dt * efficiency;
    
    const workerTypes = ['logging', 'mining', 'farming', 'research', 'trading'];
    
    workerTypes.forEach(type => {
      const workerCount = state.workers[type] || 0;
      if (workerCount > 0) {
        // [Buff] 지수함수 기반 효율 상향 (0.75 -> 0.82)
        // 공식: 인원수 ^ 0.82
        const efficiency = Math.pow(workerCount, 0.82);
        const speed = 6 * efficiency * effectiveDt; // 기본 속도 5 -> 6 상향, 인카운터 효율 반영
        state.workProgress[type] += speed;

        if (state.workProgress[type] >= 100) {
          state.workProgress[type] = 0;
          this.handleWorkComplete(type);
        }
      } else {
        // 인원 없으면 진행률 유지 혹은 서서히 감소 (여기선 유지)
      }
    });
  }

  handleWorkComplete(type) {
    if (type === 'population_up') {
        this.ui.addMiniNotification("새로운 정착민 합류! (인구 +1)");
        return;
    }

    const s = this.state;
    const up = s.upgrades;
    let baseAmount = 0;
    let resName = "";
    let bonusComponent = 0;
    let bonusLoot = "";
    
    // 업그레이드 보너스 대폭 상향 (레벨당 10% -> 25%)
    const getBonus = (lv) => 1 + (lv * 0.25);
    
    // 확률 로직 미리 계산: 대박(10%), 실패(5%), 일반(85%)
    const rand = Math.random();
    let isJackpot = rand < 0.1;
    let isFailure = rand >= 0.1 && rand < 0.15;
    
    switch(type) {
      case 'logging': 
        baseAmount = Math.floor(12 * getBonus(up.logging)); 
        resName = "목재"; 
        break;
      case 'mining': 
        baseAmount = Math.floor(8 * getBonus(up.mining)); 
        resName = "강철"; 
        // 채광 보너스 (심층 채굴 레벨 반영): 플라스틸(5+2%*lv), 우라늄(10+2%*lv), 비취(5+2%*lv)
        // 채광 보너스 (심층 채굴 레벨 반영): 플라스틸 상향 (12+4%*lv)
        const mineBonus = up.mining * 0.04;
        if (!isFailure) {
            if (Math.random() < 0.12 + mineBonus) { 
                const amt = Math.floor(Math.random() * 3) + 2; // 2 ~ 4개 
                s.plasteel += amt; bonusLoot += ` (플라스틸 +${amt}!)`; 
            }
            if (Math.random() < 0.10 + mineBonus) { 
                const amt = Math.floor(Math.random() * 3) + 1; 
                s.uranium += amt; bonusLoot += ` (우라늄 +${amt}!)`; 
            }
            if (Math.random() < 0.02 + (up.mining * 0.02)) { 
                s.jade += 1; bonusLoot += ` (비취 +1!)`; 
            }
        }
        break;
      case 'farming': 
        baseAmount = Math.floor(12 * getBonus(up.farming)); 
        resName = "식량"; 
        break;
      case 'trading': 
        // 기본량 하향 (12 -> 6), 하지만 레벨당 기본 효율 증가 추가
        baseAmount = Math.floor((6 + (up.trade * 6)) * getBonus(up.trade)); 
        resName = "은화"; 
        // 교역 보너스 (무역 네트워크 레벨 반영): 플라스틸 확률(10+5%*lv) 및 획득량 증가
        // 교역 보너스 (무역 네트워크 레벨 반영): 플라스틸 확률 상향 (20+8%*lv)
        const tradeBonus = up.trade * 0.08;
        if (!isFailure) {
            if (Math.random() < 0.20 + tradeBonus) { 
                const amt = Math.floor((Math.random() * 4 + 2) * getBonus(up.trade)); // 획득량 상향
                s.plasteel += amt; bonusLoot += ` (플라스틸 +${amt}!)`; 
            }
            if (Math.random() < 0.015) { 
                const amt = Math.floor(Math.random() * 2) + 1; 
                s.jade += amt; bonusLoot += ` (비취 +${amt}!)`; 
            }
        }
        break;
      case 'research': 
        baseAmount = Math.floor(13 * getBonus(up.education)); 
        resName = "연구"; 
        // 연구 보너스 (현대 교육 레벨 반영): 부품 획득 확률(20+5%*lv)
        const eduBonus = up.education * 0.05;
        if (!isFailure && Math.random() < 0.20 + eduBonus) {
            const amt = Math.floor(Math.random() * 2) + 1; 
            bonusComponent = amt;
            bonusLoot += ` (부품 +${amt}!)`;
        }
        break;
    }


    let finalAmount = 0;
    if (isJackpot) {
        finalAmount = baseAmount * 5; // 3 -> 5 상향
    } else if (isFailure) {
        finalAmount = 0;
        bonusComponent = 0;
    } else {
        // 랜덤성 대폭 강화 (50% ~ 200%)
        finalAmount = Math.floor(baseAmount * (0.5 + Math.random() * 1.5));
        if (finalAmount < 1 && baseAmount > 0) finalAmount = 1;
    }

    // [New] 작업 영감 보너스 (3배) 반영
    const workMult = this.encounterManager.getGlobalWorkMultiplier(type);
    finalAmount = Math.floor(finalAmount * workMult);

    // [New] 암브로시아 보너스 (은화 2배) 반영
    if (resName === "은화") {
        const silverMult = this.encounterManager.getGlobalSilverMultiplier();
        finalAmount = Math.floor(finalAmount * silverMult);
    }

    // 테마별 메시지 맵핑
    const themeMessages = {
        logging: { jackpot: "🌳 거대 수목 발견!", success: "🪓 벌목 완료", failure: "⚙️ 장비 파손" },
        mining: { jackpot: "⛏️ 치밀한 심층 채광!", success: "🪵 강철 채굴", failure: "⚠️ 낙석 사고" },
        farming: { jackpot: "🌾 풍년 (Bumper Crop)!", success: "🧺 식량 수확", failure: "❄️ 한파 피해" },
        research: { jackpot: "📜 고대 기술문서 발견!", success: "🔧 연구 완료", failure: "🔥 회로 소실" },
        trading: { jackpot: "💰 친절한 상단 방문!", success: "📦 교역 완료", failure: "🏴‍☠️ 해적의 약탈" }
    };

    const theme = themeMessages[type] || { jackpot: "⭐ 대박!", success: "✅ 완료", failure: "❌ 실패" };
    let statusMsg = isJackpot ? theme.jackpot : (isFailure ? theme.failure : theme.success);

    // 자원 추가
    if (finalAmount > 0) {
      this.state.addResource(type === 'logging' ? 'wood' : (type === 'mining' ? 'steel' : (type === 'farming' ? 'food' : (type === 'trading' ? 'silver' : 'researchPoints'))), finalAmount);
      
      if (isJackpot) {
          // 대박 미니 알림 (황금색)
          this.ui.addMiniNotification(`${statusMsg}: ${resName} +${finalAmount}${bonusLoot}`, 'jackpot');
      } else {
          // 일반 성공 미니 알림
          this.ui.addMiniNotification(`${resName} +${finalAmount}${bonusLoot}`);
      }
    } else if (isFailure) {
      // 실패 미니 알림 (빨간색)
      this.ui.addMiniNotification(`${statusMsg}: ${resName} 채집 실패!`, 'failure');
    } else if (type === 'research') {
      this.state.researchPoints += finalAmount;
    }
    
    if (bonusComponent > 0) s.component += bonusComponent;
  }

  handleMouseMove(e) {
    const rect = this.renderer.canvas.getBoundingClientRect();
    this.mousePos.x = (e.clientX - rect.left) * (this.renderer.canvas.width / rect.width);
    this.mousePos.y = (e.clientY - rect.top) * (this.renderer.canvas.height / rect.height);
  }

  handleCanvasClick(e) {
    if (this.placementMode && this.pendingGachaResult) {
      this.confirmPlacement();
      return;
    }

    const rect = this.renderer.canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (this.renderer.canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (this.renderer.canvas.height / rect.height);

    let selectedAny = false;
    this.units.forEach(u => {
      const dist = Math.hypot(u.x - mouseX, u.y - mouseY);
      if (dist < 30) {
        this.units.forEach(u2 => u2.selected = false);
        u.selected = true;
        this.ui.showUnitDetail(u);
        selectedAny = true;
      }
    });

    if (!selectedAny) {
      this.units.forEach(u => u.selected = false);
    }
  }

  calculateSellPrice(u) {
    if (!u || !u.weaponData) return 5;
    const grade = u.weaponData.grade || 'Common';
    const isJade = u.material === '비취옥' || u.material === 'Jade';
    
    // 등급별 기본 가격 매핑
    const basePrices = {
        Common: 5,
        Uncommon: 10,
        Rare: 25,
        Epic: 50,
        Legendary: 200,
        Mythic: 500
    };
    
    let price = basePrices[grade] || 5;
    // 비취옥 프리미엄 (5배)
    if (isJade) price *= 5;
    
    return price;
  }

  sellSelectedUnit() {
    const selectedIdx = this.units.findIndex(u => u.selected);
    if (selectedIdx !== -1) {
      const u = this.units[selectedIdx];
      const price = this.calculateSellPrice(u);
      
      this.units.splice(selectedIdx, 1);
      this.state.silver += price;
      
      // [Hidden] 판매 33회 달성 시 전설의 꽁치검 지급
      this.state.totalSellCount++;
      if (this.state.totalSellCount === 33) {
          const result = GachaSystem.createSpecificWeapon('전설의 꽁치검', 'legendary', 'None');
          const event = {
              name: "정착지의 전설: 판매왕",
              desc: "당신은 무려 33개의 유닛을 팔아치우는 냉혹한 효율을 보여주었습니다! \n\n그 미친듯한 거래 능력에 감탄한 상인들이 전설의 무기 '전설의 꽁치검'을 선물로 보냈습니다.",
              type: 'positive'
          };
          if (this.encounterManager) this.encounterManager.showEventModal(event);
          this.startPlacement(result);
          SoundManager.playSFX('assets/audio/encounter_success.mp3');
      }

      SoundManager.playSFX('assets/audio/buy.mp3');
      this.ui.addMiniNotification(`${u.weaponName} 판매 완료 (+${price} 은) [누적 ${this.state.totalSellCount}회]`);
      this.ui.updateDisplays(this.state);
      return true;
    }
    return false;
  }

  buyAdvancedUnit() {
    if (this.state.isPaused) return;
    if (this.state.silver >= 1000) {
      this.state.silver -= 1000;
      const artisanLv = this.state.upgrades.artisan || 0;
      const result = GachaSystem.drawAdvanced(artisanLv);
      SoundManager.playSFX('assets/audio/buy.mp3');
      this.startPlacement(result);
      this.ui.updateDisplays(this.state);
    } else {
      alert("은화가 부족합니다! (1,000 은 필요)");
    }
  }

  buyRandomUnit() {
    if (this.state.isPaused) return;
    if (this.state.silver >= 50) {
      this.state.silver -= 50;
      const artisanLv = this.state.upgrades.artisan || 0;
      const result = GachaSystem.draw(artisanLv);
      SoundManager.playSFX('assets/audio/buy.mp3');
      this.startPlacement(result);
      this.ui.updateDisplays(this.state);
    } else {
      alert("은화가 부족합니다! (50 은 필요)");
    }
  }

  init() {
    console.log("%c[RimWorld TD] Engine V2 Started", "color: #00f2ff; font-weight: bold;");
    
    // 렌더러 크기에 맞춰 정밀한 경로 생성
    const cx = this.renderer.width / 2;
    const cy = this.renderer.height / 2;
    this.waypoints = this.createCircularPath(cx, cy, 320, 120); // 세그먼트 수를 120으로 늘려 곡선 정교화
    
    // 웨이브 매니저 실제 초기화
    this.waveManager = new WaveManager(
        this.waypoints,
        (reward, isBoss) => this.handleEnemyDeath(reward, isBoss),
        () => this.handleWaveComplete(),
        (num) => this.handleWaveStart(num)
    );

    // 글로벌 접근 허용 (일부 레거시 로직 대응용)
    window.gameCore = this;
    
    this.ui.updateDisplays(this.state);
    this.waveManager.startNextWave();
    this.loop.start();
  }

  /**
   * 원형 경로 생성
   */
  createCircularPath(cx, cy, r, segments) {
    const points = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r
      });
    }
    // 루프를 닫기 위해 첫 점 추가
    points.push(points[0]);
    return points;
  }

  /**
   * 마우스 이동 처리 (배치 가이드)
   */
  handleMouseMove(e) {
    const rect = this.renderer.canvas.getBoundingClientRect();
    this.mousePos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  /**
   * 캔버스 클릭 처리 (설치/선택)
   */
  handleCanvasClick(e) {
    if (this.inputLock) return; // UI 클릭 후 즉각 반응 방지
    
    // 우클릭은 취소 (contextmenu 이벤트를 따로 잡거나 mousedown 사용 권장하나 일단 click에서 처리)
    if (this.placementMode) {
        this.confirmPlacement();
    } else {
        // 유닛 선택 로직
        const found = this.units.find(u => !u.isBlueprint && Math.hypot(u.x - this.mousePos.x, u.y - this.mousePos.y) < 30);
        if (found) {
            this.ui.showUnitDetail(found);
        } else {
            this.ui.hideUnitDetail();
        }
    }
  }

  /**
   * 캔버스 우클릭 처리 (취소)
   */
  handleCanvasRightClick(e) {
    if (this.placementMode) {
        this.cancelPlacement();
    } else {
        this.ui.hideUnitDetail();
    }
  }

  /**
   * 유닛 배치 대기 모드 진입
   */
  startPlacement(gachaResult) {
    if (!gachaResult) {
      console.error("Gacha result is null!");
      return;
    }
    
    // 배치 모드 강제 활성화
    this.placementMode = true;
    this.pendingGachaResult = gachaResult;

    // UI 알림
    this.ui.addMiniNotification(`배치 준비: ${gachaResult.weaponName} (${gachaResult.quality})`, "info");
    
    // [Safety] 0.1초간 클릭 무시 (버튼 잔상 방지)
    this.inputLock = true;
    setTimeout(() => { this.inputLock = false; }, 100);
  }

  /**
   * 유닛 배치 확정
   */
  confirmPlacement() {
    if (this.state.isPaused) return;
    // 실제 배치를 확정하는 순간에 파업 체크
    if (this.encounterManager && this.encounterManager.isStrikeActive()) {
        this.ui.addMiniNotification("아직 파업이 끝나지 않았습니다! 배치를 완료할 수 없습니다.", "failure");
        return; // pendingGachaResult를 지우지 않고 유지함
    }

    const tower = new Tower(this.mousePos.x, this.mousePos.y, this.pendingGachaResult, this);
    tower.isBlueprint = false;
    this.units.push(tower);
    // this.state.population = this.units.length; <- 이 줄이 버그의 원인이었습니다. 인구는 구매 시 늘어나는 것이 아니라 식량 등에 의해 결정되어야 합니다.
    
    
    this.placementMode = false;
    const grade = tower.weaponData.grade || 'Common';
    
    // [New] 에픽 이상 등급은 배치 완료 시 coin 효과음 재생
    const highGrades = ['Epic', 'Special', 'Legendary', 'Mythic', 'Hidden'];
    if (highGrades.includes(grade)) {
        SoundManager.playSFX('assets/audio/coin.mp3');
    }

    this.pendingGachaResult = null;
    this.ui.showNotification("배치 완료", `${tower.weaponName}이(가) 전장에 배치되었습니다.`, grade);
  }

  handleEnemyDeath(enemy) {
    if (!enemy) return;
    
    const s = this.state;
    const type = enemy.type;
    const isBoss = enemy.isBoss;
    
    // 1. 기본 점수 증가
    s.score += isBoss ? 500 : 10;
    
    // 2. 기본 은화 보상 (1개 고정, 보스는 기존 보상 유지)
    const silMul = this.encounterManager ? this.encounterManager.getGlobalSilverMultiplier() : 1.0;
    const baseReward = isBoss ? enemy.reward : 1;
    s.silver += Math.floor(baseReward * silMul);

    // 3. 확률형 추가 전리품 (확룰 상향 및 전리품 태그 추가)
    const rand = Math.random();
    let lootMsg = "";

    if (type === 'organic') {
        // 은화 35%, 식량 50% (평균 2개 -> 기대값 1.0)
        if (rand < 0.35) {
            const amount = 1 + Math.floor(Math.random() * 3);
            const finalSilver = Math.floor(amount * silMul);
            s.silver += finalSilver;
            lootMsg = `은화 +${finalSilver}`;
        } else if (rand < 0.85) { // 35% ~ 85% (50%)
            const amount = 1 + Math.floor(Math.random() * 3); // 1, 2, 3 (평균 2)
            s.addResource('food', amount);
            lootMsg = `식량 +${amount}`;
        }
    } else if (type === 'mech') {
        // 은화 35%, 강철 40%(평균 2.5 -> 기대값 1.0), 플라스틸 20%(평균 2.5 -> 기대값 0.5)
        if (rand < 0.35) {
            const amount = 2 + Math.floor(Math.random() * 5);
            const finalSilver = Math.floor(amount * silMul);
            s.silver += finalSilver;
            lootMsg = `은화 +${finalSilver}`;
        } else if (rand < 0.75) { // 35% ~ 75% (40%)
            const amount = 2 + Math.floor(Math.random() * 2); // 2, 3 (평균 2.5)
            s.addResource('steel', amount);
            lootMsg = `강철 +${amount}`;
        } else if (rand < 0.95) { // 75% ~ 95% (20%)
            const amount = 2 + Math.floor(Math.random() * 2); // 2, 3 (평균 2.5)
            s.addResource('plasteel', amount);
            lootMsg = `플라스틸 +${amount}`;
        }
    }

    // 보스 전용 보상
    if (isBoss) {
      s.addResource('steel', 10);
      s.addResource('component', 1);
      this.ui.addMiniNotification(`[처치] 보스 제거! 강철+10, 부품+1`, "info");
    } else if (lootMsg) {
      // 모든 전리품 획득 시 [전리품] 태그와 함께 알림
      this.ui.addMiniNotification(`[전리품] ${lootMsg}`);
    }
  }

  handleWaveComplete() {
    console.log(`[Wave] ${this.state.waveNumber} 완료!`);
  }

  handleWaveStart(num) {
    this.state.waveNumber = num;
    SoundManager.playSFX('assets/audio/raid_alert.mp3');
  }

  /**
   * 게임 상태 업데이트
   */
  update(dt) {
    // 일시정지 상태면 모든 업데이트 스킵
    if (this.state.isPaused) return;

    const scaledDt = dt * this.state.timeScale;

    // 0. 기본 자금 수입 (2초당 1은)
    this.passiveSilverTimer += scaledDt;
    if (this.passiveSilverTimer >= 2.0) {
      const silverMult = this.encounterManager.getGlobalSilverMultiplier();
      this.state.silver += Math.floor(1 * silverMult);
      this.passiveSilverTimer -= 2.0;
    }

    // [New] 작업 파견 진행 (v2)
    this.updateWorkDispatch(scaledDt);

    // [New] 인카운터 시스템 업데이트
    this.encounterManager.update(scaledDt);
    
    // [New] 인구 증가 체크 (식량 임계점 도달 시)
    if (this.state.food >= this.state.foodToNextPop) {
      this.state.food -= this.state.foodToNextPop;
      this.state.population++;
      this.state.idlePopulation++;
      
      // 다음 인구 필요 식량 지수적 증가 (1.3배씩 증가)
      this.state.foodToNextPop = Math.floor(100 * Math.pow(1.3, this.state.population - 3));
      
      this.handleWorkComplete('population_up');
    }

    // 1. 웨이브 엔진 업데이트
    this.waveManager.update(scaledDt, this.enemies);
    this.state.nextWaveTimer = this.waveManager.nextWaveTimer; // 타이머 동기화

    // 2. 적 리스트 정리 및 업데이트
    this.enemies = this.enemies.filter(e => e.active);
    this.enemies.forEach(e => e.update(scaledDt));

    // 3. 유닛 업데이트
    this.units.forEach(u => u.update(scaledDt, this.enemies, (p) => this.projectiles.push(p)));

    // 4. 투사체 업데이트
    this.projectiles = this.projectiles.filter(p => p.active);
    this.projectiles.forEach(p => p.update(scaledDt, this.enemies, this.fieldEffects));

    // 5. 필드 효과 (연막/독성) 업데이트 및 적용
    this.fieldEffects = this.fieldEffects.filter(f => {
      f.duration -= scaledDt;
      
      // 범위 내의 적들에게 효과 적용
      this.enemies.forEach(en => {
        if (en.active && Math.hypot(en.x - f.x, en.y - f.y) <= (f.radius || 60)) {
          if (f.type === 'smoke') en.applyEffect('smoke', 0.5);
          if (f.type === 'toxin') en.applyEffect('toxin', 0.5);
        }
      });

      return f.duration > 0;
    });

    // UI 동기화
    this.ui.updateDisplays(this.state);

    // [New] 히든 인카운터 타이머 및 로직 업데이트
    if (this.hiddenEventManager) {
        this.hiddenEventManager.update(scaledDt);
    }

    // [New] 무기 조합 가능 여부 체크 (20프레임마다 한 번씩 수행하여 최적화)
    if (Math.floor(Date.now() / 333) % 1 === 0) {
        this.checkCombinationAvailability();
    }

    // [New] 보스 시간 초과 체크 (게임 오버)
    const timedOutBoss = this.enemies.find(e => e.active && e.isBoss && e.bossTimer <= 0);
    if (timedOutBoss) {
        this.handleGameOver(`보스 처치 제한 시간(${timedOutBoss.bossTimerMax}초)이 초과되었습니다!`);
    }

    // [Bug Fix] 적의 수가 100마리를 넘으면 게임 오버
    if (this.enemies.length >= 100) {
        this.handleGameOver("적의 수가 너무 많아 기지가 함락되었습니다! (100마리 도달)");
    }

    // [New] 특수 히든 레시피 체크
    this.checkSpecialEvolution();
  }

  /**
   * [Easter Egg] 특수 진화/히든 레시피 체크
   */
  checkSpecialEvolution() {
    // 1. 999강 나무몽둥이: 맨손/목재 9개 + 목재 999개
    const woodRes = this.state.wood || 0;
    const bareHands = this.units.filter(u => u.weaponName === '맨손/목재' && !u.isBlueprint);

    if (woodRes >= 999 && bareHands.length >= 9) {
        // [Trigger Event]
        const event = {
            name: "전설의 999몽둥이 등장",
            desc: "맨손을 극한으로 단련하여 마침내 경지에 이르렀습니다! \n\n9명의 정착민이 999개의 목재를 소모하여 전설적인 '999강 나무몽둥이'를 완성했습니다. \n(기존 정착민 9명은 이 무기에 영혼을 담아 사라졌습니다.)",
            type: 'positive'
        };

        if (this.encounterManager) {
            this.encounterManager.showEventModal(event);
        }

        // 자원 및 유닛 소모
        this.state.wood -= 999;
        let count = 0;
        // 유닛 목록에서 맨손/목재 9개 제거
        for (let i = this.units.length - 1; i >= 0; i--) {
            if (this.units[i].weaponName === '맨손/목재' && !this.units[i].isBlueprint) {
                this.units.splice(i, 1);
                count++;
                if (count >= 9) break;
            }
        }

        // 히든 아이템 지급 (전설 품질 고정)
        const result = GachaSystem.createSpecificWeapon('999강 나무몽둥이', 'legendary', '나무');
        this.startPlacement(result);

        this.ui.updateDisplays(this.state);
        SoundManager.playSFX('assets/audio/encounter_success.mp3');
    }
  }

  /**
   * 조합 가능 유닛 식별 로직
   */
  checkCombinationAvailability() {
    const counts = {}; // "Name-Grade": count
    this.units.forEach(u => {
      if (u.isBlueprint) return;
      const key = `${u.weaponName}-${u.weaponData.grade}`;
      counts[key] = (counts[key] || 0) + 1;
    });

    this.units.forEach(u => {
      if (u.isBlueprint) return;
      const key = `${u.weaponName}-${u.weaponData.grade}`;
      const isLowGrade = u.weaponData.grade === 'Common' || u.weaponData.grade === 'Uncommon';
      u.isCombinable = (counts[key] >= 4 && isLowGrade);
    });
  }

  /**
   * 유닛 조합 실행
   */
  combineUnits(targetUnit) {
    if (!targetUnit || !targetUnit.isCombinable) return;
    
    try {
        const cost = 200;
        if (this.state.researchPoints < cost) {
            this.ui.addMiniNotification("연구 포인트가 부족합니다! (200 필요)", "failure");
            return;
        }

        const name = targetUnit.weaponName;
        const grade = targetUnit.weaponData.grade;
        
        // 1. 재료 후보군 추출 (동일 이름, 동일 등급)
        const candidates = this.units.filter(u => u.weaponName === name && u.weaponData.grade === grade && !u.isBlueprint);
        if (candidates.length < 4) {
            console.warn(`Not enough materials for ${name}: ${candidates.length}/4`);
            return;
        }

        // 2. 우선순위 정렬 (품질 순서: awful(0) < normal(1) < excellent(2) < legendary(3))
        const qualityMap = { awful: 0, normal: 1, excellent: 2, legendary: 3 };
        const sorted = candidates.filter(u => u !== targetUnit).sort((a, b) => {
            const qA = qualityMap[a.quality] || 0;
            const qB = qualityMap[b.quality] || 0;
            return qA - qB;
        });

        // 최종 재료 4개 (선택한 유닛 1개 + 최하급 3개)
        const materials = [targetUnit, ...sorted.slice(0, 3)];
        console.log(`[Combine] Executing with materials:`, materials);

        // 3. 자원 소모
        this.state.researchPoints -= cost;
        
        // 4. 성패 판정
        const successProb = (grade === 'Common') ? 0.8 : 0.7;
        const isSuccess = Math.random() < successProb;

        if (isSuccess) {
            const result = GachaSystem.drawForCombination(grade, this.state.upgrades.artisan || 0);
            if (result) {
                // [Fix] 자동 생성이 아닌, 상점처럼 직접 배치 모드로 전환
                SoundManager.playSFX('assets/audio/buy.mp3');
                this.startPlacement(result);
                this.ui.showNotification("조합 성공!", `${name} 4개를 합쳐 새로운 무기 획득! 마우스로 배치하세요.`, result.weaponData.grade);
            } else {
                console.error("[Combine] Gacha result was null!");
            }
        } else {
            this.ui.showNotification("조합 실패", `${name} 4개가 전부 파괴되었습니다...`, 'failure');
        }

        // 5. 재료 제거 (반드시 수행)
        this.units = this.units.filter(u => !materials.includes(u));
        this.ui.hideUnitDetail();
        console.log(`[Combine] Finished. Remaining units: ${this.units.length}`);
        
    } catch (e) {
        console.error("Combination Error:", e);
        this.ui.addMiniNotification("조합 중 오류가 발생했습니다!", "failure");
    }
  }

  /**
   * 게임 오버 처리
   */
  handleGameOver(reason) {
    this.loop.stop();
    alert(`[GAME OVER]\n${reason}`);
    location.reload(); // 간단한 재시작 로직
  }

  /**
   * 렌더링
   */
  render() {
    this.renderer.clear();
    
    // 맵 경로 가이드 (테스트용)
    this.renderer.drawMap(this.waypoints);

    // 필드 효과
    this.fieldEffects.forEach(f => f.render(this.renderer.ctx));

    // 적 -> 유닛 -> 투사체 순으로 렌더링
    this.renderer.drawEntities(this.enemies);
    this.renderer.drawEntities(this.units);
    this.renderer.drawEntities(this.projectiles);

    // 6. 배치 모드 (Ghost 유닛) 렌더링
    if (this.placementMode && this.pendingGachaResult) {
      const ctx = this.renderer.ctx;
      const x = this.mousePos.x;
      const y = this.mousePos.y;
      
      const weaponData = this.pendingGachaResult.weaponData;
      const range = weaponData.range || (weaponData.type === 'ranged' ? 250 : 100);
      
      ctx.save();
      ctx.globalAlpha = 0.5;
      
      // [New] 고스트 이미지 렌더링 (실제 무기 이미지 표시)
      const img = SpriteManager.getImage(this.pendingGachaResult.weaponName);
      if (img && img.complete) {
          const size = 32;
          ctx.drawImage(img, x - size/2, y - size/2, size, size);
      } else {
          ctx.fillStyle = SpriteManager.getColor(this.pendingGachaResult.quality);
          ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
      }
      
      // [UI 개선] 사거리 미리보기 가시성 상향
      ctx.strokeStyle = "rgba(0, 242, 255, 0.9)"; // 더 진한 청록색
      ctx.lineWidth = 3; // 선 두께 증가
      ctx.setLineDash([10, 5]); // 더 긴 점선
      ctx.beginPath(); ctx.arc(x, y, range, 0, Math.PI * 2); ctx.stroke();
      
      // 내부 영역 연하게 투명한 채우기
      ctx.fillStyle = "rgba(0, 242, 255, 0.08)";
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * 소모성 아이템 사용 로직
   */
  useItem(type) {
    if (this.state.isPaused) return;
    if ((this.state.items[type] || 0) <= 0) {
        this.ui.addMiniNotification("아이템이 부족합니다!", "failure");
        return;
    }

    let success = false;
    switch (type) {
        case 'orbital_strike':
            // 보스 제외 모든 적 제거
            const targets = this.enemies.filter(en => !en.isBoss);
            targets.forEach(en => {
                en.flashTimer = 0.5; // 강력한 번쩍임
                en.hp = 0;
            });
            this.ui.addMiniNotification("궤도 폭격 가동!", "Legendary");
            success = true;
            break;
        default:
            this.ui.addMiniNotification("해당 아이템은 개발 중입니다.", "info");
            break;
    }

    if (success) {
        this.state.items[type]--;
        this.ui.updateDisplays(this.state);
        // 화면 흔들림 효과 등 추가 가능
    }
  }

  /**
   * 무작위 타워 하나를 파괴 (루시페륨 페널티 등)
   */
  destroyRandomTower() {
    if (this.units.length <= 0) return;
    const randomIndex = Math.floor(Math.random() * this.units.length);
    const tower = this.units[randomIndex];
    
    // 타워 제거 및 알림
    this.ui.addMiniNotification(`금단 증상으로 인해 [${tower.weaponName}] 타워가 파괴되었습니다!`, 'failure');
    this.units.splice(randomIndex, 1);
  }

  /**
   * [Hidden Reward] 제국 근위대의 가호 (영구 공속 +20%)
   */
  applyImperialBuff() {
    this.ui.showNotification("근위대의 가호", "제국 근위대의 시련을 이겨냈습니다! 모든 아군의 공격 속도가 영구적으로 20% 상승합니다.", "Legendary");
    // GameState에 반영하거나 Tower.js에서 체크하도록 설정
    this.state.imperialBuff = true; 
    this.units.forEach(u => { if (u.setupStats) u.setupStats(); }); // 스탯 재계산
  }

  /**
   * [Hidden Reward] 알파 트럼보의 유산
   */
  grantThrumboHorn() {
    const result = GachaSystem.createSpecificWeapon('알파 트럼보 뿔', 'legendary', 'None');
    
    // 1. 화려한 보상 안내 모달 지원
    const eventData = {
        name: "🔔 전설적인 승리: 알파의 유산",
        desc: "최정예 사냥꾼들의 활약으로 마침내 '알파 트럼보'를 쓰러뜨렸습니다! \n\n시체 속에서 발견된 '알파 트럼보 뿔'은 그 자체로 현존하는 최강의 흉기가 될 것입니다. 이제 이 뿔을 정착지의 방어선에 배치하십시오.",
        type: 'positive'
    };
    
    if (this.encounterManager) {
        this.encounterManager.showEventModal(eventData);
    }

    // 2. 사운드 및 배치 모드 실행
    SoundManager.playSFX('assets/audio/encounter_success.mp3');
    this.startPlacement(result);
  }

  /**
   * [Hidden Reward] 모노리스의 지혜 (저등급 전체 강화)
   */
  upgradeAllLowerGradeTowers() {
    this.ui.showNotification("모노리스의 지혜", "암흑 모노리스를 정화했습니다! Common ~ Rare 등급 유닛의 공격력이 영구적으로 1.5배 상승합니다.", "Legendary");
    this.state.monolithBuff = true;
    this.units.forEach(u => { if (u.setupStats) u.setupStats(); }); // 스탯 재계산
  }

  /**
   * [Hidden Event] 상단 습격 성공 (일확천금)
   */
  handleCaravanRaidSuccess() {
      const s = this.state;
      // 1. 은화 보상 상향 (2000~4500)
      const silver = 2000 + Math.floor(Math.random() * 2500);
      s.silver += silver;
      
      // 2. 산업 자원 보상 상향 (랜덤성 극대화)
      const steel = 200 + Math.floor(Math.random() * 650);
      const component = 5 + Math.floor(Math.random() * 20);
      const plasteel = 50 + Math.floor(Math.random() * 150);
      
      s.addResource('steel', steel);
      s.addResource('component', component);
      s.addResource('plasteel', plasteel);
      
      // [Log] 미니 알림 병행
      this.ui.addMiniNotification(`강탈 성공! 은화+${silver}, 강철+${steel}...`, "Legendary");

      // 3. 특수 전설 무기 지급
      const weaponGrades = ['Legendary', 'Mythic'];
      const grade = weaponGrades[Math.floor(Math.random() * weaponGrades.length)];
      const result = GachaSystem.drawSpecificGrade(grade, 0);
      
      const report = `[전리품 목록]\n• 은화: ${silver}\n• 강철: ${steel}\n• 부품: ${component}\n• 플라스틸: ${plasteel}\n\n상단의 보물을 모두 탈취했습니다!`;
      
      if (this.encounterManager) {
          this.encounterManager.showEventModal({
              name: "💰 습격 대성공!",
              desc: report,
              type: 'positive'
          });
      }
      
      if (result) this.startPlacement(result);
      SoundManager.playSFX('assets/audio/encounter_success.mp3');
  }

  /**
   * [Hidden Event] 상단 습격 실패 (배상 청구)
   */
  handleCaravanRaidFailure() {
      const s = this.state;
      const lossMsg = [];
      
      // 1. 은화 차감 (현재의 30%)
      const silverLoss = Math.floor(s.silver * 0.3);
      s.silver -= silverLoss;
      if (silverLoss > 0) lossMsg.push(`• 은화: -${silverLoss}`);
      
      // 2. 다른 자원 중 하나를 무작위로 대량 차감
      const resources = ['steel', 'food', 'wood'];
      const target = resources[Math.floor(Math.random() * resources.length)];
      const currentAmount = s[target] || 0;
      const lossAmount = Math.floor(currentAmount * 0.4);
      s[target] -= lossAmount;
      const targetName = target === 'steel' ? '강철' : (target === 'food' ? '식량' : '목재');
      if (lossAmount > 0) lossMsg.push(`• ${targetName}: -${lossAmount}`);

      const report = `상단이 무사히 탈출하여 제국에 신고했습니다!\n\n[피해 내역]\n${lossMsg.join('\n')}\n\n보복으로 인해 자원이 차감되었습니다.`;
      
      if (this.encounterManager) {
          this.encounterManager.showEventModal({
              name: "⚖️ 배상 청구",
              desc: report,
              type: 'negative'
          });
      }
      
      SoundManager.playSFX('assets/audio/raid_alert.mp3');
  }

  /**
   * [Hidden Event] 울부짖는 칼날의 선택 보상 강제 지급
   */
  triggerHowlingBladeReward() {
    console.log("[App] Triggering Howling Blade Reward Sequence...");
    try {
        const result = GachaSystem.createSpecificWeapon('결속 단분자검', 'legendary', 'None');
        
        // 1. 강제 일시정지 해제 및 배치 모드 설정
        this.state.isPaused = false;
        this.placementMode = true;
        this.pendingGachaResult = result;
        
        // 2. 초기 마우스 위치 보정 (안 뜨는 현상 방지)
        if (!this.mousePos || (this.mousePos.x === 0 && this.mousePos.y === 0)) {
            this.mousePos = { x: this.renderer.width / 2, y: this.renderer.height / 2 };
        }

        this.ui.showNotification("피의 계약", "무기가 전장에 나타났습니다. 배치할 위치를 선택하세요.", "Legendary");
        this.ui.updateDisplays(this.state);
        
        console.log("[App] Placement Mode Active:", this.placementMode, this.pendingGachaResult);
    } catch (e) {
        console.error("[App] Reward Trigger Error:", e);
    }
  }
}

// 창 로드 시 앱 시작
window.addEventListener('DOMContentLoaded', () => {
    new App();
});
