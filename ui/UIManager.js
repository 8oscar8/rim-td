import { GachaSystem } from '../game/GachaSystem.js';

/**
 * UIManager.js
 * 게임의 최소 UI 요소와 통신합니다. (Clean Slate 버전)
 */
export class UIManager {
  constructor(app) {
    this.app = app;
    this.fetchElements();
    this.initEvents();
  }

  fetchElements() {
    // 1. 상태 값 정보
    this.waveVal = document.getElementById('wave-val');
    this.timerVal = document.getElementById('timer-val');
    this.popVal = document.getElementById('pop-val');
    this.enemyVal = document.getElementById('enemy-val');
    this.silverVal = document.getElementById('silver-val');

    // 2. 자원 정보
    this.resWood = document.getElementById('res-wood');
    this.resSteel = document.getElementById('res-steel');
    this.resPlasteel = document.getElementById('res-plasteel');
    this.resUranium = document.getElementById('res-uranium');
    this.resJade = document.getElementById('res-jade');
    this.resComponent = document.getElementById('res-component');
    this.resFood = document.getElementById('res-food');
    this.resResearch = document.getElementById('res-research');

    // 3. 작업 관리 및 기타
    this.idlePopVal = document.getElementById('idle-pop-val');
    this.workPlusBtns = document.querySelectorAll('.btn-circle.plus');
    this.workMinusBtns = document.querySelectorAll('.btn-circle.minus');
    
    // 4. 탭 관련
    this.tabBtns = document.querySelectorAll('.tab-btn');
    this.tabPanes = document.querySelectorAll('.tab-pane');

    // 5. 버튼들
    this.speedBtns = document.querySelectorAll('.speed-btn');
    this.buyRandomBtn = document.getElementById('btn-buy-random');
    this.buyAdvancedBtn = document.getElementById('btn-buy-advanced');
    this.sellUnitsBtn = document.getElementById('btn-sell-units');
    this.techUpBtn = document.getElementById('btn-tech-upgrade');
    this.craftBtns = document.querySelectorAll('.shop-btn.craft');
    
    this.upgradeMeleeBtn = document.getElementById('up-melee');
    this.upgradeBluntBtn = document.getElementById('up-blunt');
    this.upgradeRangedBtn = document.getElementById('up-ranged');

    // 6. 상세 정보 창 요소
    this.detailName = document.getElementById('detail-name');
    this.detailGrade = document.getElementById('detail-grade');
    this.detailType = document.getElementById('detail-type');
    this.detailDps = document.getElementById('detail-dps');
    this.detailAtk = document.getElementById('detail-atk');
    this.detailRange = document.getElementById('detail-range');
    this.detailSpd = document.getElementById('detail-spd');
    this.detailAp = document.getElementById('detail-ap');
    this.techLevelVal = document.getElementById('tech-level-val');
    
    // 7. DPM 표시 요소
    this.bluntDpmVal = document.getElementById('blunt-dpm');
    this.sharpDpmVal = document.getElementById('sharp-dpm');
    this.rangedDpmVal = document.getElementById('ranged-dpm');

    // 8. 추가 상세 정보 요소
    this.detailUpLv = document.getElementById('detail-up-lv');
    this.detailAtkBonus = document.getElementById('detail-atk-bonus');
  }

  initEvents() {
    console.log("[UIManager] 프리미엄 탭 시스템 바인딩 완료.");

    // 탭 전환 핸들러
    this.tabBtns.forEach(btn => {
      btn.onclick = () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      };
    });

    // 속도 조절
    this.speedBtns.forEach(btn => {
      btn.onclick = () => {
        this.speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const speed = parseFloat(btn.textContent);
        if (this.app.state) this.app.state.timeScale = speed;
      };
    });

    // 작업자 배정 이벤트 (v2)
    this.workPlusBtns.forEach(btn => {
      btn.onclick = (e) => {
        const type = e.target.getAttribute('data-type');
        if (this.app.state.idlePopulation > 0) {
          this.app.state.workers[type]++;
          this.app.state.idlePopulation--;
        }
      };
    });

    this.workMinusBtns.forEach(btn => {
      btn.onclick = (e) => {
        const type = e.target.getAttribute('data-type');
        if (this.app.state.workers[type] > 0) {
          this.app.state.workers[type]--;
          this.app.state.idlePopulation++;
        }
      };
    });

    // 1. 일반 뽑기 (50 은)
    if (this.buyRandomBtn) {
      this.buyRandomBtn.onclick = () => {
        if (this.app.state.silver >= 50) {
          this.app.state.silver -= 50;
          const result = GachaSystem.draw(0);
          this.app.startPlacement(result);
        } else {
          alert("은이 부족합니다!");
        }
      };
    }

