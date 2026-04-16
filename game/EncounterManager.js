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
  }

  getRandomInterval() {
    // 3분(180초) ~ 6분(360초) 사이의 무작위 간격
    return 180 + Math.random() * 180;
  }

  update(dt) {
    // 1. 이벤트 주기 타이머 갱신
    this.nextEventTimer -= dt;
    if (this.nextEventTimer <= 0) {
      this.triggerRandomEvent();
      this.nextEventTimer = this.getRandomInterval();
    }

    // 2. 지속 이벤트 시간 갱신 및 종료 처리
    this.activeEvents = this.activeEvents.filter(event => {
      event.duration -= dt;
      if (event.duration <= 0) {
        this.app.ui.addMiniNotification(`이벤트 종료: ${event.name}`, 'info');
        return false;
      }
      return true;
    });
  }

  triggerRandomEvent() {
    const events = [
      { name: '상선 통과', weight: 12, type: 'positive', id: 'trade_ship' },
      { name: '독성 낙진', weight: 10, type: 'negative', id: 'toxic_fallout' }
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

    this.executeEvent(selected);
  }

  executeEvent(event) {
    console.log(`[Encounter] Triggered: ${event.name}`);

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
