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
import { ITEM_DB } from './game/WeaponData.js';

/**
 * Main Application Class
 * 림월드 TD의 모든 핵심 시스템을 제어합니다.
 */
class App {
  constructor() {
    window.app = this; // 전역 접근 허용 (UI 이벤트용)
    window.gameCore = this; // [Alias] WaveManager 등에서 보상 처리용으로 사용
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
    this.isItemTargeting = false;
    this.pendingItemId = null;
    this.mousePos = { x: 0, y: 0 };
    this.passiveSilverTimer = 0; // 2초당 1은 지급을 위한 타이머
    this.moodDecayTimer = 0; // 3초당 무드 감소 타이머

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
        const jadeBonus = up.trade * 0.01; // 레벨당 1% 확률 증가
        if (!isFailure) {
            if (Math.random() < 0.20 + tradeBonus) { 
                const amt = Math.floor((Math.random() * 4 + 2) * getBonus(up.trade)); // 획득량 상향
                s.plasteel += amt; bonusLoot += ` (플라스틸 +${amt}!)`; 
            }
            if (Math.random() < 0.015 + jadeBonus) { 
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

    // [New] 무드 이벤트 (기초 3% + 업그레이드 레벨당 2% 추가 확률)
    const moodProbBase = 0.03;
    const upLv = (type === 'logging') ? (s.upgrades.logging || 0) : (type === 'farming' ? (s.upgrades.farming || 0) : 0);
    const finalMoodProb = moodProbBase + (upLv * 0.02);

    if ((type === 'logging' || type === 'farming') && Math.random() < finalMoodProb) {
        const events = [
            { msg: "신비로운 꽃을 발견하여 정착민들이 잠시 기뻐합니다. (+5% 무드)", bonus: 5 },
            { msg: "정착지 근처의 자연경관을 감상하며 정신을 가다듬습니다. (+3% 무드)", bonus: 3 },
            { msg: "기분 좋은 바람이 불어와 작업 효율이 올랐습니다. (+2% 무드)", bonus: 2 }
        ];
        const evt = events[Math.floor(Math.random() * events.length)];
        s.mood = Math.min(100, s.mood + evt.bonus);
        this.ui.addMiniNotification(`[무드 보너스] ${evt.msg}`, 'jackpot');
    }
  }

  handleMouseMove(e) {
    const rect = this.renderer.canvas.getBoundingClientRect();
    this.mousePos.x = (e.clientX - rect.left) * (this.renderer.canvas.width / rect.width);
    this.mousePos.y = (e.clientY - rect.top) * (this.renderer.canvas.height / rect.height);
  }

  handleCanvasClick(e) {
    if (this.inputLock) return;

    // 마우스 위치 재계산 (이벤트 객체 기준)
    const rect = this.renderer.canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (this.renderer.canvas.width / rect.width);
    const clickY = (e.clientY - rect.top) * (this.renderer.canvas.height / rect.height);
    
    // 아이템 타겟팅 모드 처리
    if (this.isItemTargeting && this.pendingItemId) {
      this.confirmItemUsage(clickX, clickY);
      return;
    }

    // 배치 모드 처리
    if (this.placementMode && this.pendingGachaResult) {
      this.confirmPlacement();
      return;
    }

    let selectedAny = false;

    // [New] 몬스터 우선 선택 로직 (움직이는 적이므로 우선순위 부여)
    for (const en of this.enemies) {
        if (!en.active) continue;
        const dist = Math.hypot(en.x - clickX, en.y - clickY);
        // 판정 범위를 더욱 넉넉하게 (반경 + 35)
        if (dist < (en.radius + 35)) { 
            this.units.forEach(u2 => u2.selected = false);
            this.enemies.forEach(e2 => e2.selected = false);
            
            en.selected = true;
            this.ui.showEnemyDetail(en);
            selectedAny = true;
            console.log(`[Click] Monster selected: ${en.name || 'Enemy'}`);
            break; 
        }
    }

    // 2. 유닛 선택 로직 (몬스터가 선택되지 않았을 때)
    if (!selectedAny) {
        for (const u of this.units) {
          const dist = Math.hypot(u.x - clickX, u.y - clickY);
          if (dist < 35) {
            this.units.forEach(u2 => u2.selected = false);
            this.enemies.forEach(e2 => e2.selected = false);
            
            u.selected = true;
            this.ui.showUnitDetail(u);
            selectedAny = true;
            console.log(`[Click] Tower selected: ${u.weaponName}`);
            break; 
          }
        }
    }

    // 3. 선택 해제
    if (!selectedAny) {
      this.units.forEach(u => u.selected = false);
      this.enemies.forEach(en => en.selected = false);
      this.ui.hideUnitDetail();
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
   * 캔버스 우클릭 처리 (취소)
   */
  handleCanvasRightClick(e) {
    if (this.isItemTargeting) {
        this.isItemTargeting = false;
        this.pendingItemId = null;
        this.ui.addMiniNotification("아이템 사용 취소");
    } else if (this.placementMode) {
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
    
    // [New] 등급별 무드 보너스
    const moodBonus = { Epic: 5, Special: 5, Legendary: 12, Mythic: 30 };
    if (moodBonus[grade]) {
        this.state.mood = Math.min(100, this.state.mood + moodBonus[grade]);
    }

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
        // 은화 35%, 강철 40%, 플라스틸 20%
        if (rand < 0.35) {
            const amount = 2 + Math.floor(Math.random() * 5);
            const finalSilver = Math.floor(amount * silMul);
            s.silver += finalSilver;
            lootMsg = `은화 +${finalSilver}`;
        } else if (rand < 0.75) {
            const amount = 2 + Math.floor(Math.random() * 2);
            s.addResource('steel', amount);
            lootMsg = `강철 +${amount}`;
        } else if (rand < 0.95) {
            const amount = 2 + Math.floor(Math.random() * 2);
            s.addResource('plasteel', amount);
            lootMsg = `플라스틸 +${amount}`;
        }

        // [New/Fix] 현대 교육 기반 부품(Component) 추가 획득 로직 (기계 처치 시에만 발동)
        const eduLv = s.upgrades.education || 0;
        const compProb = 0.01 + (eduLv * 0.02); // 기본 1% + 레벨당 2% (최대 11%)
        if (Math.random() < compProb) {
            const amount = (eduLv >= 3) ? (1 + Math.floor(Math.random() * 2)) : 1; 
            s.addResource('component', amount);
            const compTxt = `부품 +${amount}`;
            lootMsg = lootMsg ? `${lootMsg}, ${compTxt}` : compTxt;
        }
    }

    // 4. 무드 회복 (처치당 1.0)
    s.mood = Math.min(100, (s.mood || 0) + 1.0);
    
    // 보스 전용 보상
    if (isBoss) {
      s.addResource('steel', 10);
      s.addResource('component', 1);
      s.mood = Math.min(100, s.mood + 5); // 보스 처치 시 대폭 상승
      this.ui.addMiniNotification(`[처치] 보스 제거! 강철+10, 부품+1, 무드+5%`, "info");
      SoundManager.playSFX('assets/audio/encounter_success.mp3'); // 보스 처치 쾌감 부여
    } else if (lootMsg) {
      // 모든 전리품 획득 시 [전리품] 태그와 함께 알림
      this.ui.addMiniNotification(`[전리품] ${lootMsg}`);
    }
  }

  handleWaveComplete() {
    console.log(`[Wave] ${this.state.waveNumber} 완료!`);
    // [New] 웨이브 클리어 시 무드 보너스 +10
    this.state.mood = Math.min(100, this.state.mood + 10);
    this.ui.addMiniNotification(`웨이브 ${this.state.waveNumber} 클리어! 정착민 무드 +10%`, "info");
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

    // [New] 무드 자연 감소 (4초당 -1)
    this.moodDecayTimer += scaledDt;
    if (this.moodDecayTimer >= 4.0) {
        this.state.mood = Math.max(0, this.state.mood - 1);
        this.moodDecayTimer -= 4.0;
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
      
      this.state.updateFoodThreshold();
      
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
          if (f.type === 'molotov') en.applyEffect('burn_fear', 0.5);
        }
      });

      return f.duration > 0;
    });

    // 6. 아이템 쿨타임 업데이트
    for (const key in this.state.itemCooldowns) {
        if (this.state.itemCooldowns[key] > 0) {
            this.state.itemCooldowns[key] = Math.max(0, this.state.itemCooldowns[key] - scaledDt);
        }
    }

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

    // [New] 보스 시간 초과 체크
    const timedOutBoss = this.enemies.find(e => e.active && e.isBoss && e.bossTimer <= 0);
    if (timedOutBoss) {
        const bName = timedOutBoss.name || "";
        
        if (bName.includes('암흑 모노리스')) {
            timedOutBoss.active = false;
            this.applyVoidPunishment("처치 실패");
        } else if (bName.includes('알파 트럼보')) {
            timedOutBoss.active = false;
            this.handleAlphaThrumboFailure();
        } else if (bName.includes('제국 근위대')) {
            timedOutBoss.active = false;
            this.handleImperialGuardFailure();
        } else {
            this.handleGameOver(`보스 처치 제한 시간(${timedOutBoss.bossTimerMax}초)이 초과되었습니다!`);
        }
    }

    // [Bug Fix] 적의 수가 100마리를 넘으면 게임 오버
    if (this.enemies.length >= 100) {
        this.handleGameOver("적의 수가 너무 많아 기지가 함락되었습니다! (100마리 도달)");
    }

    // [New] 특수 히든 레시피 체크
    this.checkSpecialEvolution();
  }

