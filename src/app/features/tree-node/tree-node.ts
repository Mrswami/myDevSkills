import { Component, Input, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { SkillNode, SkillTreeService } from '../../core/state/skill-tree.service';

@Component({
  selector: 'app-tree-node',
  standalone: true,
  templateUrl: './tree-node.html',
  styleUrls: ['./tree-node.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.left.px]': 'node.x',
    '[style.top.px]': 'node.y',
    '[style.--hue]': 'hue()',
    '[class.dimmed]': 'dimmed',
  }
})
export class TreeNodeComponent {
  @Input({ required: true }) node!: SkillNode;
  @Input() dimmed = false;
  public skillService = inject(SkillTreeService);

  hue() {
    return this.skillService.hueOf().get(this.node.domain) ?? 200;
  }

  glyph(): string {
    switch (this.node.status) {
      case 'locked': return '🔒';
      case 'mastered': return '★';
      case 'learning': return '◔';
      case 'planned': return '✎';
      default: return this.node.type === 'domain' ? '◈' : this.node.title.charAt(0);
    }
  }

  onClick() {
    // 1. Always center the camera on the clicked orb first
    this.skillService.focusNode(this.node.id, window.innerWidth, 1.2);

    if (this.node.status === 'locked') {
      this.playTone(150, 'sawtooth', 0.1); // Error buzz
      return;
    }
    
    if (this.node.status !== 'unlocked' && this.node.status !== 'mastered') {
      this.playTone(600, 'sine', 0.1); // Initial click blip
      this.skillService.completeInPlan(this.node.id).then(() => {
        this.playTone(880, 'sine', 0.2); // Success ping
        this.playTone(1760, 'sine', 0.3, 0.1); // Sparkle
      });
    } else {
      this.skillService.selectNode(this.node.id);
    }
  }

  private playTone(freq: number, type: OscillatorType, duration = 0.1, delay = 0) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.1, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    } catch (e) {
      // Ignore audio context errors if user hasn't interacted yet
    }
  }
}
