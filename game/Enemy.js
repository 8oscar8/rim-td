import { SpriteManager } from '../engine/SpriteManager.js';
import { SoundManager } from '../engine/SoundManager.js';

/**
 * Enemy.js
 * 전장을 따라 이동하며 유닛의 공격을 받는 적들의 베이스 클래스
 */
export class Enemy {
  // 전역 보스 피해 배율 (훈련 등에 의해 변동 가능)
  static bossBonus = 1.0; 

  constructor(waypoints, hp, reward, type = 'organic', isBoss = false, armor = 0, img = null) {
    this.waypoints = waypoints;
    this.img = img;
    this.currentWaypointIndex = 0;
    
    this.x = waypoints[0].x;
    this.y = waypoints[0].y;
    
    this.isBoss = isBoss;
    this.maxHp = hp;
    this.hp = hp;
    this.armor = armor; 
    this.initialArmor = armor; // 방어력 깎기 하한선 계산용
    this.reward = reward;
    this.speed = isBoss ? 60 : 80; 
    this.radius = isBoss ? 20 : 8;
    this.active = true;
    this.type = type; // 'organic' (생체) 또는 'mech' (기계)
    this.name = isBoss ? 'CENTIPEDE' : ''; 
    
    // 상태 이상 변수
    this.stunTimer = 0;
    this.slowTimer = 0;
    this.fearTimer = 0;
    this.hpRegen = 0;
    this.toxinRegenBlock = 0; // [New] 독소 효과에 의한 체력 재생 억제 타이머
    this.activeDots = []; // { damagePerSec, duration }
    this.distanceTraveled = 0;
    this.lastX = this.x; // 진행 방향 판단용
    this.movingRight = false;
    
    // 특수 기믹 변수
    this.shield = 0;
    this.shieldMax = 0;
    this.shieldRegenTimer = 0;
    this.hpRegen = 0;
    this.gradeFilter = null; 
    
    // 보스 제한 시간 기믹 (550초)
    if (this.isBoss) {
      this.bossTimerMax = 550;
      this.bossTimer = 550;
    }

    // [New] 상단 습격용 탈출 타이머 기믹
    this.raidTimer = 0;
    this.raidTimerMax = 0;
    this.onRaidTimeout = null; // 타이머 종료 시 콜백 (탈출 성공 판정용)

    this.selected = false;
    this.flashTimer = 0;
    this.bossHitCount = 0; // [New] 보스 피격 사운드 제어용 카운터
  }

  update(dt) {
    if (!this.active) return;
    
    // 진행 방향 업데이트
    if (this.x !== this.lastX) {
        this.movingRight = this.x > this.lastX;
    }
    this.lastX = this.x;

    if (this.flashTimer > 0) this.flashTimer -= dt;

    // 재생 로직 처리 (독소 효과 및 스턴에 의해 억제될 수 있음)
    if (this.hpRegen > 0 && this.hp < this.maxHp && this.toxinRegenBlock <= 0 && this.stunTimer <= 0) {
      this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
    }
    
    if (this.toxinRegenBlock > 0) this.toxinRegenBlock -= dt;

    if (this.shieldMax > 0 && this.shield < this.shieldMax) {
      this.shieldRegenTimer -= dt;
      if (this.shieldRegenTimer <= 0) {
        this.shield = Math.min(this.shieldMax, this.shield + (this.shieldMax * 0.03 * dt));
      }
    }
    
    // 도트 데미지 처리
    for (let i = this.activeDots.length - 1; i >= 0; i--) {
      const dot = this.activeDots[i];
      const damageTick = dot.damagePerSec * dt;
      this.hp -= damageTick * (this.isBoss ? Enemy.bossBonus : 1.0);
      dot.duration -= dt;
      if (dot.duration <= 0) this.activeDots.splice(i, 1);
    }
    
    // [New] 상단 습격 타이머 업데이트
    if (this.raidTimer > 0) {
      this.raidTimer -= dt;
      
      // [New] 보스 UI 타이머와 남은 탈출 시간 동기화
      if (this.isBoss) {
          this.bossTimer = this.raidTimer;
          this.bossTimerMax = this.raidTimerMax;
      }
      
      if (this.raidTimer <= 0) {
          if (this.onRaidTimeout) this.onRaidTimeout(this);
          this.active = false; // 탈출하여 맵에서 사라짐
          return;
      }
    }
    
    if (this.hp <= 0 && this.flashTimer <= 0) {
      this.die();
      return;
    }

    // 경직(스턴) 처리
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      return;
    }

