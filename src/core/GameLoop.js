class GameLoop {
  constructor(updateCallback, renderCallback) {
    this.updateCallback = updateCallback;
    this.renderCallback = renderCallback;
    this.running = false;
    this.lastTimestamp = 0;
  }

  start() {
    if (!this.running) {
      this.running = true;
      this.lastTimestamp = performance.now();
      requestAnimationFrame(this.loop.bind(this));
    }
  }

  stop() {
    this.running = false;
  }

  loop(timestamp) {
    if (!this.running) {return;}

    const deltaTime = (timestamp - this.lastTimestamp) / 1000; // Convert to seconds
    this.lastTimestamp = timestamp;

    this.updateCallback(deltaTime);
    this.renderCallback(deltaTime);

    requestAnimationFrame(this.loop.bind(this));
  }
}

export default GameLoop;
