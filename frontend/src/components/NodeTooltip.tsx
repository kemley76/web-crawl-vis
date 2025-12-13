import type { Node } from "@/lib/data";

type NodeTooltipProps = {
    data: Node & { degree: number };
};

const NodeTooltip = ({ data }: NodeTooltipProps) => {

    return (
        <div className='absolute top-0 w-full flex gap-4 items-center justify-center'>
            <div className="max-w-1/2 h-auto m-2 px-2 py-1 flex flex-col outline p-2 rounded-md bg-neutral-900/70">
                <div className="flex justify-between gap-2">
                    <h1 className="text-white font-bold">Title:</h1>
                    <div className='text-primary-foreground text-right'>{data.title}</div>
                </div>
                <div className="flex justify-between gap-2">
                    <h1 className="text-white font-bold">URL:</h1>
                    <div className='text-primary-foreground text-right'>{data.url}</div>
                </div>
                 <div className="flex justify-between gap-2">
                    <h1 className="text-white font-bold"># of Connections:</h1>
                    <div className='text-primary-foreground text-right'>{data.degree}</div>
                </div>
            </div>
        </div>
    )
}

export default NodeTooltip