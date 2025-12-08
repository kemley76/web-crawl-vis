import { type Data, type Link, type Node } from "@/lib/data";
import { createContext, useContext, useEffect, useRef, useState } from "react";

type ContextType = {
  seeds: string[];
  data: Data;
  addSeed: (newSeed: string) => void;
  removeSeed: (seedToRemove: string) => void;
  getChildren: (nodeId: string) => Set<string> | undefined;
  getParent: (nodeId: string) => string | null;
};

const defaultContext: ContextType = {
  seeds: ["https://go.dev/"],
  data: {
    nodes: [],
    links: [],
  },
  addSeed: () => {},
  removeSeed: () => {},
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
  const [seeds, setSeeds] = useState<string[]>(defaultContext.seeds);
  const [data, setData] = useState<Data>(defaultContext.data);
  const nodesRef = useRef<Map<number, Node>>(new Map());
  const edgesRef = useRef<Map<string, Link>>(new Map());
  const adjList = useRef<Map<string, Set<string>>>(new Map());

  const addSeed = (newSeed: string) => {
    setSeeds((oldSeeds) => {
      const newSeeds = oldSeeds.filter((seed) => seed != newSeed);
      newSeeds.push(newSeed);
      return newSeeds;
    });
  };

  const removeSeed = (seedToRemove: string) => {
    setSeeds((oldSeeds) => {
      const newSeeds = oldSeeds.filter((seed) => seed != seedToRemove);
      return newSeeds;
    });
  };

  const getParent = (nodeId: string) => {
    const edge = data.links.find(
      (edge) => edge.source === nodeId || edge.target === nodeId
    );

    if (!edge) return null;

    const parent = edge.source === nodeId ? edge.target : edge.source;

    return parent;
  };

  const getChildren = (nodeId: string) => {
    return adjList.current.get(nodeId);
  }

  const handleIncomingMessage = (message: SSEMessage) => {
    const { id, neighbors, errors, title, url } = message;

    const root = seeds.some(val => val === url);

    console.log(root)

    const replaceNode = nodesRef.current.has(id)
    const newNode: Node | undefined = {
      id: id.toString(),
      title,
      url,
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
      console.log("Starting DEV MODE simulation...");
      
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
          url: mockIdCounter === 1 ? seeds[0] : `http://localhost:3000/page/${mockIdCounter}`,
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
      url.searchParams.append("seeds", seeds.join(","));
      const evtSource = new EventSource(url.toString());

      evtSource.addEventListener("close", (_) => {
        evtSource.close();
        console.log("Done crawling!");
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
  }, [seeds]);

  const contextValue: ContextType = {
    seeds,
    data,
    addSeed,
    removeSeed,
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