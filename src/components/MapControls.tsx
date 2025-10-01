// components/MapControls.tsx
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger
} from "@/components/ui/accordion";
import {
    Layers,
    Landmark,
    MapPin,
    Building,
    Bus,
    School,
    Hospital,
    X,
    Menu,
    BusFront,
    MapPinCheckIcon,
    NotepadTextDashed,
    Mountain,
    MapIcon,
    Circle,
    User2,

} from 'lucide-react';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSetRecoilState } from "recoil";
import { globalVisibleLayersState } from '@/state/activeLayersAtom';
import { LegendRow } from './Legend/LegendGroupTableDialog';

type ChomeMetric = "total" | "aging" | "density" | "total_2040" | "aging_2040";

interface MapControlsProps {
    currentStyle: string;
    onStyleChange: (value: string) => void;
    roadsVisible: boolean;
    toggleRoads: () => void;
    adminVisible: boolean;
    toggleAdmin: () => void;
    // terrainEnabled: boolean;
    // toggleTerrain: () => void;
    fitToBounds: () => void;
    agriLayerVisible: boolean;
    toggleAgri: () => void;
    selectedMetric: string;
    onMetricChange: (val: string) => void;
    styles: Record<string, string>;
    transportVisible: boolean;
    toggleTransport: () => void;
    pbFacilityVisible: boolean;
    togglePbFacility: () => void;
    schoolLayerVisible: boolean;
    toggleSchoolLayer: () => void;
    medicalLayerVisible: boolean;
    toggleMedicalLayer: () => void;
    touristLayerVisible: boolean;
    toggleTouristLayer: () => void;
    roadsideStationLayerVisible: boolean;
    toggleAttractionLayer: () => void;
    attractionLayerVisible: boolean;
    toggleRoadsideStationLayerVisible: () => void;
    busStopsVisible: boolean;
    toggleBusStops: () => void;

    boardingVisible: boolean;
    toggleBoarding: () => void;

    alightingVisible: boolean;
    toggleAlighting: () => void;

    busPickDropLayerVisible: boolean;
    toggleBusPickDropLayerVisible: () => void;
    busPassengerLayerVisible: boolean;
    toggleBusPassengerLayerVisible: () => void;
    sakaeCourseRideLayerVisible: boolean;
    toggleSakaeCourseRideLayerVisible: () => void;
    sakaeCourseDropLayerVisible: boolean;
    toggleSakaeCourseDropLayerVisible: () => void;
    masuoCourseRideLayerVisible: boolean;
    toggleMasuoCourseRideLayerVisible: () => void;
    masuoCourseDropLayerVisible: boolean;
    toggleMasuoCourseDropLayerVisible: () => void;

    shonanCourseRideLayerVisible: boolean;
    toggleShonanCourseRideLayerVisible: () => void;
    shonanCourseDropLayerVisible: boolean;
    toggleShonanCourseDropLayerVisible: () => void;
    captureMapScreenshot: () => void

    newbusLayerVisible: boolean;
    toggleNewBusLayerVisible: () => void;

    newKashiwakuruRideLayerVisible: boolean;
    toggleNewKashiwakuruRideLayerVisible: () => void;

    newKashiwakuruDropLayerVisible: boolean;
    toggleNewKashiwakuruDropLayerVisible: () => void;

    kashiwaPublicFacilityVisible: boolean;
    toggleKashiwaPublicFacilityVisible: (category: string) => void;
    selectedCategories: string[];
    setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>>;

    toggleKashiwaShopsVisible: (category: string) => void;
    selectedShopCategories: string[];

    shonanRouteVisible: boolean;
    toggleShonanRouteVisible: () => void;

    masuoRouteVisible: boolean;
    toggleMasuoRouteVisible: () => void;

    sakaiRouteVisible: boolean;
    toggleSakaiRouteVisible: () => void;

    kashiwakuruOdVisible: boolean;
    toggleKashiwakuruOdVisible: () => void;
    kashiwakuruOdHour: number;
    onKashiwakuruOdHourChange: (h: number) => void;
    onClearOdEndpointHighlight: () => void;
    downloadPpt: () => void;

