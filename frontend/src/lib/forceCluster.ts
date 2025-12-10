import * as d3 from "d3";
import type { Node } from "./data";

// Code referenced from: https://observablehq.com/@d3/clustered-bubbles
export default function forceCluster() {
  const strength = 0.1;
  let nodes: Node[];

    function centroid(nodes: Node[]) {
        let x = 0;
        let y = 0;
        for (const d of nodes) {
            x += (d.x ?? 0);
            y += (d.y ?? 0);
        }
        return {x: x / nodes.length, y: y / nodes.length};
    }

  function force(alpha: number) {
    const centroids = d3.rollup(nodes, centroid, d => d.group);
    const l = alpha * strength;
    for (const d of nodes) {
      const {x: cx, y: cy} = centroids.get(d.group) ?? {x: 0, y: 0};
      d.vx = (d.vx ?? 0) - ((d.x ?? 0) - cx) * l;
      d.vy = (d.vy ?? 0) - ((d.y ?? 0) - cy) * l;
    }
  }

  force.initialize = (_: Node[]) => nodes = _;

  return force;
}