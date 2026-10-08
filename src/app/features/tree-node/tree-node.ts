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
    '[style.animation-delay.ms]': '(node.y > 0 ? node.y * 0.5 : 0)',
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
    // Select the node so the sidebar opens and dimming logic kicks in
    this.skillService.selectNode(this.node.id);
    this.skillService.focusNode(this.node.id, window.innerWidth);

    if (this.node.status === 'locked') {
      this.playTone(150, 'sawtooth', 0.1); // Error buzz
    } else {
      this.playTone(600, 'sine', 0.1); // Standard blip
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
