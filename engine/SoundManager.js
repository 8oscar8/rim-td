export class SoundManager {
  static init() {
    this.bgm = null;
    this.sfx = {};
    this.masterVolume = 0.5;
    
    // [추가] 습격 및 배드 이벤트 사운드 사전 로딩
    this.raidAlert = new Audio('assets/audio/raid_alert.mp3');
    this.raidAlert.preload = 'auto';
    this.badAlert = new Audio('assets/audio/bad_alert.mp3');
    this.badAlert.preload = 'auto';
    this.encounterSuccessSound = new Audio('assets/audio/encounter_success.mp3');
    this.encounterSuccessSound.preload = 'auto';
    this.coinSound = new Audio('assets/audio/coin.mp3');
    this.coinSound.preload = 'auto';
    this.buySound = new Audio('assets/audio/buy.mp3');
    this.buySound.preload = 'auto';
    this.upgradeSound = new Audio('assets/audio/upgrade.mp3');
    this.upgradeSound.preload = 'auto';
  }

  // 배경음악 재생 (루프 지원, 중복 생성 방지)
  static playBGM(src, volume = 0.4) {
    if (this.bgm && this.bgm.src.includes(src)) {
      if (this.bgm.paused) {
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
    this.bgm.volume = volume * this.masterVolume;
    this.bgm.preload = 'metadata';
    
    const playPromise = this.bgm.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn("BGM 자동재생 차단됨:", error);
      });
    }
  }

  // 효과음 재생 (중첩 지원 또는 특정 사운드 전용 처리)
  static playSFX(src, volume = 0.6) {
    let sound;
    
    // 사전 로드된 특수 사운드(습격/배드 이벤트) 재사용
    if (src.includes('raid_alert')) {
      sound = this.raidAlert;
      sound.currentTime = 0;
    } else if (src.includes('bad_alert')) {
      sound = this.badAlert;
      sound.currentTime = 0;
    } else if (src.includes('encounter_success.mp3')) {
      sound = this.encounterSuccessSound;
      sound.currentTime = 0;
    } else if (src.includes('coin.mp3')) {
      sound = this.coinSound;
      sound.currentTime = 0;
    } else if (src.includes('buy.mp3')) {
      sound = this.buySound;
      sound.currentTime = 0;
    } else if (src.includes('upgrade.mp3')) {
      sound = this.upgradeSound;
      sound.currentTime = 0;
    } else {
      sound = new Audio(src);
    }

    sound.volume = volume * this.masterVolume;
    sound.play().catch(e => {
      console.warn("SFX 재생 실패 (유저 클릭 필요):", src, e);
    }); 
  }

  static stopBGM() {
    if (this.bgm) {
      this.bgm.pause();
    }
  }

  static setMasterVolume(v) {
    this.masterVolume = Math.max(0, Math.min(1, parseFloat(v)));
    
    // 배경음악 즉시 동기화
    if (this.bgm) {
      this.bgm.volume = 0.4 * this.masterVolume;
    }
    
    // 사전 로드된 모든 효과음 객체 볼륨 즉시 동기화
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
        item.obj.volume = item.mul * this.masterVolume;
      }
    });

    console.log(`Master Volume updated to: ${this.masterVolume}`);
  }
}
