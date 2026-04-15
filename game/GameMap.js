export class GameMap {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.tileSize = 40;
    
    this.waypoints = [];
    const cx = this.width / 2;
    const cy = this.height / 2; // 반 칸 더 위로 올려서 정중앙에 배치
    const maxRadiusX = (this.width / 2) * 0.78; // 맵이 잘리지 않도록 크기 소폭 축소
    const maxRadiusY = (this.height / 2) * 0.78; 
    
    const minRadiusX = 50;
    const minRadiusY = 50;
    
    const steps = 100; // 부드러운 타원
    
    for (let i = 0; i < steps; i++) {
        const t = i / steps; 
        const angle = t * Math.PI * 2;
        
        const x = cx + maxRadiusX * Math.cos(angle);
        const y = cy + maxRadiusY * Math.sin(angle);
        this.waypoints.push({ x, y });
    }
  }

  // [추가] 유닛 배치 가능 여부 체크
  isValidPosition(x, y) {
    // 맵 경계 체크
    if (x < 0 || y < 0 || x > this.width || y > this.height) return false;

    // 경로(Waypoints)와의 거리 체크 (최소 25px 이상 떨어져야 함)
    const tooCloseToPath = this.waypoints.some(wp => Math.hypot(wp.x - x, wp.y - y) < 25);
    if (tooCloseToPath) return false;

    return true;
  }
}
