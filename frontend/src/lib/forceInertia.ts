import type { Node } from "./data";

export default function forceInertia() {
  let nodes: (Node & { degree: number })[];
  const strength = 1; 

  function force(_: number) {
    for (const node of nodes) {
        if (node.degree === 0) {
            continue;
        }

        const mobility = 1 / ((node.degree ?? 0) * strength + 1);
        node.vx = (node.vx ?? 0) * mobility;
        node.vy = (node.vy ?? 0) * mobility;
    }
  }

  force.initialize = (_nodes: (Node & { degree: number })[]) => nodes = _nodes;

  return force;
}