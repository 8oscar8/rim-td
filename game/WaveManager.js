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

    // [New] 특수 스폰 대기열 (식인 동물 등 차례대로 소환)
    this.specialSpawnQueue = [];
    this.specialSpawnTimer = 0;
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
        else if (enemiesList.length === 0 && !this.isWaveCompleted && this.specialSpawnQueue.length === 0) {
          this.isWaveCompleted = true;
          if (this.nextWaveTimer > 10) this.nextWaveTimer = 10; // 잔여 적 소탕 시 타이머 단축
          if (this.onWaveComplete) this.onWaveComplete();
        }
      }

      // [New] 특수 스폰 대기열 처리 (일반 시작점에서 차례대로 스폰)
      if (this.specialSpawnQueue.length > 0) {
          this.specialSpawnTimer += dt;
          if (this.specialSpawnTimer >= 0.2) { // 0.2초 간격으로 스폰
              this.specialSpawnTimer = 0;
              const data = this.specialSpawnQueue.shift();
              this.spawnEnemyFromData(data, enemiesList);
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
      if (died) this.onEnemyDeath(enemy.reward, false);
      return died;
    };
    enemiesList.push(enemy);
  }

  /**
   * 보스 적 인스턴스 생성 및 리스트 추가
   */
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
      if (died) this.onEnemyDeath(enemy.reward, true);
      return died;
    };
    enemiesList.push(enemy);
  }

  /**
   * 데이터 기반 적 생성 (대기열 전용)
   */
  spawnEnemyFromData(data, enemiesList) {
    const enemy = new Enemy(this.waypoints, data.hp, data.reward, data.type || 'organic');
    enemy.name = data.name;
    if (data.speed) enemy.speed = data.speed;
    
    const originalTakeDamage = enemy.takeDamage.bind(enemy);
    enemy.takeDamage = (amount, ap, effect) => {
        const died = originalTakeDamage(amount, ap, effect);
        if (died) this.onEnemyDeath(enemy.reward, false);
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
                this.onEnemyDeath(muffalo.reward, false);
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
            boss.hpRegen = 50;
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
                this.onEnemyDeath(boss.reward, true);
                if (type === 'ImperialGuard') window.gameCore.applyImperialBuff();
                else if (type === 'AlphaThrumbo') window.gameCore.grantThrumboHorn();
                else if (type === 'DarkMonolith') window.gameCore.upgradeAllLowerGradeTowers();
            }
            return died;
        };
        // [New] 이벤트 기반 대신 직접 리스트 관리 방안 사용 가능하나, 일관성을 위해 customEvent 유지 혹은 직접 추가
        if (window.app && window.app.enemies) {
            window.app.enemies.push(boss);
        }
    }
  }

  /**
   * 식인 동물 무리 스폰 (대기열 주입)
   */
  spawnManhunterPack(animalType, count) {
    for (let i = 0; i < count; i++) {
        let hp = (this.currentEnemyHp || this.baseEnemyHp);
        let speed = 80;
        let name = "식인 동물";
        let reward = 0;

        switch(animalType) {
            case 'Yorkshire':
                name = "식인 요크셔테리어";
                hp *= 0.35;
                speed = 130;
                break;
            case 'Wolf':
                name = "식인 늑대";
                hp *= 1.2;
                speed = 105;
                break;
            case 'Thrumbo':
                name = "식인 트럼보";
                hp *= 15.0;
                speed = 65;
                reward = 100;
                break;
        }

        this.specialSpawnQueue.push({
            name, hp, reward, speed, type: 'organic'
        });
    }
  }
}
