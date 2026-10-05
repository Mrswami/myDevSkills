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
    this.skillService.selectNode(this.node.id);
  }
}