    kashiwakuruOdFilterOn: boolean;                   // NEW
    onToggleKashiwakuruOdFilter: (on: boolean) => void;

    chomeTotalVisible: boolean;
    toggleChomeTotalVisible: () => void;
    chomeAgingVisible: boolean;
    toggleChomeAgingVisible: () => void;
    chomeDensityVisible: boolean;
    toggleChomeDensityVisible: () => void;

    onChomeStyleChange: (
        metric: ChomeMetric,
        opts: {
            palette?: "Blues" | "Greens" | "Oranges" | "Purples";
            method?: "quantile" | "equal" | "jenks" | "manual"; // ⬅ added manual
            bins?: number;
            breaks?: number[]; // ⬅ new
            opacity?: number;
        }
    ) => void;

    onChomeRangeChange: (
        metric: ChomeMetric,
        min: number | null,
        max: number | null
    ) => void;

    onChomeLabelsChange: (
        visible: boolean,
        mode: "name" | "metric",
        metric: ChomeMetric,
    ) => void;

    chomeTotal2040Visible: boolean;
    toggleChomeTotal2040Visible: () => void;
    chomeAging2040Visible: boolean;
    toggleChomeAging2040Visible: () => void;

    meshVisible: boolean;
    toggleMesh: () => void;

    terrainEnabled: boolean;
    toggleTerrain: () => void;

    passengerLabelsVisible: boolean;
    togglePassengerLabelsVisible: () => void;

    odGridVisible: boolean;
    onToggleOdGrid: () => void;
    odGridFilterOn: boolean;
    onToggleOdGridFilter: (on: boolean) => void;
    odGridHour: number;
    onOdGridHourChange: (h: number) => void;
    odGridShowGrid: boolean;
    onToggleOdGridShowGrid: (on: boolean) => void;
    odGridUndirected: boolean;
    onToggleOdGridUndirected: (on: boolean) => void;
    odGridMinVol: number;
    onOdGridMinVolChange: (n: number) => void;
    odGridFocusMode: "all" | "out" | "in";
    onOdGridFocusModeChange: (m: "all" | "out" | "in") => void;
    onOdGridClearFocus: () => void;
    odGridShowStops: boolean;
    onToggleOdGridShowStops: (on: boolean) => void;

    // To disable 発/着/両方 when a single OD line is isolated
    odGridSingleOD?: boolean;

    busCoverageVisible: boolean;
    toggleBusCoverage: () => void;

    busStopPointsVisible: boolean;        // NEW
    toggleBusStopPoints: () => void;

    cityMaskVisible: boolean;
    toggleCityMask: () => void;

    waniOutboundRideLayerVisible: boolean;
    toggleWaniOutboundRideLayerVisible: () => void;
    waniOutboundDropLayerVisible: boolean;
    toggleWaniOutboundDropLayerVisible: () => void;
    waniReturnRideLayerVisible: boolean;
    toggleWaniReturnRideLayerVisible: () => void;
    waniReturnDropLayerVisible: boolean;
    toggleWaniReturnDropLayerVisible: () => void;
    waniRouteVisible: boolean;
    toggleWaniRouteVisible: () => void;

    busRoutesCommonVisible: boolean;
    toggleBusRoutesCommonVisible: () => void;
    busRoutesOtherVisible: boolean;
    toggleBusRoutesOtherVisible: () => void;

    railLinesVisible: boolean;
    toggleRailLinesVisible: () => void;
    railStationsVisible: boolean;
    toggleRailStationsVisible: () => void;
    stationCoverageVisible: boolean;
    toggleStationCoverageVisible: () => void;

    facilityLegendRows: LegendRow[];
    shopLegendRows: LegendRow[];

    facilityLabelsVisible: boolean;                  // <-- ADD
    toggleFacilityLabelsVisible: () => void;
    shopsLabelsVisible: boolean;
    toggleShopsLabelsVisible: () => void;