  /**
   * [Hidden Penalty] 공허의 응징 (모노리스 거절 또는 처치 실패 시)
   */
  applyVoidPunishment(reason = "거절") {
    const s = this.state;
    const results = [];

    if (reason === "거절") {
        // [거절] 가벼운 제물 패널티: 은화와 강철 일부 소실
        const silverLoss = Math.floor(s.silver * 0.2); // 현재 자산의 20%
        const steelLoss = Math.floor(s.steel * 0.2);
        
        s.silver = Math.max(0, s.silver - silverLoss);
        s.steel = Math.max(0, s.steel - steelLoss);
        
        if (silverLoss > 0) results.push(`• 은화: -${silverLoss}`);
        if (steelLoss > 0) results.push(`• 강철: -${steelLoss}`);
        
        const report = `당신은 공허의 부름을 거부하고 제물을 바쳐 그들을 달랬습니다. \n정착민들은 무사히 넘겼지만 자산의 일부를 소실했습니다. \n\n[소실 내역]\n${results.length > 0 ? results.join('\n') : "소실된 자산 없음"}`;
        
        if (this.encounterManager) {
            this.encounterManager.showEventModal({
                name: "🌑 공허의 공물",
                desc: report,
                type: 'info'
            });
        }
        this.ui.updateDisplays(s);
        return;
    }

    // [처치 실패] 기존의 가혹한 기술 퇴행 패널티
    // 1. 파견/생산 기술 일괄 하락 (-1)
    const prodTypes = ['logging', 'mining', 'farming', 'trade', 'education', 'artisan'];
    const koProd = {
        logging: '벌목', mining: '채광', farming: '농사',
        trade: '교역', education: '교육', artisan: '제작'
    };

    prodTypes.forEach(type => {
        if ((s.upgrades[type] || 0) > 0) {
            s.upgrades[type]--;
            results.push(`🛠️ ${koProd[type]} -1`);
        }
    });

    // 2. 전투 기술 무작위 소량 하락 (2~3단계)
    const combatTypes = ['sharp', 'blunt', 'ranged'];
    const koCombat = { sharp: '날붙이', blunt: '둔기', ranged: '원거리' };
    const lossCount = 2 + Math.floor(Math.random() * 2);
    
    const lostCombat = {};
    for (let i = 0; i < lossCount; i++) {
        const type = combatTypes[Math.floor(Math.random() * combatTypes.length)];
        if (s.upgrades[type] > 0) {
            s.upgrades[type]--;
            lostCombat[type] = (lostCombat[type] || 0) + 1;
        }
    }

    for (const [type, count] of Object.entries(lostCombat)) {
        results.push(`⚔️ ${koCombat[type]} -${count}`);
    }

    if (results.length > 0) {
        this.ui.addMiniNotification(reason === "처치 실패" ? "공허를 막아내는 데 실패했습니다!" : "정착지의 지식이 공허 속으로 증발합니다!", "failure");
        
        const title = reason === "처치 실패" ? "😱 공허의 역습" : "👁️ 공허의 응징";
        const descPrefix = reason === "처치 실패" ? "모노리스를 파괴하지 못해 정착지가 오염되었습니다." : "공허의 부름을 모독한 대가로 정착민들의 의식이 뒤엉킵니다.";

        if (this.encounterManager) {
            this.encounterManager.showEventModal({
                name: title,
                desc: `${descPrefix} \n쌓아올린 기술과 숙련도가 신기루처럼 사라졌습니다. \n\n` + results.join('\n'),
                type: 'negative'
            });
        }
    } else {
        this.ui.addMiniNotification("공허의 기운이 조용히 물러납니다.", "info");
    }
    
    this.ui.updateDisplays(s);
    SoundManager.playSFX('assets/audio/bad_alert.mp3');
  }

