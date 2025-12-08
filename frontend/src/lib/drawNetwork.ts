// source: https://codesandbox.io/p/sandbox/bold-resonance-p4hfq4

import { type Link, type Node } from "./data";
import * as d3 from "d3";

const blue = "#3b82f6";
const yellow = "#ffbb10";
const red = "#f5384a";
const green = "#00d32d";

export const drawNetwork = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  nodes: Node[],
  links: Link[],
  transform: d3.ZoomTransform,
  hoveredNode: string | null,
  hoveredChildren?: Set<string>,
) => {
  context.save();
  context.clearRect(0, 0, width, height);
  context.translate(transform.x, transform.y);
  context.scale(transform.k, transform.k);

  context.beginPath();
  let shouldDraw = false;
  const nextLinks = [];
  const prevLinks = [];
  const prevNodes = new Set<string>();

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const source = (link.source as any as Node)
    const target = (link.target as any as Node)

    if (!source.x || !target.x || !source.y || !target.y) continue;

    const hovered = source.id === hoveredNode || target.id === hoveredNode;
    const prev = source.id === hoveredNode ? target.id : source.id;

    if (!hovered) {
        context.moveTo(source.x, source.y);
        context.lineTo(target.x, target.y);
        shouldDraw = true;
    }
    else if (hovered && !hoveredChildren?.has(prev)) {
      prevNodes.add(prev);
      prevLinks.push(link);
    }
    else {
      nextLinks.push(link);
    }
  }

  if (shouldDraw) {
      context.strokeStyle = "#cbd5e1"; 
      context.lineWidth = 2 / transform.k;
      context.globalAlpha = 0.15;
      context.stroke();
  }
  
  if (nextLinks.length > 0) {
    context.beginPath();
    for (let i = 0; i < nextLinks.length; i++) {
      const link = nextLinks[i];
      const source = (link.source as any as Node)
      const target = (link.target as any as Node)

      if (!source.x || !target.x || !source.y || !target.y) continue;

      context.moveTo(source.x, source.y);
      context.lineTo(target.x, target.y);
    }

    context.strokeStyle = blue;
    context.lineWidth = 2 / transform.k;
    context.globalAlpha = 1;
    context.stroke();
  }

  if (prevLinks.length > 0) {
    context.beginPath();
    for (let i = 0; i < prevLinks.length; i++) {
      const link = prevLinks[i];
      const source = (link.source as any as Node)
      const target = (link.target as any as Node)

      if (!source.x || !target.x || !source.y || !target.y) continue;

      context.moveTo(source.x, source.y);
      context.lineTo(target.x, target.y);
    }

    context.strokeStyle = yellow;
    context.lineWidth = 2 / transform.k;
    context.globalAlpha = 1;
    context.stroke();
  }

  context.globalAlpha = 1;

  const showLabels = true;
  // if we need more optimization we can batch the different node types too
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node.x || !node.y) continue;
    const hovered = (hoveredNode === node.id || hoveredChildren?.has(node.id));
    const isPrev = prevNodes.has(node.id);

    context.beginPath();
    context.moveTo(node.x + node.radius, node.y);

    let nodeColor = hovered || isPrev ? blue : `${blue}44`
    
    if (node.type === "error") {
      nodeColor = hovered || isPrev ? red : `${red}44`;
    }
    else if (node.type === "root") {
      nodeColor = hovered || isPrev ? green : `${green}44`;
    }

    context.fillStyle = nodeColor;
    context.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
    context.fill();

    let outlineColor = "eeeeee"
    if (isPrev) {
      outlineColor = yellow;
    }
    else if (hovered) {
      outlineColor = blue
    }
    console.log(node.id, outlineColor)
    context.strokeStyle = outlineColor;
    context.lineWidth = 2;
    context.stroke();
    context.strokeStyle = "#eeeeee"

    if (showLabels || hovered || isPrev) {
        context.fillStyle = "#fff";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = "bold 10px sans-serif";
        context.fillText(node.id, node.x, node.y);
    }
  }

  context.restore();
};
