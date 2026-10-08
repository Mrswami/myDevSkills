import { Injectable, signal, computed } from '@angular/core';

export type NodeStatus = 'locked' | 'available' | 'unlocked' | 'mastered' | 'learning' | 'planned' | 'charging';
export type NodeType = 'domain' | 'language' | 'framework' | 'tool' | 'concept';
export type PlanStatus = 'planned' | 'learning' | 'done';
export type ViewMode = 'journey' | 'plan';

export interface SkillNode {
  id: string;
  title: string;
  domain: string;
  type: NodeType;
  status: NodeStatus;
  requires: string[];
  x: number;
  y: number;
  resumeContext?: string;
  linkedProjects?: string[];
}

export interface Domain { id: string; name: string; hue: number; }
export interface Role { id: string; name: string; skills: string[]; }

export interface SkillData {
  domains: Domain[];
  roles: Role[];
  nodes: Omit<SkillNode, 'x' | 'y'>[];
}

export interface Edge {
  key: string;
  x1: number; y1: number; x2: number; y2: number;
  length: number;
  state: 'locked' | 'available' | 'active';
  dimmed: boolean;
  cross: boolean;
}

const PLAN_KEY = 'mds.plan.v1';
const MODE_KEY = 'mds.mode.v1';
const DONE: NodeStatus[] = ['unlocked', 'mastered'];

@Injectable({ providedIn: 'root' })
export class SkillTreeService {
  // Static graph (positions computed once on load)
  private baseNodes = signal<SkillNode[]>([]);
  public domains = signal<Domain[]>([]);
  public roles = signal<Role[]>([]);

  // Personal plan overlay (visitor), persisted in the browser
  private plan = signal<Record<string, PlanStatus>>(this.read(PLAN_KEY, {}));
  public mode = signal<ViewMode>(this.read<ViewMode>(MODE_KEY, 'journey'));
  private chargingId = signal<string | null>(null);

  // Camera
  private panSignal = signal({ x: 0, y: 0 });
  private zoomSignal = signal(1);
  public pan = computed(() => this.panSignal());
  public zoom = computed(() => this.zoomSignal());
  public readonly minZoom = 0.08;
  public readonly maxZoom = 2.5;

  // Selection + filters
  private selectedNodeIdSignal = signal<string | null>(null);
  public domainFilter = signal<string | null>(null);
  public roleFilter = signal<string | null>(null);
  public search = signal('');

  private byId = computed(() => new Map(this.baseNodes().map(n => [n.id, n])));
  private childrenOf = computed(() => {
    const m = new Map<string, string[]>();
    for (const n of this.baseNodes()) for (const r of n.requires) (m.get(r) ?? m.set(r, []).get(r)!).push(n.id);
    return m;
  });
  public hueOf = computed(() => new Map(this.domains().map(d => [d.id, d.hue])));

  /** Effective nodes: owner's record in journey mode, visitor plan in plan mode. */
  public nodes = computed<SkillNode[]>(() => {
    const base = this.baseNodes();
    const charging = this.chargingId();
    const resolved = this.mode() === 'journey' ? this.journeyStatuses(base) : this.planStatuses(base);
    return resolved.map(n => (n.id === charging ? { ...n, status: 'charging' as const } : n));
  });

  private nodeMap = computed(() => new Map(this.nodes().map(n => [n.id, n])));

  public selectedNode = computed(() => {
    const id = this.selectedNodeIdSignal();
    return id ? this.nodeMap().get(id) ?? null : null;
  });
  public selectedPrereqs = computed(() => {
    const s = this.selectedNode();
    return s ? s.requires.map(id => this.nodeMap().get(id)).filter((n): n is SkillNode => !!n) : [];
  });
  public selectedUnlocks = computed(() => {
    const s = this.selectedNode();
    return s ? (this.childrenOf().get(s.id) ?? []).map(id => this.nodeMap().get(id)).filter((n): n is SkillNode => !!n) : [];
  });

