import { SpriteManager } from '../engine/SpriteManager.js';
import { SoundManager } from '../engine/SoundManager.js';

/**
 * Enemy.js
 * 전장을 따라 이동하며 유닛의 공격을 받는 적들의 베이스 클래스
 */
export class Enemy {
  // 전역 보스 피해 배율 (훈련 등에 의해 변동 가능)
  static bossBonus = 1.0; 

  constructor(waypoints, hp, reward, type = 'organic', isBoss = false, armor = 0) {
    this.waypoints = waypoints;
    this.currentWaypointIndex = 0;
    
    this.x = waypoints[0].x;
    this.y = waypoints[0].y;
    
    this.isBoss = isBoss;
    this.maxHp = hp;
    this.hp = hp;
    this.armor = armor; 
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
    this.activeDots = []; // { damagePerSec, duration }
    this.distanceTraveled = 0;
    
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
  }

  update(dt) {
    if (!this.active) return;
    if (this.flashTimer > 0) this.flashTimer -= dt;

    // 재생 로직 처리
    if (this.hpRegen > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
    }

    if (this.shieldMax > 0 && this.shield < this.shieldMax) {
      this.shieldRegenTimer -= dt;
      if (this.shieldRegenTimer <= 0) {
        this.shield = Math.min(this.shieldMax, this.shield + (this.shieldMax * 0.1 * dt));
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
      if (this.raidTimer <= 0) {
          if (this.onRaidTimeout) this.onRaidTimeout(this);
          this.active = false; // 탈출하여 맵에서 사라짐
          return;
      }
    }
    
    if (this.hp <= 0 && this.flashTimer <= 0) {
      this.active = false;
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

    // 보스 제한 시간 차감 (550초)
    if (this.isBoss && this.active) {
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
  takeDamage(amount, ap = 0, effect = null, shooterGrade = 'Common') {
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

    // SoundManager.playSFX('assets/audio/hit.mp3', 0.3); // 파일 부재로 인한 주석 처리

    let finalDamage = 0;

    // 특수 효과(즉사 등) 처리
    if (effect === 'instakill' && !this.isBoss) {
      if (Math.random() < 0.1) {
         this.hp = 0;
         this.active = false;
         return true;
      }
    }

    if (effect === 'max_hp_percent') {
      finalDamage = (this.maxHp * 0.015) + amount;
    } else {
      const effectiveArmor = Math.max(0, this.armor * (1 - ap));
      const damageMultiplier = 100 / (effectiveArmor + 100);
      finalDamage = amount * damageMultiplier * (this.isBoss ? Enemy.bossBonus : 1.0);
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
    this.handleStatusEffect(effect);

    if (this.hp <= 0) {
      this.active = false;
      return true;
    }
    return false;
  }

  /**
   * 투사체 효과에 따른 상태 이상 분기 처리
   */
  handleStatusEffect(effect) {
    if (effect === 'stun') {
      this.stunTimer = 0.5;
    } else if (effect === 'stun_long') {
      this.stunTimer = 5.0;
    } else if (effect === 'emp' && this.type === 'mech') {
      this.stunTimer = 3.0;
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
    } else if (effect === 'armor_break') {
      this.armor = Math.max(0, Math.floor(this.armor * 0.5));
    } else if (effect && effect.includes('knockback')) {
      this.distanceTraveled = Math.max(0, this.distanceTraveled - 15);
      this.stunTimer = 0.2;
    }
  }

  applyEffect(effect, duration = 1.0) {
    if (!this.active) return;
    if (effect === 'stun') this.stunTimer = Math.max(this.stunTimer, duration);
    else if (effect === 'smoke') this.slowTimer = Math.max(this.slowTimer, duration);
    else if ((effect === 'fear' || effect === 'burn_fear') && this.type === 'organic') {
      this.fearTimer = Math.max(this.fearTimer, duration);
    }
    else if (effect === 'toxin' && this.type !== 'mech') {
      const existingToxin = this.activeDots.find(d => d.isFieldToxin);
      if (existingToxin) {
        existingToxin.duration = 0.5;
      } else {
        this.activeDots.push({ damagePerSec: 8, duration: 0.5, isFieldToxin: true });
      }
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
    if (this.hpRegen > 0 && this.hp < this.maxHp && this.active) {
      ctx.save();
      const pulse = Math.sin(Date.now() * 0.01) * 3;
      ctx.strokeStyle = `rgba(0, 255, 120, ${0.4 + pulse/10})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -Date.now() * 0.05;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 4 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 체력 및 보호막바 렌더링
    this.drawHealthBar(ctx);

    if (this.isBoss) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(this.name, this.x, (this.y - 40));
      
      if (this.type === 'mech' && Math.random() < 0.1) {
        ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x + (Math.random()-0.5)*40, this.y + (Math.random()-0.5)*40);
        ctx.lineTo(this.x + (Math.random()-0.5)*20, this.y + (Math.random()-0.5)*20);
        ctx.stroke();
      }
    }
  }

  drawHealthBar(ctx) {
    const hpPercent = Math.max(this.hp / this.maxHp, 0);
    const barWidth = this.isBoss ? 60 : 20;
    const barHeight = this.isBoss ? 8 : 4;
    const barY = this.y - (this.isBoss ? 35 : 20);
    
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
