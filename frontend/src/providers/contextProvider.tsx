import { type Data, type Link, type Node } from "@/lib/data";
import { createContext, useContext, useEffect, useRef, useState } from "react";

type ContextType = {
    seeds: string[],
    data: Data,
    addSeed: (newSeed: string) => void,
    removeSeed: (seedToRemove: string) => void,
}

const defaultContext: ContextType = {
    seeds: ["https://www.nvidia.com/en-us/"],
    data: {
        nodes: [],
        links: [],
    },
    addSeed: () => {},
    removeSeed: () => {},
}

const Context = createContext<ContextType>(defaultContext);

type SSEMessage = {
    errors: string[] | null,
    id: number,
    neighbors: number[],
    responseTime: number,
    title: string,
    url: string,
}

export const ContextProvider = ({ children }: { children: React.ReactNode }) => {
    const [seeds, setSeeds] = useState<string[]>(defaultContext.seeds);
    const [data, setData] = useState<Data>(defaultContext.data);
    const nodesRef = useRef<Map<number, Node>>(new Map());
    const edgesRef = useRef<Map<string, Link>>(new Map());

    const addSeed = (newSeed: string) => {
        setSeeds(oldSeeds => {
            const newSeeds = oldSeeds.filter(seed => seed != newSeed);

            newSeeds.push(newSeed);

            return newSeeds;
        });
    };

    const removeSeed = (seedToRemove: string) => {
        setSeeds(oldSeeds => {
            const newSeeds = oldSeeds.filter(seed => seed != seedToRemove);

            return newSeeds;
        });
    };

    useEffect(() => {
        console.log("SEEEEEEED")
        // @ts-ignore
        const url = new URL("/crawl", document.location);
        url.searchParams.append("seeds", seeds.join(","));
        const evtSource = new EventSource(url.toString());

        evtSource.addEventListener("close", (_) => {
            evtSource.close();
            console.log("Done crawling!");
        });
        evtSource.addEventListener("data", (event) => {
            const {
                id,
                neighbors,
                errors,
                title,
                url
            } = JSON.parse(event.data) as SSEMessage;
            if (errors) return;
            
            const newNode: Node | undefined = !nodesRef.current.has(id) ? { id: id.toString(), title, url, group: "1" } : undefined;
            if (newNode) {
                nodesRef.current.set(id, newNode);
            }

            const newEdges: Link[] = []
            console.log(id, neighbors, JSON.parse(event.data))   
            for (const adjNode of neighbors) {
                if (!nodesRef.current.has(adjNode)) continue;

                const source = Math.min(adjNode, id).toString();
                const target = Math.max(adjNode, id).toString();
                const edge = `${source}-${target}`;

                if (!edgesRef.current.has(edge)) {
                    const newEdge: Link = { source, target, value: 1 } 
                    edgesRef.current.set(edge, newEdge);
                    newEdges.push(newEdge);
                }
            }

            setData(oldData => {
                return {
                    nodes: newNode ? [...oldData.nodes, newNode] : [...oldData.nodes],
                    links: [...oldData.links, ...newEdges]
                }
            })
            // const newElement = document.createElement("li");
            // const eventList = document.getElementById("event-list");

            // const json = JSON.parse(event.data);
            // if (!json.errors || json.errors.length === 0) {
            //     newElement.innerHTML = `<li>${json.title}
            //         <ul>
            //             <li>ID: ${json.id}</li>
            //             <li>URL: <a href=${json.url}>${json.url}</a></li>
            //             <li>Neighbors: ${json.neighbors}</li>
            //         <ul>
            //     </li>`;
            // } else {
            //     newElement.innerHTML = `<li>Error
            //         <ul>
            //             <li>URL: <a href=${json.url}>${json.url}</a></li>
            //             <li>Errors: ${json.errors}</li>
            //         <ul>
            //     </li>`;
            //     newElement.style.color = "red";
            // }
            // eventList.appendChild(newElement);
        });
    }, [seeds])

    const contextValue: ContextType = {
        seeds,
        data,
        addSeed,
        removeSeed,
    };

    return (
    <Context.Provider value={contextValue}>
        {children}
    </Context.Provider>
    );
};

export const useAppContext = ()  => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("useContext must be used within a ContextProvider");
  }
  return context;
};