export class Renderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // 부모 컨테이너에 맞춤
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // 인게임 배경 이미지 로드
    this.bgImage = new Image();
    this.bgImage.src = 'assets/배경화면/user_choice_1.png';
    this.bgImageLoaded = false;
    this.bgImage.onload = () => {
      this.bgImageLoaded = true;
    };
  }

  /**
   * 배경 이미지를 실시간으로 교체합니다.
   */
  setBackground(path) {
    this.bgImageLoaded = false;
    this.bgImage.src = path;
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
      this.width = this.canvas.width;
      this.height = this.canvas.height;
    }
  }

  clear() {
    // 배경 이미지가 있든 없든 일단 기본 배경색을 칠함 (검은 화면 방지)
    this.ctx.fillStyle = '#1e1e1e';
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (this.bgImageLoaded) {
      // [Optimization] 이미지 비율을 유지하며 화면을 꽉 채움 (CSS의 background-size: cover와 동일)
      const scale = Math.max(this.width / this.bgImage.width, this.height / this.bgImage.height);
      const drawWidth = this.bgImage.width * scale;
      const drawHeight = this.bgImage.height * scale;
      
      // 중앙 정렬하여 그리기
      const offsetX = (this.width - drawWidth) / 2;
      const offsetY = (this.height - drawHeight) / 2;
      
      this.ctx.drawImage(this.bgImage, offsetX, offsetY, drawWidth, drawHeight);
    }
  }

  drawMap(waypoints) {
    if (!waypoints || waypoints.length === 0) return;
    
    this.ctx.save();
    
    // 전체 투명도 설정 (배경 질감 투과를 유지하되 가시성 상향)
    this.ctx.globalAlpha = 0.5;
    
    // 캔버스 중앙 계산
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radius = 320;

    // 원형 트랙 그리기 (황무지 최적화 색상 레시피 수정 적용)
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    
    // 메인 색상 (Tan) - 투명도 상향
    this.ctx.strokeStyle = 'rgba(210, 180, 140, 0.4)';
    this.ctx.lineWidth = 45;
    this.ctx.stroke();

    // 테두리 색상 (은은한 흰색) - 투명도 상향
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  drawEntities(entities) {
    for (const entity of entities) {
      if (entity.render) {
        entity.render(this.ctx);
      }
    }
  }

  drawGrid(tileSize) {
    // 배경 이미지 위에서는 그리드를 아주 연하게 표현
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= this.width; x += tileSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.height; y += tileSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }
}
