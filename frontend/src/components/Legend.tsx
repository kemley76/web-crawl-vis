import { useAppContext } from '@/providers/contextProvider';
import { Spinner } from './ui/spinner';

type LegendProps = {
    legendItems: {
        label: string;
        color: string;
        hollow?: boolean;
    }[],
    hoveredEdgesCount?: number
}

const Legend = ({legendItems, hoveredEdgesCount}: LegendProps) => {
    const appContext = useAppContext();
    return (
        <div className='absolute top-0 right-0 m-2 rounded-md p-2 gap-1 justify-between items-center bg-neutral-900/70 outline h-auto w-[12%] flex flex-col transition-all duration-500'>
            <div className='flex justify-between items-center w-full'>
                <div className='text-primary-foreground font-bold mr-2'>Total Nodes:</div>
                <div className='text-primary-foreground'>{appContext.data.nodes.length}</div>
            </div>
            <div className='flex justify-between items-center w-full'>
                <div className='text-primary-foreground font-bold mr-2'>Total Edges:</div>
                <div className='text-primary-foreground'>{appContext.data.links.length}</div>
            </div>
            {
                !hoveredEdgesCount ? <div className='h-0'></div> : (<div className='flex justify-between items-center w-full'>
                    <div className='text-primary-foreground font-bold mr-2'>Hovered Edges:</div>
                    <div className='text-primary-foreground'>{hoveredEdgesCount}</div>
                </div>)
            }
            <div className='grid grid-cols-[20%_80%] w-full gap-1'>
                <h2 className='font-bold text-white w-full mb-1'>Legend</h2>
                <div className='w-full flex justify-end text-white pr-2'>{appContext.loading && <Spinner />}</div>
                
                {legendItems.map(item => (
                    <>
                        {/* circle */}
                        <div className={`w-5 h-5 rounded-full ${item.hollow ? 'border-2' : ''}`} style={{ 
                            backgroundColor: item.hollow ? "transparent" : item.color,
                            borderColor: item.color
                        }}></div>
                        <div className='text-primary-foreground'>{item.label}</div>
                    </>
                ))}
                
            </div>
        </div>
    )
}

export default Legend