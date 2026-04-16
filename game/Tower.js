import { Projectile } from './Projectile.js';
import { SpriteManager } from '../engine/SpriteManager.js';
import { WEAPON_DB, MATERIAL_DB, QUALITY_COEFFS } from './WeaponData.js';

/**
 * Tower.js
 * 전장에 배치되어 적을 공격하는 모든 유닛의 베이스 클래스
 */
export class Tower {
  constructor(x, y, gachaResult, gameCore) {
    this.x = x;
    this.y = y;
    this.gameCore = gameCore; 
    
    // 1. 기본 무기 데이터 및 품질/재질 추출
    this.weaponData = gachaResult.weaponData || WEAPON_DB['맨손/목재'];
    this.weaponName = gachaResult.weaponName || this.weaponData.name || '알 수 없는 무기';
    
    // 품질 및 재질 (대소문자 및 매핑 안정성 확보)
    this.quality = (gachaResult.quality || 'normal').toLowerCase();
    this.material = gachaResult.material || '강철';
    this.weaponType = (this.weaponData.type || 'blunt').toLowerCase();

    // 2. 기본 수치 및 보정치 확보
    const baseDmg = Number(this.weaponData.dmg) || 10;
    const baseSpd = Number(this.weaponData.spd) || 0.5;
    const baseAp = Number(this.weaponData.ap) || 0;
    
    const matData = MATERIAL_DB[this.material] || MATERIAL_DB['강철'] || { matMul: 1, spdMul: 1, apMul: 1 };
    const qualMod = QUALITY_COEFFS[this.quality] || 1.0;
    
    const isRanged = this.weaponType === 'ranged';
    const dmgMul = isRanged ? 1.0 : (matData.matMul || 1.0);
    const spdMul = isRanged ? 1.0 : (matData.spdMul || 1.0);
    const apMul = isRanged ? 1.0 : (matData.apMul || 1.0);

    // 3. 최종 스탯 계산 및 검증 (0 방지)
    let calcDmg = baseDmg * dmgMul * qualMod;
    if (baseDmg > 0 && calcDmg < 1) calcDmg = 1;
    this.baseDamage = Math.floor(calcDmg) || 1; // 최소 1 보장
    
    this.baseAttackSpeed = baseSpd * spdMul;
    this.ap = Math.min(1.0, baseAp * apMul);
    this.range = this.weaponData.range || (isRanged ? 250 : (this.weaponType === 'sharp' ? 100 : 80));

    console.log(`[Tower] ${this.weaponName} 생성: ATK ${this.baseDamage}, SPD ${this.baseAttackSpeed.toFixed(2)}, Type ${this.weaponType}`);

    this.cooldown = 0;
    this.selected = false;

    // 애니메이션 및 건설 상태
    this.isSwinging = false;
    this.swingTimer = 0;
    this.swingDuration = 0.2; 
    this.rotation = 0; 
    this.target = null; 
    this.isBlueprint = true;
    this.buildProgress = 0;

    // 과열 시스템
    this.heat = 0;
    this.maxHeat = 100;
    this.isOverheated = false;
    this.overheatTimer = 0;
    this.overheatDuration = 5.0; 
    
    // 특수 버프 상태
    this.isLuciferiumActive = false;
  }

  /**
   * 훈련 레벨과 특수 버프를 포함한 실시간 공격력 반환
   */
  get damage() {
    if (!this.gameCore || !this.gameCore.state || !this.gameCore.state.upgrades) return this.baseDamage;
    // GameState의 upgrades 키와 타워의 weaponType 매칭 확인
    let typeKey = this.weaponType;
    if (typeKey === 'melee') typeKey = 'sharp'; // 매핑 동기화
    
    const lv = this.gameCore.state.upgrades[typeKey] || 0;
    const upgradeMul = 1 + (lv * 0.1);
    const luciMul = this.isLuciferiumActive ? 1.5 : 1.0;
    return Math.floor(this.baseDamage * upgradeMul * luciMul);
  }

  /**
   * 실시간 공격 속도 반환 (오라 버프 등 반영)
   */
  get attackSpeed() {
    return this.baseAttackSpeed * (this.isBuffed ? 1.4 : 1.0);
  }

