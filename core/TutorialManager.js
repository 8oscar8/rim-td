/**
 * TutorialManager.js
 * 게임 초반부 사용자 가이드를 단계별로 진행합니다.
 */
export class TutorialManager {
    constructor(app) {
        this.app = app;
        this.currentStep = 0;
        this.tutorialData = [
            {
                msg: "📡 [긴급 무전]\n반갑습니다, 관리자님. 이곳은 변방계의 척박한 정착지입니다. \n\n곧 대규모 습격이 시작될 예정입니다. 살아남기 위해 기지를 방어해야 합니다.",
                mission: null,
                canNext: true
            },
            {
                msg: "우선 방어선을 구축하기 위해 요원이 필요합니다.\n\n하단 상점의 [일반 유닛 모집] 버튼(Q)을 눌러 유닛을 확보하고, \n확보된 유닛을 지도(원형 경로 주변)에 클릭하여 배치하세요.",
                mission: "유닛 모집 및 배치하기 (Q -> 클릭)",
                canNext: false,
                trigger: 'place_unit', // 최종 목표는 배치 완료
                pointer: '#btn-buy-random'
            },
            {
                msg: "성공적이군요. 이제 정착민들을 실제 작업에 투입해야 합니다.\n\n왼쪽 사이드바를 마우스 휠로 끝까지 내려서 [정착민 파견 관리] 구역을 찾아보세요.",
                mission: "휠을 내려 파견 관리 확인하기",
                canNext: false,
                trigger: 'view_dispatch',
                pointer: '.work-management'
            },
            {
                msg: "좋습니다. 이제 노는 정착민들을 모두 작업에 배정해 봅시다.\n\n각 항목의 [+] 버튼이나 단축키를 사용해 대기 중인 정착민을 0명으로 만들어보세요.",
                mission: "대기 중인 정착민 모두 배정하기 (0명 만들기)",
                canNext: false,
                trigger: 'assign_all_workers',
                pointer: '.btn-circle.plus'
            },
            {
                msg: "완벽합니다! 이곳에서 노는 인구를 자원 채집에 배정할 수 있습니다.\n\n정착민들이 자원을 모으는 동안, 전투력을 높여봅시다. [훈련] 탭을 클릭해 보세요.",
                mission: "[훈련] 탭 클릭하기",
                canNext: false,
                trigger: 'switch_tab_train',
                pointer: '.tab-btn[data-tab="train"]'
            },
            {
                msg: "각 무기 타입별(둔기/날붙이/원거리) 공격력을 강화할 수 있습니다.\n\n원하는 항목의 [강화] 버튼을 눌러 전투력을 업그레이드해 보세요.",
                mission: "유닛 강화 1회 실행하기",
                canNext: false,
                trigger: 'upgrade_unit',
                pointer: '#up-ranged' 
            },
            {
                msg: "훈련을 통해 기초 화력을 갖추셨군요. 아주 좋습니다!\n\n다음으로 상단 [제작] 탭으로 이동해 보세요.",
                mission: "[제작] 탭 클릭하기",
                canNext: false,
                trigger: 'switch_tab_craft',
                pointer: '.tab-btn[data-tab="craft"]'
            },
            {
                msg: "이곳에서는 자원을 소모하여 특정 등급의 타워를 확정적으로 획득할 수 있습니다.\n\n운에 맡기지 않고 확실한 전력 보강이 필요할 때 이용해 보세요. \n\n다음으로 [특수] 탭으로 이동해 봅시다.",
                mission: "[특수] 탭 클릭하기",
                canNext: false,
                trigger: 'switch_tab_special',
                pointer: '.tab-btn[data-tab="special"]'
            },
            {
                msg: "잘하셨습니다. 이제 왼쪽 사이드바를 마우스 휠로 아래로 내려보세요.\n\n이곳에서는 전투에 큰 도움을 주는 [특수 소모품]을 제작하여 사용할 수 있습니다.",
                mission: "휠을 내려 [특수 아이템] 확인하기",
                canNext: false,
                trigger: 'view_special_items',
                pointer: '.item-section'
            },
            {
                msg: "수고하셨습니다! 소모품은 위급한 순간에 전세를 역전시킬 강력한 수단입니다.\n\n[무전 종료] 모든 기초 지식을 습득하셨습니다. 관리자님의 정착지에 번영이 가득하기를!",
                mission: null,
                canNext: true
            }
        ];
        
        this.overlay = document.getElementById('tutorial-overlay');
        this.msgEl = document.getElementById('tutorial-msg');
        this.missionEl = document.getElementById('tutorial-mission');
        this.missionText = document.getElementById('mission-text');
        this.nextBtn = document.getElementById('tutorial-next-btn');
        this.skipBtn = document.getElementById('tutorial-skip-btn');
        this.pointer = document.getElementById('tutorial-pointer');
        
        this.initEvents();
    }

    start() {
        this.currentStep = 0;
        this.showStep();
        this.overlay.classList.remove('hidden');
    }

    initEvents() {
        if (this.nextBtn) {
            this.nextBtn.onclick = () => this.nextStep();
        }
        if (this.skipBtn) {
            this.skipBtn.onclick = () => this.finish();
        }
    }

