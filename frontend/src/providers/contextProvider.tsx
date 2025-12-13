import useCache from "@/hooks/cache";
import { type Data, type Link, type Node } from "@/lib/data";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type ContextType = {
  colorList: [string, string][],
  loading: boolean;
  data: Data;
  appState: { seed: string; depth: number, delay: number, page: "home" | "graph" };
  setAppState: (newSeed: string, newDepth: number, delay: number, page: "home" | "graph") => void;
  getChildren: (nodeId: string) => Set<string> | undefined;
  getParent: (nodeId: string) => string | null;
};

const DEFAULT_COLOR = "#5c33ff"

const defaultContext: ContextType = {
  appState: { seed: "https://go.dev/", depth: 1, delay: 400, page: "home" },
  colorList: [],
  loading: false,
  data: {
    nodes: [],
    links: [],
  },
  setAppState: () => {},
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
  const [appState, _setAppState] = useState<{ seed: string; depth: number, delay: number, page: "home" | "graph" }>(defaultContext.appState);
  const [data, setData] = useState<Data>(defaultContext.data);
  const [colorList, setColorList] = useState<[string, string][]>(defaultContext.colorList);
  const [loading, setLoading] = useState(defaultContext.loading);
  const nodesRef = useRef<Map<number, Node>>(new Map());
  const edgesRef = useRef<Map<string, Link>>(new Map());
  const adjList = useRef<Map<string, Set<string>>>(new Map());

  const filteredData = useMemo(() => {
    const unknownNodeIds = new Set<string>();
    const newNodes = data.nodes.filter(node => {
      if (node.title === "unknown") {
        unknownNodeIds.add(node.id);
        return false;
      }
      return true
    });

    return {
      nodes: newNodes,
      links: data.links.filter(link => {
        return !unknownNodeIds.has(link.source) && !unknownNodeIds.has(link.target);
      }),
    }
  }, [data]);

  const setAppState = (newSeed: string, newDepth: number, newDelay: number, page: "home" | "graph") => {
    _setAppState({ seed: newSeed, depth: newDepth, delay: newDelay, page });

    if (page === "home") {
      // Reset graph data when going back to home
      nodesRef.current = new Map();
      edgesRef.current = new Map();
      adjList.current = new Map();
      setData({ nodes: [], links: [] });
      setColorList([]);
    }
  };

  const getParent = (nodeId: string) => {
    const edge = data.links.find(
      (edge) => edge.source === nodeId || edge.target === nodeId
    );

    if (!edge) return null;

    const parent = edge.source === nodeId ? edge.target : edge.source;

    return parent;
  };

  const getDomain = (url: string) => {
    try {
      const { hostname } = new URL(url);
      const parts = hostname.split(".");
      return parts.length > 2 ? parts.slice(-2).join(".") : hostname;
    } catch (e) {
      return null
    }
    
  }

  const getColorForUrl = useCache((url: string) => {
    let color = "#"
    let domain = getDomain(url)
    if (!domain) {
      domain = "unknown domain"
      color = DEFAULT_COLOR
    }
    else {
      let hash = 0;
      domain.split('').forEach(char => {
        hash = char.charCodeAt(0) + ((hash << 5) - hash)
      })
      for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff
        color += value.toString(16).padStart(2, '0')
      }
    }

    setColorList(oldList => {
      if (!oldList.find(([_, d]) => domain === d)) {
        return [...oldList, [color, domain]]
      }
      else {
        return oldList
      }
    })

    return color;
  })

  const getChildren = (nodeId: string) => {
    return adjList.current.get(nodeId);
  }

  const handleIncomingMessage = (message: SSEMessage) => {
    const { id, neighbors, errors, title, url } = message;

    const root = appState.seed === url;

    const replaceNode = nodesRef.current.has(id)
    const newNode: Node | undefined = {
      id: id.toString(),
      title: title || (errors|| [""])[0],
      url,
      color: getColorForUrl(url),
      group: getDomain(url) ?? "0",
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
          color: DEFAULT_COLOR,
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
    if (appState.page !== "graph") return;

    // @ts-ignore
    const url = new URL("/crawl", document.location);
    url.searchParams.append("seeds", appState.seed);
    url.searchParams.append("depth", appState.depth.toString());
    url.searchParams.append("delay", appState.delay.toString());
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

    return () => evtSource.close();
  }, [appState]);

  const contextValue: ContextType = {
    appState, setAppState,
    colorList,
    loading,
    data: filteredData,
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