  update(dt, enemies, addProjectile, globalEffects = { emi: false, luciferium: false }) {
    if (this.isBlueprint) return;

    // 외부 효과 반영 (EMI 등)
    const isAdvanced = this.weaponData.tech === 'advanced';
    this.currentRange = (globalEffects.emi && isAdvanced) ? this.range * 0.5 : this.range;
    this.isLuciferiumActive = globalEffects.luciferium || false;

    if (this.cooldown > 0) this.cooldown -= dt;

    // 과열 처리
    if (this.isOverheated) {
      this.overheatTimer -= dt;
      if (this.overheatTimer <= 0) {
        this.isOverheated = false;
        this.heat = 0;
      }
      return;
    } else {
      if (this.heat > 0) this.heat = Math.max(0, this.heat - 10 * dt);
    }

    // 휘두르기 애니메이션 업데이트
    if (this.isSwinging) {
      this.swingTimer -= dt;
      if (this.swingTimer <= 0) {
        this.isSwinging = false;
        this.rotation = 0;
      } else {
        const progress = 1 - (this.swingTimer / this.swingDuration);
        this.rotation = Math.sin(progress * Math.PI) * 1.2; 
      }
    }

    // 3. 특수 효과: 오라(Aura) 처리
    this.handleAuras(enemies, dt);

    // 4. 공격 시전
    if (this.cooldown <= 0) {
      if (this.weaponData.effect === 'multi_bullet') {
        const targets = enemies.filter(en => en.active && Math.hypot(en.x - this.x, en.y - this.y) <= (this.currentRange || this.range));
        if (targets.length > 0) {
          const target = targets[0];
          this.fire(target, addProjectile);
          this.cooldown = 1.0 / this.attackSpeed;
        }
      } else {
        const target = this.findTarget(enemies);
        if (target) {
          this.target = target;
          this.fire(target, addProjectile);
          this.cooldown = 1.0 / this.attackSpeed;
        }
      }
    }
  }

  /**
   * 주변 아군에게 영향을 주는 오라 로직
   */
  handleAuras(enemies, dt) {
    if (this.weaponData.effect === 'aura_cd') {
      // 주변 아군의 쿨타임을 추가로 감소시킴 (엘텍스 지팡이 등)
      this.gameCore.units.forEach(u => {
        if (u !== this && !u.isBlueprint && Math.hypot(u.x - this.x, u.y - this.y) < this.range) {
          if (u.cooldown > 0) u.cooldown -= dt * 0.5; // 쿨타임 회복 속도 50% 보너스
        }
      });
    }
  }

  /**
   * 공격 범위 내에서 가장 앞선 적을 탐색
   */
  findTarget(enemies) {
    let bestTarget = null;
    let maxDist = -1;

    for (const enemy of enemies) {
      if (!enemy.active) continue;
      
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const distToEnemy = Math.hypot(dx, dy);

      if (distToEnemy <= (this.currentRange || this.range)) {
        if (enemy.distanceTraveled > maxDist) {
          maxDist = enemy.distanceTraveled;
          bestTarget = enemy;
        }
      }
    }
    return bestTarget;
  }

  /**
   * 유닛의 공격 시전 (투사체 생성 혹은 직접 타격)
   */
  fire(target, addProjectile) {
    const isRanged = this.weaponType && String(this.weaponType).toLowerCase().trim() === 'ranged';
    const burstCount = this.weaponData.burst || 1;

    if (isRanged) {
      const targetList = Array.isArray(target) ? target : [target];
      targetList.forEach(t => {
        for (let i = 0; i < burstCount; i++) {
          setTimeout(() => {
            if (!t.active) return;
            addProjectile(new Projectile(
              this.x, this.y, t, this.damage, this.ap, 
              this.weaponData.effect, SpriteManager.getColor(this.quality),
              this.weaponData.grade
            ));
          }, i * 50);
        }
      });
 
      // 특수 범위 효과 처리
      if (this.weaponData.effect === 'map_aoe') {
        document.dispatchEvent(new CustomEvent('mapHit', { 
          detail: { damage: this.damage, ap: this.ap, qualityColor: SpriteManager.getColor(this.quality) } 
        }));
      }

      // 미니건 전용 과열 로직
      if (this.weaponName === '미니건') {
        this.heat += burstCount * 3.5;
        if (this.heat >= this.maxHeat) {
          this.isOverheated = true;
          this.overheatTimer = this.overheatDuration;
          this.cooldown = this.overheatDuration;
        }
      }
    } else {
      // 근접 애니메이션 및 데미지
      this.isSwinging = true;
      this.swingTimer = this.swingDuration;
      
      for (let i = 0; i < burstCount; i++) {
        setTimeout(() => {
          if (!target.active) return;
          target.takeDamage(this.damage, this.ap, this.weaponData.effect, this.weaponData.grade);
          
          const effect = this.weaponData.effect;
          if (effect === 'splash' || effect === 'splash_knockback') {
            document.dispatchEvent(new CustomEvent('meleeSplash', { 
              detail: { x: target.x, y: target.y, radius: 60, damage: this.damage * 0.5, ap: this.ap, effect: effect, shooterGrade: this.weaponData.grade } 
            }));
          }
        }, i * 50);
      }
    }
  }

