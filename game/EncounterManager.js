/**
 * EncounterManager.js
 * 림월드 스타일의 랜덤 이벤트(인카운터) 시스템을 관리합니다.
 */
import { GachaSystem } from './GachaSystem.js';
import { WEAPON_DB } from './WeaponData.js';

export class EncounterManager {
  constructor(app) {
    this.app = app;
    this.nextEventTimer = this.getRandomInterval();
    this.activeEvents = []; // 현재 지속 중인 이벤트 (독성 낙진 등)
    
    // UI 캐싱
    this.modal = document.getElementById('encounter-modal');
    this.modalTitle = document.getElementById('event-modal-title');
    this.modalText = document.getElementById('event-modal-text');
    this.modalCloseBtn = document.getElementById('event-modal-close-btn');
    this.activeEventsContainer = document.getElementById('active-events-container');

    // 모달 닫기 이벤트
    if (this.modalCloseBtn) {
        this.modalCloseBtn.onclick = () => {
            this.modal.classList.add('hidden');
            this.app.state.isPaused = false; // 일시정지 해제
        };
    }
  }

  getRandomInterval() {
    return 180 + Math.random() * 180;
  }

  update(dt) {
    // 게임이 일시정지 상태면 타이머 진행 안 함 (모달 열려있을 때 등)
    if (this.app.state.isPaused) return;

    // 1. 이벤트 주기 타이머 갱신
    this.nextEventTimer -= dt;
    if (this.nextEventTimer <= 0) {
      this.triggerRandomEvent();
      this.nextEventTimer = this.getRandomInterval();
    }

    // 2. 지속 이벤트 시간 갱신 및 UI 업데이트
    this.updateActiveEvents(dt);
  }

  // 글로벌 은화 배율 계산 (암브로시아 등 반영)
  getGlobalSilverMultiplier() {
    let multiplier = 1.0;
    if (this.activeEvents.some(e => e.id === 'ambrosia_sprout')) {
        multiplier *= 2.0;
    }
    return multiplier;
  }

  // 글로벌 작업량 배율 계산 (작업 영감 반영)
  getGlobalWorkMultiplier(jobType) {
    let multiplier = 1.0;
    const inspiration = this.activeEvents.find(e => e.id === 'work_inspiration' && e.targetJob === jobType);
    if (inspiration) {
        multiplier *= 3.0;
    }
    return multiplier;
  }

  // 글로벌 루시페륨 효과 배율 계산 (공속/데미지)
  getGlobalLuciferiumMultiplier() {
    let multiplier = 1.0;
    if (this.activeEvents.some(e => e.id === 'luciferium')) {
        multiplier *= 1.5; // 데미지 1.5배, 공속은 Tower.js에서 별도 처리
    }
    return multiplier;
  }

  // 글로벌 공격 속도 배율 계산 (정신적 안정파 등 반영)
  getGlobalAttackSpeedMultiplier() {
    let multiplier = 1.0;
    if (this.activeEvents.some(e => e.id === 'psychic_soothe')) {
        multiplier *= 1.5; // 50% 공속 보너스
    }
    return multiplier;
  }

