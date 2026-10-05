import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkillNode, SkillTreeService } from '../../core/state/skill-tree.service';

@Component({
  selector: 'app-tree-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tree-node.html',
  styleUrls: ['./tree-node.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TreeNodeComponent {
  @Input({ required: true }) node!: SkillNode;
  public skillService = inject(SkillTreeService);

  onClick() {
    this.skillService.selectNode(this.node.id);
  }
}
