import { GameState } from './core/GameState.js';
import { GameLoop } from './engine/GameLoop.js';
import { Renderer } from './engine/Renderer.js';
import { UIManager } from './ui/UIManager.js';
import { WaveManager } from './game/WaveManager.js';
import { Tower } from './game/Tower.js';
import { SpriteManager } from './engine/SpriteManager.js';
import { SoundManager } from './engine/SoundManager.js';

/**
 * Main Application Class
 * 림월드 TD의 모든 핵심 시스템을 제어합니다.
 */
class App {
  constructor() {
    this.state = new GameState();
    this.renderer = new Renderer('game-canvas');
    this.ui = new UIManager(this);

    // 1. 매니저 클래스 초기화
    SpriteManager.init();
    
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

    // 5. 웨이브 매니저 (init에서 초기화)
    this.waveManager = null;

    // 5. 게임 루프 설정
    this.loop = new GameLoop(
      (dt) => this.update(dt),
      () => this.render()
    );

    // 6. 입력 이벤트 (타워 선택 및 배치)
    this.renderer.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.renderer.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));

    this.init();
  }

  /**
   * 정착민 파견 작업 진행 및 자원 획득 로직
   */
  updateWorkDispatch(dt) {
    const state = this.state;
    const workerTypes = ['logging', 'mining', 'farming', 'research', 'trading'];
    
    workerTypes.forEach(type => {
      const workerCount = state.workers[type] || 0;
      if (workerCount > 0) {
        // [New] 지수함수 기반 효율 적용 (Diminishing Returns)
        // 공식: 인원수 ^ 0.75
        const efficiency = Math.pow(workerCount, 0.75);
        const speed = 5 * efficiency * dt;
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
    let baseAmount = 0;
    let resName = "";
    let bonusComponent = 0;
    let bonusLoot = "";
    
    // 확률 로직 미리 계산: 대박(10%), 실패(5%), 일반(85%)
    const rand = Math.random();
    let isJackpot = rand < 0.1;
    let isFailure = rand >= 0.1 && rand < 0.15;
    
    switch(type) {
      case 'logging': baseAmount = 5; resName = "목재"; break;
      case 'mining': 
        baseAmount = 3; resName = "강철"; 
        // 채광 보너스: 플라스틸(5%), 우라늄(10%), 비취(5%)
        if (!isFailure) {
            if (Math.random() < 0.05) { 
                const amt = Math.floor(Math.random() * 2) + 1; // 1~2
                s.plasteel += amt; bonusLoot += ` (플라스틸 +${amt}!)`; 
            }
            if (Math.random() < 0.1) { 
                const amt = Math.floor(Math.random() * 3) + 1; // 1~3
                s.uranium += amt; bonusLoot += ` (우라늄 +${amt}!)`; 
            }
            if (Math.random() < 0.05) { 
                const amt = Math.floor(Math.random() * 2) + 1; // 1~2
                s.jade += 1; bonusLoot += ` (비취 +${amt}!)`; 
            }
        }
        break;
      case 'farming': baseAmount = 5; resName = "식량"; break;
      case 'trading': 
        baseAmount = 10; resName = "은화"; 
        // 교역 보너스: 플라스틸(10%), 비취(5%)
        if (!isFailure) {
            if (Math.random() < 0.1) { 
                const amt = Math.floor(Math.random() * 3) + 1; // 1~3
                s.plasteel += amt; bonusLoot += ` (플라스틸 +${amt}!)`; 
            }
            if (Math.random() < 0.05) { 
                const amt = Math.floor(Math.random() * 2) + 1; // 1~2
                s.jade += amt; bonusLoot += ` (비취 +${amt}!)`; 
            }
        }
        break;
      case 'research': 
        baseAmount = 10; resName = "연구"; 
        if (!isFailure && Math.random() < 0.2) {
            const amt = Math.floor(Math.random() * 2) + 1; // 1~2
            bonusComponent = amt;
            bonusLoot += ` (부품 +${amt}!)`;
        }
        break;
    }


    let finalAmount = 0;
    if (isJackpot) {
        finalAmount = baseAmount * 3;
    } else if (isFailure) {
        finalAmount = 0;
        bonusComponent = 0;
    } else {
        finalAmount = Math.floor(baseAmount * (0.8 + Math.random() * 0.4));
        if (finalAmount < 1 && baseAmount > 0) finalAmount = 1;
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
      
      this.ui.addMiniNotification(`${u.weaponName} 판매 완료 (+${price} 은)`);
      this.ui.updateDisplays(this.state);
      return true;
    }
    return false;
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
   * 유닛 배치 대기 모드 진입
   */
  startPlacement(gachaResult) {
    this.placementMode = true;
    this.pendingGachaResult = gachaResult;
    this.ui.addMiniNotification("맵에서 배치할 위치를 클릭하세요.");
  }

  /**
   * 유닛 배치 확정
   */
  confirmPlacement() {
    const tower = new Tower(this.mousePos.x, this.mousePos.y, this.pendingGachaResult, this);
    tower.isBlueprint = false;
    this.units.push(tower);
    // this.state.population = this.units.length; <- 이 줄이 버그의 원인이었습니다. 인구는 구매 시 늘어나는 것이 아니라 식량 등에 의해 결정되어야 합니다.
    
    
    this.placementMode = false;
    this.pendingGachaResult = null;
    const grade = tower.weaponData.grade || 'Common';
    this.ui.showNotification("배치 완료", `${tower.weaponName}이(가) 전장에 배치되었습니다.`, grade);
  }

  handleEnemyDeath(reward, isBoss) {
    this.state.silver += reward;
    if (isBoss) {
      this.state.addResource('steel', 10);
      console.log("[Loot] 보스 처치! 강철 10 획득");
    }
  }

  handleWaveComplete() {
    console.log(`[Wave] ${this.state.waveNumber} 완료!`);
  }

  handleWaveStart(num) {
    this.state.waveNumber = num;
  }

  /**
   * 게임 상태 업데이트
   */
  update(dt) {
    const scaledDt = dt * this.state.timeScale;

    // 0. 기본 자금 수입 (2초당 1은)
    this.passiveSilverTimer += scaledDt;
    if (this.passiveSilverTimer >= 2.0) {
      this.state.silver += 1;
      this.passiveSilverTimer -= 2.0;
    }

    // [New] 작업 파견 진행 (v2)
    this.updateWorkDispatch(scaledDt);
    
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

    // 5. 필드 효과 (연막/독성) 업데이트
    this.fieldEffects = this.fieldEffects.filter(f => {
      f.duration -= scaledDt;
      return f.duration > 0;
    });

    // UI 동기화
    this.ui.updateDisplays(this.state);
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
      ctx.fillStyle = SpriteManager.getColor(this.pendingGachaResult.quality);
      ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
      
      ctx.strokeStyle = "rgba(0, 242, 255, 0.5)";
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(x, y, range, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
}

// 창 로드 시 앱 시작
window.addEventListener('DOMContentLoaded', () => {
    new App();
});