  updateActiveEvents(dt) {
    let uiHtml = "";
    this.activeEvents = this.activeEvents.filter(event => {
      event.duration -= dt;
      
      let borderColor = (event.type === 'positive') ? "#a855f7" : "#ef4444";
      let bgColor = (event.type === 'positive') ? "rgba(168, 85, 247, 0.1)" : "rgba(239, 68, 68, 0.1)";

      // 특정 이벤트 색상 커스텀
      if (event.id === 'psychic_soothe') {
          borderColor = "#22d3ee"; // Cyan
          bgColor = "rgba(34, 211, 238, 0.1)";
      } else if (event.id === 'work_inspiration') {
          borderColor = "#facc15"; // Gold
          bgColor = "rgba(250, 204, 21, 0.1)";
      } else if (event.id === 'luciferium') {
          borderColor = "#991b1b"; // Deep Red (Crimson)
          bgColor = "rgba(153, 27, 27, 0.1)";
      } else if (event.id === 'solar_flare') {
          borderColor = "#ea580c"; // Orange
          bgColor = "rgba(234, 88, 12, 0.1)";
      } else if (event.id === 'food_poisoning') {
          borderColor = "#84cc16"; // Lime
          bgColor = "rgba(132, 204, 22, 0.1)";
      } else if (event.id === 'psychic_drone') {
          borderColor = "#a21caf"; // Purple/Fuchsia
          bgColor = "rgba(162, 28, 175, 0.1)";
      } else if (event.id === 'pyromaniac') {
          borderColor = "#ea580c"; // Orange-Red
          bgColor = "rgba(234, 88, 12, 0.1)";
      } else if (event.id === 'food_rot') {
          borderColor = "#78350f"; // Brown
          bgColor = "rgba(120, 53, 15, 0.1)";
      }

      // UI 요소 생성
      uiHtml += `
        <div class="event-tag" style="border-left-color: ${borderColor}; background: ${bgColor}">
            <span>${event.name}</span>
            <span class="time" style="color: ${borderColor}">${Math.ceil(event.duration)}s</span>
        </div>
      `;

      if (event.duration <= 0) {
        this.app.ui.addMiniNotification(`이벤트 종료: ${event.name}`, 'info');
        
        // 루시페륨 종료 시 페널티 적용
        if (event.id === 'luciferium') {
            this.app.destroyRandomTower();
        }

        return false;
      }
      return true;
    });

    if (this.activeEventsContainer) {
        this.activeEventsContainer.innerHTML = uiHtml;
    }
  }

  triggerRandomEvent() {
    const events = [
      { 
        name: '상선 통과', weight: 12, type: 'positive', id: 'trade_ship',
        desc: "무역 상선이 궤도를 통과하며 보존된 무기 상자를 투하했습니다! Rare 이상의 무기를 획득합니다."
      },
      { 
        name: '화물 낙하기', weight: 15, type: 'positive', id: 'cargo_pods',
        desc: "궤도상에서 정체를 알 수 없는 화물 보급품들이 낙하했습니다! 유용한 자원들을 확보했습니다."
      },
      { 
        name: '공동체 합류', weight: 10, type: 'positive', id: 'wanderer_joins',
        desc: "지나 가던 길잃은 정착민이 우리 정착지의 안전함에 이끌려 합류를 요청했습니다! 인구가 1 증가합니다."
      },
      { 
        name: '암브로시아 발아', weight: 12, type: 'positive', id: 'ambrosia_sprout',
        desc: "정착지 근처에서 희귀한 암브로시아 나무들이 발아했습니다! 120초 동안 모든 은화(Silver) 획득량이 2배로 증가합니다."
      },
      { 
        name: '정신적 안정파', weight: 12, type: 'positive', id: 'psychic_soothe',
        desc: "행성 전체에 기분 좋은 정신적 안정파가 흐릅니다! 60초 동안 모든 아군 유닛의 공격 속도가 대폭 상승합니다."
      },
      { 
        name: '고대의 유물', weight: 5, type: 'positive', id: 'ancient_relic',
        desc: "미개척지에서 고대 기술로 만들어진 강력한 유물이 발견되었습니다! 전설적인 근접 무기 중 하나를 확보합니다."
      },
      { 
        name: '작업 영감', weight: 10, type: 'positive', id: 'work_inspiration',
        desc: "정착민들이 특정 작업에 깊은 영감을 얻었습니다! 90초 동안 무작위 한 종류의 작업 수득량이 3배로 증가합니다."
      },
      { 
        name: '루시페륨 투여', weight: 10, type: 'negative', id: 'luciferium',
        desc: "금지된 약물인 루시페륨을 전원에게 투여했습니다! 60초간 폭발적인 화력을 얻지만, 약효가 끝나면 정착민 한 명이 미쳐버려 타워 하나가 무작위로 파괴됩니다."
      },
      { 
        name: '독성 낙진', weight: 10, type: 'negative', id: 'toxic_fallout',
        desc: "지독한 독성 낙진이 대기를 뒤덮었습니다! 외부 활동이 제한되어 모든 파견 임무의 효율이 50% 감소합니다."
      },
      { 
        name: '흑점 폭발', weight: 15, type: 'negative', id: 'solar_flare',
        desc: "강렬한 태양 활동으로 인해 흑점 폭발이 발생했습니다! 전자기기들이 먹통이 되어 60초 동안 모든 원거리 타워의 공격이 불가능해집니다."
      },
      { 
        name: '식중독', weight: 15, type: 'negative', id: 'food_poisoning',
        desc: "정착민들이 상한 음식을 먹고 식중독에 걸렸습니다! 고통과 구토로 인해 45초 동안 모든 파견 작업 효율이 50% 감소합니다."
      },
      { 
        name: '정신적 파동', weight: 20, type: 'negative', id: 'psychic_drone',
        desc: "불쾌한 정신적 파동이 정착지를 휩쓸고 있습니다! 정착민들이 극심한 두통과 집중력 저하를 겪으며 60초 동안 모든 타워의 사거리가 20% 감소합니다."
      },
      { 
        name: '방화광', weight: 10, type: 'negative', id: 'pyromaniac',
        desc: "정착지에 방화광 정착민이 화풀이로 불을 질렀습니다! 창고에 보관 중이던 무작위 자원 중 일부가 소실되었습니다."
      },
      { 
        name: '식량 부패', weight: 15, type: 'negative', id: 'food_rot',
        desc: "보관 중이던 식량이 상해버렸습니다! 덥고 습한 날씨 혹은 관리 소홀로 인해 보관 중인 식량의 상당수가 부패했습니다."
      }
    ];

    const totalWeight = events.reduce((sum, e) => sum + e.weight, 0);
    const rand = Math.random() * totalWeight;
    let cumulative = 0;
    let selected = events[0];

    for (const e of events) {
      cumulative += e.weight;
      if (rand <= cumulative) {
        selected = e;
        break;
      }
    }

    // 팝업 표시 및 게임 일시정지
    this.showEventModal(selected);
    this.executeEvent(selected);
  }

