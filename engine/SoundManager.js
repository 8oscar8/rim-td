export class SoundManager {
  static init() {
    this.bgm = null;
    this.sfx = {};
    
    // [New] 카테고리별 볼륨 설정 (기본값)
    this.volumes = {
        master: 1.0,
        bgm: 0.5,
        sfx: 0.5
    };
    
    // 습격 및 배드 이벤트 사운드 사전 로딩
    this.raidAlert = new Audio('assets/audio/raid_alert.mp3');
    this.badAlert = new Audio('assets/audio/bad_alert.mp3');
    this.encounterSuccessSound = new Audio('assets/audio/encounter_success.mp3');
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

  // 효과음 재생
  static playSFX(src, baseVol = 0.6) {
    try {
      const finalVol = baseVol * this.volumes.master * this.volumes.sfx;
      let sound;
      
      // 사전 로드된 사운드 체크
      if (src.includes('raid_alert')) sound = this.raidAlert;
      else if (src.includes('bad_alert')) sound = this.badAlert;
      else if (src.includes('encounter_success.mp3')) sound = this.encounterSuccessSound;
      else if (src.includes('coin.mp3')) sound = this.coinSound;
      else if (src.includes('buy.mp3')) sound = this.buySound;

      if (!sound) {
        sound = new Audio(src);
      }

      if (sound) {
        sound.currentTime = 0;
        sound.volume = Math.max(0, Math.min(1, finalVol));
        const playPromise = sound.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => { /* 자동재생 오류 무시 */ });
        }
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