  /** Ids that match the current filters; null means "no filter active". */
  public visibleIds = computed<Set<string> | null>(() => {
    const dom = this.domainFilter();
    const role = this.roleFilter();
    const q = this.search().trim().toLowerCase();
    if (!dom && !role && !q) return null;
    let set: Set<string> | null = null;
    const intersect = (s: Set<string>) => { set = set ? new Set([...set].filter(x => s.has(x))) : s; };
    if (dom) intersect(new Set(this.baseNodes().filter(n => n.domain === dom || n.id === dom || n.id === 'me').map(n => n.id)));
    if (role) {
      const r = this.roles().find(x => x.id === role);
      intersect(this.withAncestors(r?.skills ?? []));
    }
    if (q) intersect(new Set(this.baseNodes().filter(n => n.title.toLowerCase().includes(q)).map(n => n.id)));
    return set;
  });

  public edges = computed<Edge[]>(() => {
    const map = this.nodeMap();
    const vis = this.visibleIds();
    const out: Edge[] = [];
    for (const n of this.nodes()) {
      for (const r of n.requires) {
        const p = map.get(r);
        if (!p) continue;
        const bothDone = this.isDone(p) && this.isDone(n);
        const state = bothDone ? 'active' : (n.status === 'available' || n.status === 'learning' || n.status === 'planned' || n.status === 'charging') && this.isDone(p) ? 'available' : 'locked';
        out.push({
          key: `${r}>${n.id}`,
          x1: p.x, y1: p.y, x2: n.x, y2: n.y,
          length: Math.hypot(n.x - p.x, n.y - p.y),
          state,
          dimmed: !!vis && !(vis.has(n.id) && vis.has(r)),
          cross: p.domain !== n.domain && p.id !== 'me' && p.type !== 'domain',
        });
      }
    }
    return out;
  });

  public stats = computed(() => {
    const skills = this.nodes().filter(n => n.type !== 'domain');
    const count = (f: (n: SkillNode) => boolean) => skills.filter(f).length;
    return {
      total: skills.length,
      done: count(n => n.status === 'mastered' || n.status === 'unlocked'),
      mastered: count(n => n.status === 'mastered'),
      learning: count(n => n.status === 'learning'),
      planned: count(n => n.status === 'planned'),
    };
  });

  public bounds = computed(() => {
    const ns = this.baseNodes();
    if (!ns.length) return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
    return {
      minX: Math.min(...ns.map(n => n.x)), maxX: Math.max(...ns.map(n => n.x)),
      minY: Math.min(...ns.map(n => n.y)), maxY: Math.max(...ns.map(n => n.y)),
    };
  });

  // ───────── Loading + layout
  public loadData(data: SkillData) {
    this.domains.set(data.domains);
    this.roles.set(data.roles);
    this.baseNodes.set(this.layout(data));
  }

  /**
   * District layout. Each domain is a compact district placed on a ring around the hub.
   * Inside a district, nodes are layered by local prerequisite depth (same-domain only),
   * bands extend away from the hub, and wide bands wrap into rows. Parents' lateral
   * positions order children to keep edges short.
   */
  private layout(data: SkillData): SkillNode[] {
    const COLS = 6;        // max nodes per row
    const COL_W = 170;     // lateral spacing
    const ROW_H = 120;     // radial spacing between rows
    const START = 170;     // gap from district node to first row
    const RING = 1500;     // distance of district nodes from hub

    const pos = new Map<string, { x: number; y: number }>();
    pos.set('me', { x: 0, y: 0 });

    data.domains.forEach((dom, di) => {
      const theta = -Math.PI / 2 + (di / data.domains.length) * Math.PI * 2;
      const u = { x: Math.cos(theta), y: Math.sin(theta) };   // away from hub
      const v = { x: -u.y, y: u.x };                          // lateral
      const origin = { x: u.x * RING, y: u.y * RING };
      pos.set(dom.id, origin);

      const members = data.nodes.filter(n => n.domain === dom.id && n.type !== 'domain');
      const ids = new Set(members.map(m => m.id));

      // Local depth: longest chain among same-domain prerequisites
      const depth = new Map<string, number>();
      const depthOf = (id: string, seen = new Set<string>()): number => {
        if (depth.has(id)) return depth.get(id)!;
        if (seen.has(id)) return 1;
        seen.add(id);
        const n = members.find(m => m.id === id)!;
        const local = n.requires.filter(r => ids.has(r));
        const d = local.length ? 1 + Math.max(...local.map(r => depthOf(r, seen))) : 1;
        depth.set(id, d);
        return d;
      };
      members.forEach(m => depthOf(m.id));

      const lateral = new Map<string, number>();
      let offset = START;
      const maxD = Math.max(1, ...depth.values());
      for (let d = 1; d <= maxD; d++) {
        let layer = members.filter(m => depth.get(m.id) === d);
        if (!layer.length) continue;
        // Order by mean lateral position of same-domain parents (barycenter heuristic)
        const score = (m: typeof layer[number]) => {
          const ps = m.requires.filter(r => lateral.has(r)).map(r => lateral.get(r)!);
          return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : 0;
        };
        layer = layer.map((m, i) => ({ m, i, s: score(m) }))
          .sort((a, b) => a.s - b.s || a.i - b.i).map(x => x.m);

        const rows = Math.ceil(layer.length / COLS);
        const perRow = Math.ceil(layer.length / rows);   // balance rows
        for (let r = 0; r < rows; r++) {
          const chunk = layer.slice(r * perRow, (r + 1) * perRow);
          chunk.forEach((m, i) => {
            const lat = (i - (chunk.length - 1) / 2) * COL_W + (r % 2 ? COL_W / 4 : 0);
            lateral.set(m.id, lat);
            pos.set(m.id, {
              x: origin.x + u.x * offset + v.x * lat,
              y: origin.y + u.y * offset + v.y * lat,
            });
          });
          offset += ROW_H;
        }
        offset += 30; // breathing room between depth bands
      }
    });
    return data.nodes.map(n => ({ ...n, ...(pos.get(n.id) ?? { x: 0, y: 0 }) }));
  }