  showEventModal(event) {
    if (!this.modal) return;
    
    this.modalTitle.innerText = event.name;
    this.modalTitle.style.color = (event.type === 'positive') ? "#4ade80" : "#ef4444";
    this.modalText.innerText = event.desc;
    this.modal.classList.remove('hidden');
    
    this.app.state.isPaused = true; // 게임 일시정지
  }

  executeEvent(event) {
    switch (event.id) {
      case 'trade_ship':
        this.handleTradeShip();
        break;
      case 'cargo_pods':
        this.handleCargoPods(event);
        break;
      case 'wanderer_joins':
        this.handleWandererJoins();
        break;
      case 'ambrosia_sprout':
        this.handleAmbrosiaSprout();
        break;
      case 'psychic_soothe':
        this.handlePsychicSoothe();
        break;
      case 'ancient_relic':
        this.handleAncientRelic(event);
        break;
      case 'work_inspiration':
        this.handleWorkInspiration(event);
        break;
      case 'luciferium':
        this.handleLuciferium();
        break;
      case 'toxic_fallout':
        this.handleToxicFallout();
        break;
      case 'solar_flare':
        this.handleSolarFlare();
        break;
      case 'food_poisoning':
        this.handleFoodPoisoning();
        break;
      case 'psychic_drone':
        this.handlePsychicDrone();
        break;
      case 'pyromaniac':
        this.handlePyromaniac(event);
        break;
      case 'food_rot':
        this.handleFoodRot(event);
        break;
    }
  }

  // 1. 상선 통과 (상위 등급 무기 획득)
  handleTradeShip() {
    const isEpic = Math.random() < 0.3;
    const grade = isEpic ? 'Epic' : 'Rare';
    
    const result = GachaSystem.drawSpecificGrade(grade, this.app.state.upgrades.artisan || 0);
    if (result) {
      this.app.startPlacement(result);
    }
  }

