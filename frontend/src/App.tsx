import { NetworkDiagram } from "@/components/NetworkDiagram";
import { useAppContext } from "./providers/contextProvider";
import { AlertDialog, AlertDialogContent } from "./components/ui/alert-dialog";
import Home from "./components/Home";
 
export default function App() {
  const appContext = useAppContext()
  return (
    <>
      <div style={{ width: '100vw', height: '100vh', left: "0", top: "0"}}>
        <NetworkDiagram data={appContext.data} width={window.innerWidth} height={window.innerHeight} />
      </div>
      <AlertDialog open={appContext.appState.page === "home"}>
        <AlertDialogContent className="w-3/4 h-fit p-0 border-0">
          <Home />
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