  /** Frame a set of nodes (e.g. a domain district) in the viewport. */
  public fitIds(ids: string[], width: number, height: number) {
    const set = new Set(ids);
    const ns = this.baseNodes().filter(n => set.has(n.id));
    if (!ns.length) return this.fitView(width, height);
    const minX = Math.min(...ns.map(n => n.x)), maxX = Math.max(...ns.map(n => n.x));
    const minY = Math.min(...ns.map(n => n.y)), maxY = Math.max(...ns.map(n => n.y));
    const pad = 160;
    const z = Math.max(this.minZoom, Math.min(1, Math.min(width / (maxX - minX + pad * 2), height / (maxY - minY + pad * 2))));
    this.zoomSignal.set(z);
    this.panSignal.set({ x: -((minX + maxX) / 2) * z, y: -((minY + maxY) / 2) * z });
  }

  public idsInDomain(domainId: string): string[] {
    return this.baseNodes().filter(n => n.domain === domainId).map(n => n.id);
  }

  // ───────── Status resolution
  private isDone(n: SkillNode) { return DONE.includes(n.status); }

  private journeyStatuses(base: SkillNode[]): SkillNode[] {
    const map = new Map(base.map(n => [n.id, n]));
    return base.map(n => {
      if (n.status !== 'locked') return n;
      const ready = n.requires.length > 0 && n.requires.every(r => {
        const s = map.get(r)?.status;
        return s === 'unlocked' || s === 'mastered';
      });
      return ready ? { ...n, status: 'available' as const } : n;
    });
  }

  private planStatuses(base: SkillNode[]): SkillNode[] {
    const plan = this.plan();
    const first = base.map(n => {
      if (n.id === 'me' || n.type === 'domain') return { ...n, status: 'unlocked' as const };
      const p = plan[n.id];
      const status: NodeStatus = p === 'done' ? 'unlocked' : p === 'learning' ? 'learning' : p === 'planned' ? 'planned' : 'locked';
      return { ...n, status };
    });
    const map = new Map(first.map(n => [n.id, n]));
    return first.map(n => {
      if (n.status !== 'locked') return n;
      const ready = n.requires.every(r => this.isDone(map.get(r)!));
      return ready ? { ...n, status: 'available' as const } : n;
    });
  }

  // ───────── Actions
  public setMode(m: ViewMode) {
    this.mode.set(m);
    this.write(MODE_KEY, m);
  }

  public setPlanStatus(id: string, status: PlanStatus | null) {
    this.plan.update(p => {
      const next = { ...p };
      if (status) next[id] = status; else delete next[id];
      return next;
    });
    this.write(PLAN_KEY, this.plan());
  }

