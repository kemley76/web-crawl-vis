import type { FormEvent } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { useAppContext } from "@/providers/contextProvider"

const Home = () => {
    const appContext = useAppContext();
    
    const handleStartCrawl = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const seedUrl = formData.get("seedUrl")
        const crawlDepth = formData.get("depth")

        if (!seedUrl || !crawlDepth) {
            alert("Please fill in all fields");
            return;
        }

        
        if (isNaN(Number(crawlDepth)) || Number(crawlDepth) < 1) {
            alert("Crawl depth must be a positive number");
            return;
        }

        try {
            // make sure it's a valid URL
            new URL(seedUrl.toString());

            appContext.setAppState(seedUrl.toString(), Number(crawlDepth), "graph");
        }
        catch (e) {
            alert("Please enter a valid URL");
        }
    }

    return (
        <div className="w-full h-fit bg-primary rounded-lg p-6 text-white border border-neutral-600">
            <h1 className="text-lg font-bold text-white w-full text-center">Web Crawler</h1>
            <form onSubmit={handleStartCrawl} className="flex flex-col gap-10 h-full justify-between py-2">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <Label className="text-white">Seed Url</Label>
                        <Input type="url" name="seedUrl" className="bg-secondary border-neutral-400" placeholder="google.com"/>
                    </div>
                    <div className="flex flex-col gap-4">
                        <Label className="text-white">Crawl Depth</Label>
                        <Input type="number" name="depth" className="bg-secondary border-neutral-400" placeholder="1"/>
                    </div>
                </div>

                <div className="w-full flex justify-center">
                    <Button type="submit" variant="green" className="w-1/3">Start Crawl</Button>
                </div>
            </form>
        </div>
    )
}

export default Home