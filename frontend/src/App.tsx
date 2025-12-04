import { NetworkDiagram } from "@/components/NetworkDiagram";
import { useAppContext } from "./providers/contextProvider";
 
export default function App() {
  // const [largeData] = useState(() => generateTreeData(500, 10)); 
  const data = useAppContext()
  return (
    <div style={{ width: '100vw', height: '100vh', left: "0", top: "0", background: "grey",
}}>
      <NetworkDiagram data={data.data} width={window.innerWidth} height={window.innerHeight} />
    </div>
  );
}
