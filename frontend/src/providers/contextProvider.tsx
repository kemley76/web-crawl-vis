import useCache from "@/hooks/cache";
import { type Data, type Link, type Node } from "@/lib/data";
import * as d3 from "d3";
import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

type ContextType = {
  appState: "graph" | "home";
  seed: string;
  loading: boolean;
  data: Data;
  setAppState: Dispatch<SetStateAction<"graph" | "home">>,
  setSeed: Dispatch<SetStateAction<string>>,
  getChildren: (nodeId: string) => Set<string> | undefined;
  getParent: (nodeId: string) => string | null;
};

const COLORS = ["#5c33ff", "#ff33aa", "#f59e0b"];
const colorScale = d3.scaleOrdinal<number, string>()
  .domain([0, 1, 2])
  .range(COLORS);

const defaultContext: ContextType = {
  appState: "home",
  seed: "https://go.dev/",
  loading: false,
  data: {
    nodes: [],
    links: [],
  },
  setAppState: () => {},
  setSeed: () => {},
  getChildren: () => undefined,
  getParent: () => null,
};

const Context = createContext<ContextType>(defaultContext);

type SSEMessage = {
  errors: string[] | null;
  id: number;
  neighbors: number[] | null;
  responseTime: number;
  title: string;
  url: string;
};

const BASE_RADIUS = 20;
const RADIUS_GROWTH_PER_LINK = 0.5;
const MAX_RADIUS = 50; // Cap it so they don't get too huge

export const ContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [appState, setAppState] = useState<"graph" | "home">(defaultContext.appState);
  const [seed, setSeed] = useState<string>(defaultContext.seed);
  const [data, setData] = useState<Data>(defaultContext.data);
  const [loading, setLoading] = useState(defaultContext.loading);
  const nodesRef = useRef<Map<number, Node>>(new Map());
  const edgesRef = useRef<Map<string, Link>>(new Map());
  const adjList = useRef<Map<string, Set<string>>>(new Map());

  const getParent = (nodeId: string) => {
    const edge = data.links.find(
      (edge) => edge.source === nodeId || edge.target === nodeId
    );

    if (!edge) return null;

    const parent = edge.source === nodeId ? edge.target : edge.source;

    return parent;
  };

  const getColorForUrl = useCache((url: string) => {
    try {
      const { hostname } = new URL(url);
      const parts = hostname.split(".");
      const domain = parts.length > 2 ? parts.slice(-2).join(".") : hostname;

      let hash = 0;
      for (let i = 0; i < domain.length; i++) {
        hash += Math.pow(domain.charCodeAt(i), i + 1) / 2;
      }

      return colorScale(hash);
    } catch {
      return colorScale(0);
    }
  })

  const getChildren = (nodeId: string) => {
    return adjList.current.get(nodeId);
  }

  const handleIncomingMessage = (message: SSEMessage) => {
    const { id, neighbors, errors, title, url } = message;

    const root = seed === url;

    const replaceNode = nodesRef.current.has(id)
    const newNode: Node | undefined = {
      id: id.toString(),
      title: title || (errors|| [""])[0],
      url,
      color: getColorForUrl(url),
      group: "1",
      type: errors ? "error" : (root ? "root" : "normal"),
      radius: BASE_RADIUS,
    };

    nodesRef.current.set(id, newNode);
    adjList.current.set(id.toString(), new Set((neighbors ?? []).map(n => n.toString())));

    let newNodes = false

    if (replaceNode) newNodes = true

    const newEdges: Link[] = [];
    const updatedNodeIds = new Set<string>();

    // Create edges only if the neighbor already exists in our graph
    for (const adjNode of neighbors ?? []) {
      if (!nodesRef.current.has(adjNode)) {
        const newAdjNode = {
          id: adjNode.toString(),
          title: "unknown",
          url: "unknown",
          color: colorScale(0),
          group: "1",
          type: "normal",
          radius: BASE_RADIUS,
        }
        nodesRef.current.set(adjNode, newAdjNode);
        adjList.current.set(adjNode.toString(), new Set());
        newNodes = true
      }

      const source = Math.min(adjNode, id).toString();
      const target = Math.max(adjNode, id).toString();
      const edge = `${source}-${target}`;

      if (!edgesRef.current.has(edge)) {
        const newEdge: Link = { source, target, value: 1 };
        edgesRef.current.set(edge, newEdge);
        newEdges.push(newEdge);

        const nodeA = nodesRef.current.get(id);
        const nodeB = nodesRef.current.get(adjNode);

        if (nodeA) {
          nodeA.radius = Math.min(nodeA.radius + RADIUS_GROWTH_PER_LINK, MAX_RADIUS);
          updatedNodeIds.add(nodeA.id);
        }
        if (nodeB) {
          nodeB.radius = Math.min(nodeB.radius + RADIUS_GROWTH_PER_LINK, MAX_RADIUS);
          updatedNodeIds.add(nodeB.id);
        }
      }
    }

    if (newNodes || newEdges.length > 0) {
      setData((oldData) => {
        return {
          nodes: [...nodesRef.current.values()],
          links: [...oldData.links, ...newEdges],
        }
      });
    }
  };

  useEffect(() => {
    //@ts-ignore
    const isDev = process.env.NODE_ENV === "development";

    let cleanup = () => {};

    if (isDev) {
      let mockIdCounter = 0;
      
      const interval = setInterval(() => {
        mockIdCounter++;
        
        const existingIds = Array.from(nodesRef.current.keys());
        const neighbors: number[] = []

        for (let i = 0; i < Math.floor(Math.random() * 100); i++) {
          const randomNeighborId = existingIds.length > 0 
              ? existingIds[Math.floor(Math.random() * existingIds.length)] 
              : null;
          if (randomNeighborId == null) break;

          if (!neighbors.find((v) => v == randomNeighborId))
            neighbors.push(randomNeighborId)
        }

        // 2. Generate Mock Message
        const mockMsg: SSEMessage = {
          id: mockIdCounter,
          title: `Simulated Page ${mockIdCounter}`,
          url: mockIdCounter === 1 ? seed[0] : `http://localhost:3000/page/${mockIdCounter}`,
          errors: Math.random() > 0.9 ? ["Simulated 404"] : null,
          neighbors: neighbors,
          responseTime: 200,
        };

        handleIncomingMessage(mockMsg);

        if (mockIdCounter > 100) clearInterval(interval);

      }, 200);

      cleanup = () => clearInterval(interval);

    } else {
      // @ts-ignore
      const url = new URL("/crawl", document.location);
      url.searchParams.append("seeds", seed);
      const evtSource = new EventSource(url.toString());
      setLoading(true);

      evtSource.addEventListener("close", (_) => {
        evtSource.close();
        setLoading(false);
      });

      evtSource.addEventListener("data", (event) => {
        try {
          const msg = JSON.parse(event.data) as SSEMessage;
          handleIncomingMessage(msg);
        } catch (e) {
          console.error("Failed to parse SSE message", e);
        }
      });

      cleanup = () => evtSource.close();
    }

    return cleanup;
  }, [seed]);

  const contextValue: ContextType = {
    appState, setAppState,
    seed, setSeed,
    loading,
    data,
    getChildren,
    getParent,
  };

  return <Context.Provider value={contextValue}>{children}</Context.Provider>;
};

export const useAppContext = () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("useContext must be used within a ContextProvider");
  }
  return context;
};