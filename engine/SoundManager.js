export class SoundManager {
  // 우선순위 정의
  static PRIORITY = {
    HIGH: 0,    // BGM, 레이드 알림, 배드 이벤트 (절대 끊기면 안 됨)
    MEDIUM: 1,  // UI 클릭, 보상 획득, 건물 건설 (중요도가 높음)
    LOW: 2      // 전투 사운드 (발사음, 명중음, 사망음 - 가장 낮음)
  };

  static init() {
    this.bgm = null;
    this.activeVoices = []; // 현재 재생 중인 모든 오디오 객체 추적
    
    // 환경 설정
    this.MAX_TOTAL_VOICES = 32;   // 브라우저 채널 한계를 고려한 전체 최대 동시 재생 수
    this.MAX_PER_SRC = 3;         // 동일한 사운드 파일의 최대 중첩 재생 제한 (스팸 방지)
    this.LOW_PRIORITY_CAP = 20;   // LOW 우선순위 사운드들이 점유할 수 있는 최대 슬롯 (HIGH/MEDIUM 자리 보존)

    this.volumes = {
        master: 1.0,
        bgm: 0.5,
        weapon: 0.5,
        ui: 0.5,
        enemy: 0.5
    };
    
    const encodePath = (p) => p.split('/').map(s => encodeURIComponent(s)).join('/').replace(/%3A/g, ':');

    // 중요 알림 사운드 사전 로딩
    this.raidAlert = new Audio(encodePath('assets/audio/raid_alert.mp3'));
    this.badAlert = new Audio(encodePath('assets/audio/bad_alert.mp3'));
    this.encounterSuccessSound = new Audio(encodePath('assets/audio/긍정적랜덤인카운터.ogg'));
    this.coinSound = new Audio(encodePath('assets/audio/coin.mp3'));
    this.buySound = new Audio(encodePath('assets/audio/BuyThing.ogg'));
    this.upgradeSound = new Audio(encodePath('assets/audio/upgrade.mp3'));
    this.clickSound = new Audio(encodePath('assets/audio/click.mp3'));
    
    const preloads = [this.raidAlert, this.badAlert, this.encounterSuccessSound, this.coinSound, this.buySound, this.upgradeSound, this.clickSound];
    preloads.forEach(a => { if (a) a.preload = 'auto'; });
  }

  /**
   * 볼륨 설정 업데이트
   */
  static updateVolumes(settings) {
    if (!settings) return;
    if (settings.masterVolume !== undefined) this.volumes.master = parseFloat(settings.masterVolume);
    if (settings.bgmVolume !== undefined) this.volumes.bgm = parseFloat(settings.bgmVolume);
    if (settings.weaponVolume !== undefined) this.volumes.weapon = parseFloat(settings.weaponVolume);
    if (settings.uiVolume !== undefined) this.volumes.ui = parseFloat(settings.uiVolume);
    if (settings.enemyVolume !== undefined) this.volumes.enemy = parseFloat(settings.enemyVolume);
    
    this.syncActiveSounds();
  }

  /**
   * 재생 중인 모든 소리의 볼륨 동기화
   */
  static syncActiveSounds() {
    const master = this.volumes.master;
    const bgmMult = master * this.volumes.bgm;
    const weaponMult = master * this.volumes.weapon;
    const uiMult = master * this.volumes.ui;
    const enemyMult = master * this.volumes.enemy;

    if (this.bgm) {
      this.bgm.volume = Math.max(0, Math.min(1, 0.4 * bgmMult));
    }
    
    this.activeVoices.forEach(voice => {
      if (voice.audio) {
        const base = voice.baseVol || 0.6;
        let mult = uiMult;
        // [New] 무기(2.5배) 및 적 사망(1.5배) 소리 증폭 계수 적용
        if (voice.category === 'weapon') mult = weaponMult * 2.5; 
        else if (voice.category === 'enemy') mult = enemyMult * 1.5;
        
        voice.audio.volume = Math.max(0, Math.min(1, base * mult));
      }
    });

    // 사전 로드된 UI 객체들은 UI 볼륨 적용
    [this.raidAlert, this.badAlert, this.encounterSuccessSound, this.coinSound, this.buySound, this.upgradeSound, this.clickSound].forEach(obj => {
      if (obj) obj.volume = Math.max(0, Math.min(1, 0.8 * uiMult));
    });
  }

  /**
   * 배경음악 재생
   */
  static playBGM(src, baseVol = 0.4) {
    const finalVol = baseVol * this.volumes.master * this.volumes.bgm;

    if (this.bgm && this.bgm.src.includes(src)) {
      if (this.bgm.paused) {
        this.bgm.volume = Math.max(0, Math.min(1, finalVol));
        this.bgm.play().catch(() => {});
      }
      return;
    }

    if (this.bgm) {
      this.bgm.pause();
      this.bgm = null;
    }

    const encodePath = (p) => p.split('/').map(s => encodeURIComponent(s)).join('/').replace(/%3A/g, ':');
    this.bgm = new Audio(encodePath(src));
    this.bgm.loop = true;
    this.bgm.volume = Math.max(0, Math.min(1, finalVol));
    this.bgm.play().catch(e => console.warn("BGM 자동재생 대기:", e));
  }

  /**
   * 우선순위 기반 효과음 재생 핵심 로직
   */
  static playSFX(src, baseVol = 0.6, priority = this.PRIORITY.LOW, category = 'ui') {
    try {
      // 1. 끝난 소리 정리
      this.activeVoices = this.activeVoices.filter(v => !v.audio.ended && !v.audio.paused);

      // 2. 중요 알림 예외 처리 (별도 객체 사용)
      if (src.includes('raid_alert') || src.includes('bad_alert')) {
        this.playHighPriorityStatic(src.includes('raid_alert') ? this.raidAlert : this.badAlert, baseVol);
        return;
      }

      // 중요 효과음 매핑 (src 기반 자동 우선순위 격상)
      if (src.includes('coin.mp3') || src.includes('BuyThing.ogg') || src.includes('upgrade.mp3') || src.includes('제작.ogg')) {
          priority = this.PRIORITY.MEDIUM;
          category = 'ui';
      }
      
      // 자동 카테고리 분류 (기존 코드와의 호환성을 위함)
      if (src.includes('죽음소리') || src.includes('사망사운드') || src.includes('몹피격음')) {
          category = 'enemy';
      } else if (src.includes('weaponsound') || (src.includes('.ogg') && !src.includes('긍정적') && priority !== this.PRIORITY.MEDIUM)) {
          // .ogg 파일 중 무기 폴더에 있거나 UI(MEDIUM)가 아닌 소리들은 무기로 추정
          if (!category || category === 'ui') category = 'weapon';
      }

      // 3. 동일 사운드 중첩(Per-Src Limit) 체크
      const sameSrcCount = this.activeVoices.filter(v => v.src === src).length;
      if (sameSrcCount >= this.MAX_PER_SRC) {
          if (priority === this.PRIORITY.LOW) return; // 낮은 순위면 그냥 무시
          // 높은 순위면 가장 오래된 같은 소리를 중지하고 진행
          const oldestSame = this.activeVoices.find(v => v.src === src);
          if (oldestSame) this.stopVoice(oldestSame);
      }

      // 4. 글로벌 보이스 제한 체크 및 슬롯 확보
      if (this.activeVoices.length >= this.MAX_TOTAL_VOICES) {
          // 낮은 우선순위 사운드 중 가장 오래된 것을 찾아 제거
          const lowPriorityVoices = this.activeVoices.filter(v => v.priority === this.PRIORITY.LOW);
          if (lowPriorityVoices.length > 0) {
              this.stopVoice(lowPriorityVoices[0]);
          } else if (priority === this.PRIORITY.LOW) {
              // 모든 슬롯이 HIGH/MEDIUM인데 새로 들어온 게 LOW면 재생 안함
              return;
          } else {
              // 최후의 수단: 가장 오래된 MEDIUM이라도 제거
              const mediumVoices = this.activeVoices.filter(v => v.priority === this.PRIORITY.MEDIUM);
              if (mediumVoices.length > 0) this.stopVoice(mediumVoices[0]);
          }
      }

      // 5. LOW 우선순위 전용 캡 적용 (HIGH/MEDIUM을 위해 자리 비워둠)
      if (priority === this.PRIORITY.LOW) {
          const currentLowCount = this.activeVoices.filter(v => v.priority === this.PRIORITY.LOW).length;
          if (currentLowCount >= this.LOW_PRIORITY_CAP) return;
      }

      // 6. 실제 재생
      const encodePath = (p) => p.split('/').map(s => encodeURIComponent(s)).join('/').replace(/%3A/g, ':');
      const audio = new Audio(encodePath(src));
      
      let mult = this.volumes.ui;
      if (category === 'weapon') mult = this.volumes.weapon * 2.5; // 무기 소리 2.5배 증폭
      else if (category === 'enemy') mult = this.volumes.enemy * 1.5; // 적 사망 소리 1.5배 증폭
      
      audio.volume = Math.max(0, Math.min(1, baseVol * this.volumes.master * mult));
      
      const voice = {
          audio,
          src,
          priority,
          category,
          baseVol,
          startTime: Date.now()
      };

      audio.play().then(() => {
          this.activeVoices.push(voice);
      }).catch(() => { /* 재생 차단 무시 */ });

    } catch (err) {
      console.error("[Sound] playSFX Error:", err);
    }
  }

  /**
   * 특정 보이스 강제 종료 및 리스트 제거
   */
  static stopVoice(voice) {
      try {
          voice.audio.pause();
          voice.audio.currentTime = 0;
          this.activeVoices = this.activeVoices.filter(v => v !== voice);
      } catch (e) {}
  }

  /**
   * 레이드 알림 등 단일 인스턴스 중요 사운드 재생
   */
  static playHighPriorityStatic(audioObj, baseVol = 0.8) {
      if (!audioObj) return;
      audioObj.currentTime = 0;
      audioObj.volume = Math.max(0, Math.min(1, baseVol * this.volumes.master * this.volumes.ui));
      audioObj.play().catch(() => {});
  }

  /**
   * 주요 사운드 재생 편의 메서드 (우선순위 자동 지정)
   */
  static playClick() {
    this.playSFX('assets/audio/click.mp3', 1.0, this.PRIORITY.MEDIUM);
  }

  static playReward() {
    this.playSFX('assets/audio/coin.mp3', 0.8, this.PRIORITY.MEDIUM);
  }

  static playSuccess() {
    this.playSFX('assets/audio/긍정적랜덤인카운터.ogg', 0.8, this.PRIORITY.MEDIUM);
  }

  static playRaidAlert() {
    this.playHighPriorityStatic(this.raidAlert, 0.9);
  }

  static playBadAlert() {
    this.playSFX('assets/audio/Quest_Failed_01a.ogg', 1.0, this.PRIORITY.MEDIUM);
  }

  static playBuy() {
    this.playSFX('assets/audio/BuyThing.ogg', 0.8, this.PRIORITY.MEDIUM);
  }

  static playUpgrade() {
    this.playSFX('assets/audio/upgrade.mp3', 0.8, this.PRIORITY.MEDIUM);
  }

  static playCraft() {
    this.playSFX('assets/audio/제작.ogg', 0.8, this.PRIORITY.MEDIUM);
  }

  static stopBGM() {
    if (this.bgm) {
      this.bgm.pause();
    }
  }
}

