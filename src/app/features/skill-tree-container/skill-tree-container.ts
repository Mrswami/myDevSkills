import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, ChangeDetectionStrategy, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SkillTreeService, SkillData, SkillNode, ViewMode } from '../../core/state/skill-tree.service';
import { TreeNodeComponent } from '../tree-node/tree-node';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-skill-tree-container',
  standalone: true,
  imports: [TreeNodeComponent],
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

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private pointers = new Map<number, { x: number; y: number }>();
  private lastPinch = 0;
  private moved = false;
  private cleanup: Array<() => void> = [];

  constructor() {
    this.http.get<SkillData>('skills.json').subscribe(data => {
      this.skillService.loadData(data);
      // Wait for the view to measure, then zoom to macro level on the center hub
      requestAnimationFrame(() => {
        this.skillService.focusNode('me', window.innerWidth, 0.45);
      });
    });

    // Pan to a node when a search narrows to a single skill.
    effect(() => {
      const q = this.skillService.search().trim();
      const vis = this.skillService.visibleIds();
      if (q && vis && vis.size === 1) {
        this.skillService.focusNode([...vis][0], window.innerWidth, 1.2);
      }
    });
  }

  ngAfterViewInit() {
    const el = this.mapContainer.nativeElement;
    const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn as EventListener, opts);
      this.cleanup.push(() => el.removeEventListener(type, fn as EventListener));
    };

    on('pointerdown', e => {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.moved = false;
      if (this.pointers.size === 2) this.lastPinch = this.pinchDistance();
    });

    on('pointermove', e => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };
      this.pointers.set(e.pointerId, cur);

      if (this.pointers.size === 1) {
        const dx = cur.x - prev.x, dy = cur.y - prev.y;
        if (!this.moved && Math.abs(dx) + Math.abs(dy) < 2) return;
        this.moved = true;
        const p = this.skillService.pan();
        this.skillService.setPan(p.x + dx, p.y + dy);
      } else if (this.pointers.size === 2) {
        const dist = this.pinchDistance();
        if (this.lastPinch > 0) {
          const mid = this.pinchMidpoint();
          this.skillService.zoomAt(this.skillService.zoom() * (dist / this.lastPinch), mid.x, mid.y);
        }
        this.lastPinch = dist;
      }
    });

    const end = (e: PointerEvent) => { this.pointers.delete(e.pointerId); this.lastPinch = 0; };
    on('pointerup', end);
    on('pointercancel', end);
    on('pointerleave', end);

    on('wheel', e => {
      e.preventDefault();
      const c = this.center();
      const factor = Math.exp(-e.deltaY * 0.0015);
      this.skillService.zoomAt(this.skillService.zoom() * factor, e.clientX - c.x, e.clientY - c.y);
    }, { passive: false });

    on('click', e => {
      // Clicking empty space dismisses the sidebar (not after a drag).
      if (!this.moved && (e.target as HTMLElement).closest('app-tree-node') === null) {
        this.skillService.selectNode(null);
      }
    });
  }

  private center() {
    const r = this.mapContainer.nativeElement.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  private pinchPoints() { return [...this.pointers.values()]; }
  private pinchDistance() {
    const [a, b] = this.pinchPoints();
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  private pinchMidpoint() {
    const [a, b] = this.pinchPoints();
    const c = this.center();
    return { x: (a.x + b.x) / 2 - c.x, y: (a.y + b.y) / 2 - c.y };
  }

  fit() {
    const r = this.mapContainer.nativeElement.getBoundingClientRect();
    this.skillService.fitView(r.width, r.height, true);
  }

  zoomBy(factor: number) {
    this.skillService.zoomAt(this.skillService.zoom() * factor, 0, 0);
  }

  setMode(mode: ViewMode) { this.skillService.setMode(mode); }

  onSearch(e: Event) { this.skillService.search.set((e.target as HTMLInputElement).value); }

  toggleDomain(id: string) {
    const turningOn = this.skillService.domainFilter() !== id;
    this.skillService.domainFilter.set(turningOn ? id : null);
    const r = this.mapContainer.nativeElement.getBoundingClientRect();
    if (turningOn) this.skillService.fitIds(this.skillService.idsInDomain(id), r.width, r.height);
    else this.fit();
  }

  onRole(e: Event) {
    const v = (e.target as HTMLSelectElement).value;
    this.skillService.roleFilter.set(v || null);
  }

  clearFilters() {
    this.skillService.domainFilter.set(null);
    this.skillService.roleFilter.set(null);
    this.skillService.search.set('');
    this.fit();
  }

  isDimmed(n: SkillNode): boolean {
    const vis = this.skillService.visibleIds();
    return !!vis && !vis.has(n.id);
  }

  go(n: SkillNode) {
    this.skillService.selectNode(n.id);
    this.skillService.focusNode(n.id, window.innerWidth);
  }

  confirmReset() {
    if (confirm('Clear your plan and start over?')) this.skillService.resetPlan();
  }

  ngOnDestroy() {
    this.cleanup.forEach(fn => fn());
  }
}
