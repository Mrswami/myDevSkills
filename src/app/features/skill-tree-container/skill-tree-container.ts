import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { SkillTreeService, SkillNode } from '../../core/state/skill-tree.service';
import { TreeNodeComponent } from '../tree-node/tree-node';
import { fromEvent, Subscription, switchMap, takeUntil, map } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-skill-tree-container',
  standalone: true,
  imports: [CommonModule, TreeNodeComponent],
  templateUrl: './skill-tree-container.html',
  styleUrls: ['./skill-tree-container.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('250ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class SkillTreeContainerComponent implements AfterViewInit, OnDestroy {
  public skillService = inject(SkillTreeService);
  private http = inject(HttpClient);
  private sub = new Subscription();

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  constructor() {
    this.http.get<{nodes: SkillNode[]}>('skills.json').subscribe(data => {
      this.skillService.loadNodes(data.nodes);
    });
  }

  ngAfterViewInit() {
    this.setupPanZoom();
  }

  private setupPanZoom() {
    const el = this.mapContainer.nativeElement;

    const mousedown$ = fromEvent<MouseEvent>(el, 'mousedown');
    const mousemove$ = fromEvent<MouseEvent>(document, 'mousemove');
    const mouseup$ = fromEvent<MouseEvent>(document, 'mouseup');

    const drag$ = mousedown$.pipe(
      switchMap(startEvent => {
        startEvent.preventDefault();
        const startPan = this.skillService.pan();
        return mousemove$.pipe(
          map(moveEvent => ({
            x: startPan.x + (moveEvent.clientX - startEvent.clientX),
            y: startPan.y + (moveEvent.clientY - startEvent.clientY)
          })),
          takeUntil(mouseup$)
        );
      })
    );

    this.sub.add(drag$.subscribe(pos => this.skillService.setPan(pos.x, pos.y)));

    const wheel$ = fromEvent<WheelEvent>(el, 'wheel');
    this.sub.add(
      wheel$.subscribe(event => {
        event.preventDefault();
        const currentZoom = this.skillService.zoom();
        const zoomDelta = event.deltaY > 0 ? -0.1 : 0.1;
        let newZoom = currentZoom + zoomDelta;
        newZoom = Math.max(0.2, Math.min(newZoom, 3));
        this.skillService.setZoom(newZoom);
      })
    );
  }

  getParentX(parentId: string): number {
    return this.skillService.nodes().find(n => n.id === parentId)?.x || 0;
  }

  getParentY(parentId: string): number {
    return this.skillService.nodes().find(n => n.id === parentId)?.y || 0;
  }

  getParentStatus(parentId: string): string {
    return this.skillService.nodes().find(n => n.id === parentId)?.status || 'locked';
  }

  getLineLength(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
