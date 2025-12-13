
// source: https://codesandbox.io/p/sandbox/bold-resonance-p4hfq4
import * as d3 from "d3";
import { useEffect, useMemo, useRef, useState } from "react";
import { BLUE, drawNetwork, GREEN, RED, YELLOW } from "@/lib/drawNetwork";
import { type Data, type Link, type Node } from "@/lib/data";
import { useAppContext } from "@/providers/contextProvider";
import Legend from "./Legend";
import { GridBackground } from "./ui/grid_background";
import throttle from "lodash.throttle";
import GraphNav from "./GraphNav";
import forceCollide from "@/lib/forceCollide";
import forceCluster from "@/lib/forceCluster";
import forceInertia from "@/lib/forceInertia";
import NodeTooltip from "./NodeTooltip";

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
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const hoverStateRef = useRef<{ id: string | null; children: Set<string> | undefined }>({
    id: null,
    children: undefined,
  });

  const nodePositions = useRef<Map<any, [number, number]>>(new Map<any, [number, number]>());
  const zoomRef = useRef(d3.zoomIdentity);
  const gridRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appContext = useAppContext();
  const links = useMemo(() => data.links.map((d) => ({ ...d })), [data]);
  const nodes = useMemo(() => {
    const linkCount = new Map<string, number>();
    data.links.forEach((link: Link) => {
      const sourceCount = linkCount.get(link.source) || 0;
      const targetCount = linkCount.get(link.target) || 0;

      linkCount.set(link.source, sourceCount + 1);
      linkCount.set(link.target, targetCount + 1);
    });

    return data.nodes.map((d) => ({
      ...d,
      degree: linkCount.get(d.id) || 0,
    }));
  }, [data]);
  const nodesRef = useRef<Node[]>([]);
  const [colorList, setColorList] = useState<{color: string, label: string}[]>([]);

  const hoveredChildren = useMemo(() => {
    return appContext.getChildren(hoveredNodeId ?? "0");
  }, [hoveredNodeId, appContext]);
  const hoveredDegree = useMemo(() => {
    return hoveredNodeId === null ? 0 : nodes.find(node => node.id === hoveredNodeId)?.degree
  }, [hoveredNodeId, nodes])

  useEffect(() => {
    hoverStateRef.current = { id: hoveredNodeId, children: hoveredChildren };

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (context && nodesRef.current.length > 0) {
      requestAnimationFrame(() => {
        drawNetwork(context, width, height, nodesRef.current, links, zoomRef.current, hoveredNodeId, setColorList, hoveredChildren)
      })
    }

  }, [hoveredNodeId, hoveredChildren]);


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
      let pos = nodePositions.current.get(node.id);

      if (pos) {
        return { ...node, x: pos[0], y: pos[1] };
      }
      const parent = appContext.getParent(node.id)
      pos = parent ? nodePositions.current.get(parent) ?? [width / 2, height / 2] : [width / 2, height / 2];
      const [x, y] = pos;

      return {
          ...node,
          x: x + (Math.random() - 0.5) * 50 ,
          y: y + (Math.random() - 0.5) * 50 ,
      };
    });

    nodesRef.current = adjustedNodes;

    const draw = () => {
      adjustedNodes.forEach((node: Node) => {
          let pos = [node.x ?? 0, node.y ?? 0]

          nodePositions.current.set(node.id, pos as [number, number]);
      });
      drawNetwork(context, width, height, adjustedNodes, links, zoomRef.current, hoverStateRef.current.id, setColorList, hoverStateRef.current.children)
    }

    simulationRef.current = d3.forceSimulation<Node, Link>(adjustedNodes)
    .force("charge", d3.forceManyBody()
      .strength(-300)
      .distanceMin(50)
      .distanceMax(1000)
    )
    .force("link", d3.forceLink<Node, Link>(links)
      .id((d) => d.id)
      .distance(300)
      .iterations(1)
    )
    .force("inertia", forceInertia())
    .force("cluster", forceCluster())
    .force("collide", forceCollide())
    .force("center", d3.forceCenter(width / 2, height / 2))
    .alphaDecay(0.02)
    .on("tick", draw)
  

    const zoom = d3.zoom<HTMLCanvasElement, unknown>()
    .scaleExtent([0.05, 15])
    .on("zoom", ({transform}: {transform: d3.ZoomTransform}) => {
      zoomRef.current = transform;

      if (gridRef.current) {
        gridRef.current.style.backgroundSize = `${transform.k * 40}px ${transform.k * 40}px`;
        gridRef.current.style.backgroundPositionX = `${transform.x}px`
        gridRef.current.style.backgroundPositionY = `${transform.y}px`
      }

      draw();
    })
    
    d3.select(canvas).call(zoom);
          
    return () => {
        simulationRef.current?.stop();
    };
  }, [width, height, nodes, links]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const handleMouseMove = throttle((event: MouseEvent) => {
      let mouseX = event.clientX;
      let mouseY = event.clientY;

      const canvasRect = canvasRef.current?.getBoundingClientRect();

      mouseY -= canvasRect?.top || 0;
      mouseX -= canvasRect?.left || 0;

      const zoom = zoomRef.current;

      if (!zoom) return;

      const graphX = (mouseX - zoom.x) / zoom.k;
      const graphY = (mouseY - zoom.y) / zoom.k;

      const node = simulationRef.current?.find(graphX, graphY, 30);

      if (node) {
        setHoveredNodeId(node.id);
      } else {
        setHoveredNodeId(null);
      }
    }, 10)

    d3.select(canvasRef.current).on("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="z-100">
      {
        appContext.appState.page === "graph" &&
        <GraphNav />
      }
      {
        hoveredNodeId &&
        <NodeTooltip data={nodes.find(n => n.id === hoveredNodeId)!} />
      }
      <Legend
      hoveredEdgesCount={hoveredDegree} 
      legendItems={[
        {
          color: BLUE,
          label: "Referenced in",
          hollow: true,
        },
        {
          color: YELLOW,
          label: "References",
          hollow: true,
        },
        {
          color: RED,
          label: "Error Crawling",
        },
        {
          color: GREEN,
          label: "Root Node",
        },
        ...colorList
      ]}/>
      <GridBackground ref={gridRef}/>
      <canvas
      ref={canvasRef}
      />
    </div>
  );
};