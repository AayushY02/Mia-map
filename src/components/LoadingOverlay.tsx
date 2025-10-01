// components/LoadingOverlay.tsx
import { Card } from '@/components/ui/card';
import { Grid } from 'ldrs/react';

export default function LoadingOverlay() {
    return (
        <Card className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-5 z-50 rounded-2xl bg-white">
            <Grid size="60" speed="1.5" color="black" />
        </Card>
    );
}
