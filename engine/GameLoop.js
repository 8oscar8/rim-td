export class GameLoop {
  constructor(updateFn, renderFn) {
    this.updateFn = updateFn;
    this.renderFn = renderFn;
    this.lastTime = 0;
    this.running = false;
    this.frameId = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame((time) => this.loop(time));
  }

  stop() {
    this.running = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  loop(currentTime) {
    if (!this.running) return;
    
    // Delta Time 계산 (초 단위)
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // 비정상적인 도약 방지를 위한 Delta Time 상한선 설정
    const safeDelta = Math.min(deltaTime, 0.1);

    this.updateFn(safeDelta);
    this.renderFn();

    this.frameId = requestAnimationFrame((time) => this.loop(time));
  }
}