  /**
   * [Hidden Penalty] 알파 트럼보 처치 실패 (인구 감소)
   */
  handleAlphaThrumboFailure() {
    const lossCount = 1 + Math.floor(Math.random() * 4); // 1~4명 무작위 사망
    const actualLoss = Math.min(this.state.population - 1, lossCount); // 최소 1명은 생존 보장
    
    if (actualLoss > 0) {
        let remainingToKill = actualLoss;
        
        // 1. 먼저 대기 인구에서 차감
        const idleLoss = Math.min(this.state.idlePopulation, remainingToKill);
        this.state.idlePopulation -= idleLoss;
        remainingToKill -= idleLoss;
        
        // 2. 남은 사망자가 있다면 파견 인원(workers) 중에서 무작위로 선별하여 사망 처리
        if (remainingToKill > 0) {
            const workerTypes = ['logging', 'mining', 'farming', 'research', 'trading'];
            const lostJobs = [];

            while (remainingToKill > 0) {
                // 현재 인원이 있는 작업 종류만 필터링
                const activeJobs = workerTypes.filter(type => this.state.workers[type] > 0);
                if (activeJobs.length === 0) break; // 더 이상 죽일 작업 인원 없음

                const targetJob = activeJobs[Math.floor(Math.random() * activeJobs.length)];
                this.state.workers[targetJob]--;
                remainingToKill--;
                lostJobs.push(targetJob);
            }
            
            if (lostJobs.length > 0) {
                const jobKo = { logging: '벌목', mining: '채광', farming: '농사', research: '연구', trading: '교역' };
                const jobSummary = lostJobs.map(j => jobKo[j] || j).join(', ');
                console.log(`[Death] 파견 인원 사망 발생: ${jobSummary}`);
            }
        }

        this.state.population -= actualLoss;
        this.state.updateFoodThreshold(); // 식량 요구량 재계산
        
        this.ui.addMiniNotification(`알파 트럼보의 습격으로 정착민 ${actualLoss}명을 잃었습니다...`, "failure");
        if (this.encounterManager) {
            this.encounterManager.showEventModal({
                name: "💀 비극: 사냥꾼들의 전멸",
                desc: `날뛰는 알파 트럼보를 저지하지 못했습니다. 분노한 짐승은 정착지에 큰 상처를 남기고 사라졌으며, 이 과정에서 용감했던 정착민 ${actualLoss}명이 끔찍하게 목숨을 잃었습니다. \n\n(사망자 중 일부는 작업 현장에서 참변을 당했습니다.)`,
                type: 'negative'
            });
        }
    } else {
        this.ui.addMiniNotification("알파 트럼보가 분노했지만 기적적으로 인명 피해는 없었습니다.", "info");
    }
    
    this.ui.updateDisplays(this.state);
    SoundManager.playSFX('assets/audio/bad_alert.mp3');
  }

