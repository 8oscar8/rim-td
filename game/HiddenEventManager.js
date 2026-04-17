/**
 * HiddenEventManager.js
 * 게임당 1~2회만 발생하는 전설적인 '히든 인카운터' 시스템을 관리합니다.
 */
export class HiddenEventManager {
  constructor(app) {
    this.app = app;
    this.nextEventTimer = this.getRandomInterval();
    this.isWarningActive = false;
    this.warningTimer = 0;
    this.pityBonus = 0; // 발생 실패 시마다 증가하는 보정 확률
  }

  // 15~20분 (900~1200초) 사이의 무작위 간격
  getRandomInterval() {
    return 900 + Math.random() * 300;
  }

  update(dt) {
    const s = this.app.state;
    if (s.isPaused) return;

    // 게임 시간 누적
    s.gameTime += dt;

    // 세션당 최대 2회 제한
    if (s.hiddenEventCount >= 2) return;

    // 1. 이벤트 주기 타이머 갱신
    this.nextEventTimer -= dt;

    // 2. 경고 공지 처리 (발생 10초 전)
    if (!this.isWarningActive && this.nextEventTimer <= 10) {
        // 발생 조건 체크 (최소 15분 경과 및 20웨이브 이상)
        if (s.gameTime >= 900 && s.waveNumber >= 20) {
            this.startWarning();
        } else {
            // 조건 미충족 시 타이머 재설정 (조금 짧은 주기로 재시도)
            this.nextEventTimer = 60 + Math.random() * 60;
        }
    }

    if (this.isWarningActive) {
        this.warningTimer -= dt;
        if (this.warningTimer <= 0) {
            this.triggerHiddenEvent();
        }
    }
  }

  startWarning() {
    console.log("%c[Warning] 무언가 거대한 운명의 흐름이 느껴집니다...", "color: #ff00ff; font-weight: bold;");
    this.isWarningActive = true;
    this.warningTimer = 10;
    
    // 시각적 노이즈 효과 활성화 (CSS 클래스 주입)
    document.body.classList.add('screen-noise');
    
    // 미니 알림
    this.app.ui.addMiniNotification("치명적인 예감이 정착지를 뒤덮습니다...", "Legendary");
  }

  triggerHiddenEvent() {
    this.isWarningActive = false;
    document.body.classList.remove('screen-noise');

    // 확률 체크 (기본 30% + 피티 보너스)
    const chance = 0.3 + this.pityBonus;
    if (Math.random() < chance || this.app.state.gameTime > 1800) { // 30분 넘으면 확정
        this.executeRandomHiddenEvent();
        this.app.state.hiddenEventCount++;
        this.nextEventTimer = this.getRandomInterval();
        this.pityBonus = 0;
    } else {
        // 실패 시 다음 기회 노림 (보정치 증가)
        this.pityBonus += 0.2;
        this.nextEventTimer = 300 + Math.random() * 300; // 5~10분 뒤 재시도
        this.app.ui.addMiniNotification("불길한 기운이 잠시 가라앉았습니다.", "info");
    }
  }

  executeRandomHiddenEvent() {
    const events = [
        { id: 'alpha_thrumbo', name: '알파 트럼보의 출현', type: 'boss' },
        { id: 'dark_monolith', name: '암흑 모노리스', type: 'object' },
        { id: 'imperial_guard', name: '근위대의 시련', type: 'combat' },
        { id: 'howling_blade', name: '울부짖는 칼날의 선택', type: 'choice' }
    ];

    const selected = events[Math.floor(Math.random() * events.length)];
    
    // 실제 로직 연동 (WaveManager 등)
    if (this.app.waveManager) {
        console.log(`[Hidden Event] Triggering: ${selected.name}`);
        
        const eventData = {
            name: `[히든] ${selected.name}`,
            desc: this.getEventDescription(selected.id),
            type: 'negative' // 보스전이므로 경고 색상
        };

        this.app.encounterManager.showEventModal(eventData);
        
        // 보스 스폰 로직 호출 (로직은 이미 WaveManager에 준비되어 있음)
        if (selected.id === 'alpha_thrumbo') this.app.waveManager.spawnSpecialBoss('AlphaThrumbo');
        else if (selected.id === 'dark_monolith') this.app.waveManager.spawnSpecialBoss('DarkMonolith');
        else if (selected.id === 'imperial_guard') this.app.waveManager.spawnSpecialBoss('ImperialGuard');
        else if (selected.id === 'howling_blade') this.triggerHowlingBlade();
    }
  }

  triggerHowlingBlade() {
      const eventData = {
          name: "울부짖는 칼날의 선택",
          desc: "공허의 틈새에서 피울음을 토하는 칼날 하나가 나타났습니다. \n\n이 칼날은 정착민 10명의 생명력을 제물로 원하고 있습니다. \n수락하면 무작위 타워 10개가 즉시 파괴되지만, 히든 무기 '결속 단분자검'을 손에 넣을 수 있습니다. \n\n시련을 받아들이시겠습니까?"
      };

      this.app.encounterManager.showChoiceModal(
          eventData,
          () => {
              // [수락] 유닛 10개 무작위 파괴
              this.app.ui.addMiniNotification("피의 계약이 성사되었습니다.", "failure");
              
              for (let i = 0; i < 10; i++) {
                  if (this.app.units.length > 0) {
                      const idx = Math.floor(Math.random() * this.app.units.length);
                      this.app.units.splice(idx, 1);
                  }
              }

              // [Fix] 메인 앱의 전역 보상 함수를 직접 호출 (안정성 확보)
              if (typeof this.app.triggerHowlingBladeReward === 'function') {
                  this.app.triggerHowlingBladeReward();
              } else if (window.app && window.app.triggerHowlingBladeReward) {
                  window.app.triggerHowlingBladeReward();
              }
          },
          () => {
              // [거절]
              this.app.ui.addMiniNotification("칼날은 실망한 듯 공허 속으로 사라졌습니다.", "info");
          }
      );
  }

  getEventDescription(id) {
    const descs = {
        alpha_thrumbo: "일반적인 생태계의 정점에 선 '알파 트럼보'가 정착지를 향해 돌진하고 있습니다! 파괴적인 맷집과 초재생 능력을 가졌습니다. 처치 시 전설적인 보상을 기대할 수 있습니다.",
        dark_monolith: "알 수 없는 공허의 뒤틀림이 발생하며 필드에 '암흑 모노리스'가 나타났습니다. 60초 내에 파괴하지 못하면 정착민들의 정신이 파괴될 것입니다!",
        imperial_guard: "정착지의 성장을 지켜보던 제국 근위대장이 시련을 내리기 위해 직접 찾아왔습니다. 근위대의 철통같은 방어를 뚫고 실력을 증명하십시오."
    };
    return descs[id] || "정체를 알 수 없는 거대한 힘이 접근합니다.";
  }
}
