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
    // [UI 개선] '999강 나무몽둥이' 및 '꽁치검'은 재질/품질 보너스를 무시하고 기본 성능을 가지도록 예외 처리
    let finalDmgMul = (this.weaponName.includes('999강') || this.weaponName.includes('꽁치검')) ? 1.0 : (dmgMul * qualMod);
    let calcDmg = baseDmg * finalDmgMul;
    
    if (baseDmg > 0 && calcDmg < 1) calcDmg = 1;
    this.baseDamage = Math.floor(calcDmg) || 1; // 최소 1 보장
    
    this.baseAttackSpeed = baseSpd * spdMul;
    this.ap = Math.min(1.0, baseAp * apMul);
    this.baseRange = this.weaponData.range || (isRanged ? 250 : (this.weaponType === 'sharp' ? 100 : 80));

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
    this.auraBuffTimer = 0;
    this.goJuiceTimer = 0; // [New] 고주스 버프 타이머
    this.buildProgress = 0;

    // 과열 시스템
    this.heat = 0;
    this.maxHeat = 100;
    this.isOverheated = false;
    this.overheatTimer = 0;
    this.overheatDuration = 6.0; 
    
    // 특수 버프 상태
    this.goJuiceTimer = 0; // 고주스 투약 지속 시간
    this.auraBuffTimer = 0; // 근처 엘텍스 지팡이 등에 의한 버프 타이머
    this.personaBuffTimer = 0; // [New] 인공자아핵 버프 지속 타이머
    this.personaBuffValue = 1.0; // [New] 실제로 적용받고 있는 인공자아핵 배율 (1.2~1.5)

    // 인공자아핵 전용 배율 결정 로직 (1.2 ~ 1.5 가변)
    if (this.weaponData.effect === 'aura_persona') {
        const qWeights = { awful: 1.2, normal: 1.3, excellent: 1.4, legendary: 1.5 };
        const base = qWeights[this.quality] || 1.3;
        // 품질 기준값에서 최대 0.05 사이의 랜덤 수치를 더함 (단, 1.5를 넘지 않음)
        this.auraMultiplier = Math.min(1.5, base + (Math.random() * 0.05));
    }
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
    if (typeKey === 'melee') typeKey = 'sharp';
    
    const state = this.gameCore.state;
    const upgradeMul = state.getUpgradeMultiplier(typeKey);
    const encounterManager = this.gameCore.encounterManager;
    const luciMul = encounterManager ? encounterManager.getGlobalLuciferiumMultiplier() : 1.0;
    const moodMul = (state.mood >= 85) ? 1.1 : 1.0;
    const goJuiceMul = (this.goJuiceTimer > 0) ? 1.5 : 1.0;
    const personaMul = (this.personaBuffTimer > 0) ? (this.personaBuffValue || 1.0) : 1.0; 
    
    return Math.floor(this.baseDamage * upgradeMul * luciMul * moodMul * goJuiceMul * personaMul);
  }

  /**
   * 실시간 공격 속도 반환 (오라 버프 등 반영)
   */
  get attackSpeed() {
    const auraMul = (this.auraBuffTimer > 0) ? 1.4 : 1.0;
    const goJuiceMul = (this.goJuiceTimer > 0) ? 1.5 : 1.0; // [New] 고주스 공속 보너스
    const encounterManager = this.gameCore.encounterManager;
    const globalMul = encounterManager ? encounterManager.getGlobalAttackSpeedMultiplier() : 1.0;
    
    // [Hidden Reward] 근위대의 가호: 1.2배 공속
    const imperialMul = this.gameCore.state.imperialBuff ? 1.2 : 1.0;
    const personaSpdMul = (this.personaBuffTimer > 0) ? (this.personaBuffValue || 1.0) : 1.0; 
    const moodMul = (this.gameCore.state.mood >= 85) ? 1.1 : 1.0;
    
    return this.baseAttackSpeed * auraMul * goJuiceMul * globalMul * imperialMul * personaSpdMul * moodMul;
  }

  /**
   * 실시간 사거리 반환 (인카운터 배율 반영)
   */
  get range() {
    const encounterManager = this.gameCore.encounterManager;
    const globalMul = encounterManager ? encounterManager.getGlobalRangeMultiplier() : 1.0;
    return this.baseRange * globalMul;
  }

  update(dt, enemies, addProjectile, globalEffects = { emi: false, luciferium: false }) {
    // 흑점 폭발 체크 (원거리 타워 무력화)
    const isSolarFlare = (this.gameCore.encounterManager && this.gameCore.encounterManager.activeEvents.some(e => e.id === 'solar_flare'));
    const isRanged = this.weaponType === 'ranged';
    
    if (isSolarFlare && isRanged) {
        return; // 원거리 타워는 흑점 폭발 시 작동 중지
    }

    if (this.isBlueprint) return;

    // 외부 효과 반영 (EMI 등)
    const isAdvanced = this.weaponData.tech === 'advanced';
    this.currentRange = (globalEffects.emi && isAdvanced) ? this.range * 0.5 : this.range;
    this.isLuciferiumActive = globalEffects.luciferium || false;

    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.goJuiceTimer > 0) this.goJuiceTimer -= dt;
    if (this.auraBuffTimer > 0) this.auraBuffTimer -= dt;
    if (this.auraBuffTimer > 0) this.auraBuffTimer -= dt;
    if (this.personaBuffTimer > 0) {
        this.personaBuffTimer -= dt;
        if (this.personaBuffTimer <= 0) this.personaBuffValue = 1.0; // 버프 종료 시 초기화
    }

    // [New] 인공자아핵 오라 발산 (주변 타워 강화)
    if (this.weaponData.effect === 'aura_persona') {
      this.gameCore.units.forEach(u => {
        if (u !== this && !u.isBlueprint && Math.hypot(u.x - this.x, u.y - this.y) < this.range) {
          u.personaBuffTimer = 0.2; 
          u.personaBuffValue = Math.max(u.personaBuffValue || 1.0, this.auraMultiplier);
        }
      });
      return; // [Fix] 인공자아핵은 공격을 하지 않음
    }

    // 과열 처리
    if (this.isOverheated) {
      this.overheatTimer -= dt;
      // 과열 게이지가 4초에 걸쳐 시각적으로 줄어들도록 동기화
      this.heat = (this.overheatTimer / this.overheatDuration) * this.maxHeat;
      
      if (this.overheatTimer <= 0) {
        this.isOverheated = false;
        this.heat = 0;
      }
      return;
      return;
    }

    if (this.auraBuffTimer > 0) this.auraBuffTimer -= dt;
    if (this.goJuiceTimer > 0) this.goJuiceTimer -= dt;

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
      const multiTargetEffects = ['multi_bullet', 'instant_multi', 'melee_aoe'];
      if (multiTargetEffects.includes(this.weaponData.effect)) {
        const targets = enemies.filter(en => en.active && Math.hypot(en.x - this.x, en.y - this.y) <= (this.currentRange || this.range));
        if (targets.length > 0) {
          this.target = targets[0]; // [Fix] 광역 공격 시에도 첫 번째 적을 기준으로 휘두르기 방향 결정
          this.fire(targets, addProjectile); // 모든 대상에게 발사
          if (!this.isOverheated) {
            this.cooldown = 1.0 / this.attackSpeed;
          }
        }
      } else {
        const target = this.findTarget(enemies);
        if (target) {
          this.target = target;
          this.fire(target, addProjectile);
          if (!this.isOverheated) {
            this.cooldown = 1.0 / this.attackSpeed;
          }
        }
      }
    }
  }

  /**
   * 주변 아군에게 영향을 주는 오라 로직
   */
  handleAuras(enemies, dt) {
    if (this.weaponData.effect === 'aura_cd') {
      // 주변 아군에게 공속 버프 부여 (타이머 갱신 방식)
      this.gameCore.units.forEach(u => {
        if (u !== this && !u.isBlueprint && Math.hypot(u.x - this.x, u.y - this.y) < this.range) {
          u.auraBuffTimer = 0.2; // 지속적인 갱신
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
    const effect = this.weaponData.effect;

    if (isRanged) {
      const targetList = Array.isArray(target) ? target : [target];
      
      // [New] 즉시 전유닛 타격 (빔 리피터용)
      if (effect === 'instant_multi') {
        targetList.forEach(t => {
           t.takeDamage(
             this.damage, this.ap, effect, 
             this.weaponData.grade, this.weaponData.shred || 0,
             !!this.weaponData.isTrueDamage
           );
        });
        return; 
      }

      targetList.forEach(t => {
        for (let i = 0; i < burstCount; i++) {
          setTimeout(() => {
            if (!t.active) return;
            addProjectile(new Projectile(
              this.x, this.y, t, this.damage, this.ap, 
              this.weaponData.effect, SpriteManager.getColor(this.quality),
              this.weaponData.grade,
              this.weaponData.shred || 0,
              !!this.weaponData.isTrueDamage
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
        this.heat += burstCount * 1.2;
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
      
      const targetList = Array.isArray(target) ? target : [target];
      
      targetList.forEach(t => {
        for (let i = 0; i < burstCount; i++) {
          setTimeout(() => {
            if (!t.active) return;
            t.takeDamage(
              this.damage, this.ap, this.weaponData.effect, 
              this.weaponData.grade, this.weaponData.shred || 0,
              !!this.weaponData.isTrueDamage
            );
            
            const effect = this.weaponData.effect;
            if (effect === 'splash' || effect === 'splash_knockback') {
              document.dispatchEvent(new CustomEvent('meleeSplash', { 
                detail: { x: t.x, y: t.y, radius: 60, damage: this.damage * 0.5, ap: this.ap, effect: effect, shooterGrade: this.weaponData.grade } 
              }));
            }
          }, i * 50);
        }
      });
    }
  }

  render(ctx) {
    const weaponImg = SpriteManager.getImage(this.weaponName);
    
    if (weaponImg && weaponImg.complete) {
      ctx.save();
      if (this.isBlueprint) ctx.globalAlpha = 0.4;

      // 특수 유닛 시각 효과 처리
      this.drawSpecialEffect(ctx);

      // 엘텍스 지팡이 오오라 연출 (가느다란 점선)
      if (this.weaponData.effect === 'aura_cd' && !this.isBlueprint) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 242, 255, 0.4)'; // 좀 더 선명한 대신 투명하게
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 8]); // 가느다란 점선 패턴
        ctx.lineDashOffset = -Date.now() * 0.01; // 천천히 회전하는 효과
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // [New] 인공자아핵 버프 수혜 시 붉은 글로우 강조
      if (this.personaBuffTimer > 0 && !this.isBlueprint) {
        ctx.shadowBlur = 25;
        ctx.shadowColor = "rgba(255, 0, 0, 0.8)";
      } else {
        ctx.shadowBlur = 25;
        ctx.shadowColor = SpriteManager.getColor(this.quality);
      }
      
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
      
      // [New] 클릭 시 동일 유닛 연결선 표시
      if (this.isCombinable) {
        ctx.save();
        ctx.setLineDash([10, 5]);
        ctx.lineWidth = 1;
        this.gameCore.units.forEach(u => {
          if (u !== this && !u.isBlueprint && u.weaponName === this.weaponName && u.weaponData.grade === this.weaponData.grade) {
            ctx.strokeStyle = 'rgba(155, 89, 182, 0.6)';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(u.x, u.y);
            ctx.stroke();
          }
        });
        ctx.restore();
      }
    }

    this.drawGauges(ctx);
  }

  // 특수 비주얼 효과 통합 렌더링
  drawSpecialEffect(ctx) {
    if (this.isBlueprint) return;
    const time = Date.now() * 0.003;

    // [New] 조합 가능 오오라 표시 (보라색 파동)
    if (this.isCombinable) {
      const pulse = Math.sin(Date.now() * 0.005) * 5;
      ctx.save();
      ctx.strokeStyle = 'rgba(162, 0, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, 30 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.weaponName === '전설의 꽁치검') {
      const glowSize = 45 + Math.sin(time) * 8;
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowSize);
      grad.addColorStop(0, 'rgba(0, 191, 255, 0.7)');
      grad.addColorStop(1, 'rgba(0, 121, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2); ctx.fill();
    } else if (this.weaponData.effect === 'aura_persona') {
      // 인공자아핵 붉은 오오라
      const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.8;
      const glowSize = this.range;
      const grad = ctx.createRadialGradient(this.x, this.y, 10, this.x, this.y, glowSize);
      grad.addColorStop(0, `rgba(255, 0, 0, ${0.15 * pulse})`);
      grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
      
      ctx.save();
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2); ctx.fill();
      
      // 범위 테두리 점선 연출
      ctx.strokeStyle = `rgba(255, 50, 50, ${0.3 * pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath(); ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    } else if (this.weaponName === '999강 나무몽둥이') {
      const glowSize = 50 + Math.sin(time) * 10;
      const gradient = ctx.createRadialGradient(this.x, this.y, 5, this.x, this.y, glowSize);
      gradient.addColorStop(0, 'rgba(255, 215, 0, 0.9)');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2); ctx.fill();
    }

    if (this.material === '비취옥' || this.material === 'Jade') {
      const jadeTime = Date.now() * 0.002;
      const jadePulse = Math.sin(jadeTime) * 5;
      
      ctx.save();
      // 영롱한 비취색 오라 (Emerald Glow)
      const grad = ctx.createRadialGradient(this.x, this.y, 10, this.x, this.y, 35 + jadePulse);
      grad.addColorStop(0, 'rgba(46, 204, 113, 0.4)');
      grad.addColorStop(0.5, 'rgba(46, 204, 113, 0.1)');
      grad.addColorStop(1, 'rgba(46, 204, 113, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 35 + jadePulse, 0, Math.PI * 2);
      ctx.fill();
      
      // 회전하는 점선 테두리
      ctx.strokeStyle = 'rgba(46, 204, 113, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 5]);
      ctx.lineDashOffset = -jadeTime * 20;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 25, 0, Math.PI * 2);
      ctx.stroke();

      // [Tag] JADE 텍스트 표시
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 10px Inter';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#000';
      ctx.fillText('JADE', this.x, this.y + 20);
      ctx.restore();
    }
  }

  // 체력 및 과열 게이지 렌더링
  drawGauges(ctx) {
    const barW = 60; // 너비 확장
    const barH = 6;  // 두께 확장
    const bx = this.x - barW / 2;

    if (this.isBlueprint) {
      const by = this.y + 25;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(bx, by, barW * (this.buildProgress / 100), barH);
    }

    if (this.heat > 0 || this.isOverheated) {
      // 위치를 다시 타워 아래로 조정
      const by = this.y + 25; 
      
      // 배경 박스 (더 어둡게)
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
      
      const heatRatio = Math.min(1.0, this.heat / this.maxHeat);
      
      // 과열 시 강렬한 붉은색, 아닐 시에도 붉은색 계열 유지
      if (this.isOverheated) {
          ctx.fillStyle = '#ff3333'; // 과열 중인 밝은 빨강
      } else {
          // 열이 오를수록 더 진한 빨간색으로 변화
          ctx.fillStyle = `rgb(${150 + heatRatio * 105}, 0, 0)`;
      }
      
      ctx.fillRect(bx, by, barW * heatRatio, barH);

      // 테두리 추가
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, barW, barH);

      if (this.isOverheated) {
        const bounce = Math.sin(Date.now() * 0.01) * 2;
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff0000';
        ctx.fillText('OVERHEAT COOLING...', this.x, by + 18 + bounce);
        ctx.shadowBlur = 0;
      }
    }
  }

  /**
   * [New] 타워 전용 효과 적용 메서드 (고주스 등)
   */
  applyEffect(type, duration) {
    if (type === 'go_juice') {
        this.goJuiceTimer = Math.max(this.goJuiceTimer, duration);
    }
  }
}