    busRoutesHighlightedVisible: boolean;
    toggleBusRoutesHighlightedVisible: () => void;

    stationPassengersVisible: boolean;
    toggleStationPassengersVisible: () => void;

    subdivisionsVisible: boolean;
    toggleSubdivisionsVisible: () => void;

    elevationGridVisible: boolean;
    toggleElevationGrid: () => void;

    chibaRoadsVisible: boolean;
    toggleChibaRoads: () => void;

    busRoutesFrequencyVisible: boolean;
    toggleBusRoutesFrequencyVisible: () => void;
    busRoutesFrequencyDay: "weekday" | "saturday" | "holiday";
    onBusRoutesFrequencyDayChange: (d: "weekday" | "saturday" | "holiday") => void;

    busRoutesFrequencyStyle: {
        thresholds: number[];
        colors: string[];
        widthRange: { min: number; max: number };
    };
    onBusRoutesFrequencyStyleChange: (cfg: {
        thresholds: number[];
        colors: string[];
        widthRange: { min: number; max: number };
    }) => void;



}

export default function MapControls({
    currentStyle,
    onStyleChange,
    adminVisible,
    toggleAdmin,
    fitToBounds,
    selectedMetric,
    onMetricChange,
    styles,
    transportVisible,
    toggleTransport,
    pbFacilityVisible,
    togglePbFacility,
    schoolLayerVisible,
    toggleSchoolLayer,
    medicalLayerVisible,
    toggleMedicalLayer,
    roadsideStationLayerVisible,
    toggleRoadsideStationLayerVisible,
    toggleAttractionLayer,
    attractionLayerVisible,
    downloadPpt,
    captureMapScreenshot,
    meshVisible,
    toggleMesh,
    terrainEnabled,
    toggleTerrain,

    toggleKashiwaPublicFacilityVisible,
    selectedCategories,

    busCoverageVisible,
    toggleBusCoverage,

    busStopPointsVisible,
    toggleBusStopPoints,

    cityMaskVisible,
    toggleCityMask,

    railLinesVisible,
    toggleRailLinesVisible,
    railStationsVisible,
    toggleRailStationsVisible,
    stationCoverageVisible,
    toggleStationCoverageVisible,

    subdivisionsVisible,
    toggleSubdivisionsVisible,


    busRoutesFrequencyStyle,


}: MapControlsProps) {

    const [isOpen, setIsOpen] = useState(false);
    const setGlobalVisibleLayers = useSetRecoilState(globalVisibleLayersState);

    const [, setFreqThresholdsText] = useState(
        busRoutesFrequencyStyle.thresholds.join(",")
    );
    useEffect(() => {
        setFreqThresholdsText(busRoutesFrequencyStyle.thresholds.join(","));
    }, [busRoutesFrequencyStyle.thresholds]);



    const metricLabels: Record<string, string> = {
        PTN_2025: '総人口（2025年）',
        PTC_2025: '65歳以上の人口（2025年）',
        PTA_2025: '0〜14歳の人口（2025年）',
        RTC_2025: '高齢者比率（65歳以上／総人口）',
    };

    function handleLayerToggle(
        layerName: string,
        layerCurrentState: boolean,
        toggleFunction: () => void,
    ) {
        setGlobalVisibleLayers((prev) => {
            if (!layerCurrentState) {
                // Hidden → visible: add to array
                if (!prev.includes(layerName)) {
                    return [...prev, layerName];
                }
                return prev;
            } else {
                // Visible → hidden: remove from array
                return prev.filter((name) => name !== layerName);
            }
        });

        toggleFunction();
    }

    return (
        <div data-map-controls className="absolute right-3 top-3 z-10 max-h-screen w-fit flex flex-col items-end">
            {/* Toggle Button */}
            <Button
                className="px-4 py-2 bg-white/50 backdrop-blur-2xl hover:bg-[#f2f2f2] cursor-pointer text-black rounded-full shadow-md text-sm mb-2 flex items-center gap-2"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="map-controls"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.1 }}
                        className="overflow-y-auto px-4 py-4 flex flex-col space-y-3 bg-white/50 backdrop-blur-2xl rounded-2xl shadow-2xl w-72 sm:w-80 max-h-[75vh]"
                    >
                        <Select value={currentStyle} onValueChange={onStyleChange}>
                            <SelectTrigger className="w-full px-4 py-2 text-sm bg-white rounded-xl text-black shadow border border-gray-200">
                                <SelectValue placeholder="地図スタイルを選択" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(styles).map(([label, url]) => (
                                    <SelectItem key={url} value={url}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button className="flex items-center gap-2 bg-white rounded-2xl text-black hover:bg-[#f2f2f2] cursor-pointer" onClick={captureMapScreenshot}>
                            <MapPinCheckIcon />
                            画像をエクスポート
                        </Button>
                        <Button className="flex items-center gap-2 bg-white rounded-2xl text-black hover:bg-[#f2f2f2] cursor-pointer" onClick={downloadPpt}>
                            <NotepadTextDashed />
                            パワーポイントにエクスポート
                        </Button>
                        <Button className="flex items-center gap-2 bg-white rounded-2xl text-black hover:bg-[#f2f2f2] cursor-pointer" onClick={fitToBounds}>
                            <MapPinCheckIcon />
                            いなべ市にフォーカス
                        </Button>

                        <Button
                            onClick={() => handleLayerToggle('メッシュ', meshVisible, toggleMesh)}
                            className="flex items-center gap-2 bg-white rounded-2xl text-black hover:bg-[#f2f2f2] cursor-pointer"
                        >
                            <Layers size={16} />
                            {meshVisible ? 'メッシュを非表示' : 'メッシュを表示'}
                        </Button>
                        <Button
                            onClick={() => toggleCityMask()}
                            className="flex items-center gap-2 bg-white rounded-2xl text-black hover:bg-[#f2f2f2] cursor-pointer"
                        >
                            <MapIcon size={16} />
                            {cityMaskVisible ? 'いなべ市マスクを非表示' : 'いなべ市マスクを表示'}
                        </Button>

                        <Button
                            onClick={toggleTerrain}
                            className="flex items-center gap-2 bg-white rounded-2xl text-black hover:bg-[#f2f2f2] cursor-pointer"
                            aria-pressed={terrainEnabled}
                        >
                            <Mountain size={16} />
                            {terrainEnabled ? '3D地形を無効化' : '3D地形を有効化'}
                        </Button>

                        <Button onClick={() => handleLayerToggle('行政界', adminVisible, toggleAdmin)} className="flex items-center gap-2 bg-white rounded-2xl text-black hover:bg-[#f2f2f2] cursor-pointer"><Layers />{adminVisible ? '行政界を非表示' : '行政界を表示'}</Button>

                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="transportation">
                                <AccordionTrigger className="text-black bg-gray-50 text-sm hover:bg-gray-100 rounded-xl px-4 py-2 hover:no-underline cursor-pointer flex items-center ">
                                    <BusFront size={16} />交通レイヤーの操作
                                </AccordionTrigger>
                                <AccordionContent className="flex flex-col space-y-2 bg-white rounded-xl mt-2 px-4 py-2">
                                    {[
                                        { label: '交通レイヤー', checked: transportVisible, onChange: () => handleLayerToggle('交通レイヤー', transportVisible, toggleTransport), icon: <Bus size={16} /> },

                                        {
                                            label: 'バス停（点）',
                                            checked: busStopPointsVisible,
                                            onChange: () => handleLayerToggle('バス停（点）', busStopPointsVisible, toggleBusStopPoints),
                                            icon: <MapPinCheckIcon size={16} />,
                                        },
                                        { label: 'バス停 300mカバレッジ（合成）', checked: busCoverageVisible, onChange: () => handleLayerToggle('バス停 300mカバレッジ', busCoverageVisible, toggleBusCoverage), icon: <Bus size={16} /> },
                                    ].map(({ label, checked, onChange, icon }) => (
                                        <div key={label} className="flex items-center justify-between">
                                            <Label className="text-sm text-black flex items-center gap-2">{icon} {label}</Label>
                                            <Switch checked={checked} onCheckedChange={onChange} />
                                        </div>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        <Button onClick={() => handleLayerToggle('公共施設', pbFacilityVisible, togglePbFacility)} className="flex items-center gap-2 bg-white rounded-2xl text-black hover:bg-[#f2f2f2] cursor-pointer">
                            <Building size={16} />
                            {pbFacilityVisible ? '公共施設を非表示' : '公共施設を表示'}
                        </Button>
                        <Button onClick={() => handleLayerToggle('学校', schoolLayerVisible, toggleSchoolLayer)} className="flex items-center gap-2 bg-white rounded-2xl text-black hover:bg-[#f2f2f2] cursor-pointer">
                            <School size={16} />
                            {schoolLayerVisible ? '学校を隠す' : '学校を表示'}
                        </Button>
                        <Button onClick={() => handleLayerToggle('医療機関', medicalLayerVisible, toggleMedicalLayer)} className="flex items-center gap-2 bg-white rounded-2xl text-black hover:bg-[#f2f2f2] cursor-pointer">
                            <Hospital size={16} />
                            {medicalLayerVisible ? '医療機関を隠す' : '医療機関を表示'}
                        </Button>

                        <Button onClick={() => handleLayerToggle('道の駅', roadsideStationLayerVisible, toggleRoadsideStationLayerVisible)} className="flex items-center gap-2 bg-white rounded-2xl text-black hover:bg-[#f2f2f2] cursor-pointer">
                            <MapPin size={16} />
                            {roadsideStationLayerVisible ? '道の駅を非表示' : '道の駅を表示'}
                        </Button>
                        <Button onClick={() => handleLayerToggle('集客施設レイヤー', attractionLayerVisible, toggleAttractionLayer)} className="flex items-center gap-2 bg-white rounded-2xl text-black hover:bg-[#f2f2f2] cursor-pointer">

                            {attractionLayerVisible ? '集客施設レイヤーを非表示' : '集客施設レイヤーを表示'}
                        </Button>

                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="kashiwa-chome">
                                <AccordionTrigger className="text-black bg-gray-50 text-sm hover:bg-gray-100 rounded-xl px-4 py-2 hover:no-underline cursor-pointer flex items-center ">
                                    行政区域
                                </AccordionTrigger>
                                <AccordionContent className="flex flex-col space-y-2 bg-white rounded-xl mt-2 px-4 py-2">
                                    {[
                                        { label: '地区区分（17）', checked: subdivisionsVisible, onChange: () => toggleSubdivisionsVisible() },
                                    ].map(({ label, checked, onChange }) => (
                                        <div key={label} className="flex items-center justify-between">
                                            <Label className="text-sm text-black flex items-center gap-2">{label}</Label>
                                            <Switch checked={checked} onCheckedChange={onChange} />
                                        </div>
                                    ))}


                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="railway">
                                <AccordionTrigger className="text-black bg-gray-50 text-sm hover:bg-gray-100 rounded-xl px-4 py-2 hover:no-underline cursor-pointer flex items-center ">
                                    {/* Reuse an icon you already import, e.g. Landmark */}
                                    <Landmark size={16} /> 鉄道路線・駅
                                </AccordionTrigger>
                                <AccordionContent className="flex flex-col space-y-2 bg-white rounded-xl mt-2 px-4 py-2">
                                    {[
                                        {
                                            label: "鉄道（ライン）",
                                            checked: railLinesVisible,
                                            onChange: () => handleLayerToggle("鉄道（ライン）", railLinesVisible, toggleRailLinesVisible),
                                            icon: <Landmark size={16} />,
                                        },
                                        {
                                            label: "鉄道駅（点）",
                                            checked: railStationsVisible,
                                            onChange: () => handleLayerToggle("鉄道駅（点）", railStationsVisible, toggleRailStationsVisible),
                                            icon: <MapPin size={16} />,
                                        },
                                        {
                                            label: "駅 800m カバレッジ",
                                            checked: stationCoverageVisible,
                                            onChange: () =>
                                                handleLayerToggle("駅カバレッジ（800m/1km）", stationCoverageVisible, toggleStationCoverageVisible),
                                            icon: <Landmark size={16} />,
                                        },
                                    ].map(({ label, checked, onChange, icon }) => (
                                        <div key={label} className="flex items-center justify-between">
                                            <Label className="text-sm text-black flex items-center gap-2">{icon} {label}</Label>
                                            <Switch checked={checked} onCheckedChange={onChange} />
                                        </div>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="transportation">
                                <AccordionTrigger className="text-black bg-gray-50 text-sm hover:bg-gray-100 rounded-xl px-4 py-2 hover:no-underline cursor-pointer flex items-center justify-between">
                                    <div className='flex space-x-4 w-full'>
                                        <User2 size={16} />
                                        <div>三重県の公共施設</div>
                                    </div>
                                    {/* <button
                                        type="button"
                                        title="凡例グループ表を開く"
                                        className="p-1 rounded-lg hover:bg-white/60"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation(); // do not toggle accordion
                                            setFacilityDialogOpen(v => !v);
                                        }}
                                    >
                                        <TableIcon className="h-4 w-4 text-muted-foreground" />
                                    </button> */}


                                </AccordionTrigger>
                                <AccordionContent className="flex flex-col space-y-2 bg-white rounded-xl mt-2 px-4 py-2">
                                    {[
                          

                                        { label: '全て', category: '', color: '#808080' },
                                        { label: '建物', category: '3', color: '#FF5733' },
                                        { label: 'その他', category: '9', color: '#33FF57' },
                                        { label: '国の機関', category: '11', color: '#DDD92A' },
                                        { label: '地方公共団体', category: '12', color: '#313715' },
                                        { label: '厚生機関', category: '13', color: '#91E5F6' },
                                        { label: '警察機関', category: '14', color: '#FF1053' },
                                        { label: '消防署', category: '15', color: '#725AC1' },
                                        { label: '学校', category: '16', color: '#A1EF8B' },
                                        { label: '病院', category: '17', color: '#5D737E' },
                                        { label: '郵便局', category: '18', color: '#FF9000' },
                                        { label: '福祉施設', category: '19', color: '#13070C' },

                                    ].map(({ label, category, color }) => (
                                        <div key={label} className="flex items-center justify-between">
                                            <Label className="text-sm text-black flex items-center gap-2">
                                                <Circle className='text-white' fill={color} size={20} />
                                                {label}
                                            </Label>
                                            <Switch
                                                checked={selectedCategories.includes(category)}
                                                onCheckedChange={() => handleLayerToggle(category === '' ? '柏市の公共施設-全て' : category, selectedCategories.includes(category), () => toggleKashiwaPublicFacilityVisible(category))}
                                            />
                                        </div>
                                    ))}
                                    {/* <div className="flex items-center justify-between">
                                        <Label className="text-sm text-black flex items-center gap-2">
                                            施設番号ラベル（NO）
                                        </Label>
                                        <Switch
                                            checked={facilityLabelsVisible}
                                            onCheckedChange={toggleFacilityLabelsVisible}
                                        />
                                    </div> */}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        <Select value={selectedMetric} onValueChange={(value) => {
                            const label = metricLabels[value];

                            setGlobalVisibleLayers([label]);
                            onMetricChange(value);
                        }}>
                            <SelectTrigger className="w-full px-4 py-2 text-sm bg-white rounded-xl text-black shadow border border-gray-200">
                                <SelectValue placeholder="表示する人口指標" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PTN_2025">総人口（2025年）</SelectItem>
                                <SelectItem value="PTC_2025">65歳以上の人口（2025年）</SelectItem>
                                <SelectItem value="PTA_2025">0〜14歳の人口（2025年）</SelectItem>
                                <SelectItem value="RTC_2025">高齢者比率（65歳以上／総人口）（2025年）</SelectItem>
                            </SelectContent>
                        </Select>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