    showStep() {
        const step = this.tutorialData[this.currentStep];
        if (!step) {
            this.finish();
            return;
        }

        // 창이 숨겨져 있으면 다시 표시
        this.overlay.classList.remove('hidden');

        this.msgEl.textContent = step.msg;
        
        if (step.mission) {
            this.missionEl.classList.remove('hidden');
            this.missionText.textContent = step.mission;
            this.nextBtn.style.display = 'none'; // 미션이 있으면 '다음' 버튼 숨김
        } else {
            this.missionEl.classList.add('hidden');
            this.nextBtn.style.display = 'block';
        }

        // [New] 화살표 위치 업데이트
        this.updatePointer(step.pointer);

        // [New] 업그레이드 단계 진입 시 자원이 부족할 수 있으므로 최소량(1) 보충해줌
        if (step.trigger === 'upgrade_unit') {
            const s = this.app.state;
            s.silver = Math.max(s.silver, 1);
            s.wood = Math.max(s.wood, 1);
            s.steel = Math.max(s.steel, 1);
            s.plasteel = Math.max(s.plasteel, 1);
            this.app.ui.updateDisplays(s);
        }
    }

    /**
     * [New] 지시 화살표를 특정 요소 위에 배치 및 실시간 추적
     */
    updatePointer(selector) {
        this.currentTargetSelector = selector;
        if (!this.pointer) return;

        // 이전 하이라이트 제거
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });

        if (!selector) {
            this.pointer.classList.add('hidden');
            return;
        }

        // 실시간 추적 루프 시작
        this.startPointerLoop();
    }

    startPointerLoop() {
        if (this.pointerLoopId) return;
        
        const loop = () => {
            if (!this.currentTargetSelector) {
                this.stopPointerLoop();
                return;
            }

            const target = document.querySelector(this.currentTargetSelector);
            if (target) {
                // 타겟 하이라이트 중복 방지
                if (!target.classList.contains('tutorial-highlight')) {
                    target.classList.add('tutorial-highlight');
                }

                const rect = target.getBoundingClientRect();
                
                // [New] 파견 구역 혹은 특수 아이템 구역이 화면 중앙 근처에 보이면 자동으로 다음 단계로 진행
                if ((this.currentTargetSelector === '.work-management' || this.currentTargetSelector === '.item-section') && rect.top < window.innerHeight * 0.8) {
                     const step = this.tutorialData[this.currentStep];
                     if (step && (step.trigger === 'view_dispatch' || step.trigger === 'view_special_items')) {
                         this.trigger(step.trigger);
                     }
                }

                // 타겟이 화면 밖에 있으면 숨김 처리
                if (rect.top < 0 || rect.bottom > window.innerHeight) {
                    this.pointer.classList.add('hidden');
                } else {
                    this.pointer.classList.remove('hidden');
                    this.pointer.style.left = `${rect.left + rect.width / 2}px`;
                    this.pointer.style.top = `${rect.top - 55}px`;
                }
            } else {
                this.pointer.classList.add('hidden');
            }

            this.pointerLoopId = requestAnimationFrame(loop);
        };
        this.pointerLoopId = requestAnimationFrame(loop);
    }

    stopPointerLoop() {
        if (this.pointerLoopId) {
            cancelAnimationFrame(this.pointerLoopId);
            this.pointerLoopId = null;
        }
    }

    nextStep() {
        this.currentStep++;
        this.showStep();
    }

    /**
     * 외부(App)에서 특정 행동이 발생했을 때 호출
     */
    trigger(action) {
        const step = this.tutorialData[this.currentStep];
        if (!step) return;

        // [New Exception] 유닛 구매 시 창을 즉시 숨김 (통합 안내 단계에서)
        if (action === 'buy_unit' && step.trigger === 'place_unit') {
            this.hide();
            return;
        }

        if (step.trigger === action) {
            this.nextStep();
        }
    }

    finish() {
        this.overlay.classList.add('hidden');
        this.updatePointer(null); // 화살표 제거
        // 튜토리얼이 끝나면 게임 일시정지 해제
        this.app.state.isPaused = false;
        this.app.ui.addMiniNotification("튜토리얼 완료! 행운을 빕니다.", "info");
    }

    /**
     * [New] 튜토리얼 창 일시 숨김 (배치 중 등)
     */
    hide() {
        this.overlay.classList.add('hidden');
        this.updatePointer(null);
    }

    /**
     * [New] 튜토리얼 창 다시 표시
     */
    show() {
        if (this.overlay.classList.contains('hidden')) {
            this.overlay.classList.remove('hidden');
            this.showStep();
        }
    }

    /**
     * 특정 행동이 현재 허용되는지 확인
     */
    isActionAllowed(action) {
        // 튜토리얼이 끝났거나(UI가 숨겨짐), 건너뛰었다면 모든 행동 허용
        if (this.overlay.classList.contains('hidden')) return true;

        const step = this.tutorialData[this.currentStep];
        if (!step) return true;

        // [Critical Fix] '다음' 버튼으로만 넘어가는 단순 안내 단계(예: 첫 인사)라면 모든 게임 행동 차단
        if (step.canNext && !step.mission) return false;

        // [New Exception] 배치 미션 중에는 구매 행동도 허용함
        if (action === 'buy_unit' && step.trigger === 'place_unit') return true;

        // [New Exception] 탭 전환 미션 중에는 탭 버튼 활성화 허용
        if (action === 'switch_tab' && step.trigger && step.trigger.startsWith('switch_tab_')) return true;

        // 현재 단계의 트리거가 없으면 자유로운 조작 허용 (미션이 완료된 마지막 안내 등)
        if (!step.trigger) return true;

        // 현재 단계의 트리거와 일치하는 행동만 허용
        return step.trigger === action;
    }
}
