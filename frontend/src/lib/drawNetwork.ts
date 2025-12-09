// source: https://codesandbox.io/p/sandbox/bold-resonance-p4hfq4

import type { Dispatch, SetStateAction } from "react";
import { type Link, type Node } from "./data";
import * as d3 from "d3";

export const BLUE = "#33d9ff";
export const YELLOW = "#ffbb10";
export const RED = "#f5384a";
export const GREEN = "#00d32d";

export const drawNetwork = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  nodes: Node[],
  links: Link[],
  transform: d3.ZoomTransform,
  hoveredNode: string | null,
  setColorsList: Dispatch<SetStateAction<{
    color: string;
    label: string;
  }[]>>,
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

  // screen bounds
  const minX = -transform.x / transform.k - 50;
  const maxX = (width - transform.x) / transform.k + 50;
  const minY = -transform.y / transform.k - 50;
  const maxY = (height - transform.y) / transform.k + 50;

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const source = (link.source as any as Node)
    const target = (link.target as any as Node)

    if (!source.x || !target.x || !source.y || !target.y) continue;
    if ((source.x < minX && target.x < minX) || (source.x > maxX && target.x > maxX) ||
        (source.y < minY && target.y < minY) || (source.y > maxY && target.y > maxY)) {
        continue;
    }

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

    context.strokeStyle = BLUE;
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

    context.strokeStyle = YELLOW;
    context.lineWidth = 2 / transform.k;
    context.globalAlpha = 1;
    context.stroke();
  }

  context.globalAlpha = 1;
  const colorList = [];
  const domainSet = new Set<string>();

  const showLabels = transform.k > 1.2;
  // if we need more optimization we can batch the different node types too
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!node.x || !node.y) continue;
    if (node.x < minX || node.x > maxX || node.y < minY || node.y > maxY) {
        continue;
    }
    
    const hovered = (hoveredNode === node.id || hoveredChildren?.has(node.id));
    const isPrev = prevNodes.has(node.id);
    const focused = hovered || isPrev;

    context.beginPath();
    context.moveTo(node.x + node.radius, node.y);

    // replace this with focused to show all focused nodes on the legend
    if (hoveredNode === node.id) {
      try {
        const { hostname } = new URL(node.url);
        const parts = hostname.split(".");
        let domain = parts.length > 2 ? parts.slice(-2).join(".") : hostname;

        if (!domainSet.has(domain)) {
          colorList.push({
            color: node.color,
            label: domain
          });
          domainSet.add(domain);
        }
      }
      catch (err) {}
    }

    let nodeColor = focused ? node.color : `${node.color}77`
    
    if (node.type === "error") {
      nodeColor = focused ? RED : `${RED}77`;
    }
    else if (node.type === "root") {
      nodeColor = focused ? GREEN : `${GREEN}77`;
    }

    context.fillStyle = nodeColor;
    context.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
    context.fill();

    let outlineColor = "eeeeee"
    if (isPrev) {
      outlineColor = YELLOW;
    }
    else if (hovered) {
      outlineColor = BLUE
    }
    context.strokeStyle = outlineColor;
    context.lineWidth = 2;
    context.stroke();
    context.strokeStyle = "#eeeeee"

    if (showLabels || focused) {
        context.fillStyle = "#fff";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = "bold 10px sans-serif";
        context.fillText(node.title, node.x, node.y);
    }
  }

  setColorsList(colorList);
  context.restore();
};
