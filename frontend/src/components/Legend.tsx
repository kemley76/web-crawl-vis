import { useAppContext } from '@/providers/contextProvider';
import { Spinner } from './ui/spinner';

type LegendProps = {
    legendItems: {
        label: string;
        color: string;
        hollow?: boolean;
    }[]
}

const Legend = ({legendItems}: LegendProps) => {
    const appContext = useAppContext();
    return (
        <div className='absolute top-0 right-0 m-2 rounded-md p-2 gap-1 justify-between items-center bg-neutral-900/50 outline h-auto w-[12%] grid grid-cols-[20%_80%]'>
            <h2 className='font-bold text-white w-full'>Legend</h2>
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
    )
}

export default Legend