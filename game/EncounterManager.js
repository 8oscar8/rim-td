/**
 * EncounterManager.js
 * 림월드 스타일의 랜덤 이벤트(인카운터) 시스템을 관리합니다.
 */
import { GachaSystem } from './GachaSystem.js';

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
        name: '독성 낙진', weight: 10, type: 'negative', id: 'toxic_fallout',
        desc: "지독한 독성 낙진이 대기를 뒤덮었습니다! 외부 활동이 제한되어 모든 파견 임무의 효율이 50% 감소합니다."
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
      case 'toxic_fallout':
        this.handleToxicFallout();
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
    if (this.activeEvents.some(e => e.id === 'toxic_fallout')) {
      efficiency *= 0.5;
    }
    return efficiency;
  }
}
