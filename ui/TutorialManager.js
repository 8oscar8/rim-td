/**
 * TutorialManager.js
 * 게임의 초기 적응을 돕는 단계별 가이드 시스템 (미션형)
 */
export class TutorialManager {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.currentStep = 0;
        this.isActive = false;
        this.isStepTransitioning = false;

        // UI 요소 참조
        this.fetchElements();

        // 튜토리얼 단계 정의
        this.steps = [
            {
                title: "작전 목표: 100일의 사투",
                desc: "변방계의 구조선이 도착하기까지 <b>100일(100웨이브)</b> 동안 기지를 사수해야 합니다. 매 습격마다 전력을 다해 방어선을 유지하십시오.",
                targetId: "wave-display",
                actionType: "click_next"
            },
            {
                title: "패배 조건: 방어 분계선",
                desc: "전장에 남아있는 <b>적이 100명</b>을 넘어서면 방어선이 완전히 무너져 게임 오버됩니다. 항상 왼쪽의 적 숫자를 주시하세요.",
                targetId: "enemy-count",
                actionType: "click_next"
            },
            {
                title: "자원 수급 실습: 정착민 파견",
                desc: "생존의 기초입니다. 하단 파견 관리에서 <b>벌목(목재)</b> 측면의 <b>[+]</b> 버튼을 눌러 정착민을 1명 배치해 보세요.",
                targetId: "right-ui",
                actionType: "dispatch_worker"
            },
            {
                title: "병기 확보 실습: 상점 구매",
                desc: "지급된 100 은화로 무작위 유닛을 고용할 수 있습니다. <b>[🎁 상점]</b> 탭을 누른 후 <b>[무작위 유닛 구매]</b> 버튼을 눌러보세요.",
                targetId: "tab-btn-shop",
                actionType: "buy_unit"
            },
            {
                title: "정예화: 전문 기술 훈련",
                desc: "<b>훈련</b> 탭에서는 정착민의 작업 효율을 영구적으로 강화할 수 있습니다. 후반부를 대비해 채광과 무역 숙련도를 높이세요.",
                targetId: "tab-btn-train",
                actionType: "tab_train"
            },
            {
                title: "전력 증강: 기술 훈련(업그레이드)",
                desc: "하단의 <b>기술 훈련</b>은 둔기, 날붙이, 원거리 병종의 공격력을 각각 강화합니다. 필요한 자원만큼 <b>은화</b>도 동일하게 소모되니 신중하게 투자하세요.",
                targetId: "upgrade-list",
                actionType: "click_next"
            },
            {
                title: "전술 매뉴얼: 유닛 배치",
                desc: "지금 시나리오 지급 무기들이 대기 중입니다! 전장의 하얀색 <b>건설 가능 구역</b>을 클릭하여 정착민을 배치하세요. 모든 무기가 배치되어야 전면전이 시작됩니다.",
                targetId: "tower-info", 
                actionType: "place_unit"
            }
        ];

