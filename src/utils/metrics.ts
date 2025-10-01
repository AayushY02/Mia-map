// utils/metrics.ts
export const getGradientLegendForMetric = (metric: string) => {
    if (metric === 'RTC_2025') {
        return {
            title: '高齢者比率（65歳以上／総人口）',
            gradient: ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
            labels: ['<10%', '20%', '30%', '40%', '>40%']
        };
    } else if (metric === 'PTC_2025') {
        return {
            title: '65歳以上の人口（2025年）',
            gradient: ['#fff5eb', '#fd8d3c', '#f16913', '#d94801', '#a63603'],
            labels: ['<500', '1500', '3000', '5000', '>5000']
        };
    } else if (metric === 'PTA_2025') {
        return {
            title: '0〜14歳の人口（2025年）',
            gradient: ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b'],
            labels: ['<300', '800', '1200', '2000', '>2000']
        };
    } else {
        return {
            title: '総人口（2025年）',
            gradient: ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494'],
            labels: ['<500', '1500', '3000', '5000', '>5000']
        };
    }
};
