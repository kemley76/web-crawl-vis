import { useAppContext } from "@/providers/contextProvider";
import { Button } from "./ui/button";
import { ArrowBigLeft } from "lucide-react";

const GraphNav = () => {
    const appContext = useAppContext();

    const handleBackToHome = () => {
        appContext.setAppState("", 0, 400, "home");
    }

    return (
        <div className='absolute top-0 left-0 m-2 rounded-md bg-neutral-900/70 outline h-auto w-fit flex gap-4 px-2 py-1 items-center justify-between'>
            <Button variant="outline" className="text-white w-fit" onClick={handleBackToHome}><ArrowBigLeft/></Button>
            <div className="w-full h-full flex flex-col p-2">
                <div className="flex justify-between">
                    <h1 className="text-white font-bold mr-2">Seed URL:</h1>
                    <div className='text-primary-foreground text-right'>{appContext.appState.seed.length > 50 ? appContext.appState.seed.substring(0, 50) + "..." : appContext.appState.seed}</div>
                </div>
                <div className="flex justify-between">
                    <h1 className="text-white font-bold">Crawl Depth:</h1>
                    <div className='text-primary-foreground text-right'>{appContext.appState.depth}</div>
                </div>
                <div className="flex justify-between">
                    <h1 className="text-white font-bold">Delay:</h1>
                    <div className='text-primary-foreground text-right'>{Math.round(appContext.appState.delay / 10)/100} s</div>
                </div>
            </div>
        </div>
    )
}

export default GraphNav