    if (this.slowTimer > 0) this.slowTimer -= dt;
    if (this.fearTimer > 0) this.fearTimer -= dt;

    let moveDist = this.speed * dt;
    if (this.slowTimer > 0) moveDist *= 0.5;

    // 공포 상태 역주행 로직
    if (this.fearTimer > 0) {
      const target = this.waypoints[this.currentWaypointIndex];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const distance = Math.hypot(dx, dy);

      if (distance <= moveDist) {
        this.x = target.x;
        this.y = target.y;
        this.distanceTraveled = Math.max(0, this.distanceTraveled - distance);
        this.currentWaypointIndex = (this.currentWaypointIndex - 1 + this.waypoints.length) % this.waypoints.length;
      } else {
        this.x += (dx / distance) * moveDist;
        this.y += (dy / distance) * moveDist;
        this.distanceTraveled = Math.max(0, this.distanceTraveled - moveDist);
      }
    } else {
      // 일반 경로 주행 로직
      const nextIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
      const target = this.waypoints[nextIndex];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const distance = Math.hypot(dx, dy);

      if (distance <= moveDist) {
        this.x = target.x;
        this.y = target.y;
        this.currentWaypointIndex = nextIndex;
        this.distanceTraveled += distance;
      } else {
        this.x += (dx / distance) * moveDist;
        this.y += (dy / distance) * moveDist;
        this.distanceTraveled += moveDist;
      }
    }