    // 2. 고급 무기 상자 (1000 은)
    if (this.buyAdvancedBtn) {
      this.buyAdvancedBtn.onclick = () => {
        if (this.app.state.silver >= 1000) {
          this.app.state.silver -= 1000;
          const result = GachaSystem.drawAdvanced(1); // 장인 레벨 보너스 적용
          this.app.startPlacement(result);
        } else {
          alert("은이 부족합니다! (1000 은 필요)");
        }
      };
    }

    // 3. 판매 (5개 250 은)
    if (this.sellUnitsBtn) {
      this.sellUnitsBtn.onclick = () => {
        const cost = 250;
        // 실제 유닛 제거 로직은 App에서 처리해야 하지만 일단 자원만 추가 예시
        this.app.state.silver += cost;
        this.showNotification(`유닛 판매 성공`, `선택한 유닛을 판매하여 ${cost} 은을 획득했습니다.`);
        this.updateDisplays(this.app.state);
      };
    }

    // 4. 기술 업그레이드 (v2: 은화 + 연구 수치)
    if (this.techUpBtn) {
      this.techUpBtn.onclick = () => {
        const levels = ['primitive', 'advanced', 'spacer', 'ultra'];
        const currIdx = levels.indexOf(this.app.state.techLevel);
        if (currIdx >= levels.length - 1) return;

        // 비용 결정 (산업: 200/100, 우주: 500/300, 초월: 1000/1000)
        let sCost = 200, rCost = 100;
        if (currIdx === 1) { sCost = 500; rCost = 300; }
        else if (currIdx === 2) { sCost = 1000; rCost = 1000; }

        if (this.app.state.silver >= sCost && this.app.state.researchPoints >= rCost) {
          this.app.state.silver -= sCost;
          this.app.state.researchPoints -= rCost;
          this.app.state.techLevel = levels[currIdx + 1];
          this.app.showNotification(`기술 발전 완료`, `기술 수준이 ${this.app.state.techLevel}로 업그레이드되었습니다.`);
        } else {
          alert("자원이 부족합니다!");
        }
        this.updateDisplays(this.app.state);
      };
    }

    // 5. 무기 제작
    this.craftBtns.forEach(btn => {
      btn.onclick = () => {
        const grade = btn.getAttribute('data-grade');
        // 간소화된 제작 체크 로직 (실제 자원 소모 로직 추가 필요)
        if (this.app.state.silver >= 500) { 
           this.app.state.silver -= 500;
           const result = GachaSystem.drawSpecificGrade(grade, 1);
           if (result) {
             this.app.startPlacement(result);
           }
        } else {
           alert("자원이 부족합니다!");
        }
      };
    });

    // 업그레이드 버튼 이벤트
    const handleUpgrade = (type) => {
      const s = this.app.state;
      const currentLevel = s.upgrades[type] || 0;
      const nextLevelCost = currentLevel + 1;

      // 자원 매핑 (이미지 및 요청 사항 기반)
      const resourceMap = {
        blunt: ['silver', 'steel'],
        sharp: ['wood', 'silver'],
        ranged: ['plasteel', 'silver']
      };
      
      const resKeys = resourceMap[type];
      
      // 자원 체크
      let canAfford = true;
      resKeys.forEach(res => {
        if (s[res] < nextLevelCost) canAfford = false;
      });

      if (canAfford) {
        // 자원 소모
        resKeys.forEach(res => {
          s[res] -= nextLevelCost;
        });
        
        // 업그레이드 레벨 증가
        s.upgrades[type]++;
        this.showNotification(`${type} 훈련 완료`, `공격력이 10% 증가했습니다. (현재 Lv.${s.upgrades[type]})`);
      } else {
        alert("자원이 부족합니다!");
      }
      this.updateDisplays(s);
    };

