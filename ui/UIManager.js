import { GachaSystem } from '../game/GachaSystem.js';
import { SoundManager } from '../engine/SoundManager.js';
import { ITEM_DB } from '../game/WeaponData.js';

/**
 * UIManager.js
 * 게임의 최소 UI 요소와 통신합니다. (Clean Slate 버전)
 */
export class UIManager {
  constructor(app) {
    this.app = app;
    this.fetchElements();
    this.initEvents();
    this.selectedUnit = null; // 선택된 타워
    this.selectedEnemy = null; // 선택된 몬스터
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
    this.pauseBtn = document.getElementById('btn-pause');
    this.buyRandomBtn = document.getElementById('btn-buy-random');
    this.buyAdvancedBtn = document.getElementById('btn-buy-advanced');
    this.exchangeJadeBtn = document.getElementById('btn-exchange-jade');
    this.sellUnitsBtn = document.getElementById('btn-sell-units');
    this.techUpBtn = document.getElementById('btn-tech-upgrade');
    this.combineUnitBtn = document.getElementById('btn-combine-unit');
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

    // 9. 정보창 레이블 및 행 제어
    this.lblDps = document.getElementById('lbl-dps');
    this.lblAtk = document.getElementById('lbl-atk');
    this.lblRange = document.getElementById('lbl-range');
    this.lblSpd = document.getElementById('lbl-spd');
    this.lblAp = document.getElementById('lbl-ap');
    
    this.rowAp = document.getElementById('row-ap');
    this.rowRange = document.getElementById('row-range');
    this.rowSpd = document.getElementById('row-spd');
    this.rowShred = document.getElementById('row-shred');
    this.detailShred = document.getElementById('detail-shred');
    this.tooltip = document.getElementById('custom-tooltip');
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
      if (btn.id === 'btn-pause') return; // 일시정지 버튼은 별도 처리
      btn.onclick = () => {
        this.speedBtns.forEach(b => { if(b.id !== 'btn-pause') b.classList.remove('active'); });
        btn.classList.add('active');
        const speed = parseFloat(btn.textContent);
        if (this.app.state) this.app.state.timeScale = speed;
      };
    });

    // 일시정지 토글
    if (this.pauseBtn) {
      this.pauseBtn.onclick = () => {
        this.app.state.isPaused = !this.app.state.isPaused;
        this.updateDisplays(this.app.state);
      };
    }

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
        this.app.buyRandomUnit();
      };
    }

    // 2. 고급 무기 상자 (1000 은)
    if (this.buyAdvancedBtn) {
      this.buyAdvancedBtn.onclick = () => {
        this.app.buyAdvancedUnit();
      };
    }

    // 2.5 비취옥 환전 (1개 -> 250 은)
    if (this.exchangeJadeBtn) {
      this.exchangeJadeBtn.onclick = () => {
        if (this.app.state.jade >= 1) {
          this.app.state.jade -= 1;
          this.app.state.silver += 250;
          this.addMiniNotification(`비취옥 1개 환전 완료 (+250 은)`, 'jackpot');
          this.updateDisplays(this.app.state);
        } else {
          alert("비취옥이 부족합니다!");
        }
      };
    }

    // 3. 판매 (선택 유닛 50 은)
    if (this.sellUnitsBtn) {
      this.sellUnitsBtn.onclick = () => {
        const success = this.app.sellSelectedUnit();
        if (!success) {
          alert("판매할 유닛을 먼저 선택해주세요!");
        }
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
          // [Sound] 기술 업그레이드 효과음
          const audio = new Audio('assets/audio/upgrade.mp3');
          audio.volume = 0.4;
          audio.play().catch(e => console.log("Audio play deferred"));

          this.addMiniNotification(`기술 업그레이드 완료: ${this.app.state.techLevel}`);
        } else {
          alert("자원이 부족합니다!");
        }
        this.updateDisplays(this.app.state);
      };
    }

    // 5. 무기 제작
    this.craftBtns.forEach(btn => {
      btn.onclick = (e) => {
        if (e) e.stopPropagation(); // 캔버스 클릭 간섭 방지
        // 파업 체크
        if (this.app.encounterManager && this.app.encounterManager.isStrikeActive()) {
          alert("정착민들이 파업 중입니다! 상점을 이용할 수 없습니다.");
          return;
        }

        const grade = btn.getAttribute('data-grade');
        const state = this.app.state;
        
        // 기술 수준 체크
        const levels = ['primitive', 'advanced', 'spacer', 'ultra'];
        const techIdx = levels.indexOf(state.techLevel);
        let techMet = true;
        // Rare는 이제 원시(Primitive, 0)에서도 가능하도록 수정
        if (grade === 'Epic' && techIdx < 2) techMet = false;
        else if (grade === 'Legendary' && techIdx < 3) techMet = false;
        else if (grade === 'Mythic' && techIdx < 3) techMet = false;

        if (!techMet) {
          this.addMiniNotification("지식이 부족하여 아직 제작할 수 없습니다!", "failure");
          return;
        }

        let canCraft = false;
        if (grade === 'Rare') {
          if (state.wood >= 30 && state.steel >= 30 && state.component >= 1) canCraft = true;
        } else if (grade === 'Epic') {
          if (state.steel >= 50 && state.plasteel >= 10 && state.component >= 5) canCraft = true;
        } else if (grade === 'Legendary') {
          if (state.plasteel >= 30 && state.uranium >= 20 && state.researchPoints >= 100 && state.component >= 10) canCraft = true;
        } else if (grade === 'Mythic') {
          if (state.plasteel >= 50 && state.uranium >= 30 && state.researchPoints >= 300 && state.component >= 20) canCraft = true;
        }

        if (canCraft) {
           const result = GachaSystem.drawSpecificGrade(grade, 1);
           if (result) {
             // [Fix] 무기 생성이 성공했을 때만 자원 소모
             if (grade === 'Rare') {
               state.wood -= 30; state.steel -= 30; state.component -= 1;
             } else if (grade === 'Epic') {
               state.steel -= 50; state.plasteel -= 10; state.component -= 5;
             } else if (grade === 'Legendary') {
               state.plasteel -= 30; state.uranium -= 20; state.researchPoints -= 100; state.component -= 10;
             } else if (grade === 'Mythic') {
               state.plasteel -= 50; state.uranium -= 30; state.researchPoints -= 300; state.component -= 20;
             }

             SoundManager.playSFX('assets/audio/buy.mp3');
             
             // [CRITICAL FIX] 클릭 이벤트가 모두 종료된 후에 배치 모드 진입 (캔버스 클릭 간섭 방지)
             setTimeout(() => {
               this.app.startPlacement(result);
             }, 50);

             this.updateDisplays(state);
           } else {
             this.addMiniNotification("무기 설계도를 찾을 수 없습니다!", "failure");
           }
        } else {
           this.addMiniNotification("자원이 부족합니다!", "failure");
        }
      };

      // [New] 제작 요구 자원 툴팁 이벤트
      btn.onmouseenter = (e) => this.showCraftTooltip(e, btn);
      btn.onmousemove = (e) => this.moveTooltip(e);
      btn.onmouseleave = () => this.hideTooltip();
    });

    // 업그레이드 버튼 이벤트
    const handleUpgrade = (type) => {
      console.log(`[UIManager] handleUpgrade triggered for: ${type}`);
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
        console.log(`[UIManager] Upgrade SUCCESS: ${type} is now Lv.${s.upgrades[type]}`);
        
        // [Critical Fix] 가장 직접적인 방식으로 사운드 재생 강제 시도
        const audio = new Audio('assets/audio/upgrade.mp3');
        audio.volume = 0.4;
        audio.play().catch(err => console.error("Audio play failed:", err));

        const typeKo = { blunt: '둔기', sharp: '날붙이', ranged: '원거리' };
        this.addMiniNotification(`${typeKo[type] || type} 훈련 완료 (Lv.${s.upgrades[type]})`);
      } else {
        alert("자원이 부족합니다!");
      }
      this.updateDisplays(s);
    };

    if (this.upgradeBluntBtn) this.upgradeBluntBtn.onclick = () => handleUpgrade('blunt');
    if (this.upgradeMeleeBtn) this.upgradeMeleeBtn.onclick = () => handleUpgrade('sharp');
    if (this.upgradeRangedBtn) this.upgradeRangedBtn.onclick = () => handleUpgrade('ranged');

    // 5.5 생산 업그레이드 이벤트
    this.prodUpBtns = document.querySelectorAll('.prod-up');
    
    const getProdCost = (type, lv) => {
        // [200, 500, 1200, 2800, 5500] 커브 적용
        const silverCurve = [200, 500, 1200, 2800, 5500];
        const resCurve = [100, 250, 600, 1400, 2750];
        
        if (lv >= 5) return null;

        const baseCosts = {
            education: { silver: silverCurve[lv], wood: resCurve[lv] },
            artisan: { silver: silverCurve[lv], steel: resCurve[lv] },
            farming: { silver: silverCurve[lv], food: resCurve[lv] },
            mining: { silver: silverCurve[lv], steel: resCurve[lv] },
            logging: { silver: silverCurve[lv], wood: resCurve[lv] },
            trade: { silver: Math.floor(silverCurve[lv] * 1.5), researchPoints: Math.floor(resCurve[lv] * 1.5) }
        };
        return baseCosts[type] || null;
    };

    this.prodUpBtns.forEach(btn => {
      btn.onclick = () => {
        const type = btn.getAttribute('data-type');
        const s = this.app.state;
        const curLv = s.upgrades[type] || 0;

        if (curLv >= 5) {
            alert("최대 레벨에 도달했습니다!");
            return;
        }

        const cost = getProdCost(type, curLv);
        let canAfford = true;
        for (const [res, amt] of Object.entries(cost)) {
            if (s[res] < amt) {
                canAfford = false;
                break;
            }
        }

        if (canAfford) {
            for (const [res, amt] of Object.entries(cost)) {
                s[res] -= amt;
            }
            s.upgrades[type] = curLv + 1;
            
            // [Critical Fix] 가장 직접적인 방식으로 사운드 재생 강제 시도
            const audio = new Audio('assets/audio/upgrade.mp3');
            audio.volume = 0.4;
            audio.play().catch(err => console.error("Audio play failed:", err));

            const name = btn.querySelector('.up-name').textContent;
            this.addMiniNotification(`${name} 강화 완료 (Lv.${s.upgrades[type]})`);
            this.updateDisplays(s);
        } else {
            alert("자원이 부족합니다!");
        }
      };

      // [New] 업그레이드 요구 자원 툴팁
      btn.onmouseenter = (e) => this.showUpgradeTooltip(e, btn);
      btn.onmousemove = (e) => this.moveTooltip(e);
      btn.onmouseleave = () => this.hideTooltip();
    });

    // 6. 특수 무기 제작
    this.specialCraftBtns = document.querySelectorAll('.special-craft');
    this.specialCraftBtns.forEach(btn => {
      // [New] 특수 제작 툴팁 이벤트
      btn.onmouseenter = (e) => this.showSpecialCraftTooltip(e, btn);
      btn.onmousemove = (e) => this.moveTooltip(e);
      btn.onmouseleave = () => this.hideTooltip();

      btn.onclick = () => {
        const weaponName = btn.getAttribute('data-weapon');
        const s = this.app.state;
        
        const costs = {
            '파쇄 수류탄': { silver: 300, steel: 150, component: 5 },
            '펄스 수류탄': { silver: 500, steel: 250, plasteel: 20, component: 10 },
            '화염병': { silver: 350, wood: 100, component: 5 },
            '연막 발사기': { silver: 400, steel: 180, component: 5 },
            '독소 수류탄': { silver: 1000, steel: 400, jade: 5, component: 15 }
        };

        const cost = costs[weaponName];
        let canAfford = true;
        for (const [res, amt] of Object.entries(cost)) {
            if (s[res] < amt) {
                canAfford = false;
                break;
            }
        }

        if (canAfford) {
            for (const [res, amt] of Object.entries(cost)) {
                s[res] -= amt;
            }
            
            // [Bug Fix] 타워 배치 대신 아이템 인벤토리에 추가
            const itemKeyMap = {
                '파쇄 수류탄': 'frag_grenade',
                '펄스 수류탄': 'pulse_grenade',
                '화염병': 'molotov',
                '연막 발사기': 'smoke_launcher',
                '독소 수류탄': 'toxin_grenade'
            };
            const itemKey = itemKeyMap[weaponName];
            if (itemKey) {
                s.items[itemKey] = (s.items[itemKey] || 0) + 1;
                this.addMiniNotification(`${weaponName} 획득! (사용: 우측 아이템 카드 클릭)`);
                SoundManager.playSFX('assets/audio/buy.mp3');
            }
            
            this.updateDisplays(s);
        } else {
            alert("자원이 부족합니다!");
        }
      };
    });
  }

  switchTab(tabId) {
    this.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    this.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabId}`);
    });
  }

  showNotification(title, text, grade = 'Common') {
    const banner = document.getElementById('notification-banner');
    const t = document.getElementById('notif-title');
    const x = document.getElementById('notif-text');
    if (banner && t && x) {
      // 등급 확률 매핑
      const probs = {
        Common: '50.9%', Uncommon: '30.0%', Rare: '13.0%', Epic: '5.0%', 
        Legendary: '0.8%', Mythic: '0.3%'
      };
      
      // 도파민 모드: 제목에 등급, 내용에 무기 이름, 밑에 확률 표시
      const gradeStr = grade.toUpperCase();
      // 가차 결과일 때만 확률 표시
      const isGacha = title.includes("배치") || title.includes("GACHA");
      const probStr = (isGacha && probs[grade]) ? `<div class="prob-tag">${probs[grade]} CHANCE</div>` : '';

      t.innerHTML = `${gradeStr}`;
      // 배치 문구 제거하고 무기 이름만 크게 표시
      const cleanName = text.split('이(가)')[0] || text;
      x.innerHTML = `${cleanName}${probStr}`;
      
      // 기존 등급 클래스 제거 및 신규 추가
      banner.className = 'grade-banner'; // 초기화
      const gradeClass = grade.toLowerCase() === 'hidden' ? 'hidden-grade' : grade.toLowerCase();
      banner.classList.add(gradeClass);
      
      banner.classList.remove('hidden');
      if (this.notifTimeout) clearTimeout(this.notifTimeout);
      this.notifTimeout = setTimeout(() => banner.classList.add('hidden'), 1100); // 1.8s -> 1.1s로 단축
    }
  }

  /**
   * 림월드 스타일 미니 알림 (5시 방향)
   */
  addMiniNotification(text, styleClass = '') {
    const container = document.getElementById('mini-notif-container');
    if (!container) return;

    const notif = document.createElement('div');
    notif.className = 'mini-notif';
    if (styleClass) notif.classList.add(styleClass);
    notif.textContent = text;
    
    container.appendChild(notif);

    // 2초 후 요소 제거 (CSS 애니메이션 속도와 동기화)
    setTimeout(() => {
        if (notif.parentNode) {
            container.removeChild(notif);
        }
    }, 2000);
  }

  showUnitDetail(tower) {
    if (!tower || !tower.weaponData) return;
    this.selectedUnit = tower; // 현재 선택된 유닛 추적
    try {
      // 품질 이름 매핑
      const qualNames = { awful: '끔찍', normal: '평범', excellent: '완벽', legendary: '전설' };
      const qualText = qualNames[tower.quality.toLowerCase()] || tower.quality;
      
      const isRanged = tower.weaponType === 'ranged';
      // 재질 표시 여부 결정 (None 혹은 무기명이 '맨손/목재'인 경우만 생략)
      const skipMaterial = tower.material === 'None' || tower.weaponName === '맨손/목재';
      
      if (isRanged || skipMaterial) {
        this.detailName.textContent = `${qualText} ${tower.weaponName}`;
      } else {
        this.detailName.textContent = `${qualText} ${tower.material} ${tower.weaponName}`;
      }

      // 레이블 복구
      if (this.lblDps) this.lblDps.textContent = "DPS";
      if (this.lblAtk) this.lblAtk.textContent = "공격력";
      if (this.lblSpd) this.lblSpd.textContent = "공속";
      if (this.rowAp) this.rowAp.classList.remove('hidden');
      if (this.rowRange) this.rowRange.classList.remove('hidden');
      if (this.rowShred) this.rowShred.classList.add('hidden'); // 일단 숨김 후 체크
      
      this.detailGrade.textContent = `[${tower.weaponData.grade || 'Common'}]`;
      this.detailGrade.style.color = ""; // 색상 초기화
      
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
      const burst = tower.weaponData.burst || 1;
      
      this.detailDps.textContent = (total * burst * spd).toFixed(1);
      this.detailAtk.textContent = Math.floor(base);
      if (this.detailAtkBonus) this.detailAtkBonus.textContent = `(+${Math.floor(bonus)} 훈련)`;
      if (this.detailUpLv) this.detailUpLv.textContent = upLv;
      
      this.detailRange.textContent = tower.range || 0;
      this.detailSpd.textContent = `${spd.toFixed(2)}/s`;

      // 버프 시각화 (하늘색 강조)
      const isBuffed = (spd > tower.baseAttackSpeed) || (total > base);
      if (isBuffed) {
        this.detailSpd.classList.add('buff-text');
        this.detailDps.classList.add('buff-text');
        this.detailAtk.classList.add('buff-text');
      } else {
        this.detailSpd.classList.remove('buff-text');
        this.detailDps.classList.remove('buff-text');
        this.detailAtk.classList.remove('buff-text');
      }
      
      // 방관 정보
      const apEl = document.getElementById('detail-ap');
      if (apEl) apEl.textContent = `${Math.floor(tower.ap * 100)}%`;

      // [New] 방깎 정보 표시
      const shredVal = tower.weaponData.shred || 0;
      if (shredVal > 0 && this.rowShred) {
        this.rowShred.classList.remove('hidden');
        if (this.detailShred) this.detailShred.textContent = shredVal;
      }

      // [New] 조합 버튼 노출 및 처리
      if (this.combineUnitBtn) {
        if (tower.isCombinable) {
          this.combineUnitBtn.classList.remove('hidden');
          
          // 연구 포인트 부족 시 비활성화
          const canAfford = (this.app.state.researchPoints >= 200);
          this.combineUnitBtn.disabled = !canAfford;
          this.combineUnitBtn.style.opacity = canAfford ? "1" : "0.5";
          this.combineUnitBtn.style.pointerEvents = canAfford ? "auto" : "none";

          this.combineUnitBtn.onclick = () => {
            if (canAfford) this.app.combineUnits(tower);
          };
        } else {
          this.combineUnitBtn.classList.add('hidden');
        }
      }
      
    } catch (e) {
      console.error("UI Detail Update Error:", e);
    }
  }

  hideUnitDetail() {
    this.selectedUnit = null;
    this.selectedEnemy = null;
    const detailArea = document.getElementById('unit-detail-area');
    if (detailArea) {
        if (this.combineUnitBtn) this.combineUnitBtn.classList.add('hidden');
    }
  }

  /**
   * 몬스터 정보 표시
   */
  showEnemyDetail(enemy) {
    if (!enemy) return;
    this.selectedUnit = null;
    this.selectedEnemy = enemy;

    try {
      this.detailName.textContent = enemy.name || "침입자";
      this.detailGrade.textContent = enemy.isBoss ? "[BOSS]" : "[ENEMY]";
      this.detailGrade.style.color = enemy.isBoss ? "var(--accent-red)" : "";
      
      const typeNames = { organic: '생체', mech: '기계' };
      this.detailType.textContent = typeNames[enemy.type] || enemy.type;
      
      // 레이블 변경
      if (this.lblDps) this.lblDps.textContent = "체력";
      if (this.lblAtk) this.lblAtk.textContent = "방어력";
      if (this.lblSpd) this.lblSpd.textContent = "속도";
      
      // 불필요한 행 숨기기 (사거리, 방관)
      if (this.rowAp) this.rowAp.classList.add('hidden');
      if (this.rowRange) this.rowRange.classList.add('hidden');
      if (this.rowShred) this.rowShred.classList.add('hidden'); // 몬스터는 방깎 표시 안 함

      // HP 정보 (DPS 위치에 표시)
      const hpText = `${Math.floor(enemy.hp)} / ${Math.floor(enemy.maxHp)}`;
      this.detailDps.textContent = hpText;
      this.detailDps.classList.remove('buff-text');
      
      // 방어력 정보 (공격력 위치에 표시)
      this.detailAtk.textContent = Math.floor(enemy.armor);
      if (this.detailAtkBonus) this.detailAtkBonus.textContent = ""; 
      if (this.detailUpLv) this.detailUpLv.textContent = "-";
      
      // 기타 정보
      this.detailRange.textContent = "-";
      this.detailSpd.textContent = enemy.speed;

      // 조합 버튼 숨기기
      if (this.combineUnitBtn) this.combineUnitBtn.classList.add('hidden');
      
    } catch (e) {
      console.error("UI Enemy Detail Update Error:", e);
    }
  }

  /**
   * 몬스터 정보 실시간 갱신 (HP 및 방어력)
   */
  updateEnemyDetail(enemy) {
    if (!enemy || !enemy.active) {
      this.hideUnitDetail();
      return;
    }

    // 1. HP 정보 갱신
    const hpText = `${Math.floor(enemy.hp)} / ${Math.floor(enemy.maxHp)}`;
    let finalHpText = hpText;
    if (enemy.shield > 0) {
      finalHpText += ` (+${Math.floor(enemy.shield)} SHIELD)`;
    }
    if (this.detailDps) this.detailDps.textContent = finalHpText;

    // 2. 방어력 실시간 갱신 (방깎 반영)
    if (this.detailAtk) {
      this.detailAtk.textContent = Math.floor(enemy.armor);
    }
  }

  updateDisplays(state) {
    if (!state) return;

    // 일시정지 상태 반영
    if (this.pauseBtn) {
        this.pauseBtn.classList.toggle('paused', state.isPaused);
        this.pauseBtn.textContent = state.isPaused ? "재개" : "일시정지";
    }

    if (this.waveVal) this.waveVal.textContent = state.waveNumber;
    if (this.timerVal) {
      const totalSeconds = Math.max(0, Math.floor(state.nextWaveTimer));
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      this.timerVal.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    if (this.popVal) this.popVal.textContent = state.population;
    if (this.silverVal) this.silverVal.textContent = Math.floor(state.silver);
    if (this.enemyVal) {
      const enemyCount = this.app.enemies ? this.app.enemies.length : 0;
      this.enemyVal.textContent = `${enemyCount} / 100`;
      
      // 위험도에 따른 색상 강조
      if (enemyCount >= 80) {
        this.enemyVal.style.color = "var(--accent-red)";
        this.enemyVal.style.textShadow = "0 0 10px rgba(239, 68, 68, 0.6)";
      } else if (enemyCount >= 50) {
        this.enemyVal.style.color = "var(--accent-gold)";
        this.enemyVal.style.textShadow = "none";
      } else {
        this.enemyVal.style.color = "";
        this.enemyVal.style.textShadow = "none";
      }
    }
    if (this.techLevelVal) {
      const names = { primitive: '원시 (Primitive)', advanced: '산업 (Advanced)', spacer: '우주 (Spacer)', ultra: '초월 (Ultra)' };
      this.techLevelVal.textContent = names[state.techLevel] || state.techLevel;
    }

    // 선택된 유닛 또는 몬스터 정보 실시간 갱신
    if (this.selectedUnit && this.selectedUnit.active) {
      this.showUnitDetail(this.selectedUnit);
    } else if (this.selectedEnemy && this.selectedEnemy.active) {
      this.updateEnemyDetail(this.selectedEnemy);
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

    // [New] 특수 아이템 수량 업데이트
    const items = state.items || {};
    const itemMap = {
        orbital_strike: 'orbital',
        frag_grenade: 'frag',
        pulse_grenade: 'pulse',
        molotov: 'molotov',
        smoke_launcher: 'smoke',
        toxin_grenade: 'toxin'
    };

    for (const [key, idSuffix] of Object.entries(itemMap)) {
        const countEl = document.getElementById(`count-${idSuffix}`);
        const cardEl = document.getElementById(`btn-item-${idSuffix}`);
        if (countEl) {
            const count = items[key] || 0;
            const cooldown = state.itemCooldowns[key] || 0;
            
            countEl.innerText = count;
            if (cardEl) {
                // 수량 체크
                if (count > 0) cardEl.classList.remove('empty');
                else cardEl.classList.add('empty');
                
                // 쿨타임 체크 및 시각화용 변수 설정
                if (cooldown > 0 && count > 0) {
                    cardEl.classList.add('on-cooldown');
                    const maxCD = ITEM_DB[key] ? ITEM_DB[key].cooldown : 10;
                    const percent = (cooldown / maxCD) * 100;
                    cardEl.style.setProperty('--cd-percent', `${percent}%`);
                } else {
                    cardEl.classList.remove('on-cooldown');
                    cardEl.style.setProperty('--cd-percent', '0%');
                }
            }
        }
    }

    // 생산 업그레이드 버튼 활성/비활성 상태 갱신 및 텍스트 동기화
    if (this.prodUpBtns) {
        const getProdCost = (type, lv) => {
            const silverCurve = [200, 500, 1200, 2800, 5500];
            const resCurve = [100, 250, 600, 1400, 2750];
            if (lv >= 5) return null;

            const baseCosts = {
                education: { silver: silverCurve[lv], wood: resCurve[lv] },
                artisan: { silver: silverCurve[lv], steel: resCurve[lv] },
                farming: { silver: silverCurve[lv], food: resCurve[lv] },
                mining: { silver: silverCurve[lv], steel: resCurve[lv] },
                logging: { silver: silverCurve[lv], wood: resCurve[lv] },
                trade: { silver: Math.floor(silverCurve[lv] * 1.5), researchPoints: Math.floor(resCurve[lv] * 1.5) }
            };
            return baseCosts[type] || null;
        };

        this.prodUpBtns.forEach(btn => {
            const type = btn.getAttribute('data-type');
            const curLv = state.upgrades[type] || 0;
            
            // 1. 레벨 텍스트 갱신
            const lvEl = document.getElementById(`${type}-lv`);
            if (lvEl) lvEl.textContent = curLv;

            // 2. 비용 텍스트 갱신
            if (curLv >= 5) {
                const area = document.getElementById(`${type}-cost-area`);
                if (area) area.innerHTML = `<span class="max-lv">MAX LEVEL</span>`;
                btn.disabled = true;
                btn.style.opacity = "0.5";
                btn.style.cursor = "default";
            } else {
                const cost = getProdCost(type, curLv);
                let canAfford = true;
                for (const [res, amt] of Object.entries(cost)) {
                    const el = document.getElementById(`${type}-cost-${res}`);
                    if (el) el.textContent = amt;
                    if (state[res] < amt) canAfford = false;
                }
                btn.disabled = !canAfford;
                btn.style.opacity = canAfford ? "1" : "0.4";
                btn.style.cursor = canAfford ? "pointer" : "not-allowed";
            }
        });
    }

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
    const canInteract = !state.isPaused;
    const canBuyRandom = state.silver >= 50 && canInteract;
    if (this.buyRandomBtn) {
      this.buyRandomBtn.disabled = !canBuyRandom;
      this.buyRandomBtn.style.opacity = canBuyRandom ? "1" : "0.4";
      this.buyRandomBtn.style.filter = canBuyRandom ? "none" : "grayscale(0.5)";
    }

    const canBuyAdvanced = state.silver >= 1000 && canInteract;
    if (this.buyAdvancedBtn) {
        this.buyAdvancedBtn.disabled = !canBuyAdvanced;
        this.buyAdvancedBtn.style.opacity = canBuyAdvanced ? "1" : "0.4";
        this.buyAdvancedBtn.style.filter = canBuyAdvanced ? "none" : "grayscale(0.5)";
    }

    const canExchangeJade = state.jade >= 1 && canInteract;
    if (this.exchangeJadeBtn) {
        this.exchangeJadeBtn.disabled = !canExchangeJade;
        this.exchangeJadeBtn.style.opacity = canExchangeJade ? "1" : "0.4";
    }

    // 3.5 판매 버튼 동적 활성화 및 가격 표시
    if (this.sellUnitsBtn) {
        const selectedUnit = this.app.units.find(u => u.selected);
        const sellText = this.sellUnitsBtn.querySelector('.text');
        
        if (selectedUnit) {
            const price = this.app.calculateSellPrice(selectedUnit);
            this.sellUnitsBtn.disabled = false;
            this.sellUnitsBtn.style.opacity = "1";
            this.sellUnitsBtn.style.filter = "none";
            if (sellText) sellText.textContent = `판매 (${price})`;
        } else {
            this.sellUnitsBtn.disabled = true;
            this.sellUnitsBtn.style.opacity = "0.4";
            this.sellUnitsBtn.style.filter = "grayscale(1)";
            if (sellText) sellText.textContent = `판매 (유닛 선택 필요)`;
        }
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

            const canUp = state.silver >= sCost && state.researchPoints >= rCost && canInteract;
            this.techUpBtn.disabled = !canUp;
            this.techUpBtn.style.opacity = canUp ? "1" : "0.4";
        }
    }

    // 제작 버튼 상태 업데이트
    if (this.craftBtns) {
      this.craftBtns.forEach(btn => {
        const grade = btn.getAttribute('data-grade');
        const levels = ['primitive', 'advanced', 'spacer', 'ultra'];
        const techIdx = levels.indexOf(state.techLevel);
        let techMet = canInteract;
        if (grade === 'Rare' && techIdx < 1) techMet = false;
        else if (grade === 'Epic' && techIdx < 2) techMet = false;
        else if (grade === 'Legendary' && techIdx < 3) techMet = false;
        else if (grade === 'Mythic' && techIdx < 3) techMet = false;

        let resMet = false;
        if (grade === 'Rare') resMet = state.wood >= 30 && state.steel >= 30 && state.component >= 1;
        else if (grade === 'Epic') resMet = state.steel >= 50 && state.plasteel >= 10 && state.component >= 5;
        else if (grade === 'Legendary') resMet = state.plasteel >= 30 && state.uranium >= 20 && state.researchPoints >= 100 && state.component >= 10;
        else if (grade === 'Mythic') resMet = state.plasteel >= 50 && state.uranium >= 30 && state.researchPoints >= 300 && state.component >= 20;
        
        const canCraft = techMet && resMet;
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

        // [New] 강화 효율 텍스트 동적 업데이트
        const effectEl = btn.querySelector('.up-effect');
        if (effectEl) {
            let rate = 10;
            if (lv >= 100) rate = 30;     // 101강 이상 (현재 100이면 다음이 101이므로 30%로 보임)
            else if (lv >= 50) rate = 20; // 51강 이상
            effectEl.textContent = `+${rate}%`;
        }

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

    // 7. 대기 인원 자동 계산 및 동기화 (작업자만 차감)
    const totalAssigned = Object.values(state.workers).reduce((a, b) => a + b, 0);
    state.idlePopulation = state.population - totalAssigned;
    if (this.idlePopVal) this.idlePopVal.textContent = state.idlePopulation;

    // 8. 특수 제작 버튼 상태 업데이트 (자원 부족 시 비활성화)
    if (this.specialCraftBtns) {
        const specialCosts = {
            '파쇄 수류탄': { silver: 300, steel: 150, component: 5 },
            '펄스 수류탄': { silver: 500, steel: 250, plasteel: 20, component: 10 },
            '화염병': { silver: 350, wood: 100, component: 5 },
            '연막 발사기': { silver: 400, steel: 180, component: 5 },
            '독소 수류탄': { silver: 1000, steel: 400, jade: 5, component: 15 }
        };

        this.specialCraftBtns.forEach(btn => {
            const weaponName = btn.getAttribute('data-weapon');
            const cost = specialCosts[weaponName];
            if (!cost) return;

            let canAfford = canInteract;
            for (const [res, amt] of Object.entries(cost)) {
                if ((state[res] || 0) < amt) {
                    canAfford = false;
                    break;
                }
            }

            btn.disabled = !canAfford;
            btn.style.opacity = canAfford ? "1" : "0.4";
            btn.style.filter = canAfford ? "none" : "grayscale(0.8)";
            btn.style.cursor = canAfford ? "pointer" : "not-allowed";
        });
    }
  }
  // ==========================================
  // [New] 제작 툴팁 시스템 메서드들
  // ==========================================

  showCraftTooltip(e, btn) {
    const grade = btn.getAttribute('data-grade');
    const s = this.app.state;
    let requirements = [];
    
    // 요구 수량 데이터 (UIManager.js의 craft logic과 동기화)
    if (grade === 'Rare') {
      requirements = [
        { name: '나무', req: 30, cur: s.wood },
        { name: '강철', req: 30, cur: s.steel },
        { name: '부품', req: 1, cur: s.component }
      ];
    } else if (grade === 'Epic') {
      requirements = [
        { name: '강철', req: 50, cur: s.steel },
        { name: '플라스틸', req: 10, cur: s.plasteel },
        { name: '부품', req: 5, cur: s.component }
      ];
    } else if (grade === 'Legendary') {
      requirements = [
        { name: '플라스틸', req: 30, cur: s.plasteel },
        { name: '우라늄', req: 20, cur: s.uranium },
        { name: '연구', req: 100, cur: s.researchPoints },
        { name: '부품', req: 10, cur: s.component }
      ];
    } else if (grade === 'Mythic') {
      requirements = [
        { name: '플라스틸', req: 50, cur: s.plasteel },
        { name: '우라늄', req: 30, cur: s.uranium },
        { name: '연구', req: 300, cur: s.researchPoints },
        { name: '부품', req: 20, cur: s.component }
      ];
    }

    this.renderTooltip(requirements, `${grade} 등급 제작 요구사항`);
  }

  showSpecialCraftTooltip(e, btn) {
    const weaponName = btn.getAttribute('data-weapon');
    const s = this.app.state;
    const costs = {
        '파쇄 수류탄': { silver: 300, steel: 150, component: 5 },
        '펄스 수류탄': { silver: 500, steel: 250, plasteel: 20, component: 10 },
        '화염병': { silver: 350, wood: 100, component: 5 },
        '연막 발사기': { silver: 400, steel: 180, component: 5 },
        '독소 수류탄': { silver: 1000, steel: 400, jade: 5, component: 15 }
    };

    const cost = costs[weaponName];
    const requirements = [];
    const nameMap = { silver: '은화', steel: '강철', wood: '나무', component: '부품', plasteel: '플라스틸', jade: '비취' };
    
    for (const [res, amt] of Object.entries(cost)) {
        requirements.push({ name: nameMap[res] || res, req: amt, cur: s[res] || 0 });
    }

    this.renderTooltip(requirements, `${weaponName} 제작 요구사항`);
  }

  showUpgradeTooltip(e, btn) {
    const type = btn.getAttribute('data-type');
    const s = this.app.state;
    const curLv = s.upgrades[type] || 0;
    const nextLv = curLv + 1;
    
    // 요구 자원 매핑 (handleUpgrade와 동일 로직)
    const resourceMap = {
        blunt: [{ name: '은화', key: 'silver' }, { name: '강철', key: 'steel' }],
        sharp: [{ name: '목재', key: 'wood' }, { name: '은화', key: 'silver' }],
        ranged: [{ name: '플라스틸', key: 'plasteel' }, { name: '은화', key: 'silver' }]
    };
    
    const resList = resourceMap[type];
    const requirements = resList.map(r => ({
      name: r.name,
      req: nextLv,
      cur: s[r.key]
    }));

    const typeName = type === 'blunt' ? '둔기' : (type === 'sharp' ? '날붙이' : '원거리');
    this.renderTooltip(requirements, `${typeName} 강화 Lv.${nextLv} 요구사항`);
  }
  renderTooltip(requirements, title) {
    let html = `<div class="tooltip-title">${title}</div><div class="tooltip-body">`;
    requirements.forEach(r => {
      const isShort = r.cur < r.req;
      const color = isShort ? '#ff4d4d' : '#4dff88';
      const status = isShort ? '▲' : '✓';
      html += `<div class="tooltip-row" style="color: ${color}">
        <span class="res-name">${status} ${r.name}:</span>
        <span class="res-val">${r.cur} / ${r.req}</span>
      </div>`;
    });
    html += `</div><div class="tooltip-footer">부족한 자원이 있으면 빨간색으로 표시됩니다.</div>`;
    if (this.tooltip) {
      this.tooltip.innerHTML = html;
      this.tooltip.classList.remove('hidden');
    }
  }

  showItemTooltip(e, key) {
    const item = ITEM_DB[key];
    if (!item) return;
    
    // 등급별 색상 매핑
    const gradeColors = {
      Common: '#ccc',
      Uncommon: '#4dff88',
      Rare: '#3498db',
      Epic: '#9b59b6',
      Legendary: '#f1c40f'
    };
    const color = gradeColors[item.grade] || '#fff';

    let html = `<div class="tooltip-title" style="color: ${color}">${item.name} [${item.grade}]</div>`;
    html += `<div class="tooltip-body" style="font-size: 0.85rem; line-height: 1.5; color: #eee; margin: 10px 0;">${item.desc}</div>`;
    
    // 스탯 요약 (필요시)
    html += `<div class="tooltip-footer" style="padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.8rem;">`;
    if (item.dmg > 0) html += `<div>폭발 피해: <span style="color: #ff4d4d">${item.dmg}</span></div>`;
    if (item.radius > 0) html += `<div>효과 범위: ${item.radius}px</div>`;
    html += `<div style="color: var(--accent-gold); font-weight: bold; margin-top: 5px;">재사용 대기: ${item.cooldown}초</div>`;
    html += `</div>`;
    
    if (this.tooltip) {
      this.tooltip.innerHTML = html;
      this.tooltip.classList.remove('hidden');
      this.moveTooltip(e);
    }
  }

  showGachaTooltip(e, type) {
    const s = this.app.state;
    // GRADE_PROBABILITIES 참조 (실제 데이터와 동기화)
    const probs = {
      Common: 50.9, Uncommon: 30.0, Rare: 13.0, Epic: 5.0, 
      Legendary: 0.8, Mythic: 0.3
    };
    const gradeColors = {
      Common: '#ccc', Uncommon: '#4dff88', Rare: '#3498db', 
      Epic: '#9b59b6', Legendary: '#f1c40f', Mythic: '#ff4d4d'
    };

    let title = type === 'random' ? "무작위 유닛 구매 확률" : "고급 무기 상자 확률 (Rare 이상)";
    let html = `<div class="tooltip-title">${title}</div><div class="tooltip-body">`;

    if (type === 'random') {
      Object.entries(probs).forEach(([grade, prob]) => {
        html += `<div class="tooltip-row" style="color: ${gradeColors[grade]}">
          <span class="res-name">${grade}:</span>
          <span class="res-val">${prob}%</span>
        </div>`;
      });
    } else {
      // 고급 뽑기: 상향된 고정 확률 테이블 적용
      const advancedWeights = {
        Rare: 50.0,
        Epic: 35.0,
        Legendary: 10.0,
        Mythic: 5.0
      };
      
      Object.entries(advancedWeights).forEach(([grade, prob]) => {
        html += `<div class="tooltip-row" style="color: ${gradeColors[grade]}">
          <span class="res-name">${grade}:</span>
          <span class="res-val">${prob.toFixed(1)}%</span>
        </div>`;
      });
      html += `<div style="margin-top: 8px; font-size: 0.75rem; color: #888; border-top: 1px solid #444; padding-top: 4px;">* 하위 등급(일반/우수) 제외 및 품질 보너스 대폭 적용</div>`;
    }

    html += `</div>`;
    
    if (this.tooltip) {
      this.tooltip.innerHTML = html;
      this.tooltip.classList.remove('hidden');
      this.moveTooltip(e);
    }
  }

  moveTooltip(e) {
    if (this.tooltip) {
      const margin = 20;
      const tooltipWidth = this.tooltip.offsetWidth;
      const tooltipHeight = this.tooltip.offsetHeight;
      
      let x = e.clientX + margin;
      let y = e.clientY + margin;

      // 우측 경계 체크: 화면 밖으로 나가면 왼쪽으로 반전
      if (x + tooltipWidth > window.innerWidth) {
          x = e.clientX - tooltipWidth - margin;
      }
      
      // 하단 경계 체크: 화면 밖으로 나가면 위쪽으로 반전
      if (y + tooltipHeight > window.innerHeight) {
          y = e.clientY - tooltipHeight - margin;
      }

      this.tooltip.style.left = x + 'px';
      this.tooltip.style.top = y + 'px';
    }
  }

  hideTooltip() {
    if (this.tooltip) {
        this.tooltip.classList.add('hidden');
    }
  }
}