    // 보스 제한 시간 차감 (550초) - 스턴 중에는 멈춤
    if (this.isBoss && this.active && this.stunTimer <= 0) {
      this.bossTimer -= dt;
      if (this.bossTimer <= 0) {
        this.bossTimer = 0;
        // 게임 오버 상태는 App.update에서 체크
      }
    }
  }

  /**
   * 데미지 피격 처리
   */
  takeDamage(amount, ap = 0, effect = null, shooterGrade = 'Common', shred = 10, isTrueDamage = false, shooterName = '알 수 없음', isItem = false) {
    if (!this.active) return false;
    this.flashTimer = 0.1; // 번쩍임 효과 활성화

    // 유닛 등급 기반 방어 기믹
    if (this.gradeFilter) {
      const grades = ['Common', 'Uncommon', 'Rare', 'Epic', 'Special', 'Legendary', 'Mythic', 'Hidden'];
      const shooterIdx = grades.indexOf(shooterGrade);
      const limitIdx = grades.indexOf(this.gradeFilter.grade);
      if (this.gradeFilter.mode === 'below' && shooterIdx > limitIdx) return false;
      if (this.gradeFilter.mode === 'above' && shooterIdx < limitIdx) return false;
    }

    // [New] 최고 딜량 추적을 위한 전역 접근
    const app = window.app;
    const s = app ? app.state : null;

    let finalDamage = 0;

    // 특수 효과(즉사 등) 처리
    if (effect === 'instakill' && !this.isBoss) {
      if (Math.random() < 0.1) {
         this.hp = 0;
         this.die();
         return true;
      }
    }

    if (effect === 'max_hp_percent' && this.name !== '타이난') {
      finalDamage = (this.maxHp * 0.015) + amount;
    } else {
      // 트루 데미지일 경우 방어력 무시
      let damageMultiplier = 1.0;
      if (!isTrueDamage) {
        const effectiveArmor = Math.max(0, this.armor * (1 - ap));
        damageMultiplier = 100 / (effectiveArmor + 100);
      }
      finalDamage = amount * damageMultiplier * (this.isBoss ? Enemy.bossBonus : 1.0);
    }

    // [New] 최고 딜량 및 총 딜량 기록 업데이트 (소모성 아이템 데미지는 제외하여 타워의 순수 기록만 보존)
    if (s && s.stats && !isItem) {
        s.stats.totalDamageDealt += finalDamage; // [New] 누적 총 피해량 합산
        
        if (finalDamage > s.stats.maxDamage) {
            s.stats.maxDamage = Math.floor(finalDamage);
            s.stats.maxDamageUnit = shooterName;
        }
    }

    // 보호막 차감 및 전환 처리
    if (this.shield > 0) {
      this.shieldRegenTimer = 3.0;
      if (this.shield >= finalDamage) {
        this.shield -= finalDamage;
        return false;
      } else {
        const remainingDmg = finalDamage - this.shield;
        this.shield = 0;
        this.hp -= remainingDmg;
      }
    } else {
      this.hp -= finalDamage;
    }

    // 상태 이상 적용
    this.handleStatusEffect(effect, shred, amount);

    // [New] 보스 전용 피격 사운드 로직 (실행 오류 방지를 위해 데미지 처리 후 별도 수행)
    if (this.isBoss && this.active) {
      this.bossHitCount++;
      if (this.bossHitCount >= 10) { // 10회 피격 시 1번 재생
        const soundPath = (this.type === 'mech') 
          ? 'assets/audio/몹피격음/기계원거리피격시.ogg' 
          : 'assets/audio/몹피격음/유기체원거리피격시.ogg';
        SoundManager.playSFX(soundPath, 0.4, SoundManager.PRIORITY.LOW, 'enemy'); // 볼륨 0.4로 적절하게 설정
        this.bossHitCount = 0;
      }
    }

    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  /**
   * 사망 처리 및 사운드 재생
   */
  die() {
    if (!this.active) return;
    this.active = false;

    // [New] 사망 콜백 실행 (도트 데미지 등 모든 사망 케이스 대응)
    if (this.onDie) this.onDie(this);

    // 종족별 사망 사운드 분기
    if (this.type === 'mech') {
      SoundManager.playSFX('assets/audio/기계 사망사운드.ogg', 0.6, SoundManager.PRIORITY.LOW, 'enemy');
    } else if (this.type === 'none' || this.type === 'None') {
      // 유기체도 기계도 아닌 특별한 존재 (예: 공허계 존재)
      SoundManager.playSFX('assets/audio/none죽음소리.ogg', 0.6, SoundManager.PRIORITY.LOW, 'enemy');
    } else {
      // 'organic' 등 일반 유기체 사망 사운드 재생
      SoundManager.playSFX('assets/audio/유기체 사망사운드.ogg', 0.6, SoundManager.PRIORITY.LOW, 'enemy');
    }
  }

  /**
   * 투사체 효과에 따른 상태 이상 분기 처리
   */
  handleStatusEffect(effect, shred = 0, amount = 0) {
    // 1. 방어력 깎기 (무기 효과와 상관없이 shred 수치가 있으면 발동)
    if (shred > 0) {
      // [Balance Up] 방어력은 원래 수치의 최대 15%까지만 보존 가능 (85%까지 파쇄 가능)
      const minArmor = Math.floor(this.initialArmor * 0.15);
      this.armor = Math.max(minArmor, this.armor - shred);
    }

    if (effect === 'stun') {
      this.stunTimer = 0.5;
    } else if (effect === 'psychic_stun') {
      // [Item] 정신충격창: 보스에게도 100% 확률로 강력한 스턴 부여 (12초 통일)
      this.stunTimer = 12.0;
    } else if (effect === 'stun_long') {
      if (Math.random() < 0.3) { // 30% 확률로 스턴 발생
        // [Balance] 최종 보스 타이난은 전설의 꽁치검 스턴 시간을 1초로 단축 (무한 스턴 방지)
        this.stunTimer = (this.name === '타이난') ? 1.0 : 5.0;
      }
    } else if (effect === 'emp' && this.type === 'mech') {
      this.stunTimer = 6.0; // 기계류 전용 기절 상향
    } else if (effect === 'frag_stun' && this.type === 'organic') {
      this.stunTimer = 4.0; // 유기체 전용 기절 상향
    } else if (effect === 'smoke') {
      this.slowTimer = Math.max(this.slowTimer, 3.0);
    } else if (effect === 'burn_fear' && this.type === 'organic') {
      this.fearTimer = Math.max(this.fearTimer, 2.0);
      this.activeDots.push({ damagePerSec: 15, duration: 3.0 });
    } else if (effect === 'toxin' && this.type !== 'mech') {
      this.activeDots.push({ damagePerSec: 5, duration: 2.0 });
    } else if (effect === 'burn') {
      if (Math.random() < 0.5) this.activeDots.push({ damagePerSec: 10, duration: 3.0 });
    } else if (effect === 'burn_percent') {
      this.hp -= this.hp * 0.03;
      if (Math.random() < 0.8) this.activeDots.push({ damagePerSec: 15, duration: 2.0 });
    } else if (effect === 'toxic_stun') {
      this.stunTimer = 1.5;
      this.activeDots.push({ damagePerSec: amount, duration: 6.0 });
    } else if (effect && effect.includes('knockback')) {
      this.distanceTraveled = Math.max(0, this.distanceTraveled - 15);
      this.stunTimer = 0.2;
    }
  }

  applyEffect(effect, duration = 1.0, dt = 1/60) {
    if (!this.active) return;
    if (effect === 'stun') {
      this.stunTimer = Math.max(this.stunTimer, duration);
    } else if (effect === 'smoke') {
      this.slowTimer = Math.max(this.slowTimer, 0.5); // 장판 안에 있는 동안 지속 갱신
    } else if (effect === 'toxin') {
      // 독성 장판: 매 프레임 원래 방어력의 5%씩 부식 (초당 5%) + 재생 억제
      this.toxinRegenBlock = 0.5; // 지속적으로 갱신
      const minArmor = Math.floor(this.initialArmor * 0.15); // 한계치 15%
      this.armor = Math.max(minArmor, this.armor - (this.initialArmor * 0.05 * dt)); 
      this.hp -= (this.isBoss ? 10 : 5) * dt; // 미세한 중독 데미지
    } else if (effect === 'molotov') {
      // 화염병: 보스 포함 모든 적에게 초당 고정 400 데미지 (밸런스 고려하여 비율뎀 삭제)
      const dotDmg = 400; 
      this.hp -= dotDmg * dt;
      this.fearTimer = Math.max(this.fearTimer, 0.3); // 패닉 유발
      this.flashTimer = 0.1;
    } else if (effect === 'fear' || effect === 'burn_fear') {
      // 패닉(공포) 효과는 유기체에게만 적용되며, 확률적으로만 발동하도록 하향 (무한 역주행 방지)
      if (this.type === 'organic') {
        if (Math.random() < 0.015) { // 프레임당 1.5% 확률 (초당 평균 0.9회 발동)
          this.fearTimer = Math.max(this.fearTimer, duration);
        }
      }
      // 화염 피해는 확률에 상관없이 지속 적용
      if (effect === 'burn_fear') this.hp -= 0.35; 
    }
  }

  render(ctx) {
    if (!this.active) return;
    
    // 번쩍임 효과 (흰색 필터)
    if (this.flashTimer > 0) {
        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#fff";
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // 몬스터 본체 렌더링 (이미지가 있으면 이미지, 없으면 도형)
    let renderedImage = false;
    if (this.img) {
      // special_ 접두사가 있으면 그대로 사용, 없으면 monster_ 접두사 추가
      const imgKey = this.img.startsWith('special_') ? this.img : `monster_${this.img}`;
      const imgObj = SpriteManager.getImage(imgKey);
      if (imgObj && imgObj.complete && imgObj.naturalHeight !== 0) {
        ctx.save();
        const size = this.radius * (this.isBoss ? 7.0 : 5.5);
        
        // [Flip] 오른쪽으로 이동 중이라면 이미지 좌우 반전
        if (this.movingRight) {
            ctx.translate(this.x, this.y);
            ctx.scale(-1, 1);
            ctx.drawImage(imgObj, -size/2, -size/2, size, size);
        } else {
            ctx.drawImage(imgObj, this.x - size/2, this.y - size/2, size, size);
        }
        ctx.restore();
        renderedImage = true;
      }
    }

    if (!renderedImage) {
      ctx.fillStyle = this.type === 'mech' ? '#7f8c8d' : SpriteManager.getColor('enemy');
      if (this.isBoss) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'red';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
      }
    }

    // [New] 선택된 상태 표시 (선택 링)
    if (this.selected) {
      ctx.save();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.lineDashOffset = -Date.now() * 0.01;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // [New] 초재생/재생 효과 연출 (초록색 펄스 오오라)
    // [New] 초재생/재생 효과 연출 (몬스터 크기에 맞춘 오오라)
    if (this.hpRegen > 0 && this.hp < this.maxHp && this.active) {
      ctx.save();
      const pulse = Math.sin(Date.now() * 0.005) * 5; // 애니메이션 속도 완화
      const auraRadius = this.isBoss ? this.radius * 3.2 : this.radius + 4; // 보스는 몸집에 맞게 크게
      
      ctx.strokeStyle = `rgba(0, 255, 120, ${0.2 + (pulse+5)/40})`; // 더 은은한 투명도
      ctx.lineWidth = this.isBoss ? 2 : 1.5; // 더 얇은 선
      ctx.setLineDash([8, 10]); // 더 긴 간격의 점선
      ctx.lineDashOffset = -Date.now() * 0.02;
      
      ctx.beginPath();
      ctx.arc(this.x, this.y, auraRadius + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 체력 및 보호막바 렌더링
    this.drawHealthBar(ctx);

    // 몬스터 이름 표시
    if (this.name) {
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      
      if (this.isBoss) {
        ctx.font = 'bold 12px Arial';
        ctx.fillText(this.name, this.x, (this.y - 85));
      } else {
        ctx.font = '10px Arial';
        ctx.fillText(this.name, this.x, (this.y - 35));
      }
      ctx.restore();
    }
  }

  drawHealthBar(ctx) {
    const hpPercent = Math.max(this.hp / this.maxHp, 0);
    const barWidth = this.isBoss ? 60 : 20;
    const barHeight = this.isBoss ? 8 : 4;
    const barY = this.y - (this.isBoss ? 75 : 30);
    
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth, barHeight);
    
    ctx.fillStyle = 'red';
    ctx.fillRect(this.x - barWidth / 2, barY, barWidth * hpPercent, barHeight);

    if (this.shieldMax > 0 && this.shield > 0) {
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(this.x - barWidth / 2, barY - 6, barWidth * (this.shield / this.shieldMax), 3);
    }

    // 보스 제한 시간 게이지 (보라색/파란색)
    if (this.isBoss && this.bossTimer > 0 && this.raidTimer <= 0) {
      const timerPercent = Math.max(this.bossTimer / this.bossTimerMax, 0);
      const timerBarY = barY + barHeight + 2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(this.x - barWidth / 2, timerBarY, barWidth, 4);
      
      // 시간에 따라 색상 변경 (안정: 파랑 -> 촉박: 보라)
      ctx.fillStyle = timerPercent > 0.3 ? '#3498db' : '#9b59b6';
      ctx.fillRect(this.x - barWidth / 2, timerBarY, barWidth * timerPercent, 4);
    }

    // [New] 상단 습격 탈출 게이지 (황금색/오렌지색)
    if (this.raidTimer > 0) {
      const rPercent = Math.max(this.raidTimer / this.raidTimerMax, 0);
      const rBarY = barY + barHeight + 8;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(this.x - barWidth / 2, rBarY, barWidth, 6);
      
      const grad = ctx.createLinearGradient(this.x - barWidth/2, 0, this.x + barWidth/2, 0);
      grad.addColorStop(0, '#f1c40f');
      grad.addColorStop(1, '#e67e22');
      ctx.fillStyle = grad;
      ctx.fillRect(this.x - barWidth / 2, rBarY, barWidth * rPercent, 6);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`ESCAPING: ${Math.ceil(this.raidTimer)}s`, this.x, rBarY + 16);
    }
  }
}