    if (this.upgradeBluntBtn) this.upgradeBluntBtn.onclick = () => handleUpgrade('blunt');
    if (this.upgradeMeleeBtn) this.upgradeMeleeBtn.onclick = () => handleUpgrade('sharp');
    if (this.upgradeRangedBtn) this.upgradeRangedBtn.onclick = () => handleUpgrade('ranged');
  }

  switchTab(tabId) {
    this.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    this.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabId}`);
    });
  }

  showNotification(title, text) {
    const banner = document.getElementById('notification-banner');
    const t = document.getElementById('notif-title');
    const x = document.getElementById('notif-text');
    if (banner && t && x) {
      t.textContent = title;
      x.textContent = text;
      banner.classList.remove('hidden');
      setTimeout(() => banner.classList.add('hidden'), 3500);
    }
  }

  showUnitDetail(tower) {
    if (!tower || !tower.weaponData) return;
    try {
      // 품질 이름 매핑
      const qualNames = { awful: '끔찍', normal: '평범', excellent: '완벽', legendary: '전설' };
      const qualText = qualNames[tower.quality.toLowerCase()] || tower.quality;
      
      const isRanged = tower.weaponType === 'ranged';
      // 원거리면 품질+무기명, 근거리면 품질+재질+무기명
      if (isRanged) {
        this.detailName.textContent = `${qualText} ${tower.weaponName}`;
      } else {
        this.detailName.textContent = `${qualText} ${tower.material} ${tower.weaponName}`;
      }
      
      this.detailGrade.textContent = `[${tower.weaponData.grade || 'Common'}]`;
      
      let typeKey = tower.weaponType || 'blunt';
      if (typeKey === 'melee') typeKey = 'sharp';
      
      const typeNames = { blunt: '둔기', sharp: '날붙이', ranged: '원거리' };
      this.detailType.textContent = typeNames[typeKey] || typeKey;
      
      // 공격력 및 업그레이드 정보 계산
      const base = tower.baseDamage || 0;
      const total = tower.damage || base;
      const bonus = total - base;
      const upLv = (this.app.state.upgrades[typeKey]) || 0;
      
      const spd = tower.attackSpeed || 1;
      
      this.detailDps.textContent = (total * spd).toFixed(1);
      this.detailAtk.textContent = Math.floor(base);
      if (this.detailAtkBonus) this.detailAtkBonus.textContent = `(+${Math.floor(bonus)} 훈련)`;
      if (this.detailUpLv) this.detailUpLv.textContent = upLv;
      
      this.detailRange.textContent = tower.range || 0;
      this.detailSpd.textContent = `${spd.toFixed(2)}/s`;
      
      // 방관 정보 (선택 사항)
      const apEl = document.getElementById('detail-ap');
      if (apEl) apEl.textContent = `${Math.floor(tower.ap * 100)}%`;
      
    } catch (e) {
      console.error("UI Detail Update Error:", e);
    }
  }

  updateDisplays(state) {
    if (!state) return;

    if (this.waveVal) this.waveVal.textContent = state.waveNumber;
    if (this.popVal) this.popVal.textContent = state.population;
    if (this.silverVal) this.silverVal.textContent = Math.floor(state.silver);
    if (this.enemyVal) this.enemyVal.textContent = state.enemies ? state.enemies.length : 0;
    if (this.techLevelVal) {
      const names = { primitive: '원시 (Primitive)', advanced: '산업 (Advanced)', spacer: '우주 (Spacer)', ultra: '초월 (Ultra)' };
      this.techLevelVal.textContent = names[state.techLevel] || state.techLevel;
    }

    // 선택된 유닛 정보 실시간 갱신
    const selectedUnit = this.app.units.find(u => u.selected);
    if (selectedUnit) {
      this.showUnitDetail(selectedUnit);
    }

    if (this.popVal) this.popVal.textContent = state.population;
    
    // 자원 업데이트
    if (this.resWood) this.resWood.textContent = Math.floor(state.wood || 0);
    if (this.resSteel) this.resSteel.textContent = Math.floor(state.steel || 0);
    if (this.resPlasteel) this.resPlasteel.textContent = Math.floor(state.plasteel || 0);
    if (this.resUranium) this.resUranium.textContent = Math.floor(state.uranium || 0);
    if (this.resJade) this.resJade.textContent = Math.floor(state.jade || 0);
    if (this.resComponent) this.resComponent.textContent = Math.floor(state.component || 0);
    if (this.resFood) {
      this.resFood.textContent = `${Math.floor(state.food || 0)}/${state.foodToNextPop || 100}`;
    }
    if (this.resResearch) this.resResearch.textContent = Math.floor(state.researchPoints || 0);



    // DPM 합계 계산 및 업데이트
    let bluntDpm = 0;
    let sharpDpm = 0;
    let rangedDpm = 0;
    
    this.app.units.forEach(u => {
        const dpm = u.damage * u.attackSpeed * 60;
        if (u.weaponType === 'blunt') bluntDpm += dpm;
        else if (u.weaponType === 'sharp') sharpDpm += dpm;
        else if (u.weaponType === 'ranged') rangedDpm += dpm;
    });

    if (this.bluntDpmVal) this.bluntDpmVal.textContent = Math.floor(bluntDpm);
    if (this.sharpDpmVal) this.sharpDpmVal.textContent = Math.floor(sharpDpm);
    if (this.rangedDpmVal) this.rangedDpmVal.textContent = Math.floor(rangedDpm);

    // 5. 버튼 활성화/비활성화 및 비용 업데이트
    const canBuyRandom = state.silver >= 50;
    if (this.buyRandomBtn) {
      this.buyRandomBtn.disabled = !canBuyRandom;
      this.buyRandomBtn.style.opacity = canBuyRandom ? "1" : "0.4";
      this.buyRandomBtn.style.filter = canBuyRandom ? "none" : "grayscale(0.5)";
    }

    const canBuyAdvanced = state.silver >= 1000;
    if (this.buyAdvancedBtn) {
        this.buyAdvancedBtn.disabled = !canBuyAdvanced;
        this.buyAdvancedBtn.style.opacity = canBuyAdvanced ? "1" : "0.4";
        this.buyAdvancedBtn.style.filter = canBuyAdvanced ? "none" : "grayscale(0.5)";
    }

    // 기술 업그레이드 버튼 및 비용 업데이트
    if (this.techUpBtn) {
        const levels = ['primitive', 'advanced', 'spacer', 'ultra'];
        const currIdx = levels.indexOf(state.techLevel);
        const isMax = currIdx >= levels.length - 1;
        
        if (isMax) {
            this.techUpBtn.disabled = true;
            this.techUpBtn.textContent = "최고 기술 도달";
            this.techUpBtn.style.opacity = "0.4";
        } else {
            let sCost = 200, rCost = 100;
            if (currIdx === 1) { sCost = 500; rCost = 300; }
            else if (currIdx === 2) { sCost = 1000; rCost = 1000; }
            
            const costS = document.getElementById('tech-cost-silver');
            const costR = document.getElementById('tech-cost-research');
            if (costS) costS.textContent = sCost;
            if (costR) costR.textContent = rCost;

            const canUp = state.silver >= sCost && state.researchPoints >= rCost;
            this.techUpBtn.disabled = !canUp;
            this.techUpBtn.style.opacity = canUp ? "1" : "0.4";
        }
    }

    // 제작 버튼 상태 업데이트
    if (this.craftBtns) {
      this.craftBtns.forEach(btn => {
        const grade = btn.getAttribute('data-grade');
        let canCraft = false;
        if (grade === 'Rare') canCraft = state.wood >= 30 && state.steel >= 30;
        else if (grade === 'Epic') canCraft = state.component >= 50 && state.plasteel >= 10;
        else if (grade === 'Legendary') canCraft = state.plasteel >= 30 && state.uranium >= 20 && state.component >= 100;
        else if (grade === 'Mythic') canCraft = state.plasteel >= 50 && state.uranium >= 30 && state.component >= 300;
        
        btn.disabled = !canCraft;
        btn.style.opacity = canCraft ? "1" : "0.4";
        btn.style.pointerEvents = canCraft ? "auto" : "none";
      });
    }

    // 훈련 및 비용 업데이트
    const updateUpgradeStatus = (btn, type) => {
        if (!btn) return;
        const lv = state.upgrades[type] || 0;
        const next = lv + 1;
        const el1 = document.getElementById(`${type}-cost-1`);
        const el2 = document.getElementById(`${type}-cost-2`);
        if (el1) el1.textContent = next;
        if (el2) el2.textContent = next;

        let hasRes = false;
        if (type === 'blunt') hasRes = state.silver >= next && state.steel >= next;
        else if (type === 'sharp') hasRes = state.wood >= next && state.silver >= next;
        else if (type === 'ranged') hasRes = state.plasteel >= next && state.silver >= next;

        btn.disabled = !hasRes;
        btn.style.opacity = hasRes ? "1" : "0.4";
        btn.style.filter = hasRes ? "none" : "grayscale(1)";
    };

    updateUpgradeStatus(this.upgradeBluntBtn, 'blunt');
    updateUpgradeStatus(this.upgradeMeleeBtn, 'sharp');
    updateUpgradeStatus(this.upgradeRangedBtn, 'ranged');


    // 6. 작업 진행률 표시 및 업데이트
    const workerTypes = ['logging', 'mining', 'farming', 'research', 'trading'];
    workerTypes.forEach(type => {
      const countEl = document.getElementById(`work-${type}`);
      if (countEl) countEl.textContent = state.workers[type] || 0;
      
      // 진행 바 및 퍼센트/배율 업데이트
      const bar = document.getElementById(`bar-${type}`);
      if (bar) {
        const progress = state.workProgress[type] || 0;
        bar.style.width = `${progress}%`;
        
        const parent = bar.parentElement.parentElement;
        // 퍼센트 텍스트 업데이트
        const percentEl = parent.querySelector('.work-percent');
        if (percentEl) percentEl.textContent = `${Math.floor(progress)}%`;

        // 배율 텍스트 업데이트 (지수함수 반영)
        const mulEl = parent.querySelector('.work-mul');
        const workerCount = state.workers[type] || 0;
        const efficiency = workerCount > 0 ? Math.pow(workerCount, 0.75) : 0;
        if (mulEl) mulEl.textContent = `x${efficiency.toFixed(1)}`;
      }
    });

    // 7. 대기 인원 자동 계산 및 동기화
    const totalAssigned = Object.values(state.workers).reduce((a, b) => a + b, 0);
    state.idlePopulation = state.population - totalAssigned;
    if (this.idlePopVal) this.idlePopVal.textContent = state.idlePopulation;
  }
}