        this.initEvents();
    }

    fetchElements() {
        this.overlay = document.getElementById('tutorial-overlay');
        this.titleEl = document.getElementById('tutorial-title');
        this.descEl = document.getElementById('tutorial-desc');
        this.stepTag = document.getElementById('tutorial-step-tag');
        this.pointer = document.getElementById('tutorial-pointer');
        this.btnNext = document.getElementById('btn-tutorial-next');
        this.btnSkip = document.getElementById('btn-tutorial-skip');
    }

    initEvents() {
        if (this.btnNext) {
            this.btnNext.onclick = () => this.nextStep();
        }
        if (this.btnSkip) {
            this.btnSkip.onclick = () => this.finish();
        }
    }

    start() {
        this.fetchElements();
        if (!this.overlay) return;
        
        console.log("Tutorial Starting...");
        this.isActive = true;
        this.currentStep = 0;
        this.isStepTransitioning = false;
        this.overlay.style.display = 'flex';
        this.overlay.style.justifyContent = 'center';
        this.overlay.style.alignItems = 'center';
        this.showStep();
    }

    showStep() {
        const step = this.steps[this.currentStep];
        if (!step) {
            this.finish();
            return;
        }

        this.btnNext.style.display = 'none';
        this.stepTag.innerText = `가이드 ${this.currentStep + 1} / ${this.steps.length}`;
        this.titleEl.innerText = step.title;
        this.descEl.innerHTML = step.desc;

        if (step.targetId) {
            this.pointTo(step.targetId);
        } else {
            this.pointer.style.display = 'none';
        }

        const isMissionStep = ['dispatch_worker', 'buy_unit', 'tab_train', 'place_unit'].includes(step.actionType);

        if (isMissionStep) {
            this.btnNext.style.display = 'none';
            if (step.actionType === 'place_unit') {
                this.gameCore.processNextPlacement();
            }
        } else {
            this.btnNext.style.display = 'block';
            if (this.currentStep === this.steps.length - 1) {
                this.btnNext.innerText = "이해했습니다";
            } else {
                this.btnNext.innerText = "다음 단계";
            }
        }
    }

    nextStep() {
        const step = this.steps[this.currentStep];
        const isMissionStep = ['dispatch_worker', 'buy_unit', 'tab_train', 'place_unit'].includes(step.actionType);
        
        if (isMissionStep && this.isActive) return;

        this.currentStep++;
        this.showStep();
    }

    pointTo(elementId) {
        const target = document.getElementById(elementId);
        if (!target) {
            this.pointer.style.display = 'none';
            return;
        }

        const rect = target.getBoundingClientRect();
        this.pointer.style.display = 'block';
        this.pointer.style.top = (rect.top - 40) + 'px';
        this.pointer.style.left = (rect.left + rect.width / 2 - 15) + 'px';

        document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
        target.classList.add('tutorial-highlight');
    }

    onAction(type) {
        if (!this.isActive || this.isStepTransitioning) return;
        
        const step = this.steps[this.currentStep];
        if (type === step.actionType) {
            if (type === 'dispatch_worker') {
                this.isStepTransitioning = true;
                this.descEl.innerHTML = "<b style='color:#2ecc71'>성공!</b> 정착민이 업무를 시작했습니다. 다음으로 넘어갑시다.";
                setTimeout(() => {
                    this.isStepTransitioning = false;
                    this.nextStep();
                }, 1500);
            }
            else if (type === 'buy_unit') {
                this.isStepTransitioning = true;
                this.descEl.innerHTML = "<b style='color:#2ecc71'>성공!</b> 무기를 확보했습니다. 배치를 배워봅시다.";
                setTimeout(() => {
                    this.isStepTransitioning = false;
                    this.nextStep();
                }, 1500);
            }
            else if (type === 'tab_train') {
                this.isStepTransitioning = true;
                this.descEl.innerHTML = "<b style='color:#2ecc71'>성공!</b> 훈련 창입니다. 무기 강화를 확인합시다.";
                setTimeout(() => {
                    this.isStepTransitioning = false;
                    this.nextStep();
                }, 1500);
            }
            else if (type === 'place_unit') {
                const pending = this.gameCore.pendingPlacements.length;
                if (pending === 0 && !this.gameCore.pendingGachaResult) {
                    this.finish();
                } else {
                    const count = pending + (this.gameCore.pendingGachaResult ? 1 : 0);
                    this.descEl.innerHTML = `좋습니다! 남은 유닛도 배치하세요. (남은 수: <b>${count}</b>)`;
                }
            }
        }
    }

    finish() {
        this.isActive = false;
        this.overlay.style.display = 'none';
        this.pointer.style.display = 'none';
        document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
        
        localStorage.setItem('rim_td_tutorial_complete', 'true');
        this.gameCore.addNotification("가이드 완료", "이제 정착지를 건설하세요!", "success");

        if (this.gameCore.waveManager) {
            this.gameCore.waveManager.startNextWave();
        }
    }
}
