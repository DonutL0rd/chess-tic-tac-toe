
class SoundManager {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number) {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq / 2, this.ctx.currentTime + duration);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playPlace() {
    this.playTone(150, 'sine', 0.15, 0.2);
  }

  playMove() {
    this.playTone(300, 'triangle', 0.1, 0.15);
  }

  playCapture() {
    this.playTone(80, 'sawtooth', 0.2, 0.25);
    setTimeout(() => this.playTone(60, 'sawtooth', 0.2, 0.2), 50);
  }

  playWin() {
    const tones = [440, 554.37, 659.25, 880];
    tones.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.4, 0.1), i * 150);
    });
  }

  playSelect() {
    this.playTone(600, 'sine', 0.05, 0.1);
  }
}

export const sounds = new SoundManager();
