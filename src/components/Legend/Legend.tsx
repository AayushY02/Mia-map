// components/Legend.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getGradientLegendForMetric } from '@/utils/metrics';

interface LegendProps {
    selectedMetric: string;
}




export default function Legend({ selectedMetric }: LegendProps) {
    const legend = getGradientLegendForMetric(selectedMetric);


    return (
        <Card className="absolute bottom-6 right-3 z-10 bg-white/50 backdrop-blur-2xl p-3 rounded-2xl shadow-xl text-xs w-64">
            <div className='space-y-2'>
                <CardHeader>
                    <CardTitle className="font-semibold text-center">{legend.title}</CardTitle>
                </CardHeader>
                <CardContent className='p-0 space-y-1'>
                    <div className="relative h-4 w-full rounded overflow-hidden"
                        style={{ background: `linear-gradient(to right, ${legend.gradient.join(',')})` }} />
                    <div className="flex justify-between text-[10px] text-gray-700">
                        {legend.labels.map((label, idx) => <span key={idx}>{label}</span>)}
                    </div>
                </CardContent>
            </div>
        </Card>
       
    );
}
