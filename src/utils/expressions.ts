// utils/expressions.ts
import type { ExpressionSpecification } from 'maplibre-gl';

export const getColorExpression = (metric: string): ExpressionSpecification => {
    let field: any;
    let colorStops: (string | number)[];

    if (metric === 'RTC_2025') {
        field = ['get', 'RTC_2025'];
        colorStops = [
            0, '#edf8e9',
            0.1, '#bae4b3',
            0.2, '#74c476',
            0.3, '#31a354',
            0.4, '#006d2c'
        ];
    } else if (metric === 'PTC_2025') {
        field = ['get', 'PTC_2025'];
        colorStops = [
            0, '#fff5eb',
            500, '#fd8d3c',
            1500, '#f16913',
            3000, '#d94801',
            5000, '#a63603'
        ];
    } else if (metric === 'PTA_2025') {
        field = ['get', 'PTA_2025'];
        colorStops = [
            0, '#f7fbff',
            300, '#c6dbef',
            800, '#6baed6',
            1200, '#2171b5',
            2000, '#08306b'
        ];
    } else {
        field = ['get', 'PTN_2025'];
        colorStops = [
            0, '#ffffcc',
            500, '#a1dab4',
            1500, '#41b6c4',
            3000, '#2c7fb8',
            5000, '#253494'
        ];
    }

    return ['interpolate', ['linear'], field, ...colorStops] as ExpressionSpecification;
};