  render(ctx) {
    const weaponImg = SpriteManager.getImage(this.weaponName);
    
    if (weaponImg && weaponImg.complete) {
      ctx.save();
      if (this.isBlueprint) ctx.globalAlpha = 0.4;

      // 특수 유닛 시각 효과 처리 (꽁치검, 999강 나무몽둥이 등)
      this.drawSpecialEffect(ctx);

      ctx.shadowBlur = 25;
      ctx.shadowColor = SpriteManager.getColor(this.quality);
      
      const size = 48; 
      ctx.translate(this.x, this.y);
      if (this.isSwinging && this.target) {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        ctx.rotate(Math.atan2(dy, dx) + this.rotation);
      }
      
      ctx.drawImage(weaponImg, -size / 2, -size / 2, size, size);
      ctx.restore();
    } else {
      ctx.fillStyle = SpriteManager.getColor(this.quality);
      ctx.beginPath(); ctx.rect(this.x - 15, this.y - 15, 30, 30); ctx.fill();
    }

    if (this.selected) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath(); ctx.arc(this.x, this.y, this.currentRange || this.range, 0, Math.PI * 2); ctx.stroke();
    }

    this.drawGauges(ctx);
  }

  // 특수 비주얼 효과 통합 렌더링
  drawSpecialEffect(ctx) {
    if (this.isBlueprint) return;
    const time = Date.now() * 0.003;

    if (this.weaponName === '전설의 꽁치검') {
      const glowSize = 45 + Math.sin(time) * 8;
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowSize);
      grad.addColorStop(0, 'rgba(0, 191, 255, 0.7)');
      grad.addColorStop(1, 'rgba(0, 121, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2); ctx.fill();
    } else if (this.weaponName === '999강 나무몽둥이') {
      const glowSize = 50 + Math.sin(time) * 10;
      const gradient = ctx.createRadialGradient(this.x, this.y, 5, this.x, this.y, glowSize);
      gradient.addColorStop(0, 'rgba(255, 215, 0, 0.9)');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2); ctx.fill();
    }

    if (this.material === '비취옥' || this.material === 'Slate') {
       // 재질 전용 입자 효과 (생략 가능)
    }
  }

  // 체력 및 과열 게이지 렌더링
  drawGauges(ctx) {
    const barW = 40;
    const barH = 4;
    const bx = this.x - barW / 2;

    if (this.isBlueprint) {
      const by = this.y + 25;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(bx, by, barW * (this.buildProgress / 100), barH);
    }

    if (this.heat > 0 || this.isOverheated) {
      const by = this.isBlueprint ? this.y + 35 : this.y + 25;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx, by, barW, barH);
      const heatRatio = Math.min(1.0, this.heat / this.maxHeat);
      
      // 과열 시 강렬한 붉은색, 아닐 시 오렌지->레드 그라데이션
      ctx.fillStyle = this.isOverheated ? '#ff0000' : `rgb(255, ${200 - heatRatio * 200}, 0)`;
      ctx.fillRect(bx, by, barW * heatRatio, barH);

      if (this.isOverheated) {
        const bounce = Math.sin(Date.now() * 0.01) * 3;
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0000';
        ctx.fillText('OVERHEATED!', this.x, by + 18 + bounce);
        ctx.shadowBlur = 0;
      }
    }
  }
}
