import { Enemy } from './Enemy.js';
import { WAVE_HP_DATA } from './WaveHPData.js';
import { FIXED_MONSTER_LIST } from './MonsterData.js';

/**
 * WaveManager.js
 * 게임의 라운드를 관리하고 적의 스폰 및 난이도 조절을 담당하는 클래스
 */
export class WaveManager {
  constructor(waypoints, onEnemyDeath, onWaveComplete, onWaveStart) {
    this.waypoints = waypoints;
    this.onEnemyDeath = onEnemyDeath;
    this.onWaveComplete = onWaveComplete;
    this.onWaveStart = onWaveStart;
    
    this.waveNumber = 0;
    this.maxWaves = 100;
    this.enemiesToSpawn = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 1.0; 
    
    this.nextWaveTimer = 10; // 초기 시작 대기 시간 10초
    this.isWaveActive = true; 
    this.isWaveCompleted = true; // 초기에는 완료 상태로 시작하여 카운트다운 유발
    this.gameFinished = false;
    
    this.baseEnemyHp = 50;
    this.baseReward = 1; 
    this.totalEnemiesInWave = 0; 
    this.enemiesKilledInWave = 0; // [New] 이번 웨이브에서 처치된 적 수 추적
    
    // 보스 구성 정보
    this.bossToSpawn = 0;
    this.bossNames = ['CENTIPEDE', 'WARQUEEN', 'DIABOLUS', 'APOLLYON', 'MECHASILISK', 'SCYTHER PRINCE', 'BRAYER'];
  }

  reset() {
    this.waveNumber = 0;
    this.isWaveActive = false;
    this.enemiesToSpawn = 0;
    this.totalEnemiesInWave = 0;
    this.enemiesKilledInWave = 0;
    this.nextWaveTimer = 110;
  }

  /**
   * 다음 웨이브(라운드)를 시작하고 난이도를 계산
   */
  startNextWave() {
    if (this.waveNumber >= this.maxWaves) {
      this.gameFinished = true;
      return;
    }

    this.waveNumber++;
    this.enemiesToSpawn = Math.min(10 + Math.floor(this.waveNumber * 1.5), 24);
    
    // 10라운드마다 보스 등장 여부 결정
    this.bossToSpawn = (this.waveNumber % 10 === 0) ? 1 : 0;
    
    // [New] 보스 라운드일 경우 일반 몹 스폰을 취소하고 보스만 단독 등장
    if (this.bossToSpawn > 0) {
      this.enemiesToSpawn = 0;
    }
    
    this.totalEnemiesInWave = this.enemiesToSpawn + this.bossToSpawn;
    
    this.spawnTimer = 0;
    this.nextWaveTimer = 110; 
    this.isWaveActive = true;
    this.isWaveCompleted = false;
    this.enemiesKilledInWave = 0; // 새 웨이브 시작 시 처치 수 초기화
    
    // 라운드별 적 체력 리스트에서 가져오기
    this.currentEnemyHp = WAVE_HP_DATA[this.waveNumber - 1] || 50;
    this.currentReward = Math.floor(this.waveNumber / 8);

    if (this.onWaveStart) this.onWaveStart(this.waveNumber);
  }

  update(dt, enemiesList) {
    if (this.gameFinished) return;

    try {
      if (this.isWaveActive) {
        // 일반 적 스폰 로직
        if (this.enemiesToSpawn > 0) {
          this.spawnTimer += dt;
          if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer -= this.spawnInterval;
            this.enemiesToSpawn--;
            
            this.spawnStandardEnemy(enemiesList);
          }
        } 
        // 보스 스폰 로직 (일반 적 스폰 완료 후)
        else if (this.bossToSpawn > 0) {
          this.spawnTimer += dt;
          if (this.spawnTimer >= this.spawnInterval * 2) {
            this.bossToSpawn--;
            this.spawnBossEnemy(enemiesList);
          }
        } 
        else if (this.enemiesKilledInWave >= this.totalEnemiesInWave && !this.isWaveCompleted) {
          this.isWaveCompleted = true;
          // [New] 최종 라운드 클리어 시 즉시 종료 처리 (카운트다운 방지)
          if (this.waveNumber >= this.maxWaves) {
              this.gameFinished = true;
              this.nextWaveTimer = 0;
          }
          if (this.onWaveComplete) this.onWaveComplete();
        }
      }
    } catch (e) {
      console.error("WaveManager Update Error:", e);
    }

