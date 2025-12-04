// source: https://codesandbox.io/p/sandbox/bold-resonance-p4hfq4

import * as d3 from "d3";
import { useEffect, useRef } from "react";
import { RADIUS, drawNetwork } from "@/lib/drawNetwork";
import { type Data, type Link, type Node } from "@/lib/data";

type NetworkDiagramProps = {
  width: number;
  height: number;
  data: Data;
};

export const NetworkDiagram = ({
  width,
  height,
  data,
}: NetworkDiagramProps) => {
    // const [count, setCount] = useState(1);
    const nodePositions = useRef<Map<any, [number, number]>>(new Map<any, [number, number]>());
    const zoomRef = useRef(d3.zoomIdentity);

    const links: Link[] = data.links.map((d) => ({ ...d }));
    const nodes: Node[] = data.nodes.map((d) => ({ ...d }));

    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");

        if (!context || !canvas) {
            return;
        }

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.scale(dpr, dpr);

        const adjustedNodes = nodes.map((node) => {
            const [x, y] = nodePositions.current.get(node.id) ?? [width / 2, height / 2];
            return {
                ...node,
                x,
                y,
            };
        });

        const draw = () => {
            adjustedNodes.forEach((node) => {
                nodePositions.current.set(node.id, [node.x ?? 0, node.y ?? 0]);
            });
            drawNetwork(context, width, height, adjustedNodes, links, zoomRef.current);
        }

        const simulation = d3.forceSimulation(adjustedNodes)
        .force(
            "link",
            d3.forceLink<Node, Link>(links).id((d) => d.id)
        )
        .force("collide", d3.forceCollide().radius(RADIUS))
        .force("charge", d3.forceManyBody().strength(-100))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .on("tick", draw)

        const zoom = d3.zoom<HTMLCanvasElement, unknown>()
        .scaleExtent([0.1, 8])
        .on("zoom", ({transform}) => {
            zoomRef.current = transform;
            draw();
        })

        d3.select(canvas).call(zoom);
            
        // Cleanup simulation on unmount or update
        return () => {
            simulation.stop();
        };
    }, [width, height, nodes, links]);

    // useEffect(() => {
    // const id = setTimeout(() => {
    //     setCount(i => i + 1);
    // }, 5000);

    // return () => clearTimeout(id);
    // }, [count]);

  return (
    <div>
      <canvas
        ref={canvasRef}
      />
    </div>
  );
};
