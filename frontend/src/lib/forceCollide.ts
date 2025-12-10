import type {Node} from './data';
import * as d3 from "d3";

// Code referenced from: https://observablehq.com/@d3/clustered-bubbles
export default function forceCollide() {
  const alpha = 0.4; // fixed for greater rigidity!
  const padding1 = 30; // separation between same-color nodes
  const padding2 = 50; // separation between different-color nodes
  let nodes: Node[];
  let maxRadius: 80;

  function force() {
    const quadtree = d3.quadtree(nodes, d => d.x ?? 0, d => d.y ?? 0) as d3.Quadtree<Node>;
    for (const d of nodes) {
      const r = d.radius + maxRadius;
      const nx1 = (d.x ?? 0) - r, ny1 = (d.y ?? 0) - r;
      const nx2 = (d.x ?? 0) + r, ny2 = (d.y ?? 0) + r;
      quadtree.visit((q, x1, y1, x2, y2) => {
        if (!q.length) {
          let leaf = q as d3.QuadtreeLeaf<Node> | undefined;
          do {
            if (leaf!.data !== d) {
              const r = d.radius + leaf!.data.radius + (d.group === leaf!.data.group ? padding1 : padding2);
              let x = (d.x ?? 0) - (leaf!.data.x ?? 0), y = (d.y ?? 0) - (leaf!.data.y ?? 0), l = Math.hypot(x, y);
              if (l < r) {
                l = (l - r) / l * alpha;
                d.x = (d.x ?? 0) - x * l;
                d.y = (d.y ?? 0) - y * l;
                leaf!.data.x = (leaf!.data.x ?? 0) + x * l;
                leaf!.data.y = (leaf!.data.y ?? 0) + y * l;
              }
            }
            leaf = leaf!.next;
          } while (leaf);
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    }
  }

  force.initialize = (_: Node[]) => maxRadius = (d3.max(nodes = _, d => d.radius) ?? 0) + Math.max(padding1, padding2);

  return force;
}