    // 다음 라운드 카운트다운 및 타이머 단축 체크
    if (this.isWaveActive) {
      // [New Fix] 웨이브 적을 다 잡았고 필드가 깨끗하다면 언제든지 타이머를 10초로 단축
      if (this.isWaveCompleted && enemiesList.length === 0 && this.nextWaveTimer > 10) {
          this.nextWaveTimer = 10;
      }

      this.nextWaveTimer -= dt;
      if (this.nextWaveTimer <= 0) {
          // [New] 타임아웃 패널티: 제한 시간 내 섬멸 실패 시 무드 -10
          if (!this.isWaveCompleted && window.gameCore) {
              window.gameCore.state.mood = Math.max(0, window.gameCore.state.mood - 10);
              window.gameCore.ui.addMiniNotification("제한 시간 내 적을 섬멸하지 못했습니다! 정착민 무드 -10%", "failure");
          }
          this.startNextWave();
      }
    }
  }

  /**
   * 일반 적 인스턴스 생성 및 리스트 추가
   */
  spawnStandardEnemy(enemiesList) {
    let type = 'organic';
    let name = '';
    let img = null;
    
    // [New] 고정 몬스터 데이터 적용 (1~50라운드)
    const fixedData = FIXED_MONSTER_LIST[this.waveNumber - 1];
    if (fixedData && !fixedData.boss) {
        type = fixedData.type;
        name = fixedData.name;
        img = fixedData.img;
    } else if (this.waveNumber >= 10) {
      if (this.waveNumber % 5 === 0 || Math.random() < 0.2) type = 'mech';
    }
    
    // [New] 일반 적 방어력 공식 적용
    let armor = 0;
    if (this.waveNumber <= 50) {
        armor = Math.floor((this.waveNumber - 1) * (50 / 49));
    } else {
        armor = Math.floor(50 + (this.waveNumber - 50) * 3);
    }
    
    const enemy = new Enemy(this.waypoints, this.currentEnemyHp, this.currentReward, type, false, armor, img);
    if (name) enemy.name = name;
    const originalTakeDamage = enemy.takeDamage.bind(enemy);
    enemy.takeDamage = (amount, ap, effect, shooterGrade, shred, isTrue, shooterName) => {
      // 7번째 인자인 shooterName이 정확히 전달되도록 수정
      const died = originalTakeDamage(amount, ap, effect, shooterGrade, shred, isTrue, shooterName);
      if (died) {
          this.enemiesKilledInWave++;
          this.onEnemyDeath(enemy);
      }
      return died;
    };
    enemiesList.push(enemy);
  }

  /**
   * 보스 적 인스턴스 생성 및 리스트 추가
   */
  spawnBossEnemy(enemiesList) {
    const bossHp = this.currentEnemyHp * 15;
    const bossReward = this.currentReward * 50;
    
    let bossName = this.bossNames[(this.waveNumber / 10 - 1) % this.bossNames.length];
    let type = (this.waveNumber >= 20) ? 'mech' : 'organic';
    let img = null;

    // [New] 고정 보스 데이터 적용 (1~50라운드)
    const fixedData = FIXED_MONSTER_LIST[this.waveNumber - 1];
    if (fixedData && fixedData.boss) {
        bossName = fixedData.name;
        type = fixedData.type;
        img = fixedData.img;
    }

    // [New] 보스 전용 방어력 공식: Floor(Wave / 10)^1.5 * 30
    const armor = Math.floor(Math.pow(Math.floor(this.waveNumber / 10), 1.5) * 30);

    const enemy = new Enemy(this.waypoints, bossHp, bossReward, type, true, armor, img);
    enemy.name = bossName;

    const originalTakeDamage = enemy.takeDamage.bind(enemy);
    enemy.takeDamage = (amount, ap, effect, shooterGrade, shred, isTrue, shooterName) => {
      const died = originalTakeDamage(amount, ap, effect, shooterGrade, shred, isTrue, shooterName);
      if (died) {
          this.enemiesKilledInWave++;
          this.onEnemyDeath(enemy);
      }
      return died;
    };
    enemiesList.push(enemy);
  }

  forceStartNextWave() {
    this.nextWaveTimer = 0;
    this.isWaveCompleted = true;
  }

  /**
   * 상단 약탈 이벤트용 머팔로 상단 소환
   */
  spawnMerchantCaravan() {
    const caravanCount = 5;
    const armor = Math.floor(this.waveNumber * 0.5); // 상단은 방어력이 낮음
    for (let i = 0; i < caravanCount; i++) {
        const muffalo = new Enemy(this.waypoints, 500, 200, 'organic', false, armor);
        muffalo.name = '짐 실은 머팔로';
        muffalo.speed *= 0.6;
        
        const originalDeath = muffalo.takeDamage.bind(muffalo);
        muffalo.takeDamage = (amount, ap, effect, shooterGrade) => {
            const died = originalDeath(amount, ap, effect, shooterGrade);
            if (died && typeof window.gameCore !== 'undefined') {
                this.onEnemyDeath(muffalo);
                window.gameCore.state.addResource('component', 2);
            }
            return died;
        };
        document.dispatchEvent(new CustomEvent('spawnSpecial', { detail: muffalo }));
    }
  }

  /**
   * 특정 테마의 특수 보스 소환
   */
  spawnSpecialBoss(type) {
    let boss;
    const baseHp = this.currentEnemyHp * 20;
    // 특수 보스 방어력 보정
    const armor = Math.floor(Math.pow(Math.floor(this.waveNumber / 10), 1.5) * 35); 
    
    switch(type) {
        case 'ImperialGuard':
            boss = new Enemy(this.waypoints, baseHp, 1000, 'mech', true, armor);
            boss.name = '제국 근위대장';
            boss.shield = baseHp * 0.5;
            break;
        case 'AlphaThrumbo':
            boss = new Enemy(this.waypoints, baseHp * 2, 2000, 'organic', true, armor * 0.5);
            boss.name = '알파 트럼보';
            boss.hpRegen = boss.maxHp * 0.025; // 초재생 능력: 초당 최대 체력의 2.5% 회복
            break;
        case 'DarkMonolith':
            // 저등급 유닛만 데미지를 줄 수 있으므로 체력을 대폭 하향 (기존 보스의 60% 수준)
            boss = new Enemy(this.waypoints, baseHp * 0.6, 0, 'none', true, armor * 1.5);
            boss.name = '암흑 모노리스';
            boss.gradeFilter = { mode: 'below', grade: 'Epic' }; // Epic 등급 이하만 피격 가능 (= Special 이상 면역)
            break;
    }

    if (boss) {
        const originalDeath = boss.takeDamage.bind(boss);
        boss.takeDamage = (amount, ap, effect, shooterGrade) => {
            const died = originalDeath(amount, ap, effect, shooterGrade);
            if (died && window.gameCore) {
                this.onEnemyDeath(boss);
                if (type === 'ImperialGuard') window.gameCore.applyImperialBuff();
                else if (type === 'AlphaThrumbo') window.gameCore.grantThrumboHorn();
                else if (type === 'DarkMonolith') window.gameCore.applyVoidWisdomReward();
            }
            return died;
        };
        document.dispatchEvent(new CustomEvent('spawnSpecial', { detail: boss }));
    }
  }

  /**
   * [New] 제국 근위대의 기습 (보스 + 정예병)
   */
  spawnImperialGuardAmbush() {
      const baseHp = this.currentEnemyHp * 20;
      const armor = Math.floor(Math.pow(Math.floor(this.waveNumber / 10), 1.5) * 30);
      
      // 1. 근위대장 (보스) 스폰
      const boss = new Enemy(this.waypoints, baseHp * 1.5, 1000, 'mech', true, armor * 1.2);
      boss.name = '제국 근위대장';
      boss.shieldMax = baseHp * 0.5;
      boss.shield = boss.shieldMax;
      
      const originalDeath = boss.takeDamage.bind(boss);
      boss.takeDamage = (amount, ap, effect, shooterGrade) => {
          const died = originalDeath(amount, ap, effect, shooterGrade);
          if (died && window.gameCore) {
              this.onEnemyDeath(boss);
              window.gameCore.applyImperialBuff(); // 성공 보상
          }
          return died;
      };
      document.dispatchEvent(new CustomEvent('spawnSpecial', { detail: boss }));

      // 2. 근위병 (정예) 12개체 스폰
      let spawned = 0;
      const interval = setInterval(() => {
          const guard = new Enemy(this.waypoints, baseHp * 0.3, 150, 'mech', false, armor * 0.8);
          guard.name = '제국 근위병';
          guard.speed *= 1.3; // 정예병이므로 빠름
          guard.shieldMax = baseHp * 0.1;
          guard.shield = guard.shieldMax;
          
          const gDeath = guard.takeDamage.bind(guard);
          guard.takeDamage = (a, ap, e, s) => {
              const d = gDeath(a, ap, e, s);
              if (d) this.onEnemyDeath(guard);
              return d;
          };
          
          document.dispatchEvent(new CustomEvent('spawnSpecial', { detail: guard }));
          spawned++;
          if (spawned >= 12) clearInterval(interval);
      }, 300);
  }

  /**
   * [New] 상단 습격 (Caravan Raid)
   */
  spawnCaravanRaid() {
    const baseHp = this.currentEnemyHp * 25;
    const trumboCount = 3;
    let trumbosLeft = trumboCount;
    let anyEscaped = false;

    // 1. 운반 트럼보 스폰
    const armor = Math.floor(Math.pow(Math.floor(this.waveNumber / 10), 1.5) * 20);
    let spawnedTrumbo = 0;
    const tInterval = setInterval(() => {
        const trumbo = new Enemy(this.waypoints, baseHp * 2.5, 500, 'organic', true, armor);
        trumbo.name = `보물 머팔로 (#${spawnedTrumbo + 1})`;
        trumbo.speed *= 0.7; // 짐이 많아 느림
        trumbo.raidTimerMax = 180; // 180초(3분) 내에 잡아야 함
        trumbo.raidTimer = trumbo.raidTimerMax;
        
        // 탈출 시 패널티 발동 콜백
        trumbo.onRaidTimeout = () => {
            if (!anyEscaped) {
                anyEscaped = true;
                if (window.gameCore) window.gameCore.handleCaravanRaidFailure();
            }
        };

        const originalDeath = trumbo.takeDamage.bind(trumbo);
        trumbo.takeDamage = (a, ap, e, s) => {
            const d = originalDeath(a, ap, e, s);
            if (d) {
                this.onEnemyDeath(trumbo);
                trumbosLeft--;
                if (trumbosLeft <= 0 && !anyEscaped) {
                    if (window.gameCore) window.gameCore.handleCaravanRaidSuccess();
                }
            }
            return d;
        };

        document.dispatchEvent(new CustomEvent('spawnSpecial', { detail: trumbo }));
        spawnedTrumbo++;
        if (spawnedTrumbo >= trumboCount) clearInterval(tInterval);
    }, 2000);

    // 2. 용병 경호원 스폰 (15명)
    let spawnedGuard = 0;
    const gInterval = setInterval(() => {
        const guard = new Enemy(this.waypoints, baseHp * 0.4, 200, 'organic', false, armor * 0.6);
        guard.name = '상단 경호원';
        guard.speed *= 1.4;
        guard.armor += 50;

        const gDeath = guard.takeDamage.bind(guard);
        guard.takeDamage = (a, ap, e, s) => {
            const d = gDeath(a, ap, e, s);
            if (d) this.onEnemyDeath(guard);
            return d;
        };

        document.dispatchEvent(new CustomEvent('spawnSpecial', { detail: guard }));
        spawnedGuard++;
        if (spawnedGuard >= 15) clearInterval(gInterval);
    }, 800);
  }

  /**
   * [New] 식인 동물 무리 소환
   */
  spawnManhunterPack() {
    const animalCount = 15 + Math.floor(this.waveNumber / 5);
    const animalHp = (this.currentEnemyHp || 50) * 0.6; 
    const animalReward = 1 + Math.floor(this.waveNumber / 20); 
    
    // [New] 1~20라운드 동물 명단 중 무작위 하나 선택
    const randomIdx = Math.floor(Math.random() * 20);
    const randomAnimal = FIXED_MONSTER_LIST[randomIdx];
    
    let spawnCount = 0;
    const armor = Math.floor(this.waveNumber * 0.3);
    const interval = setInterval(() => {
        const animal = new Enemy(
            this.waypoints, 
            animalHp, 
            animalReward, 
            'organic', 
            false, 
            armor,
            randomAnimal ? randomAnimal.img : null // 이미지 적용
        );
        animal.name = randomAnimal ? `식인 ${randomAnimal.name}` : '식인 동물';
        animal.level = this.waveNumber; // 레벨 정보 추가
        animal.speed *= 1.6; // 매우 빠름
        
        const originalDeath = animal.takeDamage.bind(animal);
        animal.takeDamage = (amount, ap, effect, shooterGrade) => {
            const died = originalDeath(amount, ap, effect, shooterGrade);
            if (died) this.onEnemyDeath(animal);
            return died;
        };
        
        document.dispatchEvent(new CustomEvent('spawnSpecial', { detail: animal }));
        
        spawnCount++;
        if (spawnCount >= animalCount) clearInterval(interval);
    }, 200); // 0.2초 간격으로 쏟아져 나옴
  }

  /**
   * 곤충 군락 (Infestation) - 다양한 곤충형 적 스폰
   */
  spawnInfestation() {
    console.log("Infestation triggered!");
    
    // 곤충 종류 정의
    const insectTypes = [
        { name: '메카스카라브', hpMul: 0.5, spdMul: 1.5, size: 10, color: '#94a3b8', img: 'special_메가스카라브.webp' },
        { name: '스펠로피드', hpMul: 1.0, spdMul: 1.1, size: 15, color: '#475569', img: 'special_스펠로피드.webp' },
        { name: '메가스파이더', hpMul: 2.2, spdMul: 0.8, size: 22, color: '#1e293b', img: 'special_메가스파이더.webp' }
    ];

    const count = { val: 0 };
    const maxCount = 12 + Math.floor(Math.random() * 8); // 12~20마리
    const baseHp = this.currentEnemyHp || 50;

    const intervalId = setInterval(() => {
        if (count.val >= maxCount) {
            clearInterval(intervalId);
            return;
        }

        // 가중치 적용 스폰 (스카라브 50%, 스펠로피드 30%, 스파이더 20%)
        const rand = Math.random();
        let config = insectTypes[0];
        if (rand > 0.8) config = insectTypes[2];      // 메가스파이더
        else if (rand > 0.5) config = insectTypes[1]; // 스펠로피드

        const armor = Math.floor(this.waveNumber * 0.8);
        const insect = new Enemy(
            this.waypoints,
            baseHp * config.hpMul,
            this.currentReward || 1,
            'organic',
            false,
            armor,
            config.img // 곤충 이미지 적용
        );
        insect.level = this.waveNumber; // 레벨 정보 추가
        
        // 곤충 개별 커스텀
        insect.name = config.name;
        insect.speed *= config.spdMul;
        insect.radius = config.size; // size 대신 radius를 직접 설정해야 화면에 보입니다.
        insect.color = config.color;

        const originalDeath = insect.takeDamage.bind(insect);
        insect.takeDamage = (amount, ap, effect, shooterGrade) => {
            const died = originalDeath(amount, ap, effect, shooterGrade);
            if (died) this.onEnemyDeath(insect);
            return died;
        };

        const spawnEvent = new CustomEvent('spawnSpecial', { detail: insect });
        document.dispatchEvent(spawnEvent);

        count.val++;
    }, 250);
  }
}