  /**
   * [Hidden Penalty] 제국 근위대 처치 실패 (자원 약탈)
   */
  handleImperialGuardFailure() {
    const s = this.state;
    // 은화 30% 및 주요 자원 소실
    const lossSilver = Math.floor(s.silver * 0.3);
    s.silver -= lossSilver;
    
    s.addResource('steel', -50);
    s.addResource('plasteel', -20);
    s.addResource('component', -5);

    this.ui.addMiniNotification("제국의 징벌로 인해 막대한 자원을 몰수당했습니다.", "failure");
    if (this.encounterManager) {
        this.encounterManager.showEventModal({
            name: "📉 제국의 분노: 징벌적 차압",
            desc: "제국 근위대의 권위에 도전했으나 그들을 굴복시키지 못했습니다. 제국은 보복으로 정착지의 창고를 털어갔으며, 막대한 양의 은화와 핵심 부품들을 강제로 차압했습니다.",
            type: 'negative'
        });
    }
    this.ui.updateDisplays(s);
    SoundManager.playSFX('assets/audio/bad_alert.mp3');
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

    // 7. 아이템 타겟팅 모드 렌더링
    if (this.isItemTargeting && this.pendingItemId) {
        const itemData = ITEM_DB[this.pendingItemId];
        const radius = itemData ? itemData.radius : 100;
        const ctx = this.renderer.ctx;

        ctx.save();
        ctx.strokeStyle = "rgba(255, 200, 0, 0.9)"; // 노란색 타겟팅 링
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(this.mousePos.x, this.mousePos.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 200, 0, 0.1)";
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

    if (this.state.itemCooldowns[type] > 0) {
        this.ui.addMiniNotification(`재사용 대기중! (${Math.ceil(this.state.itemCooldowns[type])}초)`, "failure");
        return;
    }

    // 궤도 폭격은 전장 전체 즉시 발동
    if (type === 'orbital_strike') {
        const targets = this.enemies.filter(en => !en.isBoss);
        targets.forEach(en => {
            en.flashTimer = 0.5;
            // 즉사 로직 (보상 처리 포함)
            const died = en.takeDamage(99999999, 1.0, 'instakill', 'Hidden');
            if (died) this.handleEnemyDeath(en);
        });
        this.ui.addMiniNotification("궤도 폭격 가동!", "Legendary");
        this.state.items[type]--;
        this.state.itemCooldowns[type] = ITEM_DB[type].cooldown || 60;
        this.ui.updateDisplays(this.state);
        return;
    }

    // 그 외 투척류 아이템은 지점 타겟팅 모드로 진입
    this.isItemTargeting = true;
    this.pendingItemId = type;
    this.ui.addMiniNotification(`[${type}] 타격 위치를 선택하세요. (우클릭 취소)`, "info");
  }

  /**
   * [New] 자원 도박(정제/분해/거래) 로직
   */
  gamble(type) {
    if (this.state.isPaused) return;
    const s = this.state;
    const costs = { wood: 200, steel: 200, silver: 300 };
    const cost = costs[type];

    if (s[type] < cost) {
        this.ui.addMiniNotification("자원이 부족합니다!", "failure");
        return;
    }

    s[type] -= cost;
    const rand = Math.random();
    let result = { msg: "정제 실패: 쓸모없는 찌꺼기만 남았습니다.", grade: "info" };

    if (type === 'wood') {
        // 목재 도박 (1% 잭팟 추가)
        if (rand < 0.01) { s.silver += 1000; result = { msg: "[정제 잭팟] 나무 속의 보물을 발견했습니다! (+1000 은)", grade: "Mythic" }; }
        else if (rand < 0.06) { s.component += 1; result = { msg: "목재 정제 중 부품 발견! (+1 부품)", grade: "Legendary" }; }
        else if (rand < 0.16) { s.uranium += 3; result = { msg: "심층 우라늄 조각 채취 (+3 우라늄)", grade: "Rare" }; }
        else if (rand < 0.36) { s.plasteel += 10; result = { msg: "목재 성분에서 플라스틸 정제 (+10 플라스틸)", grade: "Uncommon" }; }
        else if (rand < 0.51) { s.steel += 40; result = { msg: "불순물을 제거해 강철 확보 (+40 강철)", grade: "Common" }; }
    } else if (type === 'steel') {
        // 강철 도박 (1% 잭팟 추가)
        if (rand < 0.01) { s.silver += 2000; result = { msg: "[분해 잭팟] 정밀 기계 부품 뭉치를 팔았습니다! (+2000 은)", grade: "Mythic" }; }
        else if (rand < 0.06) { s.jade += 1; result = { msg: "공업용 비취 결정 발견! (+1 비취)", grade: "Legendary" }; }
        else if (rand < 0.16) { s.component += 2; result = { msg: "추출된 정밀 부품 (+2 부품)", grade: "Epic" }; }
        else if (rand < 0.36) { s.uranium += 6; result = { msg: "농축 우라늄 추출 성공 (+6 우라늄)", grade: "Rare" }; }
        else if (rand < 0.66) { s.plasteel += 20; result = { msg: "강철을 분해해 플라스틸 확보 (+20 플라스틸)", grade: "Uncommon" }; }
    } else if (type === 'silver') {
        // 은화 도박 (암시장 거래: 소모 300)
        if (rand < 0.01) { s.silver += 1500; result = { msg: "[암시장 잭팟] 대박 거래 성사! (+1500 은)", grade: "Mythic" }; }
        else if (rand < 0.06) { s.component += 1; result = { msg: "암시장에서 부품을 구매했습니다. (+1 부품)", grade: "Legendary" }; }
        else if (rand < 0.20) { s.uranium += 4; result = { msg: "비밀 거래로 우라늄 입수 (+4 우라늄)", grade: "Rare" }; }
        else if (rand < 0.45) { s.plasteel += 12; result = { msg: "암시장 플라스틸 거래 성공 (+12 플라스틸)", grade: "Uncommon" }; }
    }

    const isSuccess = result.grade !== 'info';
    const title = isSuccess ? (type === 'silver' ? "암시장 거래 성공" : "자원 정제 성공") : (type === 'silver' ? "암시장 거래 실패" : "자원 정제 실패");
    const displayGrade = isSuccess ? result.grade : 'failure';
    
    this.ui.showNotification(title, result.msg, displayGrade);
    
    this.ui.updateDisplays(s);
    if (isSuccess) SoundManager.playSFX('assets/audio/buy.mp3');
  }

  /**
   * 아이템 지점 타격 실행
   */
  confirmItemUsage(x, y) {
    const type = this.pendingItemId;
    const item = ITEM_DB[type];
    if (!item) return;

    const radius = item.radius || 100;
    const targets = this.enemies.filter(en => Math.hypot(en.x - x, en.y - y) <= radius);
    
    // 1. 즉발형 효과 처리 및 시각 효과 생성
    if (type === 'frag_grenade') {
        const effectDuration = 0.4;
        const effect = {
            type: 'explosion_frag', x: x, y: y, radius: radius, duration: effectDuration,
            render: (ctx) => {
                ctx.save();
                const alpha = (effect.duration / effectDuration) * 0.5;
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 2})`;
                ctx.lineWidth = 2; ctx.stroke();
                ctx.restore();
            }
        };
        this.fieldEffects.push(effect);
    } else if (type === 'pulse_grenade') {
        const effectDuration = 0.5;
        const effect = {
            type: 'explosion_pulse', x: x, y: y, radius: radius, duration: effectDuration,
            render: (ctx) => {
                ctx.save();
                const alpha = (effect.duration / effectDuration) * 0.7;
                ctx.fillStyle = `rgba(0, 242, 255, ${alpha * 0.4})`;
                ctx.shadowBlur = 20; ctx.shadowColor = '#00f2ff';
                ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = `rgba(0, 242, 255, ${alpha})`;
                ctx.lineWidth = 3; ctx.stroke();
                ctx.restore();
            }
        };
        this.fieldEffects.push(effect);
    } else if (type === 'psychic_lance') {
        const effectDuration = 0.6;
        const effect = {
            type: 'explosion_psychic', x: x, y: y, radius: radius, duration: effectDuration,
            render: (ctx) => {
                ctx.save();
                const alpha = (effect.duration / effectDuration) * 0.8;
                ctx.fillStyle = `rgba(255, 0, 255, ${alpha * 0.3})`; // 보라색 정신 파동
                ctx.shadowBlur = 30; ctx.shadowColor = '#ff00ff';
                ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.lineWidth = 4; ctx.stroke();
                // 중심부에 작은 원 추가 (집중 사격 느낌)
                ctx.beginPath(); ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            }
        };
        this.fieldEffects.push(effect);
    }

    targets.forEach(en => {
        en.flashTimer = 0.3;
        switch (type) {
            case 'frag_grenade':
                en.takeDamage(250, 0.2, 'frag_stun', 'Common', 0);
                break;
            case 'pulse_grenade':
                en.takeDamage(50, 0.5, 'emp', 'Uncommon', 0);
                en.shield = 0; // [New] 보호막 즉시 제거
                break;
            case 'psychic_lance':
                // 보스일 경우 15초 스턴, 일반 적일 경우 5초 스턴
                // Enemy.js 로직상 stunTimer > 0 일 때 bossTimer(제한시간) 감소가 자동으로 중단됨
                if (en.isBoss) {
                    en.stunTimer = 15.0;
                    this.ui.addMiniNotification("보스 무력화! (제한 시간 일시 정지)", "Legendary");
                } else {
                    en.stunTimer = 5.0;
                }
                break;
        }
    });

    // 2. 장판형 효과 생성 (지점에 1회 생성)
    if (type === 'smoke_launcher') {
        this.fieldEffects.push({
            type: 'smoke', x: x, y: y, radius: radius, duration: 8.0,
            render: (ctx) => {
                ctx.save();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                ctx.shadowBlur = 10; ctx.shadowColor = '#fff';
                ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
        });
    } else if (type === 'toxin_grenade') {
        this.fieldEffects.push({
            type: 'toxin', x: x, y: y, radius: radius, duration: 6.0,
            render: (ctx) => {
                ctx.save();
                ctx.fillStyle = 'rgba(46, 204, 113, 0.3)';
                ctx.shadowBlur = 15; ctx.shadowColor = '#2ecc71';
                ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
        });
    } else if (type === 'molotov') {
        this.fieldEffects.push({
            type: 'molotov', x: x, y: y, radius: radius, duration: 7.0,
            render: (ctx) => {
                ctx.save();
                ctx.fillStyle = 'rgba(230, 126, 34, 0.35)'; // 주황색 화염
                ctx.shadowBlur = 20; ctx.shadowColor = '#e67e22';
                ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
        });
    }

    const itemName = item.name || type;
    this.ui.addMiniNotification(`${itemName} 투척!`, "info");
    
    this.state.items[type]--;
    this.state.itemCooldowns[type] = item.cooldown || 10;
    this.isItemTargeting = false;
    this.pendingItemId = null;
    this.ui.updateDisplays(this.state);
    
    // 이펙트 레이어 등에 연출 추가 가능
    SoundManager.playSFX('assets/audio/buy.mp3'); // 던지는 소리 등으로 대체 가능
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
   * [Hidden Reward] 공허의 지식 (전투/생산 비약적 발전)
   */
  applyVoidWisdomReward() {
    const s = this.state;
    const results = [];
    
    // 1. 전투 기술 전수 (랜덤 3~5단계)
    const combatTypes = ['sharp', 'blunt', 'ranged'];
    const koCombat = { sharp: '날붙이', blunt: '둔기', ranged: '원거리' };
    const upgradeCount = 3 + Math.floor(Math.random() * 3); // 3, 4, 5 중 하나
    
    const upgradedTypes = {};
    for (let i = 0; i < upgradeCount; i++) {
        const type = combatTypes[Math.floor(Math.random() * combatTypes.length)];
        s.upgrades[type]++;
        upgradedTypes[type] = (upgradedTypes[type] || 0) + 1;
    }
    
    for (const [type, count] of Object.entries(upgradedTypes)) {
        results.push(`⚔️ ${koCombat[type]} +${count}`);
    }

    // 2. 생산 기술 도약 (전체 생산/기술 +1)
    const prodTypes = ['logging', 'mining', 'farming', 'trade', 'education', 'artisan'];
    const koProd = {
        logging: '벌목', mining: '채광', farming: '농사',
        trade: '교역', education: '교육', artisan: '제작'
    };
    
    prodTypes.forEach(type => {
        if ((s.upgrades[type] || 0) < 5) {
            s.upgrades[type]++;
            results.push(`🛠️ ${koProd[type]} +1`);
        }
    });

    // 3. 결과 모달 표시 및 UI 갱신
    this.ui.updateDisplays(s);
    this.units.forEach(u => { if (u.setupStats) u.setupStats(); }); // 전투력 즉시 반영

    const report = "공허의 지식이 정착민들의 의식 속에 직접 새겨졌습니다. \n정착지의 전투 및 생산 기술이 한 단계 진화했습니다! \n\n" + results.join('\n');
    
    if (this.encounterManager) {
        this.encounterManager.showEventModal({
            name: "🌑 공허의 지식 흡수",
            desc: report,
            type: 'positive'
        });
    }
    
    SoundManager.playSFX('assets/audio/encounter_success.mp3');
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
