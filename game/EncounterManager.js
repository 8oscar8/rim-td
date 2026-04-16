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

  updateActiveEvents(dt) {
    let uiHtml = "";
    this.activeEvents = this.activeEvents.filter(event => {
      event.duration -= dt;
      
      // UI 요소 생성
      uiHtml += `
        <div class="event-tag">
            <span>${event.name}</span>
            <span class="time">${Math.ceil(event.duration)}s</span>
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
      this.app.ui.showNotification(
        "상선 통과", 
        `무역 상선이 Rare/Epic 무기를 투하하고 떠났습니다!`, 
        grade
      );
    }
  }

  // 2. 독성 낙진 (파견 효율 감소)
  handleToxicFallout() {
    this.activeEvents.push({
      id: 'toxic_fallout',
      name: '독성 낙진',
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
