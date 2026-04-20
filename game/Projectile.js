/**
 * Projectile.js
 * 유닛이 발사하는 모든 투사체(Projectile)의 베이스 클래스
 */
export class Projectile {
  constructor(x, y, target, damage, ap, effect, color, shooterGrade = 'Common', shred = 0, isTrueDamage = false) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.ap = ap;
    this.effect = effect;
    this.color = color;
    this.shooterGrade = shooterGrade;
    this.shred = shred || 0;
    this.isTrueDamage = isTrueDamage;

    // 자본주의 로켓은 느리지만 거대함
    if (this.effect === 'capitalist_rocket') {
      this.speed = 200;
      this.radius = 8;
    } else {
      this.speed = (this.effect === 'multi_bullet') ? 800 : 300; 
      this.radius = (this.effect === 'multi_bullet') ? 2 : 4;
    }
    this.active = true;
    this.history = []; // 잔상(Tail) 효과 구현을 위한 이동 이력
  }

  update(dt, enemies = [], fieldEffects = []) {
    if (!this.active) return;

    // 특수 잔상 효과 기록
    if (this.effect === 'multi_bullet') {
      this.history.unshift({ x: this.x, y: this.y });
      if (this.history.length > 5) this.history.pop();
    }
    
    // 대상이 무력화되었을 때 투사체 소멸 (메운디 기본 로직)
    if (!this.target || !this.target.active) {
      this.active = false;
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distance = Math.hypot(dx, dy);
    const moveDist = this.speed * dt;

    if (distance <= moveDist) {
      this.active = false;
      this.handleImpact(enemies, fieldEffects);
    } else if (distance > 0) {
      this.x += (dx / distance) * moveDist;
      this.y += (dy / distance) * moveDist;
    } else {
      this.active = false;
      this.target.takeDamage(this.damage, this.ap, this.effect, this.shooterGrade, this.shred, this.isTrueDamage);
    }
  }

  /**
   * 투사체가 적에게 명중했을 때의 처리 분기
   */
  handleImpact(enemies, fieldEffects) {
    const aoeEffects = ['aoe_dmg', 'aoe_knockback', 'emp', 'smoke', 'burn_fear', 'toxin', 'splash', 'splash_knockback', 'capitalist_rocket'];
    const isAOE = aoeEffects.includes(this.effect);
    
    if (isAOE) {
      // 광역 데미지 범위 설정 (자본주의 로켓은 100, 나머지는 60)
      const radius = (this.effect === 'capitalist_rocket') ? 100 : 60;
      
      enemies.forEach(en => {
         if (en.active && Math.hypot(en.x - this.x, en.y - this.y) <= radius) {
            en.takeDamage(this.damage, this.ap, this.effect, this.shooterGrade, this.shred, this.isTrueDamage);
         }
      });
      
      // 연막 또는 독성 장판(Field Effect) 생성
      this.createFieldEffect(fieldEffects);
    } else {
      // 단일 적에게 타격
      this.target.takeDamage(this.damage, this.ap, this.effect, this.shooterGrade, this.shred, this.isTrueDamage);
    }
  }

  /**
   * 특정 투사체 효과에 따른 잔존 필드 효과 생성
   */
  createFieldEffect(fieldEffects) {
    if (this.effect === 'smoke') {
       fieldEffects.push({ 
         type: 'smoke', x: this.x, y: this.y, radius: 80, duration: 5.0,
         render: (ctx) => {
           ctx.save();
           ctx.fillStyle = 'rgba(150, 150, 150, 0.3)';
           ctx.beginPath(); ctx.arc(this.x, this.y, 80, 0, Math.PI*2); ctx.fill();
           ctx.restore();
         }
       });
    } else if (this.effect === 'toxin') {
       fieldEffects.push({ 
         type: 'toxin', x: this.x, y: this.y, radius: 60, duration: 5.0,
         render: (ctx) => {
           ctx.save();
           ctx.fillStyle = 'rgba(155, 89, 182, 0.3)';
           ctx.beginPath(); ctx.arc(this.x, this.y, 60, 0, Math.PI*2); ctx.fill();
           ctx.restore();
         }
       });
    }
  }

  render(ctx) {
    if (!this.active) return;
    
    // 에너지탄 계열의 특수 잔상 렌더링
    if (this.effect === 'multi_bullet' && this.history.length > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.radius;
      ctx.lineCap = 'round';
      ctx.moveTo(this.history[0].x, this.history[0].y);
      for (let i = 1; i < this.history.length; i++) {
        ctx.lineTo(this.history[i].x, this.history[i].y);
      }
      ctx.globalAlpha = 0.2; // 연하게 수정
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = this.color;
    if (this.effect === 'multi_bullet') {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.shadowBlur = 3; // 번짐 효과 축소
      ctx.shadowColor = this.color;
      ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (this.effect === 'arrow' || this.effect === 'toxic_stun') {
      // 화살/투창형 (실 같은 선 모양)
      if (this.target && this.target.active) {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const angle = Math.atan2(dy, dx);
        const length = 15; // 선의 길이
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(angle);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-length / 2, 0);
        ctx.lineTo(length / 2, 0);
        ctx.stroke();
        ctx.restore();
      }
    } else if (this.effect === 'aoe_dmg' || this.effect === 'aoe_knockback') {
      // 산탄총 투사체 (사각형/슬러그 모양)
      ctx.save();
      ctx.translate(this.x, this.y);
      if (this.target && this.target.active) {
        const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        ctx.rotate(angle);
      }
      ctx.fillRect(-this.radius, -this.radius/2, this.radius*2, this.radius);
      ctx.restore();
    } else if (this.effect === 'capitalist_rocket') {
      // 자본주의 로켓 전용 렌더링 (거대하고 화려함)
      ctx.save();
      ctx.translate(this.x, this.y);
      if (this.target && this.target.active) {
        const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        ctx.rotate(angle);
      }
      
      // 뒤쪽 화염 오오라
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#e67e22';
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.moveTo(-this.radius * 2, 0);
      ctx.lineTo(-this.radius, -this.radius / 2);
      ctx.lineTo(-this.radius, this.radius / 2);
      ctx.fill();

      // 로켓 몸체
      ctx.fillStyle = '#e67e22';
      ctx.fillRect(-this.radius, -this.radius / 2, this.radius * 2, this.radius);
      ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
    }
  }
}