  // 2. 화물 낙하기 (무작위 자원 보급)
  handleCargoPods(event) {
    const resources = [
        { key: 'steel', name: '강철', min: 40, max: 80 },
        { key: 'plasteel', name: '플라스틸', min: 20, max: 50 },
        { key: 'uranium', name: '우라늄', min: 15, max: 40 },
        { key: 'component', name: '부품', min: 2, max: 6 },
        { key: 'silver', name: '은화', min: 100, max: 300 }
    ];

    const res = resources[Math.floor(Math.random() * resources.length)];
    const amount = Math.floor(res.min + Math.random() * (res.max - res.min));
    
    this.app.state.addResource(res.key, amount);
    
    // 모달 텍스트 업데이트 (실제 획득한 자원 표시)
    event.desc = `궤도에서 떨어진 낙하기를 회수했습니다! \n\n보상: ${res.name} +${amount}`;
    this.modalText.innerText = event.desc;
  }

  // 3. 공동체 합류 (인구 증가)
  handleWandererJoins() {
    this.app.state.population += 1;
    this.app.state.idlePopulation += 1;
    this.app.ui.addMiniNotification("새로운 정착민 합류! (인구 +1)");
  }

  // 4. 암브로시아 발아 (은환 2배)
  handleAmbrosiaSprout() {
    this.activeEvents.push({
        id: 'ambrosia_sprout',
        name: '암브로시아 발아',
        type: 'positive',
        duration: 120 // 120초간 지속
    });
  }

  // 5. 정신적 안정파 (공속 상향)
  handlePsychicSoothe() {
    this.activeEvents.push({
        id: 'psychic_soothe',
        name: '정신적 안정파',
        type: 'positive',
        duration: 60 // 60초간 지속
    });
  }

  // 6. 고대의 유물 (전설템 획득)
  handleAncientRelic(event) {
    const relics = ['제우스망치', '플라즈마검', '단분자검'];
    const pName = relics[Math.floor(Math.random() * relics.length)];
    
    // 강제로 전설 품질로 생성
    const result = {
        weaponName: pName,
        weaponData: WEAPON_DB[pName],
        quality: 'legendary',
        material: '플라스틸'
    };

    if (result.weaponData) {
        this.app.startPlacement(result);
        event.desc = `유적 깊숙한 곳에서 빛나는 상자를 발견했습니다. \n\n득템: 전설 등급의 [${pName}]`;
        this.modalText.innerText = event.desc;
        this.app.ui.showNotification("전설적 유물 발견", `${pName}을(를) 획득했습니다!`, "Legendary");
    }
  }

  // 7. 작업 영감 (특정 작업 3배 보너스)
  handleWorkInspiration(event) {
    const jobs = [
        { id: 'logging', name: '벌목' },
        { id: 'mining', name: '채광' },
        { id: 'farming', name: '농사' },
        { id: 'research', name: '연구' },
        { id: 'trading', name: '교역' }
    ];
    const job = jobs[Math.floor(Math.random() * jobs.length)];

    this.activeEvents.push({
        id: 'work_inspiration',
        targetJob: job.id,
        name: `${job.name} 영감`,
        type: 'positive',
        duration: 90
    });

    event.desc = `정착민들이 [${job.name}] 작업에서 신들린 지혜를 발휘하기 시작했습니다! \n\n90초 동안 [${job.name}] 자원 획득량이 3배가 됩니다.`;
    this.modalText.innerText = event.desc;
  }

  // 8. 루시페륨 투여 (폭풍 공속/데미지 + 타워 파괴)
  handleLuciferium() {
    this.activeEvents.push({
        id: 'luciferium',
        name: '루시페륨 투여',
        type: 'negative',
        duration: 60 // 60초간 지속
    });
  }

  // 9. 흑점 폭발 (원거리 공격 중단)
  handleSolarFlare() {
    this.activeEvents.push({
        id: 'solar_flare',
        name: '흑점 폭발',
        type: 'negative',
        duration: 60
    });
  }

  // 10. 식중독 (파견 효율 감소)
  handleFoodPoisoning() {
    this.activeEvents.push({
        id: 'food_poisoning',
        name: '식중독',
        type: 'negative',
        duration: 45
    });
  }

