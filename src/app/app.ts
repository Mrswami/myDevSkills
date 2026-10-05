import { Component } from '@angular/core';
import { SkillTreeContainerComponent } from './features/skill-tree-container/skill-tree-container';

@Component({
  imports: [SkillTreeContainerComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {}
