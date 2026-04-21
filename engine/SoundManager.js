export class SoundManager {
  static init() {
    this.bgm = null;
    this.sfx = {};
    this.activeSFX = new Map(); // [New] 현재 재생 중인 효과음 추적 (보이스 리밋용)
    this.MAX_POLYPHONY = 5;    // [New] 동일 사운드 최대 동시 재생 수
    
    // [New] 카테고리별 볼륨 설정 (기본값)
    this.volumes = {
        master: 1.0,
        bgm: 0.5,
        sfx: 0.5
    };
    
    // 습격 및 배드 이벤트 사운드 사전 로딩
    this.raidAlert = new Audio('assets/audio/raid_alert.mp3');
    this.badAlert = new Audio('assets/audio/bad_alert.mp3');
    this.encounterSuccessSound = new Audio('assets/audio/긍정적랜덤인카운터.ogg');
    this.coinSound = new Audio('assets/audio/coin.mp3');
    this.buySound = new Audio('assets/audio/buy.mp3');
    this.upgradeSound = new Audio('assets/audio/upgrade.mp3');
    
    const preloads = [this.raidAlert, this.badAlert, this.encounterSuccessSound, this.coinSound, this.buySound, this.upgradeSound];
    preloads.forEach(a => { if (a) a.preload = 'auto'; });
  }

  /**
   * [New] 통합 볼륨 업데이트 및 실시간 동기화
   */
  static updateVolumes(settings) {
    if (!settings) return;
    if (settings.masterVolume !== undefined) this.volumes.master = parseFloat(settings.masterVolume);
    if (settings.bgmVolume !== undefined) this.volumes.bgm = parseFloat(settings.bgmVolume);
    if (settings.sfxVolume !== undefined) this.volumes.sfx = parseFloat(settings.sfxVolume);
    
    this.syncActiveSounds();
    console.log(`[Sound] 볼륨 동기화 완료 (M:${this.volumes.master}, B:${this.volumes.bgm}, S:${this.volumes.sfx})`);
  }

  /**
   * 현재 재생 중이거나 사전 로드된 모든 소리의 볼륨을 현재 설정에 맞게 재계산
   */
  static syncActiveSounds() {
    const master = this.volumes.master;
    const bgmMult = master * this.volumes.bgm;
    const sfxMult = master * this.volumes.sfx;

    // 1. 배경음악 동기화
    if (this.bgm) {
      this.bgm.volume = Math.max(0, Math.min(1, 0.4 * bgmMult));
    }
    
    // 2. 사전 로드된 효과음 객체들 동기화
    const sfxObjects = [
      { obj: this.raidAlert, mul: 0.8 },
      { obj: this.badAlert, mul: 0.8 },
      { obj: this.encounterSuccessSound, mul: 0.8 },
      { obj: this.coinSound, mul: 0.8 },
      { obj: this.buySound, mul: 0.8 },
      { obj: this.upgradeSound, mul: 1.0 }
    ];

    sfxObjects.forEach(item => {
      if (item.obj) {
        item.obj.volume = Math.max(0, Math.min(1, item.mul * sfxMult));
      }
    });

    // 3. 현재 재생 중인 활성 효과음들 동기화
    this.activeSFX.forEach((list) => {
        list.forEach(sound => {
            sound.volume = Math.max(0, Math.min(1, 0.8 * sfxMult));
        });
    });
  }

  // 배경음악 재생 (루프 지원, 중복 생성 방지)
  static playBGM(src, baseVol = 0.4) {
    const finalVol = baseVol * this.volumes.master * this.volumes.bgm;

    if (this.bgm && this.bgm.src.includes(src)) {
      if (this.bgm.paused) {
        this.bgm.volume = Math.max(0, Math.min(1, finalVol));
        this.bgm.play().catch(e => console.log("BGM Resume Wait..."));
      }
      return;
    }

    if (this.bgm) {
      this.bgm.pause();
      this.bgm = null;
    }

    this.bgm = new Audio(src);
    this.bgm.loop = true;
    this.bgm.volume = Math.max(0, Math.min(1, finalVol));
    this.bgm.preload = 'metadata';
    
    const playPromise = this.bgm.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn("BGM 자동재생 차단됨:", error);
      });
    }
  }

  // 효과음 재생 (보이스 리밋 적용)
  static playSFX(src, baseVol = 0.6) {
    try {
      const finalVol = baseVol * this.volumes.master * this.volumes.sfx;
      
      // 1. 해당 소리의 재생 중인 리스트 가져오기
      if (!this.activeSFX.has(src)) {
          this.activeSFX.set(src, []);
      }
      const playingList = this.activeSFX.get(src);

      // 2. 이미 끝난 소리 리스트에서 제거 (정리)
      const filteredList = playingList.filter(s => !s.ended && !s.paused);
      this.activeSFX.set(src, filteredList);

      // 3. 보이스 리밋 체크 (이미 5개 재생 중이면 새로 재생 안함)
      if (filteredList.length >= this.MAX_POLYPHONY) {
          return; 
      }

      // 4. 새로운 오디오 객체 생성 및 재생
      const sound = new Audio(src);
      sound.volume = Math.max(0, Math.min(1, finalVol));
      
      const playPromise = sound.play();
      if (playPromise !== undefined) {
          playPromise.then(() => {
              filteredList.push(sound);
          }).catch(error => { /* 자동재생 오류 무시 */ });
      }

    } catch (err) {
      console.error("[Sound] playSFX Error:", err);
    }
  }

  static stopBGM() {
    if (this.bgm) {
      this.bgm.pause();
    }
  }
}