  public planStatusOf(id: string): PlanStatus | null {
    return this.plan()[id] ?? null;
  }

  public resetPlan() {
    this.plan.set({});
    this.write(PLAN_KEY, {});
  }

  /** Marking a skill learned plays the charge-up before committing. */
  public async completeInPlan(id: string) {
    this.selectNode(null);
    this.chargingId.set(id);
    await new Promise(resolve => setTimeout(resolve, 600));
    this.setPlanStatus(id, 'done');
    this.chargingId.set(null);
  }

  public selectNode(id: string | null) { this.selectedNodeIdSignal.set(id); }

  /** Add a whole role path to the plan (skills + missing prerequisites). */
  public planRole(roleId: string) {
    const r = this.roles().find(x => x.id === roleId);
    if (!r) return;
    const ids = this.withAncestors(r.skills);
    this.plan.update(p => {
      const next = { ...p };
      ids.forEach(id => {
        const n = this.byId().get(id);
        if (n && n.type !== 'domain' && !next[id]) next[id] = 'planned';
      });
      return next;
    });
    this.write(PLAN_KEY, this.plan());
  }

  private withAncestors(seed: string[]): Set<string> {
    const out = new Set<string>();
    const walk = (id: string) => {
      if (out.has(id)) return;
      out.add(id);
      this.byId().get(id)?.requires.forEach(walk);
    };
    seed.forEach(walk);
    return out;
  }

  // ───────── Camera
  private cameraAnimation: number | null = null;

  public setPan(x: number, y: number) { 
    if (this.cameraAnimation) cancelAnimationFrame(this.cameraAnimation);
    this.panSignal.set({ x, y }); 
  }
  
  public setZoom(z: number) { 
    if (this.cameraAnimation) cancelAnimationFrame(this.cameraAnimation);
    this.zoomSignal.set(Math.max(this.minZoom, Math.min(this.maxZoom, z))); 
  }

  public animateCamera(targetPan: { x: number, y: number }, targetZoom: number, duration = 400) {
    if (this.cameraAnimation) cancelAnimationFrame(this.cameraAnimation);
    
    const startPan = this.panSignal();
    const startZoom = this.zoomSignal();
    const startTime = performance.now();

    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3); // cubic ease-out
      
      this.panSignal.set({
        x: startPan.x + (targetPan.x - startPan.x) * ease,
        y: startPan.y + (targetPan.y - startPan.y) * ease
      });
      this.zoomSignal.set(startZoom + (targetZoom - startZoom) * ease);
      
      if (t < 1) this.cameraAnimation = requestAnimationFrame(step);
    };
    this.cameraAnimation = requestAnimationFrame(step);
  }

  /** Zoom keeping the screen point (relative to viewport center) fixed. */
  public zoomAt(newZoom: number, px: number, py: number) {
    const z0 = this.zoomSignal();
    const z1 = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
    const p = this.panSignal();
    this.setPan(px - (px - p.x) * (z1 / z0), py - (py - p.y) * (z1 / z0));
    this.setZoom(z1);
  }

  public fitView(width: number, height: number, animated = false) {
    const b = this.bounds();
    const pad = 140;
    const w = b.maxX - b.minX + pad * 2;
    const h = b.maxY - b.minY + pad * 2;
    const z = Math.max(this.minZoom, Math.min(1, Math.min(width / w, height / h)));
    const targetPan = { x: -((b.minX + b.maxX) / 2) * z, y: -((b.minY + b.maxY) / 2) * z };
    
    if (animated) {
      this.animateCamera(targetPan, z, 500);
    } else {
      this.setZoom(z);
      this.setPan(targetPan.x, targetPan.y);
    }
  }

  public focusNode(id: string, width: number, targetZoom = 1.2) {
    const n = this.nodeMap().get(id);
    if (!n) return;
    const offset = width > 800 ? -200 : 0;
    this.animateCamera({ x: -n.x * targetZoom + offset, y: -n.y * targetZoom }, targetZoom);
  }

  // ───────── Storage (safe in SSR / private mode)
  private read<T>(key: string, fallback: T): T {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch { return fallback; }
  }
  private write(key: string, v: unknown) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
  }
}
