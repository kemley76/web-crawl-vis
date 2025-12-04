// source: https://codesandbox.io/p/sandbox/bold-resonance-p4hfq4

import { type Link, type Node } from "./data";
import * as d3 from "d3";

export const RADIUS = 30;
const COLORS = ["#3b82f6", "#10b981", "#f59e0b"];
const colorScale = d3.scaleOrdinal<number, string>()
  .domain([1, 2, 3])
  .range(COLORS);

export const drawNetwork = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  nodes: Node[],
  links: Link[],
  transform: d3.ZoomTransform
) => {
  context.save();
  context.clearRect(0, 0, width, height);
  context.translate(transform.x, transform.y);
  context.scale(transform.k, transform.k);

  // Draw the links first
  links.forEach((link) => {
    let source = (link.source as any as Node)
    let target = (link.target as any as Node)
    context.beginPath();
    if (source.x && target.x && source.y && target.y) {
      context.moveTo(source.x, source.y);
      context.lineTo(target.x, target.y);
    }
    context.strokeStyle = "#94a3b8";
    context.lineWidth = 2;
    context.globalAlpha = 0.6;
    context.stroke();
    context.globalAlpha = 1; // Reset alpha
    context.closePath();
  });

  // Draw the nodes
  nodes.forEach((node) => {
    if (!node.x || !node.y) {
      return;
    }

    context.beginPath();
    context.shadowColor = "rgba(0, 0, 0, 0.1)";
    context.shadowBlur = 6;
    context.shadowOffsetY = 4;

    context.moveTo(node.x + RADIUS, node.y);
    context.fillStyle = colorScale(1);
    context.arc(node.x, node.y, RADIUS, 0, 2 * Math.PI);
    context.fill();

    context.strokeStyle = "#eee";
    context.lineWidth = 3;
    context.stroke();

    context.fillStyle = "#fff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "bold 10px sans-serif";
    context.fillText(node.id, node.x, node.y);
  });

  context.restore();
};