  // 11. 정신적 파동 (사거리 감소)
  handlePsychicDrone() {
    this.activeEvents.push({
        id: 'psychic_drone',
        name: '정신적 파동',
        type: 'negative',
        duration: 60
    });
  }

  // 12. 방화광 (무작위 자원 소실)
  handlePyromaniac(event) {
    const resources = [
        { key: 'silver', name: '은화' },
        { key: 'steel', name: '강철' },
        { key: 'plasteel', name: '플라스틸' },
        { key: 'uranium', name: '우라늄' },
        { key: 'component', name: '부품' },
        { key: 'research', name: '연구 데이터' }
    ];

    const target = resources[Math.floor(Math.random() * resources.length)];
    const currentAmount = this.app.state.resources[target.key] || 0;
    
    if (currentAmount > 0) {
        // 현재 보유량의 20% ~ 50% 소실
        const lossPercent = 20 + Math.random() * 30;
        const lossAmount = Math.ceil(currentAmount * (lossPercent / 100));
        
        this.app.state.resources[target.key] -= lossAmount;
        if (this.app.state.resources[target.key] < 0) this.app.state.resources[target.key] = 0;

        event.desc = `방화광이 창고에 불을 질러 [${target.name}] 자원 ${lossAmount}개를 태워버렸습니다! \n\n보유 중인 자원이 크게 소실되었습니다.`;
        this.modalText.innerText = event.desc;
        this.app.ui.addMiniNotification(`자원 소실: ${target.name} -${lossAmount}`, 'failure');
    } else {
        event.desc = `방화광이 불을 지르려 했으나, 다행히도 대상 자원 창고가 비어있어 피해가 미미했습니다.`;
        this.modalText.innerText = event.desc;
    }

    this.app.ui.updateDisplays(this.app.state);
  }

  // 13. 식량 부패 (식량 자원 소실)
  handleFoodRot(event) {
    const currentFood = this.app.state.resources.food || 0;
    
    if (currentFood > 0) {
        // 30% ~ 70% 소실 (부패는 피해가 큼)
        const lossPercent = 30 + Math.random() * 40;
        const lossAmount = Math.ceil(currentFood * (lossPercent / 100));
        
        this.app.state.resources.food -= lossAmount;
        if (this.app.state.resources.food < 0) this.app.state.resources.food = 0;

        event.desc = `창고의 식량이 부패했습니다! \n\n소실된 식량: -${lossAmount}`;
        this.modalText.innerText = event.desc;
        this.app.ui.addMiniNotification(`식량 부패: -${lossAmount}`, 'failure');
    } else {
        event.desc = `창고가 비어있어 부패할 식량이 없었습니다.`;
        this.modalText.innerText = event.desc;
    }

    this.app.ui.updateDisplays(this.app.state);
  }

  // 2. 독성 낙진 (파견 효율 감소)
  handleToxicFallout() {
    this.activeEvents.push({
      id: 'toxic_fallout',
      name: '독성 낙진',
      type: 'negative',
      duration: 60 // 60초간 지속
    });

    this.app.ui.showNotification(
      "독성 낙진", 
      "대기가 오염되어 파견 작업 효율이 50% 감소합니다!", 
      "failure"
    );
  }

  // 글로벌 효율 보너스 계산 (독성 낙진 등 반영)
  getGlobalWorkEfficiency() {
    let efficiency = 1.0;
    // 독성 낙진: 파견 효율 0% (완전 중단)
    if (this.activeEvents.some(e => e.id === 'toxic_fallout')) {
      efficiency *= 0.0;
    }
    // 식중독: 파견 효율 50% 감소
    if (this.activeEvents.some(e => e.id === 'food_poisoning')) {
      efficiency *= 0.5;
    }
    return efficiency;
  }

  // 글로벌 사거리 배율 계산
  getGlobalRangeMultiplier() {
    let multiplier = 1.0;
    if (this.activeEvents.some(e => e.id === 'psychic_drone')) {
      multiplier *= 0.8; // 사거리 20% 감소
    }
    return multiplier;
  }
}
