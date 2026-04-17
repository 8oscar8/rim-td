import { Enemy } from './Enemy.js';

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
    
    this.nextWaveTimer = 120; // 라운드 사이 대기 시간 (2분)
    this.isWaveActive = false;
    this.isWaveCompleted = false;
    this.gameFinished = false;
    
    this.baseEnemyHp = 50;
    this.baseReward = 1; 
    this.totalEnemiesInWave = 0; 
    
    // 보스 구성 정보
    this.bossToSpawn = 0;
    this.bossNames = ['CENTIPEDE', 'WARQUEEN', 'DIABOLUS', 'APOLLYON', 'MECHASILISK', 'SCYTHER PRINCE', 'BRAYER'];
  }

  reset() {
    this.waveNumber = 0;
    this.isWaveActive = false;
    this.enemiesToSpawn = 0;
    this.totalEnemiesInWave = 0;
    this.nextWaveTimer = 120;
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
    this.totalEnemiesInWave = this.enemiesToSpawn + this.bossToSpawn;
    
    this.spawnTimer = 0;
    this.nextWaveTimer = 120; 
    this.isWaveActive = true;
    this.isWaveCompleted = false;
    
    // 라운드별 적 체력 및 보상 지수 계산
    this.currentEnemyHp = this.baseEnemyHp * Math.pow(1.12, this.waveNumber - 1);
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
        // 웨이브 종료 체크
        else if (enemiesList.length === 0 && !this.isWaveCompleted) {
          this.isWaveCompleted = true;
          if (this.nextWaveTimer > 10) this.nextWaveTimer = 10; // 잔여 적 소탕 시 타이머 단축
          if (this.onWaveComplete) this.onWaveComplete();
        }
      }
    } catch (e) {
      console.error("WaveManager Update Error:", e);
    }

    // 다음 라운드 카운트다운
    if (this.isWaveActive) {
      this.nextWaveTimer -= dt;
      if (this.nextWaveTimer <= 0) this.startNextWave();
    }
  }

  /**
   * 일반 적 인스턴스 생성 및 리스트 추가
   */
  spawnStandardEnemy(enemiesList) {
    let type = 'organic';
    if (this.waveNumber >= 10) {
      if (this.waveNumber % 5 === 0 || Math.random() < 0.2) type = 'mech';
    }
    
    const enemy = new Enemy(this.waypoints, this.currentEnemyHp, this.currentReward, type);
    const originalTakeDamage = enemy.takeDamage.bind(enemy);
    enemy.takeDamage = (amount, ap, effect) => {
      const died = originalTakeDamage(amount, ap, effect);
      if (died) this.onEnemyDeath(enemy);
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
    const bossName = this.bossNames[(this.waveNumber / 10 - 1) % this.bossNames.length];
    const type = (this.waveNumber >= 20) ? 'mech' : 'organic';

    const enemy = new Enemy(this.waypoints, bossHp, bossReward, type, true);
    enemy.name = bossName;

    const originalTakeDamage = enemy.takeDamage.bind(enemy);
    enemy.takeDamage = (amount, ap, effect) => {
      const died = originalTakeDamage(amount, ap, effect);
      if (died) this.onEnemyDeath(enemy);
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
    for (let i = 0; i < caravanCount; i++) {
        const muffalo = new Enemy(this.waypoints, 500, 200, 'organic');
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
    
    switch(type) {
        case 'ImperialGuard':
            boss = new Enemy(this.waypoints, baseHp, 1000, 'mech', true);
            boss.name = '제국 근위대장';
            boss.shield = baseHp * 0.5;
            break;
        case 'AlphaThrumbo':
            boss = new Enemy(this.waypoints, baseHp * 2, 2000, 'organic', true);
            boss.name = '알파 트럼보';
            boss.hpRegen = boss.maxHp * 0.025; // 초재생 능력: 초당 최대 체력의 2.5% 회복
            break;
        case 'DarkMonolith':
            boss = new Enemy(this.waypoints, baseHp, 0, 'none', true);
            boss.name = '암흑 모노리스';
            boss.gradeFilter = { mode: 'below', grade: 'Epic' };
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
                else if (type === 'DarkMonolith') window.gameCore.upgradeAllLowerGradeTowers();
            }
            return died;
        };
        document.dispatchEvent(new CustomEvent('spawnSpecial', { detail: boss }));
    }
  }

  /**
   * [New] 식인 동물 무리 소환
   */
  spawnManhunterPack() {
    const animalCount = 15 + Math.floor(this.waveNumber / 5);
    const animalHp = this.currentEnemyHp * 0.6; // 다람쥐/쥐 컨셉이라 체력은 낮음
    const animalReward = 1 + Math.floor(this.waveNumber / 20); // 보상은 미미함
    
    let spawnCount = 0;
    const interval = setInterval(() => {
        const animal = new Enemy(this.waypoints, animalHp, animalReward, 'organic');
        animal.name = Math.random() < 0.5 ? '식인 다람쥐' : '식인 멧돼지';
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
        { name: '메가스카라브', hpMul: 0.5, spdMul: 1.5, size: 10, color: '#94a3b8' },
        { name: '스펠로피드', hpMul: 1.0, spdMul: 1.1, size: 15, color: '#475569' },
        { name: '메가스파이더', hpMul: 2.2, spdMul: 0.8, size: 22, color: '#1e293b' }
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

        const insect = new Enemy(
            this.waypoints,
            baseHp * config.hpMul,
            this.currentReward || 1,
            'organic'
        );
        
        // 곤충 개별 커스텀
        insect.name = config.name;
        insect.speed *= config.spdMul;
        insect.size = config.size;
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
