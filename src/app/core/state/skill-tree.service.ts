import { Injectable, signal, computed } from '@angular/core';

export interface SkillNode {
  id: string;
  title: string;
  type: 'core' | 'specialization' | 'framework' | 'tool';
  status: 'locked' | 'available' | 'unlocked' | 'mastered' | 'charging';
  requires: string[];
  x: number;
  y: number;
  resumeContext?: string;
  linkedProjects?: string[]; // IDs linking to projects.json
}

@Injectable({
  providedIn: 'root'
})
export class SkillTreeService {
  // Master list of all nodes
  private nodesSignal = signal<SkillNode[]>([]);
  
  // Camera state for the 2D pan/zoom
  private panSignal = signal({ x: 0, y: 0 });
  private zoomSignal = signal(1);

  // Currently selected node for the details sidebar
  private selectedNodeIdSignal = signal<string | null>(null);

  // Computed state exposed to components
  public nodes = computed(() => this.nodesSignal());
  public pan = computed(() => this.panSignal());
  public zoom = computed(() => this.zoomSignal());
  public selectedNode = computed(() => {
    const id = this.selectedNodeIdSignal();
    return id ? this.nodesSignal().find(n => n.id === id) : null;
  });

  // Load the initial tree map
  public loadNodes(nodes: SkillNode[]) {
    // Automatically evaluate which nodes should be "available" based on initial state
    const evaluated = this.evaluateAvailability(nodes);
    this.nodesSignal.set(evaluated);
  }

  // Camera Actions
  public setPan(x: number, y: number) {
    this.panSignal.set({ x, y });
  }

  public setZoom(zoom: number) {
    this.zoomSignal.set(zoom);
  }

  // Node Actions
  public selectNode(id: string | null) {
    this.selectedNodeIdSignal.set(id);
  }

  public async unlockNodeSequence(id: string) {
    // 1. Close sidebar
    this.selectNode(null);

    // 2. Set node to charging
    this.nodesSignal.update(nodes => nodes.map(n => 
      n.id === id ? { ...n, status: 'charging' as const } : n
    ));

    // 3. Wait for charge-up animation
    await new Promise(resolve => setTimeout(resolve, 600));

    // 4. Unlock and reveal children
    this.nodesSignal.update(nodes => {
      const updated = nodes.map(n => 
        n.id === id ? { ...n, status: 'unlocked' as const } : n
      );
      // Re-evaluate 'available' status for adjacent nodes down the tree
      return this.evaluateAvailability(updated);
    });
  }

  public unlockNode(id: string) {
    this.unlockNodeSequence(id);
  }

  // Core recursive algorithm to check dependencies
  private evaluateAvailability(nodes: SkillNode[]): SkillNode[] {
    return nodes.map(node => {
      // Only check locked nodes to see if their parents are unlocked
      if (node.status === 'locked' && node.requires.length > 0) {
        const allReqsMet = node.requires.every(reqId => {
          const parent = nodes.find(n => n.id === reqId);
          return parent?.status === 'unlocked' || parent?.status === 'mastered';
        });
        
        if (allReqsMet) {
          return { ...node, status: 'available' as const };
        }
      }
      return node;
    });
  }
}
