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
        { id: 'caravan_raid', name: '상단 습격의 기회', type: 'choice' },
        { id: 'howling_blade', name: '울부짖는 칼날의 선택', type: 'choice' }
    ];

    const selected = events[Math.floor(Math.random() * events.length)];
    
    // 실제 로직 연동 (WaveManager 등)
    if (this.app.waveManager) {
        console.log(`[Hidden Event] Triggering: ${selected.name}`);
        
        // [Fix] 선택형 이벤트는 전용 모달을 사용하므로 일반 모달 호출 제외
        if (selected.id !== 'howling_blade') {
            const eventData = {
                name: `[히든] ${selected.name}`,
                desc: this.getEventDescription(selected.id),
                type: 'negative' // 보스전이므로 경고 색상
            };
            this.app.encounterManager.showEventModal(eventData);
        }
        
        // 보스 스폰 및 특수 이벤트 로직 호출
        if (selected.id === 'alpha_thrumbo') this.triggerAlphaThrumbo();
        else if (selected.id === 'dark_monolith') this.triggerDarkMonolith();
        else if (selected.id === 'imperial_guard') this.triggerImperialGuard();
        else if (selected.id === 'caravan_raid') this.triggerCaravanRaid();
        else if (selected.id === 'howling_blade') this.triggerHowlingBlade();
    }
  }

  triggerCaravanRaid() {
      const eventData = {
          name: "부유한 상단의 통과",
          desc: "진귀한 산업 자원과 보물을 가득 실은 외지인 연합 상단이 인근을 지나가고 있습니다. \n\n이들을 습격하면 막대한 자원과 전설 무기를 손에 넣을 수 있지만, 실패 시 제국의 혹독한 배상 책임을 지게 됩니다. \n\n약탈을 개시하시겠습니까?"
      };

      this.app.encounterManager.showChoiceModal(
          eventData,
          () => {
              // [수락] 습격 시작
              this.app.ui.addMiniNotification("약탈이 시작되었습니다! 모든 전리품을 확보하십시오.", "Legendary");
              this.app.waveManager.spawnCaravanRaid();
          },
          () => {
              // [거절]
              this.app.ui.addMiniNotification("상단은 감사의 뜻으로 소량의 식량을 보냈습니다.", "info");
              this.app.state.addResource('food', 50);
          }
      );
  }

  triggerImperialGuard() {
      const eventData = {
          name: "제국 근위대의 시련",
          desc: "정착지의 명성이 은하계 은신처까지 퍼졌습니다. \n\n제국 근위대장이 당신의 방어 능력을 직접 시험하겠다고 통보해 왔습니다. 기습에 대비하고 실력을 증명하시겠습니까? \n\n성공 시 전령의 축복(영구 공속 +20%)을 얻을 수 있습니다."
      };

      this.app.encounterManager.showChoiceModal(
          eventData,
          () => {
              // [수락] 근위대 기습 시작
              this.app.ui.addMiniNotification("제국의 정예병들이 전입했습니다!", "Legendary");
              this.app.waveManager.spawnImperialGuardAmbush();
          },
          () => {
              // [거절]
              this.app.ui.addMiniNotification("제국은 당신의 비겁함에 실망하며 물러갔습니다.", "info");
          }
      );
  }

  triggerAlphaThrumbo() {
      const eventData = {
          name: "알파 트럼보의 발견",
          desc: "매우 희귀한 변종인 '알파 트럼보' 한 마리가 정착지 인근에서 발견되었습니다. \n\n이 짐승은 극도로 위험하지만, 사냥에 성공하면 전설적인 전리품인 '알파 트럼보 뿔'을 손에 넣을 수 있습니다. \n\n알파 트럼보를 공격하여 사냥을 시작하시겠습니까?"
      };

      this.app.encounterManager.showChoiceModal(
          eventData,
          () => {
              // [수락] 알파 트럼보 스폰
              this.app.ui.addMiniNotification("사냥이 시작되었습니다!", "Legendary");
              this.app.waveManager.spawnSpecialBoss('AlphaThrumbo');
          },
          () => {
              // [거절]
              this.app.ui.addMiniNotification("알파 트럼보는 정착지를 무시하고 멀리 떠나갔습니다.", "info");
          }
      );
  }

  triggerDarkMonolith() {
      const eventData = {
          name: "공허의 뒤틀림: 암흑 모노리스",
          desc: "공허의 틈새에서 거대한 암흑 모노리스가 솟아오르려 합니다. \n\n이 구조물은 에픽(Epic) 등급 이하의 무기로만 파괴할 수 있는 기묘한 공허 보호막을 지녔으며, 파괴 시 정착민들이 공허의 지식을 흡수하여 비약적인 기술 도약을 이룰 수 있습니다. \n\n하지만 실패 시 정착민들의 정신이 붕괴될 것입니다. 시련을 받아들이시겠습니까?"
      };

      this.app.encounterManager.showChoiceModal(
          eventData,
          () => {
              // [수락] 모노리스 스폰
              this.app.ui.addMiniNotification("공허의 에너지가 실체화됩니다!", "Legendary");
              this.app.waveManager.spawnSpecialBoss('DarkMonolith');
          },
          () => {
              // [거절] 공용 패널티 함수 호출
              if (this.app.applyVoidPunishment) {
                  this.app.applyVoidPunishment("거절");
              }
          }
      );
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
        imperial_guard: "정착지의 성장을 지켜보던 제국 근위대장이 시련을 내리기 위해 직접 찾아왔습니다. 근위대의 철통같은 방어를 뚫고 실력을 증명하십시오.",
        howling_blade: "공허의 틈새에서 피울음을 토하는 칼날 하나가 나타났습니다. 이 칼날은 정착민 10명의 생명력을 제물로 원하고 있습니다."
    };
    return descs[id] || "정체를 알 수 없는 거대한 힘이 접근합니다.";
  }
}
