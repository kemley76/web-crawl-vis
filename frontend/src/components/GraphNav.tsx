import { useAppContext } from "@/providers/contextProvider";
import { Button } from "./ui/button";
import { ArrowBigLeft } from "lucide-react";

const GraphNav = () => {
    const appContext = useAppContext();

    const handleBackToHome = () => {
        appContext.setAppState("", 0, "home");
    }

    return (
        <div className='absolute top-0 left-0 m-2 rounded-md p-2 gap-1 justify-between items-center bg-gray-950/20 outline h-auto w-auto grid grid-cols-[20%_80%]'>
            <Button variant="ghost" onClick={handleBackToHome}><ArrowBigLeft className="text-white"/> Back to Home</Button>
            <div className='text-primary-foreground'></div>
            <h1 className="text-white font-bold">Seed URL:</h1>
            <div className='text-primary-foreground'>{appContext.appState.seed}</div>
            <h1 className="text-white font-bold">Crawl Depth:</h1>
            <div className='text-primary-foreground'>{appContext.appState.depth}</div>
        </div>
    )
}

export default GraphNav