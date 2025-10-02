// MapView.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { Map } from 'maplibre-gl';
import { Protocol } from 'pmtiles'
import 'maplibre-gl/dist/maplibre-gl.css';
import './App.css';
import { Card } from './components/ui/card';
import 'ldrs/react/Grid.css';
import { MAP_STYLES } from './constants/mapStyles';
import { JAPAN_BOUNDS, INABE_BOUNDS, MIE_BOUNDS } from './constants/bounds';
import { getColorExpression } from './utils/expressions';
import { addMeshLayers } from './layers/meshLayers';
import { toggleAdminBoundaries } from './layers/adminBoundaries';
import { toggleAgriLayer } from './layers/agriLayer';
import LoadingOverlay from './components/LoadingOverlay';
import MapControls from './components/MapControls';
import { useRecoilState, useRecoilValue } from 'recoil';
import { AnimatePresence, motion } from 'framer-motion';
import { toggleAlightingLayer, toggleBoardingLayer, toggleBusStops, toggleTransportationLayer } from './layers/transportationLayer';
import { togglePublicFacilityLayer } from './layers/publicFacilityLayer';
import { toggleSchoolLayer } from './layers/schoolLandLayer';
import { toggleMedicalLayer } from './layers/medicalInstituteLayer';
import { toggleTouristLayer } from './layers/touristSpot';
import { toggleRoadsideStationLayer } from './layers/roadsideStationLayer';
import { toggleAttractionLayer } from './layers/attractionLayer';
import { toggleBusPickDropLayer } from './layers/busPickDropLayer';
import { setAllPassengerLabelsVisible, toggleBusPassengerLayer, toggleMasuoCourseDropLayer, toggleMasuoCourseRideLayer, toggleSakaeCourseDropLayer, toggleSakaeCourseRideLayer, toggleShonanCourseDropLayer, toggleShonanCourseRideLayer, toggleWaniCityHallRouteLayer, toggleWaniOutboundDropLayer, toggleWaniOutboundRideLayer, toggleWaniReturnDropLayer, toggleWaniReturnRideLayer } from './layers/busPassengerLayer';
import { toggleNewBusPassengerLayer, toggleNewKashiwakuruDropLayer, toggleNewKashiwakuruRideLayer } from './layers/newbusPassengerLayer';
import { categoriesNew as categories, toggleKashiwaPublicFacilityLabels, toggleKashiwaPublicFacilityLayer } from './layers/kashiwaPublicFacilities';
import { shopCategories, toggleKashiwaShopsLabels } from './layers/kashiwaShops';
import PptxGenJS from "pptxgenjs";
import { globalVisibleLayersState } from './state/activeLayersAtom';
import BusPassengerLayerLegend from './components/Legend/BusPassengerLayerLegend';
import LegendsStack from './components/Legend/LegendsStack';
import KashiwaPublicFacilitiesLegend, { facilityCategoriesNew as facilityCategories } from './components/Legend/KashiwaPublicFacilitiesLegend';
import KashiwakuruStopsLegend from './components/Legend/KashiwakuruStopsLegend';
import KashiwaShopsLegend, { shopCategoriesLegend } from './components/Legend/KashiwaShopsLegend';
import { toggleMasuoRoute, toggleSakaiRoute, toggleShonanRoute } from './layers/busRouteLayer';
import { clearOdEndpointFocus, setKashiwakuruOdFilter, setKashiwakuruOdHour, showAllKashiwakuruOd, toggleKashiwakuruOdLayer } from './layers/kashiwakuruOdLayer';
import KashiwakuruOdLegend from './components/Legend/KashiwakuruOdLegend';
import { setKashiwaChomeLabelsVisible, setKashiwaChomeRangeFilter, toggleKashiwaChomeAging2040Layer, toggleKashiwaChomeAgingLayer, toggleKashiwaChomeDensityLayer, toggleKashiwaChomeTotal2040Layer, toggleKashiwaChomeTotalLayer, updateKashiwaChomeStyle } from './layers/kashiwaChomePopulationLayer';
import KashiwaChomePopulationLegend from './components/Legend/KashiwaChomePopulationLegend';
import { toggleTerrainLayer } from './layers/terrain';
import { clearOdGridFocus, clearSingleOdSelection, toggleKashiwakuruOdGridLayer, updateKashiwakuruOdGridLayer } from './layers/kashiwakuruOdGridLayer';
import KashiwakuruOdGridLegend from './components/Legend/KashiwakuruOdGridLegend';
import { exportCoverageGeoJSON, setBusCoverageRadius, toggleBusCoverageLayer, toggleBusStopPointsLayer } from './layers/busCoverageLayer';
import BusCoverageLegend from './components/Legend/BusCoverageLegend';
import { setCityMaskOpacity, toggleCityMaskLayer } from './layers/cityMaskLayer';
import CityMaskLegend from './components/Legend/CityMaskLegend';
import { toggleBusRoutesCommonLayer, toggleBusRoutesHighlightedLayer, toggleBusRoutesOtherLayer, wireBusRoutesHover } from './layers/busRouteMatchLayer';
import BusRoutesLinkedLegend from './components/Legend/BusRoutesLinkedLegend';
import { toggleRailwayLinesLayer, toggleRailwayStationPassengersLayer, toggleRailwayStationsLayer } from './layers/railwayLayer';
import { toggleStationCoverageLayer } from './layers/stationCoverageLayer';
import LegendGroupTableInline, { LegendRow } from './components/Legend/LegendGroupTableDialog';
import { facilityLegendTableOpenState, shopLegendTableOpenState } from './state/legendTables';
import RailwayLegend from './components/Legend/RailwayLegend';
import { toggleKashiwaSubdivisionsLayer } from './layers/kashiwaSubdivisionsLayer';
import { formatElevation, toggleKashiwaElevationLayer } from './layers/kashiwaElevationLayer';
import KashiwaElevationLegend from './components/Legend/KashiwaElevationLegend';
import { toggleChibaRoadsLayer } from './layers/chibaRoadsLayer';
import ChibaRoadsLegend from './components/Legend/ChibaRoadsLegend';
import { DEFAULT_FREQ_STYLE, FreqStyleConfig, FrequencyDay, toggleBusRoutesFrequencyLayer, updateBusRoutesFrequencyDay, updateBusRoutesFrequencyStyle } from './layers/BusFrequencyLayer';
import BusFrequencyLegend from './components/Legend/BusFrequencyLegend';
import { userLayersPanelOpenAtom } from './state/uiAtoms';
import UserLayersPanel from './components/UserLayersPanel';
import { ensureAiMeshLayers, toggleFeatureState } from './layers/aiMesh';
import PopulationMeshLegend from './components/Legend/PopulationMeshLegend';


type FC = GeoJSON.FeatureCollection<GeoJSON.Geometry, Record<string, any>>;

function rowsFromFC_FACILITIES(fc?: FC): LegendRow[] {
    if (!fc || !Array.isArray(fc.features)) return [];
    return fc.features.map((f) => {
        const p = f?.properties ?? {};
        const name =
            p["施設名"] ??
            p["名前"] ??
            p["店舗名"] ??
            p["name"] ??
            "";
        return {
            group: p["リスト表示用カテゴリ"] ?? "",
            no: p["NO"] ?? p["No"] ?? p["no"] ?? "",
            name,
        } as LegendRow;
    }).filter(r => r.group || r.no || r.name);
}

function rowsFromFC_SHOPS(fc?: FC): LegendRow[] {
    if (!fc || !Array.isArray(fc.features)) return [];
    return fc.features.map((f) => {
        const p = f?.properties ?? {};
        const name =
            p["施設名"] ??
            p["名前"] ??
            p["店舗名"] ??
            p["name"] ??
            "";
        return {
            group: p["凡例グループ"] ?? "",
            no: p["NO"] ?? p["No"] ?? p["no"] ?? "",
            name,
        } as LegendRow;
    }).filter(r => r.group || r.no || r.name);
}

export default function MapView() {
    const mapRef = useRef<Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const popupRef = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
    const transportPopupRef = new maplibregl.Popup({ closeButton: false, closeOnClick: true, className: "ai-popup" });
    const clampRef = useRef<maplibregl.LngLatBoundsLike | null>(JAPAN_BOUNDS);
    const [roadsVisible, setRoadsVisible] = useState(false);
    const [adminVisible, setAdminVisible] = useState(false);
    const [meshVisible, setMeshVisible] = useState(true);
    // const [terrainEnabled, setTerrainEnabled] = useState(false);
    const [currentStyle,] = useState(MAP_STYLES.ストリート);
    const [selectedMetric, setSelectedMetric] = useState('PTN_2020');
    const selectedMetricRef = useRef(selectedMetric);
    const [agriLayerVisible, setAgriLayerVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    // const setSelectedMeshId = useSetRecoilState(selectedMeshIdState);
    const [chatMeshRef, setChatMeshRef] = useState<{ level: "250m"; id: string } | null>(null); // NEW
    // const selectionPopupRef = useRef<maplibregl.Popup | null>(null);
    const [transportVisible, setTransportVisible] = useState(false);
    const [pbFacilityVisible, setPbFacilityVisible] = useState(false);
    const [schoolLayerVisible, setSchoolLayerVisible] = useState(false);
    const [medicalLayerVisible, setMedicalLayerVisible] = useState(false);
    const [touristLayerVisible, setTouristLayerVisible] = useState(false);
    const [roadsideStationLayerVisible, setRoadsideStationLayerVisible] = useState(false);
    const [busStopsVisible, setBusStopsVisible] = useState(false);
    const [boardingVisible, setBoardingVisible] = useState(false);
    const [alightingVisible, setAlightingVisible] = useState(false);
    const [attractionLayerVisible, setAttractionLayerVisible] = useState(false);
    const [busPickDropLayerVisible, setBusPickDropLayerVisible] = useState(false);
    const [busPassengerLayerVisible, setBusPassengerLayerVisible] = useState(false);
    const [sakaeCourseRideLayerVisible, setSakaeCourseRideLayerVisible] = useState(false);
    const [sakaeCourseDropLayerVisible, setSakaeCourseDropLayerVisible] = useState(false);
    const [masuoCourseRideLayerVisible, setMasuoCourseRideLayerVisible] = useState(false);
    const [masuoCourseDropLayerVisible, setMasuoCourseDropLayerVisible] = useState(false);
    const [shonanCourseRideLayerVisible, setShonanCourseRideLayerVisible] = useState(false);
    const [shonanCourseDropLayerVisible, setShonanCourseDropLayerVisible] = useState(false);
    const [isKashiwaBounds, setIsKashiwaBounds] = useState(false); // Track the toggle stat
    const [shonanRouteVisible, setShonanRouteVisible] = useState(false);
    const [masuoRouteVisible, setMasuoRouteVisible] = useState(false);
    const [sakaiRouteVisible, setSakaiRouteVisible] = useState(false);
    const globalVisibleLayers = useRecoilValue(globalVisibleLayersState)
    const [terrainEnabled, setTerrainEnabled] = useState(false);

    const [newBusLayerVisible, setNewBusLayerVisible] = useState(false);
    const [newKashiwakuruRideLayerVisible, setNewKashiwakuruRideLayerVisible] = useState(false);
    const [newKashiwakuruDropLayerVisible, setNewKashiwakuruDropLayerVisible] = useState(false);

    const [kashiwaPublicFacilityVisible, setKashiwaPublicFacilityVisible] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    const [, setKashiwaShopsVisible] = useState(false);
    const [selectedShopCategories, setSelectedShopCategories] = useState<string[]>([]);

    // MapView.tsx (inside component state block)
    const [kashiwakuruOdVisible, setKashiwakuruOdVisible] = useState(false); // ⬅ NEW
    const [kashiwakuruOdHour, setKashiwakuruOdHourState] = useState(8);     // ⬅ NEW (default hour band)
    const [kashiwakuruOdFilterOn, setKashiwakuruOdFilterOn] = useState(false);

    const [subdivisionsVisible, setSubdivisionsVisible] = useState(false);

    const [chomeTotalVisible, setChomeTotalVisible] = useState(false);
    const [chomeAgingVisible, setChomeAgingVisible] = useState(false);
    const [chomeDensityVisible, setChomeDensityVisible] = useState(false);
    const [chomeTotal2040Visible, setChomeTotal2040Visible] = useState(false);
    const [chomeAging2040Visible, setChomeAging2040Visible] = useState(false);

    // const 

    const selectedIdsRef = useRef<string[]>([]);

    const [passengerLabelsVisible, setPassengerLabelsVisible] = useState(false);

    const [odGridVisible, setOdGridVisible] = useState(false);
    const [odGridFilterOn, setOdGridFilterOn] = useState(false);
    const [odGridHour, setOdGridHour] = useState(8);
    const [odGridShowGrid, setOdGridShowGrid] = useState(false);
    const [odGridUndirected, setOdGridUndirected] = useState(false);
    const [odGridMinVol, setOdGridMinVol] = useState(1);
    const [odGridFocusMode, setOdGridFocusMode] = useState<"all" | "out" | "in">("all");
    const [odGridShowStops, setOdGridShowStops] = useState<boolean>(true);  // show/hide bus stop circles
    const [odGridSingleOD, setOdGridSingleOD] = useState<boolean>(false);

    const [busCoverageVisible, setBusCoverageVisible] = useState(false); // <-- NEW
    const [busStopPointsVisible, setBusStopPointsVisible] = useState(false);
    const [coverageRadius, setCoverageRadius] = useState(300);

    const [waniOutboundRideLayerVisible, setWaniOutboundRideLayerVisible] = useState(false);
    const [waniOutboundDropLayerVisible, setWaniOutboundDropLayerVisible] = useState(false);
    const [waniReturnRideLayerVisible, setWaniReturnRideLayerVisible] = useState(false);
    const [waniReturnDropLayerVisible, setWaniReturnDropLayerVisible] = useState(false);
    const [waniRouteVisible, setWaniRouteVisible] = useState(false);

    const [cityMaskVisible, setCityMaskVisible] = useState(false);
    const [cityMaskOpacity, setCityMaskOpacityState] = useState(0.85);

    const [busRoutesCommonVisible, setBusRoutesCommonVisible] = useState(false);
    const [busRoutesOtherVisible, setBusRoutesOtherVisible] = useState(false);

    const [railLinesVisible, setRailLinesVisible] = useState(false);
    const [railStationsVisible, setRailStationsVisible] = useState(false);
    const [stationCoverageVisible, setStationCoverageVisible] = useState(false);

    const [facilityFC,] = useState<FC | null>(null);
    const [shopFC,] = useState<FC | null>(null);
    const [kashiwaFacilityLabelsVisible, setKashiwaFacilityLabelsVisible] = useState(false);
    const [kashiwaShopsLabelsVisible, setKashiwaShopsLabelsVisible] = useState(false);

    const facilityLegendOpen = useRecoilValue(facilityLegendTableOpenState);
    const shopLegendOpen = useRecoilValue(shopLegendTableOpenState);

    const [busRoutesHighlightedVisible, setBusRoutesHighlightedVisible] = useState(false);

    const [stationPassengersVisible, setStationPassengersVisible] = useState(false);

    const [elevationGridVisible, setElevationGridVisible] = useState(false);
    const [chibaRoadsVisible, setChibaRoadsVisible] = useState(false);

    const [busRoutesFrequencyVisible, setBusRoutesFrequencyVisible] = useState(false);
    const [busRoutesFrequencyDay, setBusRoutesFrequencyDay] =
        useState<FrequencyDay>("weekday");

    const [busRoutesFreqStyle, setBusRoutesFreqStyle] =
        useState<FreqStyleConfig>(DEFAULT_FREQ_STYLE);

    const [userPanelOpen, setUserPanelOpen] = useRecoilState(userLayersPanelOpenAtom);

    const onToggleChibaRoads = () => {
        mapRef.current &&
            toggleChibaRoadsLayer(mapRef.current, chibaRoadsVisible, setIsLoading, setChibaRoadsVisible);
    }

    type ChomeMetric = "total" | "aging" | "density" | "total_2040" | "aging_2040";
    const hasAnyBusLegend = [
        busPassengerLayerVisible,
        sakaeCourseRideLayerVisible,
        sakaeCourseDropLayerVisible,
        masuoCourseRideLayerVisible,
        masuoCourseDropLayerVisible,
        shonanCourseRideLayerVisible,
        shonanCourseDropLayerVisible,
        sakaiRouteVisible,
        masuoRouteVisible,
        shonanRouteVisible,
        waniOutboundRideLayerVisible,
        waniOutboundDropLayerVisible,
        waniReturnRideLayerVisible,
        waniReturnDropLayerVisible,
        waniRouteVisible,
    ].some(Boolean);
    // const hasAnyOtherLegend = someOtherLegendVisible || anotherLegendVisible;

    type BoolSetter = React.Dispatch<React.SetStateAction<boolean>>;


    // Keep only *layer* visibility setters here (no UI flags like chatOpen/isLoading)
    const LAYER_SETTERS: BoolSetter[] = [
        setRoadsVisible,
        setAdminVisible,
        setMeshVisible,

        setAgriLayerVisible,
        setTransportVisible,
        setPbFacilityVisible,
        setSchoolLayerVisible,
        setMedicalLayerVisible,
        setTouristLayerVisible,
        setRoadsideStationLayerVisible,

        setBusStopsVisible,
        setBoardingVisible,
        setAlightingVisible,
        setAttractionLayerVisible,
        setBusPickDropLayerVisible,
        setBusPassengerLayerVisible,

        setSakaeCourseRideLayerVisible,
        setSakaeCourseDropLayerVisible,
        setMasuoCourseRideLayerVisible,
        setMasuoCourseDropLayerVisible,
        setShonanCourseRideLayerVisible,
        setShonanCourseDropLayerVisible,

        setShonanRouteVisible,
        setMasuoRouteVisible,
        setSakaiRouteVisible,

        setNewBusLayerVisible,
        setNewKashiwakuruRideLayerVisible,
        setNewKashiwakuruDropLayerVisible,

        setKashiwaPublicFacilityVisible,
        setKashiwaShopsVisible,
        setElevationGridVisible,

        setKashiwakuruOdVisible,
        setKashiwaPublicFacilityVisible,
        setKashiwaShopsVisible,
        setKashiwaFacilityLabelsVisible,

        setChomeTotalVisible,
        setChomeAgingVisible,
        setChomeDensityVisible,
        setChomeTotal2040Visible,
        setChomeAging2040Visible,

        setBusCoverageVisible,
        setBusRoutesCommonVisible,
        setBusRoutesOtherVisible,

        setRailLinesVisible,
        setRailStationsVisible,
        setStationCoverageVisible,

        setBusRoutesHighlightedVisible,
    ];

    // Flip all at once
    const setAllLayersVisibility = (visible: boolean) => {
        LAYER_SETTERS.forEach(setter => setter(visible));
    };

    const getMeshLayerIds = useCallback((map: maplibregl.Map) => {
        const layers = map.getStyle()?.layers ?? [];
        return layers.map(l => l.id).filter(id => id.startsWith('mesh-'));
    }, []);

    // NEW — apply visibility to *all* mesh layers
    const applyMeshVisibility = useCallback((visible: boolean) => {
        const map = mapRef.current;
        if (!map) return;
        const v = visible ? 'visible' : 'none';
        getMeshLayerIds(map).forEach(id => {
            if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', v);
        });
    }, [getMeshLayerIds]);

    // NEW — (re)build mesh layers, recolor by metric, then apply current toggle
    const rebuildMeshLayers = useCallback(() => {
        const map = mapRef.current;
        if (!map) return;

        // Only re-add if they don't exist in this style yet
        if (getMeshLayerIds(map).length === 0) {
            addMeshLayers(map, selectedMetric);
        }

        // recolor to match current metric (your existing util)
        updateMetricStyles();

        // and finally respect the toggle
        applyMeshVisibility(meshVisible);
    }, [applyMeshVisibility, getMeshLayerIds, meshVisible, selectedMetric]);


    const onToggleFacilityLabels = () => {
        if (!mapRef.current) return;
        toggleKashiwaPublicFacilityLabels(
            mapRef.current,
            kashiwaFacilityLabelsVisible,
            setIsLoading,
            setKashiwaFacilityLabelsVisible,
            selectedCategories
        );
    };


    // toggle handler
    const onToggleShopsLabels = () => {
        if (!mapRef.current) return;
        toggleKashiwaShopsLabels(
            mapRef.current,
            kashiwaShopsLabelsVisible,
            setIsLoading,
            setKashiwaShopsLabelsVisible,
            selectedShopCategories // pass the categories array you already use for shops
        );
    };

    // keep label filter synced with category filter changes
    // useEffect(() => {
    //     if (!mapRef.current) return;
    //     if (kashiwaShopsLabelsVisible) {
    //         updateKashiwaShopsLabelsFilter(mapRef.current, selectedShopCategories);
    //     }
    // }, [selectedShopCategories, kashiwaShopsLabelsVisible]);

    const toggleMesh = () => {
        const map = mapRef.current;
        if (!map) return;

        const next = !meshVisible;

        setIsLoading(true);

        // // if layers were lost (e.g., after style change) and user is turning ON,
        // // ensure they exist before making them visible
        // if (next && getMeshLayerIds(map).length === 0) {
        //     addMeshLayers(map, selectedMetric);
        //     updateMetricStyles();
        // }

        // applyMeshVisibility(next);
        // setMeshVisible(next);

        requestAnimationFrame(() => {
            if (next && getMeshLayerIds(map).length === 0) {
                // レイヤーが消えていて、ON にする場合は再追加
                addMeshLayers(map, selectedMetric);
                updateMetricStyles();

                // 新しいレイヤーが描画完了したら idle イベントで OFF
                map.once("idle", () => {
                    applyMeshVisibility(next);
                    setMeshVisible(next);
                    setIsLoading(false);
                });
            } else {
                // 既存レイヤーの可視状態だけ変える場合
                applyMeshVisibility(next);
                setMeshVisible(next);

                // 少し遅延させてローディング OFF (描画反映待ち)
                map.once("idle", () => setIsLoading(false));
            }
        });
    };

    const onToggleSubdivisions = () =>
        mapRef.current &&
        toggleKashiwaSubdivisionsLayer(
            mapRef.current,
            subdivisionsVisible,
            setIsLoading,
            setSubdivisionsVisible
        );


    const toggleTerrain = () => {
        const map = mapRef.current;
        if (!map) return;
        toggleTerrainLayer(
            map,
            terrainEnabled,
            setIsLoading,
            setTerrainEnabled,
            { exaggeration: 1.5 }                  // optional
        );
    };

    const toggleKashiwaPublicFacilityVisible = (category: string) => {
        // Toggle category selection
        setSelectedCategories((prev) =>
            prev.includes(category)
                ? prev.filter((cat) => cat !== category)
                : [...prev, category]
        );
    };
    const toggleKashiwaShopsVisible = (category: string) => {
        // Toggle category selection
        setSelectedShopCategories((prev) =>
            prev.includes(category)
                ? prev.filter((cat) => cat !== category)
                : [...prev, category]
        );
    };



    async function downloadPpt() {
        const map = mapRef.current;
        if (!map) {
            console.warn("Map not ready");
            return;
        }

        try {
            setIsLoading(true);

            // Ensure the canvas is fresh
            await new Promise<void>((resolve) => {
                map.once("render", () => resolve());
                map.triggerRepaint();
                setTimeout(() => resolve(), 300);
            });

            const canvas = map.getCanvas();
            const mapImageDataUrl = canvas.toDataURL("image/png");

            // Build the layers text from your visible layers list
            const labels = [...globalVisibleLayers];
            let layersText = labels.join(" | ");
            if (!layersText && selectedMetric === "PTN_2020") {
                layersText = "総人口（2020年）";
            }

            // --- PPT layout constants ---
            const pptx = new PptxGenJS();
            const slide = pptx.addSlide();

            const slideWidth = 10;
            const slideHeight = 5.63;
            const margin = 0.4;
            const usableWidth = slideWidth - 2 * margin;

            // --- Title (heading + layers on the same line) ---
            const titleY = margin - 0.4;
            const titleHeight = 0.6;

            // 1) Fixed-width heading (won’t wrap)
            const headW = 2.6; // tweak if your font changes
            slide.addText("（対象地域）：", {
                x: margin,
                y: titleY + 0.1,
                w: headW,
                h: titleHeight,
                fontSize: 18,
                bold: true,
                fontFace: "Arial",
            });

            // 2) Layers text box starts on the same line and wraps
            const layersFontSize = 12;
            const layersX = margin + headW + 0.1 - 0.7;             // small gap after the colon
            const layersW = usableWidth - headW - 0.1;

            // Simple token-based wrapping so we can estimate height for layout below
            const TOKENS = layersText ? layersText.split(" | ") : [];
            const MAX_CHARS_PER_LINE = 48; // rough fit for layersW; adjust if needed
            const LINE_H = 0.28;           // visual line-height for 12pt in this deck

            function wrapTokens(tokens: string[], maxChars: number) {
                const lines: string[] = [];
                let curr = "";
                for (const t of tokens) {
                    const seg = curr ? curr + " | " + t : t;
                    if (seg.length > maxChars) {
                        if (curr) lines.push(curr);
                        curr = t;
                    } else {
                        curr = seg;
                    }
                }
                if (curr) lines.push(curr);
                return lines;
            }

            const wrapped = TOKENS.length ? wrapTokens(TOKENS, MAX_CHARS_PER_LINE) : (layersText ? [layersText] : []);
            const layersBoxHeight = Math.max(LINE_H, wrapped.length * LINE_H);

            slide.addText(wrapped.join("\n"), {
                x: layersX,
                y: titleY + 0.1 + 0.12,     // same baseline as heading
                w: layersW,
                h: layersBoxHeight,  // tall enough for wrapped lines
                fontSize: layersFontSize,
                fontFace: "Arial",
                lineSpacingMultiple: 1.15,
            });

            // --- Blue bar placed after whichever is taller (heading vs wrapped layers) ---
            const afterTitleH = Math.max(titleHeight, layersBoxHeight);
            const barY = titleY + 0.1 + afterTitleH + 0.12;
            const barHeight = 0.03;

            slide.addShape(pptx.ShapeType.rect, {
                x: margin,
                y: barY,
                w: usableWidth,
                h: barHeight,
                fill: { color: "0070C0" },
            });

            // --- Lead texts (shifted down) ---
            const lead1Y = barY + 0.2;
            slide.addText("リード文 1:", {
                x: margin,
                y: lead1Y,
                w: usableWidth,
                h: 0.4,
                fontSize: 12,
                fontFace: "Arial",
            });
            slide.addText("リード文 2:", {
                x: margin,
                y: lead1Y + 0.5,
                w: usableWidth,
                h: 0.4,
                fontSize: 12,
                fontFace: "Arial",
            });

            // --- Map image (fits below lead text) ---
            const imageTopY = lead1Y + 1.0;
            const imageBottomY = slideHeight - margin - 0.2; // reserve for footer
            const imageMaxHeight = imageBottomY - imageTopY;

            const imgOriginalWidth = canvas.width;
            const imgOriginalHeight = canvas.height;
            const imageAspect = imgOriginalWidth / imgOriginalHeight;

            const imageWidth = usableWidth;
            let imageHeight = imageWidth / imageAspect + 1;
            if (imageHeight > imageMaxHeight) imageHeight = imageMaxHeight;

            slide.addImage({
                data: mapImageDataUrl,
                x: margin,
                y: imageTopY,
                w: imageWidth,
                h: imageHeight + 0.3,
            });

            // --- Footer ---
            slide.addText("Maplibre / OpenStreetMap", {
                x: margin,
                y: slideHeight - margin - 0.2,
                w: usableWidth,
                h: 0.3,
                fontSize: 10,
                italic: true,
                fontFace: "Arial",
            });

            await pptx.writeFile({ fileName: "Map_Export.pptx" });
        } catch (err) {
            console.error("Export to PPT failed:", err);
        } finally {
            setIsLoading(false);
        }
    }


    // Detect road layers (strokes + optional labels) from the *current* style
    function getRoadLayerIds(map: maplibregl.Map) {
        const layers = map.getStyle().layers ?? [];
        const strokeIds: string[] = [];
        const labelIds: string[] = [];

        for (const layer of layers) {
            const id = layer.id;
            const type = (layer as any).type;
            const sourceLayer = (layer as any)['source-layer'];

            // Road strokes in MapTiler styles use source-layer "transportation" (type usually "line")
            if (sourceLayer === 'transportation' && (type === 'line' || type === 'fill')) {
                strokeIds.push(id);
                continue;
            }
            // Road labels use "transportation_name" (type "symbol")
            if (sourceLayer === 'transportation_name' && type === 'symbol') {
                labelIds.push(id);
                continue;
            }

            // Fallback: match common id patterns if source-layer isn’t present (rare)
            if (/road|transport|street|bridge|tunnel/i.test(id)) {
                if (type === 'symbol') labelIds.push(id);
                else strokeIds.push(id);
            }
        }
        return { strokeIds, labelIds };
    }

    // Toggle roads (strokes + labels). If you want to keep labels, remove the labelIds loop.
    const toggleRoads = () => {
        const map = mapRef.current;
        if (!map) return;

        const visibility = roadsVisible ? 'none' : 'visible';
        const { strokeIds, labelIds } = getRoadLayerIds(map);

        [...strokeIds, ...labelIds].forEach((id) => {
            if (map.getLayer(id)) {
                map.setLayoutProperty(id, 'visibility', visibility);
            }
        });

        setRoadsVisible(!roadsVisible);
    };

    const onTogglePassengerLabels = () => {
        if (!mapRef.current) return;
        const next = !passengerLabelsVisible;
        setAllPassengerLabelsVisible(mapRef.current, next); // updates all currently visible circles
        setPassengerLabelsVisible(next);
    };

    const updateMetricStyles = () => {
        const map = mapRef.current;
        if (!map) return;
        const color = getColorExpression(selectedMetric);

        ['mesh-250m-fill'].forEach(id => {
            if (map.getLayer(id)) {
                map.setPaintProperty(id, 'fill-color', color);
            }
        });

        ['mesh-250m-outline'].forEach(id => {
            if (map.getLayer(id)) {
                map.setPaintProperty(id, 'line-color', color);
            }
        });
    };

    const fitBoundsToKashiwa = () => {

        const map = mapRef.current;
        if (!map) return;

        const target = !isKashiwaBounds ? INABE_BOUNDS : MIE_BOUNDS;
        fitAndClamp(map, target, true);

        setIsKashiwaBounds(!isKashiwaBounds);

    };

    function downloadMapScreenshot(map: maplibregl.Map, fileName = 'map-screenshot.png') {
        const originalCanvas = map.getCanvas();

        map.once('render', () => {
            try {
                // Create a new canvas to draw map + attribution
                const exportCanvas = document.createElement('canvas');
                exportCanvas.width = originalCanvas.width;
                exportCanvas.height = originalCanvas.height;

                const ctx = exportCanvas.getContext('2d');
                if (!ctx) throw new Error('Canvas context not available');

                // Draw the map first
                ctx.drawImage(originalCanvas, 0, 0);

                // Attribution text
                const text = '© MaplibreGL © OpenStreetMap';
                ctx.font = '14px Arial';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';

                // Optional: background for readability
                const padding = 4;
                const metrics = ctx.measureText(text);
                const textHeight = 16;

                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.fillRect(
                    exportCanvas.width - metrics.width - padding * 2 - 10,
                    exportCanvas.height - textHeight - padding,
                    metrics.width + padding * 2,
                    textHeight + padding
                );

                // Draw text flush with the bottom edge
                ctx.fillStyle = 'black';
                ctx.fillText(text, exportCanvas.width - 10, exportCanvas.height - 2);

                // Export image
                const dataURL = exportCanvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = dataURL;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

            } catch (e) {
                console.error('Screenshot failed:', e);
            }
        });

        map.triggerRepaint();
    }

    const handleStyleChange = (styleUrl: string) => {
        const map = mapRef.current;
        if (!map) return;

        setIsLoading(true);
        const nextMetric = 'PTN_2020';
        setSelectedMetric(nextMetric);

        setAllLayersVisibility(false);

        map.setStyle(styleUrl);

        map.once('idle', () => setIsLoading(false));

    };

    function fitAndClamp(
        map: maplibregl.Map,
        bounds: maplibregl.LngLatBoundsLike,
        clampAfter: boolean
    ) {
        map.setMaxBounds(null); // free the camera to animate
        map.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            duration: 800
        });
        map.once('moveend', () => {
            if (clampAfter) {
                map.setMaxBounds(bounds);
                clampRef.current = bounds;     // <-- remember active clamp
            } else {
                clampRef.current = null;       // <-- no clamp
            }
        });
    }

    useEffect(() => {
        selectedMetricRef.current = selectedMetric;
    }, [selectedMetric]);

    useEffect(() => {
        if (mapRef.current) {
            toggleKashiwaPublicFacilityLayer(mapRef.current, kashiwaPublicFacilityVisible, setIsLoading, setKashiwaPublicFacilityVisible, selectedCategories);
        }
    }, [selectedCategories]);

    useEffect(() => {
        updateMetricStyles();
        mapRef.current?.once('idle', () => setIsLoading(false));
    }, [selectedMetric]);

    useEffect(() => {
        const handleAskMirai = (e: Event) => {
            const detail = (e as CustomEvent).detail as { meshId: string; meshLevel: "250m" };
            if (!detail?.meshId || !detail?.meshLevel) return;
            setChatMeshRef({ id: detail.meshId, level: detail.meshLevel });   // NEW
        };
        window.addEventListener('mirai:ask', handleAskMirai);
        return () => window.removeEventListener('mirai:ask', handleAskMirai);
    }, []);

    useEffect(() => {
        if (!mapRef.current) return;
        if (cityMaskVisible) {
            setCityMaskOpacity(mapRef.current, cityMaskOpacity);
        }
    }, [cityMaskOpacity, cityMaskVisible]);





    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        let protocol = new Protocol();
        maplibregl.addProtocol('pmtiles', protocol.tile)

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: currentStyle,
            center: [139.9797, 35.8676],
            zoom: 5.5,
            minZoom: 4.5,
            maxZoom: 18,
            maxBounds: JAPAN_BOUNDS,
        });

        mapRef.current = map;



        map.on('load', () => {

            map.once('idle', () => {
                fitAndClamp(map, MIE_BOUNDS, true);
            });

            map.getStyle().layers?.forEach(layer => {
                if (layer.type === 'symbol' && ['poi-label', 'road-label', 'waterway-label'].some(id => layer.id.startsWith(id))) {
                    map.setLayoutProperty(layer.id, 'visibility', 'none');
                }
            });

            rebuildMeshLayers();                 // ← replace addMeshLayers + manual color with this
            ensureAiMeshLayers(map)
            wireBusRoutesHover(map, transportPopupRef);
            map.once('idle', () => setIsLoading(false));

        });

        map.on('style.load', () => {
            rebuildMeshLayers();                 // ← guarantees meshes come back for the new style
            ensureAiMeshLayers(map);

            for (const id of selectedIdsRef.current) {
                toggleFeatureState(map, id, true);
            }

            if (clampRef.current) {
                map.setMaxBounds(clampRef.current);
            }
        });

        map.on('mousemove', 'agri-fill', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    popupRef
                        .setLngLat(e.lngLat)
                        .setHTML(`
                            <strong>Type:</strong> ${props.KOUCHI}<br/>
                            <strong>City:</strong> ${props.CITY}<br/>
                            <strong>ID:</strong> ${props.ID}
                        `)
                        .addTo(map);
                }
            }
        });

        map.on('mouseleave', 'agri-fill', () => {
            map.getCanvas().style.cursor = '';
            popupRef.remove();
        });

        map.on('mousemove', 'transportation-line-hover', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    transportPopupRef
                        .setLngLat(e.lngLat)
                        .setHTML(`
                             <div class="rounded-xl border bg-white p-4 shadow-xl space-y-2 w-40">
                            <strong>Name:</strong> ${props.N07_001}<br/>
                            </div>
                    
                        `)
                        .addTo(map);
                }
            }
        });

        map.on('mouseleave', 'transportation-line-hover', () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });

        map.on('mousemove', 'school-layer', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
            <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-72 text-xs">
                <div><strong>都道府県コード (P29_001):</strong> ${props.P29_001}</div>
                <div><strong>施設ID (P29_002):</strong> ${props.P29_002}</div>
                <div><strong>施設種別コード (P29_003):</strong> ${props.P29_003}</div>
                <div><strong>施設名 (P29_004):</strong> ${props.P29_004}</div>
                <div><strong>住所 (P29_005):</strong> ${props.P29_005}</div>
                <div><strong>分類コード (P29_006):</strong> ${props.P29_006}</div>
                <div><strong>ステータスコード (P29_007):</strong> ${props.P29_007}</div>
                <div><strong>不明コード (P29_008):</strong> ${props.P29_008}</div>
                <div><strong>予備フィールド (P29_009):</strong> ${props.P29_009 ?? 'N/A'}</div>
            </div>
        `;

                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });

        map.on('mouseleave', 'school-layer', () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });

        map.on('mousemove', 'medical-layer', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
                <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-72 text-xs">
                    <div><strong>都道府県コード (P04_001):</strong> ${props.P04_001}</div>
                    <div><strong>病院名 (P04_002):</strong> ${props.P04_002}</div>
                    <div><strong>住所 (P04_003):</strong> ${props.P04_003}</div>
                    <div><strong>診療科目 (P04_004):</strong> ${props.P04_004}</div>
                    <div><strong>電話番号 (P04_005):</strong> ${props.P04_005 ?? 'N/A'}</div>
                    <div><strong>FAX番号 (P04_006):</strong> ${props.P04_006 ?? 'N/A'}</div>
                    <div><strong>病床数 (P04_007):</strong> ${props.P04_007}</div>
                    <div><strong>診療日数 (P04_008):</strong> ${props.P04_008}</div>
                    <div><strong>外来数 (P04_009):</strong> ${props.P04_009}</div>
                    <div><strong>救急数 (P04_010):</strong> ${props.P04_010}</div>
                </div>
            `;
                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });

        map.on('mouseleave', 'medical-layer', () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });

        map.on('mousemove', 'tourist-layer', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
                <div class="rounded-xl border bg-white p-4 shadow-xl text-xs space-y-1 w-60">
                    <div><strong>名称 (P12_002):</strong> ${props.P12_002}</div>
                    <div><strong>住所 (P12_006):</strong> ${props.P12_006}</div>
                    <div><strong>コード (P12_001):</strong> ${props.P12_001}</div>
                </div>
            `;
                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });

        map.on('mouseleave', 'tourist-layer', () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });

        map.on('click', 'roadside-station', (e) => {
            const feature = e.features?.[0];
            if (!feature) return;

            map.getCanvas().style.cursor = 'pointer';
            const props = feature.properties;
            if (!props) return;

            const html = `
    <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-80 text-xs select-text">
      <div><strong>緯度 (P35_001):</strong> ${props.P35_001}</div>
      <div><strong>経度 (P35_002):</strong> ${props.P35_002}</div>
      <div><strong>都道府県 (P35_003):</strong> ${props.P35_003}</div>
      <div><strong>市区町村 (P35_004):</strong> ${props.P35_004}</div>
      <div><strong>市区町村コード (P35_005):</strong> ${props.P35_005}</div>
      <div><strong>駅名 (P35_006):</strong> ${props.P35_006}</div>
      <div><strong>道の駅公式URL (P35_007):</strong> ${props.P35_007
                    ? `<a class="text-blue-500 underline" href="${props.P35_007}" target="_blank">リンク</a>`
                    : 'なし'}</div>
      <div><strong>地方会公式URL (P35_008):</strong> ${props.P35_008
                    ? `<a class="text-blue-500 underline" href="${props.P35_008}" target="_blank">リンク</a>`
                    : 'なし'}</div>
      <div><strong>市町村公式URL (P35_009):</strong> ${props.P35_009
                    ? `<a class="text-blue-500 underline" href="${props.P35_009}" target="_blank">リンク</a>`
                    : 'なし'}</div>
      <div><strong>備考 (P35_010):</strong> ${props.P35_010 ?? 'N/A'}</div>

      ${[...Array(18)].map((_, i) => {
                        const index = i + 11;
                        return `<div><strong>P35_${String(index).padStart(3, '0')}:</strong> ${props[`P35_${String(index).padStart(3, '0')}`]}</div>`;
                    }).join('')}
    </div>
  `;

            transportPopupRef
                .setLngLat(e.lngLat)
                .setHTML(html)
                .addTo(map);
        });

        // Clear popup if user clicks outside the feature
        map.on('click', (e) => {
            const ids = ['roadside-station'].filter(id => map.getLayer(id));
            if (!ids.length) return; // layer not present, nothing to query
            const features = map.queryRenderedFeatures(e.point, { layers: ids });
            if (!features.length) {
                transportPopupRef.remove();
                map.getCanvas().style.cursor = '';
            }
        });

        map.on('click', 'bus-stops', (e) => {
            const feature = e.features?.[0];
            if (!feature) return;

            const props = feature.properties;
            if (!props) return;

            const html = `
    <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-80 text-xs">
      <div><strong>P11_001:</strong> ${props.P11_001 ?? 'N/A'}</div>
      <div><strong>P11_002:</strong> ${props.P11_002 ?? 'N/A'}</div>
      <div><strong>P11_003_01:</strong> ${props.P11_003_01 ?? 'N/A'}</div>
      <div><strong>P11_003_02</strong>${props.P11_003_02 ?? 'N/A'}</div>
    </div>
    `;

            transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
        });

        map.on('click', (e) => {
            const ids = ['bus-stops'].filter(id => map.getLayer(id));
            if (!ids.length) return; // layer not present, nothing to query
            const features = map.queryRenderedFeatures(e.point, { layers: ids });

            if (!features.length) {
                transportPopupRef.remove();
                map.getCanvas().style.cursor = '';
            }
        });

        map.on('click', 'facilities-circle', (e) => {
            const feature = e.features?.[0];
            if (!feature) return;

            const props = feature.properties ?? {};
            const lngLat = e.lngLat;

            const popupContent = `
        <div class="rounded-xl border bg-white p-4 shadow-xl space-y-2 w-64 text-sm">
            <div><strong>施設名:</strong> ${props.P02_004 ?? '不明'}</div>
            <div><strong>住所:</strong> ${props.P02_005 ?? '不明'}</div>
            <div><strong>種別コード:</strong> ${props.P02_003}</div>
            <div><strong>出典:</strong> ${props.P02_007}</div>
        </div>
    `;

            transportPopupRef.setLngLat(lngLat).setHTML(popupContent).addTo(map);
        });

        map.on('mousemove', 'attraction-layer', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
                <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-72 text-xs">
                    <div><strong>都道府県コード (P33_001):</strong> ${props.P33_001}</div>
                    <div><strong>市区町村コード (P33_002):</strong> ${props.P33_002}</div>
                    <div><strong>施設コード (P33_003):</strong> ${props.P33_003}</div>
                    <div><strong>施設種別 (P33_004):</strong> ${props.P33_004}</div>
                    <div><strong>施設名 (P33_005):</strong> ${props.P33_005}</div>
                    <div><strong>郵便番号 (P33_006):</strong> ${props.P33_006}</div>
                    <div><strong>住所 (P33_007):</strong> ${props.P33_007}</div>
                    <div><strong>電話番号 (P33_008):</strong> ${props.P33_008}</div>
                    <div><strong>備考 (P33_009):</strong> ${props.P33_009 ?? 'N/A'}</div>
                    <div><strong>Webサイト (P33_010):</strong> 
                        ${props.P33_010
                            ? `<a href="${props.P33_010}" target="_blank" class="text-blue-500 underline">${props.P33_010}</a>`
                            : 'N/A'}
                    </div>
                    <div><strong>分類 (P33_011):</strong> ${props.P33_011 ?? 'N/A'}</div>
                </div>
            `;
                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });

        map.on('mouseleave', 'attraction-layer', () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });

        // POINT CIRCLE CLICK TOOLTIP
        map.on('mousemove', 'bus-pick-drop-points', (e) => {
            const feature = e.features?.[0];
            if (!feature) return;

            map.getCanvas().style.cursor = 'pointer';
            const props = feature.properties || {};

            const rows = Object.entries(props)
                .map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`)
                .join('');

            transportPopupRef
                .setLngLat(e.lngLat)
                .setHTML(`
      <div class="rounded-xl border bg-white p-3 shadow-md text-xs w-72">
        ${rows}
      </div>
    `)
                .addTo(map);
        });

        map.on('mouseleave', 'bus-pick-drop-points', () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });

        // POLYGON HOVER TOOLTIP
        map.on('click', 'bus-pick-drop-polygons', (e) => {
            const feature = e.features?.[0];
            if (!feature) return;

            const props = feature.properties || {};

            const rows = Object.entries(props)
                .map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`)
                .join('');

            transportPopupRef
                .setLngLat(e.lngLat)
                .setHTML(`
      <div class="rounded-xl border bg-white p-4 shadow-xl text-xs w-72">
        ${rows}
      </div>
    `)
                .addTo(map);
        });

        map.on('mousemove', 'bus-layer', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
                <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-fit text-xs">
                    <strong>${props.P11_001}</strong> 
                </div>
            `;
                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });

        map.on('mouseleave', 'bus-layer', () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });

        map.on('mousemove', 'sakae-course-ride', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
                <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-fit text-xs">
                    <strong>${props.sakae_ride}</strong> 
           
                </div>
            `;
                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });

        map.on('mouseleave', 'sakae-course-ride', () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });

        map.on('mousemove', 'sakae-course-drop', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
                <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-fit text-xs">
                    <strong>${props.sakae_drop}</strong> 
           
                </div>
            `;
                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });

        map.on('mouseleave', 'sakae-course-drop', () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });

        map.on('mousemove', 'masuo-course-ride', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
                <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-fit text-xs">
                    <strong>${props.masuo_ride}</strong> 
           
                </div>
            `;
                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });

        map.on('mouseleave', 'masuo-course-ride', () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });

        map.on('mousemove', 'masuo-course-drop', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
                <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-fit text-xs">
                    <strong>${props.masuo_drop}</strong> 
           
                </div>
            `;
                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });

        map.on('mouseleave', 'masuo-course-drop', () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });

        map.on('mousemove', 'shonan-course-ride', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
                <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-fit text-xs">
                    <strong>${props.shonan_ride}</strong> 
           
                </div>
            `;
                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });

        map.on('mouseleave', 'shonan-course-ride', () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });

        map.on('mousemove', 'shonan-course-drop', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
                <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-fit text-xs">
                    <strong>${props.shonan_drop}</strong> 
           
                </div>
            `;
                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });

        map.on('mouseleave', 'shonan-course-drop', () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });

        map.on('mousemove', 'new-bus-layer', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
                <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-fit text-xs">
                    <strong>表示番号: ${props.表示番号}</strong> 
                    <strong>Name: ${props.name}</strong> 
                    <strong>乗車数: ${props.乗車数}</strong> 
                    <strong>降車数: ${props.降車数}</strong> 
           
                </div>
            `;
                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });

        map.on('mouseleave', 'new-bus-layer', () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });

        map.on('mousemove', 'ride-data', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
                <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-fit text-xs">
                    <strong>${props.乗車数}</strong> 
           
                </div>
            `;
                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });

        map.on('mouseleave', 'ride-data', () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });
        map.on('mousemove', 'drop-data', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
                <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-fit text-xs">
                    <strong>${props.乗車数}</strong> 
           
                </div>
            `;
                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });

        map.on('mouseleave', 'drop-data', () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });

        map.on('mousemove', 'kashiwakuru-od-line', (e) => {                      // ⬅ NEW
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const p = feature.properties || {};
                const html = `
      <div class="rounded-xl border bg-white p-4 shadow-xl text-xs space-y-1 w-64">
        <div><strong>O→D:</strong> ${p.origin} → ${p.destination}</div>
        <div><strong>時間帯:</strong> ${p.timeband}</div>
        <div><strong>トリップ数:</strong> ${p.count}</div>
      </div>
    `;
                transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
            }
        });

        map.on('mouseleave', 'kashiwakuru-od-line', () => {                      // ⬅ NEW
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });

        map.on('mousemove', 'wani-outbound-ride', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
                <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-fit text-xs">
                    <strong>${props.stop_name}</strong> 
                    <strong>${props.ride_outbound}</strong> 
           
                </div>
            `;
                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });



        map.on('mouseleave', 'wani-outbound-ride', () => { map.getCanvas().style.cursor = ''; transportPopupRef.remove(); });

        map.on('mousemove', 'wani-outbound-drop', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
                <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-fit text-xs">
                    <strong>${props.stop_name}</strong> 
                    <strong>${props.drop_outbound}</strong> 
           
                </div>
            `;
                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });
        map.on('mouseleave', 'wani-outbound-drop', () => { map.getCanvas().style.cursor = ''; transportPopupRef.remove(); });

        map.on('mousemove', 'wani-return-ride', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
                <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-fit text-xs">
                    <strong>${props.stop_name}</strong> 
                    <strong>${props.ride_return}</strong> 
           
                </div>
            `;
                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });
        map.on('mouseleave', 'wani-return-ride', () => { map.getCanvas().style.cursor = ''; transportPopupRef.remove(); });

        map.on('mousemove', 'wani-return-drop', (e) => {
            const feature = e.features?.[0];
            if (feature) {
                map.getCanvas().style.cursor = 'pointer';
                const props = feature.properties;
                if (props) {
                    const html = `
                <div class="rounded-xl border flex flex-col bg-white p-4 shadow-xl space-y-2 w-fit text-xs">
                    <strong>${props.stop_name}</strong> 
                    <strong>${props.drop_return}</strong> 
           
                </div>
            `;
                    transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
                }
            }
        });

        map.on('mouseleave', 'wani-return-drop', () => { map.getCanvas().style.cursor = ''; transportPopupRef.remove(); });

        // --- Wani route: hover a small label; click to pin details ---
        ['wani-cityhall-route', 'wani-cityhall-route-line'].forEach((routeId) => {
            map.on('mousemove', routeId, (e) => {
                const f = e.features?.[0]; if (!f) return;
                map.getCanvas().style.cursor = 'pointer';
                const name = f.properties?.name || 'ワニバース（市役所線）';
                transportPopupRef
                    .setLngLat(e.lngLat)
                    .setHTML(`<div class="rounded-xl border bg-white p-2 shadow text-xs">${name}</div>`)
                    .addTo(map);
            });
            map.on('mouseleave', routeId, () => { map.getCanvas().style.cursor = ''; transportPopupRef.remove(); });
            map.on('click', routeId, (e) => {
                const f = e.features?.[0]; if (!f) return;
                const name = f.properties?.name || 'ワニバース（市役所線）';
                new maplibregl.Popup({ closeButton: true, offset: 8, className: "ai-popup" })
                    .setLngLat(e.lngLat)
                    .setHTML(`
        <div class="rounded-xl border bg-white p-4 shadow text-xs space-y-1 w-60">
          <div class="font-semibold">${name}</div>
          <div>種別: ルート</div>
        </div>
      `)
                    .addTo(map);
            });
        });

        map.on('mousemove', 'kashiwa-elev-grid-fill', (e) => {
            const f = e.features?.[0];
            if (!f) return;
            map.getCanvas().style.cursor = 'pointer';
            const val = (f.properties as any)?.['標高'];
            const html = `
    <div class="rounded-xl border bg-white p-3 shadow text-xs w-40">
      <div><strong>標高:</strong> ${formatElevation(val)}</div>
    </div>`;
            transportPopupRef.setLngLat(e.lngLat).setHTML(html).addTo(map);
        });
        map.on('mouseleave', 'kashiwa-elev-grid-fill', () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        });


        const showKashiwaPublicFacilityPopup = (e: maplibregl.MapMouseEvent) => {
            const features = map.queryRenderedFeatures(e.point);
            if (!features.length) return; // No features found

            const feature = features[0];
            if (!feature) return;

            map.getCanvas().style.cursor = 'pointer';

            const properties = feature.properties ?? {};
            const popupContent = `
            <div class="rounded-xl border bg-white p-4 shadow-xl space-y-2 w-64">
                <strong>施設名:</strong> ${properties?.名前 ?? '不明'}<br />
                <strong>住所:</strong> ${properties?.住所 ?? '不明'}<br />
                <strong>カテゴリ:</strong> ${properties?.カテゴリ ?? '不明'}<br />
                <strong>地図用のカテゴリ:</strong> ${properties?.category6 ?? '不明'}<br />
                <strong>リスト表示用カテゴリ:</strong> ${properties?.リスト表示用カテゴリ ?? '不明'}<br />
                <strong>凡例グループ:</strong> ${properties?.凡例グループ ?? '不明'}<br />
                <strong>NO:</strong> ${properties?.NO ?? '不明'}
            </div>
        `;

            transportPopupRef.setLngLat(e.lngLat).setHTML(popupContent).addTo(map);
        };



        const hideKashiwaPublicFacilityPopup = () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        };

        // Add hover interaction for all layers (individual filters and subete layer)
        const layers = [
            'kashiwa-public-facility-subete', // Subete layer
            ...categories.map(category => `kashiwa-public-facility-${category.label}`) // Individual filter layers
        ];

        layers.forEach(layerId => {
            // Ensure the hover event is added for each layer
            map.on('mousemove', layerId, showKashiwaPublicFacilityPopup);
            map.on('mouseleave', layerId, hideKashiwaPublicFacilityPopup);
        });


        const showKashiwaShopsPopup = (e: maplibregl.MapMouseEvent) => {
            const features = map.queryRenderedFeatures(e.point);

            if (!features.length) return; // No features found

            const feature = features[0];
            if (!feature) return;

            map.getCanvas().style.cursor = 'pointer';

            const properties = feature.properties ?? {};
            const popupContent = `
            <div class="rounded-xl border bg-white p-4 shadow-xl space-y-2 w-64">
            <strong>カテゴリ:</strong> ${properties?.カテゴリ ?? '不明'}
                <strong>店舗ブランド:</strong> ${properties?.店舗ブランド ?? '不明'}<br />
                <strong>店舗名:</strong> ${properties?.店舗名 ?? '不明'}<br />
                <strong>郵便番号:</strong> ${properties?.郵便番号 ?? '不明'}<br />
                <strong>住所:</strong> ${properties?.住所 ?? '不明'}<br />
            </div>
        `;

            transportPopupRef.setLngLat(e.lngLat).setHTML(popupContent).addTo(map);
        };

        const hideKashiwaShopsPopup = () => {
            map.getCanvas().style.cursor = '';
            transportPopupRef.remove();
        };

        // Add hover interaction for all layers (individual filters and subete layer)
        const kashiwaStopLayers = [
            'kashiwa-shops-subete', // Subete layer
            ...shopCategories.map(category => `kashiwa-shops-${category.label}`) // Individual filter layers
        ];

        kashiwaStopLayers.forEach(layerId => {
            // Ensure the hover event is added for each layer
            map.on('mousemove', layerId, showKashiwaShopsPopup);
            map.on('mouseleave', layerId, hideKashiwaShopsPopup);
        });

        return () => {
            maplibregl.removeProtocol('pmtiles');
        };

    }, []);

    useEffect(() => {
        if (!odGridVisible) return;
        const map = mapRef.current!;
        updateKashiwakuruOdGridLayer(map, setIsLoading, {
            timeBand: odGridFilterOn ? ([odGridHour, odGridHour + 1] as [number, number]) : null,
            showGrid: odGridShowGrid,
            undirected: odGridUndirected,
            minVolThreshold: odGridMinVol,
            focusMode: odGridFocusMode,
        });
    }, [
        odGridVisible,
        odGridFilterOn,
        odGridHour,
        odGridShowGrid,
        odGridUndirected,
        odGridMinVol,         // NEW
        odGridFocusMode,      // NEW
    ]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        // @ts-ignore custom event from the layer
        const handler = (e: any) => setOdGridSingleOD(!!e?.active);

        // @ts-ignore
        map.on("odgrid:single-od", handler);
        return () => {
            // @ts-ignore
            map.off("odgrid:single-od", handler);
        };
    }, []);

    // useEffect(() => {
    //     let alive = true;
    //     (async () => {
    //         try {
    //             const [f1, f2] = await Promise.all([
    //                 fetch(FACILITIES_URL).then(r => r.json()),
    //                 fetch(SHOPS_URL).then(r => r.json()),
    //             ]);
    //             if (!alive) return;
    //             setFacilityFC(f1);
    //             setShopFC(f2);
    //         } catch (e) {
    //             console.error("Failed loading public/data GeoJSONs:", e);
    //         }
    //     })();
    //     return () => { alive = false; };
    // }, []);

    const facilityLegendRows = useMemo(() => rowsFromFC_FACILITIES(facilityFC ?? undefined), [facilityFC]);
    const shopLegendRows = useMemo(() => rowsFromFC_SHOPS(shopFC ?? undefined), [shopFC]);

    useEffect(() => {
        if (!mapRef.current) return;
        setAllPassengerLabelsVisible(mapRef.current, passengerLabelsVisible);
    }, [
        passengerLabelsVisible,
        // existing 6 passenger circles
        sakaeCourseRideLayerVisible,
        sakaeCourseDropLayerVisible,
        masuoCourseRideLayerVisible,
        masuoCourseDropLayerVisible,
        shonanCourseRideLayerVisible,
        shonanCourseDropLayerVisible,
        // Wani (市役所線) 4 circles
        waniOutboundRideLayerVisible,
        waniOutboundDropLayerVisible,
        waniReturnRideLayerVisible,
        waniReturnDropLayerVisible,
    ]);

    const onClearOdEndpointHighlight = () => {
        if (mapRef.current) clearOdEndpointFocus(mapRef.current);
    };

    const onToggleKashiwakuruOdFilter = (enabled: boolean) => {
        setKashiwakuruOdFilterOn(enabled);
        if (!mapRef.current) return;
        setKashiwakuruOdFilter(mapRef.current, enabled, kashiwakuruOdHour);
    };

    const onKashiwakuruOdHourChange = (h: number) => {
        setKashiwakuruOdHourState(h);
        if (!mapRef.current) return;
        if (kashiwakuruOdFilterOn) {
            setKashiwakuruOdHour(mapRef.current, h); // strict filter only when filter mode is enabled
        }
    };

    const toggleStationPassengersVisible = () => {
        const map = mapRef.current; if (!map) return;
        toggleRailwayStationPassengersLayer(
            map,
            stationPassengersVisible,
            setIsLoading,
            setStationPassengersVisible
        );
    };

    const cardTitle = (() => {
        if (agriLayerVisible) return '柏市農地データ';
        if (transportVisible) return '交通機関運行情報_国土数値情報_2022年度';
        if (pbFacilityVisible) return '公共施設_国土数値情報_2006年度';
        if (schoolLayerVisible) return '学校_国土数値情報_2023年度';
        if (medicalLayerVisible) return '医療機関_国土数値情報_2020年度';
        if (touristLayerVisible) return '観光施設_国土数値情報_2014年度';
        if (roadsideStationLayerVisible) return '道の駅_国土数値情報_2018年度';
        if (attractionLayerVisible) return '集客施設_国土数値情報_2014年度';
        // you can add more cases here, e.g.:
        // if (adminVisible) return '行政界データ';
        // if (terrainEnabled) return '地形データ';
        return '2025年の人口推計データ';
    })();

    // metric = "total" | "aging" | "density"
    // opts = { palette?: "Blues"|"Greens"|"Oranges"|"Purples"; method?: "quantile"|"equal"|"jenks"; bins?: number; opacity?: number }
    const onChomeStyleChange = (
        metric: ChomeMetric,
        opts: {
            palette?: "Blues" | "Greens" | "Oranges" | "Purples";
            method?: "quantile" | "equal" | "jenks" | "manual";
            bins?: number;
            breaks?: number[];
            opacity?: number;
        }
    ) => {
        const map = mapRef.current!;
        updateKashiwaChomeStyle(map, metric, opts);
    };

    // Range filter: pass null for open-ended
    const onChomeRangeChange = (
        metric: ChomeMetric,
        min: number | null,
        max: number | null
    ) => {
        const map = mapRef.current!;
        setKashiwaChomeRangeFilter(map, metric, min, max);
    };

    // Labels toggle: mode = "name" | "metric"; if metric labels, specify which metric
    const onChomeLabelsChange = (
        visible: boolean,
        mode: "name" | "metric",
        metric: ChomeMetric
    ) => {
        const map = mapRef.current!;
        setKashiwaChomeLabelsVisible(map, visible, mode, metric);
    };

    // Rebuild with current UI options (hide → show)
    // const refreshOdGridLayer = () => {
    //     const map = mapRef.current;
    //     if (!map || !odGridVisible) return;

    //     const opts = {
    //         timeBand: odGridFilterOn ? [odGridHour, odGridHour + 1] as [number, number] : null,
    //         showGrid: odGridShowGrid,
    //         undirected: odGridUndirected,
    //     };

    //     // toggle OFF
    //     toggleKashiwakuruOdGridLayer(map, true, setIsLoading, setOdGridVisible, opts);
    //     // toggle ON with new options
    //     toggleKashiwakuruOdGridLayer(map, false, setIsLoading, setOdGridVisible, opts);
    // };
    const refreshOdGridLayer = () => {
        const map = mapRef.current;
        if (!map || !odGridVisible) return;

        const opts = {
            timeBand: odGridFilterOn ? ([odGridHour, odGridHour + 1] as [number, number]) : null,
            showGrid: odGridShowGrid,
            undirected: odGridUndirected,
            minVolThreshold: odGridMinVol,    // <-- already in your code? keep it here
            focusMode: odGridFocusMode,       // <-- already in your code? keep it here
            showStops: odGridShowStops,       // <-- NEW
        };

        // toggle OFF / ON (no await, same as your style)
        toggleKashiwakuruOdGridLayer(map, true, setIsLoading, setOdGridVisible, opts);
        toggleKashiwakuruOdGridLayer(map, false, setIsLoading, setOdGridVisible, opts);
    };

    // One-shot toggle
    const onToggleOdGrid = () => {
        const map = mapRef.current!;
        toggleKashiwakuruOdGridLayer(map, odGridVisible, setIsLoading, setOdGridVisible, {
            timeBand: odGridFilterOn ? ([odGridHour, odGridHour + 1] as [number, number]) : null,
            showGrid: odGridShowGrid,
            undirected: odGridUndirected,
            minVolThreshold: odGridMinVol,
            focusMode: odGridFocusMode,
            showStops: odGridShowStops,
        });
    };

    const onToggleOdGridFilter = (on: boolean) => {
        setOdGridFilterOn(on);
        if (odGridVisible) refreshOdGridLayer();
    };
    const onOdGridHourChange = (h: number) => {
        setOdGridHour(h);
        if (odGridVisible && odGridFilterOn) refreshOdGridLayer();
    };
    const onToggleOdGridShowGrid = (on: boolean) => {
        setOdGridShowGrid(on);
        if (odGridVisible) refreshOdGridLayer();
    };
    const onToggleOdGridUndirected = (on: boolean) => {
        setOdGridUndirected(on);
        if (odGridVisible) refreshOdGridLayer();
    };

    const onToggleOdGridShowStops = (on: boolean) => {
        setOdGridShowStops(on);
        if (!odGridVisible) return;
        const map = mapRef.current!;
        // Use UPDATE (no rebuild), and pass the new 'on' value explicitly
        updateKashiwakuruOdGridLayer(map, setIsLoading, {
            timeBand: odGridFilterOn ? ([odGridHour, odGridHour + 1] as [number, number]) : null,
            showGrid: odGridShowGrid,
            undirected: odGridUndirected,
            minVolThreshold: odGridMinVol,
            focusMode: odGridFocusMode,
            showStops: on, // <-- use the fresh value
        });
    };

    const onToggleElevationGrid = () =>
        mapRef.current &&
        toggleKashiwaElevationLayer(
            mapRef.current,
            elevationGridVisible,
            setIsLoading,
            setElevationGridVisible
        );

    const toggleCityMask = () =>
        toggleCityMaskLayer(
            mapRef.current!,
            cityMaskVisible,
            setIsLoading,
            setCityMaskVisible,
            {
                dimOpacity: 1,                 // stronger dim
                highlightOpacity: 0.14,           // gentle tint inside
                overlaysToRaise: [
                    // "bus-coverage-merged-fill",
                    // "bus-coverage-merged-line",
                    // "bus-coverage-stops-circle",
                    // add any others you render (OD grid, meshes, POIs…)
                ],
            }
        );



    const onOdGridMinVolChange = (n: number) => setOdGridMinVol(n);
    const onOdGridFocusModeChange = (m: "all" | "out" | "in") => setOdGridFocusMode(m);
    const onOdGridClearFocus = () => {
        const map = mapRef.current!;
        clearOdGridFocus(map);
        clearSingleOdSelection(map);
    };

    const toggleBusCoverage = () =>
        toggleBusCoverageLayer(
            mapRef.current!,
            busCoverageVisible,
            setIsLoading,
            setBusCoverageVisible,
            { radiusMeters: 300, showIndividual: false } // adjust as needed
        );

    const toggleBusStopPoints = () =>
        toggleBusStopPointsLayer(
            mapRef.current!,
            busStopPointsVisible,
            setIsLoading,
            setBusStopPointsVisible,
            { size: 4 } // tweak size/color if you want
        );

    const onToggleWaniOutboundRide = () =>
        mapRef.current &&
        toggleWaniOutboundRideLayer(
            mapRef.current,
            waniOutboundRideLayerVisible,
            setIsLoading,
            setWaniOutboundRideLayerVisible,
            passengerLabelsVisible
        );

    const onToggleWaniOutboundDrop = () =>
        mapRef.current &&
        toggleWaniOutboundDropLayer(
            mapRef.current,
            waniOutboundDropLayerVisible,
            setIsLoading,
            setWaniOutboundDropLayerVisible,
            passengerLabelsVisible
        );

    const onToggleWaniReturnRide = () =>
        mapRef.current &&
        toggleWaniReturnRideLayer(
            mapRef.current,
            waniReturnRideLayerVisible,
            setIsLoading,
            setWaniReturnRideLayerVisible,
            passengerLabelsVisible
        );

    const onToggleWaniReturnDrop = () =>
        mapRef.current &&
        toggleWaniReturnDropLayer(
            mapRef.current,
            waniReturnDropLayerVisible,
            setIsLoading,
            setWaniReturnDropLayerVisible,
            passengerLabelsVisible
        );

    const onToggleWaniRoute = () =>
        mapRef.current &&
        toggleWaniCityHallRouteLayer(
            mapRef.current,
            waniRouteVisible,
            setIsLoading,
            setWaniRouteVisible
        );

    const handleRadiusChange = async (r: number) => {
        setCoverageRadius(r);
        if (busCoverageVisible && mapRef.current) {
            await setBusCoverageRadius(mapRef.current, r);
        }
    };

    const handleExport = () => {
        if (mapRef.current) exportCoverageGeoJSON(mapRef.current);
    };

    const zoomToCoverage = () => {
        const map = mapRef.current;
        if (!map) return;
        const src = map.getSource("bus-coverage-merged-src") as maplibregl.GeoJSONSource | undefined;
        // fall back to our cache (already used in export)
        // @ts-ignore
        const data = src ? null : null;
        // We can just use the layer's bounds via queryRenderedFeatures when visible:
        const feats = map.queryRenderedFeatures({ layers: ["bus-coverage-merged-fill"] });
        if (!feats.length) return;
        const b = new maplibregl.LngLatBounds();
        feats.forEach((f) => {
            const g: any = f.geometry;
            function addCoords(coords: any) {
                if (typeof coords[0] === "number") b.extend(coords as [number, number]);
                else coords.forEach(addCoords);
            }
            addCoords(g.coordinates);
        });
        if (!b.isEmpty()) map.fitBounds(b, { padding: 40, duration: 600 });
    };

    const onToggleRailLines = () =>
        mapRef.current &&
        toggleRailwayLinesLayer(mapRef.current, railLinesVisible, setIsLoading, setRailLinesVisible);

    const onToggleRailStations = () =>
        mapRef.current &&
        toggleRailwayStationsLayer(mapRef.current, railStationsVisible, setIsLoading, setRailStationsVisible);

    const onToggleStationCoverage = () =>
        mapRef.current &&
        toggleStationCoverageLayer(mapRef.current, stationCoverageVisible, setIsLoading, setStationCoverageVisible);

    const hasAnyFacilities = selectedCategories.length > 0;
    const hasAnyKashiwakuru = newBusLayerVisible || newKashiwakuruRideLayerVisible || newKashiwakuruDropLayerVisible;
    const hasAnyShops = selectedShopCategories.includes("") ||
        shopCategoriesLegend.some(c => c.category && selectedShopCategories.includes(c.category));
    const hasAnyOdLegend = kashiwakuruOdVisible;

    const hasAnyChomeLegend =
        chomeTotalVisible || chomeAgingVisible || chomeDensityVisible || chomeTotal2040Visible || chomeAging2040Visible;

    const hasAnyBusCoverage = busCoverageVisible || busStopPointsVisible;
    const hasAnyBusRoutesLegend = busRoutesCommonVisible || busRoutesOtherVisible;
    const hasAnyRailLegend =
        railLinesVisible || railStationsVisible || stationPassengersVisible;
    const hasAnyMeshLegend = meshVisible;

    const hasAnyLegend =
        hasAnyBusLegend ||
        hasAnyFacilities ||
        hasAnyKashiwakuru ||   // KashiwakuruStopsLegend block
        odGridVisible ||       // OD Grid legend
        hasAnyShops ||
        busRoutesCommonVisible || busRoutesOtherVisible ||
        kashiwakuruOdVisible ||
        hasAnyChomeLegend ||
        hasAnyBusCoverage ||
        hasAnyRailLegend ||
        stationCoverageVisible || // railway legend(s)
        cityMaskVisible ||
        elevationGridVisible ||
        chibaRoadsVisible ||
        hasAnyMeshLegend ||
        busRoutesFrequencyVisible;



    return (
        <div className="relative w-screen h-screen">
            {isLoading && <LoadingOverlay />}

            <MapControls
                currentStyle={currentStyle}
                onStyleChange={handleStyleChange}
                roadsVisible={roadsVisible}
                toggleRoads={toggleRoads}
                adminVisible={adminVisible}
                toggleAdmin={() => toggleAdminBoundaries(mapRef.current!, adminVisible, setAdminVisible)}
                // terrainEnabled={terrainEnabled}
                // toggleTerrain={() => toggleTerrain(mapRef.current!, terrainEnabled, setTerrainEnabled)}
                fitToBounds={fitBoundsToKashiwa}
                agriLayerVisible={agriLayerVisible}
                toggleAgri={() => toggleAgriLayer(mapRef.current!, agriLayerVisible, setIsLoading, setAgriLayerVisible)}
                selectedMetric={selectedMetric}
                onMetricChange={(val) => {
                    setIsLoading(true);
                    setSelectedMetric(val);
                }}
                styles={MAP_STYLES}
                transportVisible={transportVisible}
                toggleTransport={() => toggleTransportationLayer(mapRef.current!, transportVisible, setIsLoading, setTransportVisible)}
                pbFacilityVisible={pbFacilityVisible}
                togglePbFacility={() => togglePublicFacilityLayer(mapRef.current!, pbFacilityVisible, setIsLoading, setPbFacilityVisible)}
                schoolLayerVisible={schoolLayerVisible}
                toggleSchoolLayer={() => toggleSchoolLayer(mapRef.current!, schoolLayerVisible, setIsLoading, setSchoolLayerVisible)}
                medicalLayerVisible={medicalLayerVisible}
                toggleMedicalLayer={() => toggleMedicalLayer(mapRef.current!, medicalLayerVisible, setIsLoading, setMedicalLayerVisible)}
                touristLayerVisible={touristLayerVisible}
                toggleTouristLayer={() => toggleTouristLayer(mapRef.current!, touristLayerVisible, setIsLoading, setTouristLayerVisible)}
                attractionLayerVisible={attractionLayerVisible}
                toggleAttractionLayer={() => toggleAttractionLayer(mapRef.current!, attractionLayerVisible, setIsLoading, setAttractionLayerVisible)}
                roadsideStationLayerVisible={roadsideStationLayerVisible}
                toggleRoadsideStationLayerVisible={() => toggleRoadsideStationLayer(mapRef.current!, roadsideStationLayerVisible, setIsLoading, setRoadsideStationLayerVisible)}
                busStopsVisible={busStopsVisible}
                toggleBusStops={() =>
                    toggleBusStops(mapRef.current!, busStopsVisible, setIsLoading, setBusStopsVisible)
                }
                boardingVisible={boardingVisible}
                toggleBoarding={() => toggleBoardingLayer(mapRef.current!, setBoardingVisible)}
                alightingVisible={alightingVisible}
                toggleAlighting={() => toggleAlightingLayer(mapRef.current!, setAlightingVisible)}
                busPickDropLayerVisible={busPickDropLayerVisible}
                toggleBusPickDropLayerVisible={() => toggleBusPickDropLayer(mapRef.current!, busPickDropLayerVisible, setIsLoading, setBusPickDropLayerVisible)}
                busPassengerLayerVisible={busPassengerLayerVisible}
                toggleBusPassengerLayerVisible={() => toggleBusPassengerLayer(mapRef.current!, busPassengerLayerVisible, setIsLoading, setBusPassengerLayerVisible)}
                sakaeCourseRideLayerVisible={sakaeCourseRideLayerVisible}
                toggleSakaeCourseRideLayerVisible={() => toggleSakaeCourseRideLayer(mapRef.current!, sakaeCourseRideLayerVisible, setIsLoading, setSakaeCourseRideLayerVisible, passengerLabelsVisible)}
                sakaeCourseDropLayerVisible={sakaeCourseDropLayerVisible}
                toggleSakaeCourseDropLayerVisible={() => toggleSakaeCourseDropLayer(mapRef.current!, sakaeCourseDropLayerVisible, setIsLoading, setSakaeCourseDropLayerVisible, passengerLabelsVisible)}
                masuoCourseRideLayerVisible={masuoCourseRideLayerVisible}
                toggleMasuoCourseRideLayerVisible={() => toggleMasuoCourseRideLayer(mapRef.current!, masuoCourseRideLayerVisible, setIsLoading, setMasuoCourseRideLayerVisible, passengerLabelsVisible)}
                masuoCourseDropLayerVisible={masuoCourseDropLayerVisible}
                toggleMasuoCourseDropLayerVisible={() => toggleMasuoCourseDropLayer(mapRef.current!, masuoCourseDropLayerVisible, setIsLoading, setMasuoCourseDropLayerVisible, passengerLabelsVisible)}
                shonanCourseRideLayerVisible={shonanCourseRideLayerVisible}
                toggleShonanCourseRideLayerVisible={() => toggleShonanCourseRideLayer(mapRef.current!, shonanCourseRideLayerVisible, setIsLoading, setShonanCourseRideLayerVisible, passengerLabelsVisible)}
                shonanCourseDropLayerVisible={shonanCourseDropLayerVisible}
                toggleShonanCourseDropLayerVisible={() => toggleShonanCourseDropLayer(mapRef.current!, shonanCourseDropLayerVisible, setIsLoading, setShonanCourseDropLayerVisible, passengerLabelsVisible)}
                captureMapScreenshot={() => {
                    if (mapRef.current) {
                        downloadMapScreenshot(mapRef.current);
                    }
                }}

                newbusLayerVisible={newBusLayerVisible}
                toggleNewBusLayerVisible={() => toggleNewBusPassengerLayer(mapRef.current!, newBusLayerVisible, setIsLoading, setNewBusLayerVisible)}

                newKashiwakuruRideLayerVisible={newKashiwakuruRideLayerVisible}
                toggleNewKashiwakuruRideLayerVisible={() => toggleNewKashiwakuruRideLayer(mapRef.current!, newKashiwakuruRideLayerVisible, setIsLoading, setNewKashiwakuruRideLayerVisible)}

                newKashiwakuruDropLayerVisible={newKashiwakuruDropLayerVisible}
                toggleNewKashiwakuruDropLayerVisible={() => toggleNewKashiwakuruDropLayer(mapRef.current!, newKashiwakuruDropLayerVisible, setIsLoading, setNewKashiwakuruDropLayerVisible)}

                kashiwaPublicFacilityVisible={kashiwaPublicFacilityVisible}
                toggleKashiwaPublicFacilityVisible={toggleKashiwaPublicFacilityVisible}
                selectedCategories={selectedCategories}
                setSelectedCategories={setSelectedCategories}

                toggleKashiwaShopsVisible={toggleKashiwaShopsVisible}
                selectedShopCategories={selectedShopCategories}

                shonanRouteVisible={shonanRouteVisible}
                toggleShonanRouteVisible={() =>
                    toggleShonanRoute(mapRef.current!, shonanRouteVisible, setIsLoading, setShonanRouteVisible)
                }

                masuoRouteVisible={masuoRouteVisible}
                toggleMasuoRouteVisible={() =>
                    toggleMasuoRoute(mapRef.current!, masuoRouteVisible, setIsLoading, setMasuoRouteVisible)
                }

                sakaiRouteVisible={sakaiRouteVisible}
                toggleSakaiRouteVisible={() =>
                    toggleSakaiRoute(mapRef.current!, sakaiRouteVisible, setIsLoading, setSakaiRouteVisible)
                }

                kashiwakuruOdVisible={kashiwakuruOdVisible}
                toggleKashiwakuruOdVisible={() => {
                    toggleKashiwakuruOdLayer(
                        mapRef.current!,
                        kashiwakuruOdVisible,
                        setIsLoading,
                        setKashiwakuruOdVisible,
                        kashiwakuruOdHour,
                        transportPopupRef
                    );

                    // If we just turned the layer ON, force "show all" and turn filter mode OFF.
                    const nowVisible = !kashiwakuruOdVisible;
                    if (nowVisible && mapRef.current) {
                        setKashiwakuruOdFilterOn(false);
                        showAllKashiwakuruOd(mapRef.current);
                    }
                }}
                kashiwakuruOdFilterOn={kashiwakuruOdFilterOn}                 // NEW
                onToggleKashiwakuruOdFilter={onToggleKashiwakuruOdFilter}     // NEW
                kashiwakuruOdHour={kashiwakuruOdHour}
                onKashiwakuruOdHourChange={onKashiwakuruOdHourChange}         // UPDATED
                onClearOdEndpointHighlight={onClearOdEndpointHighlight}

                chomeTotalVisible={chomeTotalVisible}
                toggleChomeTotalVisible={() =>
                    toggleKashiwaChomeTotalLayer(
                        mapRef.current!, chomeTotalVisible, setIsLoading, setChomeTotalVisible, transportPopupRef
                    )
                }

                elevationGridVisible={elevationGridVisible}
                toggleElevationGrid={onToggleElevationGrid}

                chomeAgingVisible={chomeAgingVisible}
                toggleChomeAgingVisible={() =>
                    toggleKashiwaChomeAgingLayer(
                        mapRef.current!, chomeAgingVisible, setIsLoading, setChomeAgingVisible, transportPopupRef
                    )
                }

                chomeDensityVisible={chomeDensityVisible}
                toggleChomeDensityVisible={() =>
                    toggleKashiwaChomeDensityLayer(
                        mapRef.current!, chomeDensityVisible, setIsLoading, setChomeDensityVisible, transportPopupRef
                    )
                }

                chomeTotal2040Visible={chomeTotal2040Visible}
                toggleChomeTotal2040Visible={() =>
                    toggleKashiwaChomeTotal2040Layer(
                        mapRef.current!, chomeTotal2040Visible, setIsLoading, setChomeTotal2040Visible, transportPopupRef
                    )
                }
                chomeAging2040Visible={chomeAging2040Visible}
                toggleChomeAging2040Visible={() =>
                    toggleKashiwaChomeAging2040Layer(
                        mapRef.current!, chomeAging2040Visible, setIsLoading, setChomeAging2040Visible, transportPopupRef
                    )
                }

                onChomeStyleChange={onChomeStyleChange}
                onChomeRangeChange={onChomeRangeChange}
                onChomeLabelsChange={onChomeLabelsChange}
                downloadPpt={downloadPpt}

                meshVisible={meshVisible}            // NEW
                toggleMesh={toggleMesh}

                terrainEnabled={terrainEnabled}
                toggleTerrain={toggleTerrain}

                passengerLabelsVisible={passengerLabelsVisible}
                togglePassengerLabelsVisible={onTogglePassengerLabels}

                subdivisionsVisible={subdivisionsVisible}
                toggleSubdivisionsVisible={onToggleSubdivisions}

                odGridVisible={odGridVisible}
                onToggleOdGrid={onToggleOdGrid}
                odGridFilterOn={odGridFilterOn}
                onToggleOdGridFilter={onToggleOdGridFilter}
                odGridHour={odGridHour}
                onOdGridHourChange={onOdGridHourChange}
                odGridShowGrid={odGridShowGrid}
                onToggleOdGridShowGrid={onToggleOdGridShowGrid}
                odGridUndirected={odGridUndirected}
                onToggleOdGridUndirected={onToggleOdGridUndirected}
                odGridMinVol={odGridMinVol}
                onOdGridMinVolChange={onOdGridMinVolChange}
                odGridFocusMode={odGridFocusMode}
                onOdGridFocusModeChange={onOdGridFocusModeChange}
                onOdGridClearFocus={onOdGridClearFocus}
                odGridShowStops={odGridShowStops}                    // <-- NEW
                onToggleOdGridShowStops={onToggleOdGridShowStops}    // <-- NEW
                odGridSingleOD={odGridSingleOD}

                busCoverageVisible={busCoverageVisible}
                toggleBusCoverage={toggleBusCoverage}
                busStopPointsVisible={busStopPointsVisible}        // NEW
                toggleBusStopPoints={toggleBusStopPoints}

                cityMaskVisible={cityMaskVisible}
                toggleCityMask={toggleCityMask}

                waniOutboundRideLayerVisible={waniOutboundRideLayerVisible}
                toggleWaniOutboundRideLayerVisible={() => onToggleWaniOutboundRide()}
                waniOutboundDropLayerVisible={waniOutboundDropLayerVisible}
                toggleWaniOutboundDropLayerVisible={() => onToggleWaniOutboundDrop()}
                waniReturnRideLayerVisible={waniReturnRideLayerVisible}
                toggleWaniReturnRideLayerVisible={() => onToggleWaniReturnRide()}
                waniReturnDropLayerVisible={waniReturnDropLayerVisible}
                toggleWaniReturnDropLayerVisible={() => onToggleWaniReturnDrop()}
                waniRouteVisible={waniRouteVisible}
                toggleWaniRouteVisible={() => onToggleWaniRoute()}

                busRoutesCommonVisible={busRoutesCommonVisible}
                toggleBusRoutesCommonVisible={() =>
                    toggleBusRoutesCommonLayer(
                        mapRef.current!, busRoutesCommonVisible, setIsLoading, setBusRoutesCommonVisible
                    )
                }
                busRoutesOtherVisible={busRoutesOtherVisible}
                toggleBusRoutesOtherVisible={() =>
                    toggleBusRoutesOtherLayer(
                        mapRef.current!, busRoutesOtherVisible, setIsLoading, setBusRoutesOtherVisible
                    )
                }

                railLinesVisible={railLinesVisible}
                toggleRailLinesVisible={onToggleRailLines}
                railStationsVisible={railStationsVisible}
                toggleRailStationsVisible={onToggleRailStations}
                stationCoverageVisible={stationCoverageVisible}
                toggleStationCoverageVisible={onToggleStationCoverage}

                facilityLegendRows={facilityLegendRows}
                shopLegendRows={shopLegendRows}

                facilityLabelsVisible={kashiwaFacilityLabelsVisible}             // <-- ADD
                toggleFacilityLabelsVisible={onToggleFacilityLabels}

                shopsLabelsVisible={kashiwaShopsLabelsVisible}
                toggleShopsLabelsVisible={onToggleShopsLabels}

                busRoutesHighlightedVisible={busRoutesHighlightedVisible}
                toggleBusRoutesHighlightedVisible={() =>
                    toggleBusRoutesHighlightedLayer(
                        mapRef.current!, busRoutesHighlightedVisible, setIsLoading, setBusRoutesHighlightedVisible
                    )
                }

                stationPassengersVisible={stationPassengersVisible}
                toggleStationPassengersVisible={toggleStationPassengersVisible}

                chibaRoadsVisible={chibaRoadsVisible}
                toggleChibaRoads={onToggleChibaRoads}

                busRoutesFrequencyVisible={busRoutesFrequencyVisible}
                toggleBusRoutesFrequencyVisible={() =>
                    toggleBusRoutesFrequencyLayer(
                        mapRef.current!,
                        busRoutesFrequencyVisible,
                        setIsLoading,
                        setBusRoutesFrequencyVisible,
                        busRoutesFrequencyDay,

                    )
                }
                busRoutesFrequencyDay={busRoutesFrequencyDay}
                onBusRoutesFrequencyDayChange={(d) => {
                    setBusRoutesFrequencyDay(d);
                    if (mapRef.current && busRoutesFrequencyVisible) {
                        updateBusRoutesFrequencyDay(mapRef.current, d);
                    }
                }}

                busRoutesFrequencyStyle={busRoutesFreqStyle}
                onBusRoutesFrequencyStyleChange={(cfg: FreqStyleConfig) => {
                    setBusRoutesFreqStyle(cfg);
                    if (mapRef.current && busRoutesFrequencyVisible) {
                        updateBusRoutesFrequencyStyle(mapRef.current, busRoutesFrequencyDay, cfg);
                    }
                }}

            />

            {/* <Legend selectedMetric={selectedMetric} /> */}

            <LegendsStack
                legendEnabled={hasAnyLegend}
                tablesVisible={facilityLegendOpen || shopLegendOpen}
                tables={
                    <>
                        {facilityLegendOpen && (
                            <LegendGroupTableInline
                                title="公共施設 — リスト表示用カテゴリ × 施設番号 × 施設名"
                                rows={facilityLegendRows}
                            />
                        )}
                        {shopLegendOpen && (
                            <LegendGroupTableInline
                                title="お店 — 凡例グループ × 施設番号 × 施設名"
                                rows={shopLegendRows}
                            />
                        )}
                    </>
                }
                visible={hasAnyBusLegend || hasAnyFacilities || hasAnyKashiwakuru || hasAnyShops || hasAnyOdLegend || hasAnyChomeLegend || odGridVisible || hasAnyBusCoverage || cityMaskVisible || hasAnyBusRoutesLegend || facilityLegendOpen || shopLegendOpen || hasAnyRailLegend || chibaRoadsVisible || hasAnyMeshLegend || elevationGridVisible || busRoutesFrequencyVisible} width="w-80">
                <AnimatePresence mode="popLayout">

                    {hasAnyBusLegend && (
                        <motion.div
                            key="legend-bus"
                            layout
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full"
                        >
                            <BusPassengerLayerLegend
                                className="w-full" // fills stack width
                                busPassengerLayerVisible={busPassengerLayerVisible}
                                sakaeCourseRideLayerVisible={sakaeCourseRideLayerVisible}
                                sakaeCourseDropLayerVisible={sakaeCourseDropLayerVisible}
                                masuoCourseRideLayerVisible={masuoCourseRideLayerVisible}
                                masuoCourseDropLayerVisible={masuoCourseDropLayerVisible}
                                shonanCourseRideLayerVisible={shonanCourseRideLayerVisible}
                                shonanCourseDropLayerVisible={shonanCourseDropLayerVisible}
                                sakaiRouteVisible={sakaiRouteVisible}
                                masuoRouteVisible={masuoRouteVisible}
                                shonanRouteVisible={shonanRouteVisible}
                                waniOutboundRideLayerVisible={waniOutboundRideLayerVisible}
                                waniOutboundDropLayerVisible={waniOutboundDropLayerVisible}
                                waniReturnRideLayerVisible={waniReturnRideLayerVisible}
                                waniReturnDropLayerVisible={waniReturnDropLayerVisible}
                                waniRouteVisible={waniRouteVisible}
                            />
                        </motion.div>
                    )}

                    {busRoutesFrequencyVisible && (
                        <motion.div
                            key="legend-bus-frequency"
                            layout
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full"
                        >
                            <BusFrequencyLegend
                                className="w-full"
                                visible={busRoutesFrequencyVisible}
                                day={busRoutesFrequencyDay}
                                style={busRoutesFreqStyle}
                            />
                        </motion.div>
                    )}

                    {hasAnyFacilities && (
                        <motion.div
                            key="legend-facilities"
                            layout
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full"
                        >
                            <KashiwaPublicFacilitiesLegend
                                className="w-full"
                                categories={facilityCategories}
                                selectedCategories={selectedCategories}
                            />
                        </motion.div>
                    )}

                    {hasAnyKashiwakuru && (
                        <motion.div
                            key="legend-kashiwakuru"
                            layout
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full"
                        >
                            <KashiwakuruStopsLegend
                                className="w-full"
                                newbusLayerVisible={newBusLayerVisible}
                                newKashiwakuruRideLayerVisible={newKashiwakuruRideLayerVisible}
                                newKashiwakuruDropLayerVisible={newKashiwakuruDropLayerVisible}

                            />
                        </motion.div>
                    )}

                    {odGridVisible && (
                        <motion.div
                            key="legend-od-grid"
                            layout
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full"
                        >
                            <KashiwakuruOdGridLegend
                                className="w-full"
                                visible={odGridVisible}
                                options={{
                                    filterOn: odGridFilterOn,
                                    hour: odGridHour,
                                    showGrid: odGridShowGrid,
                                    undirected: odGridUndirected,
                                    minVol: odGridMinVol,
                                    showStops: odGridShowStops,
                                }}
                            />
                        </motion.div>
                    )}

                    {elevationGridVisible && (
                        <motion.div
                            key="legend-elevation"
                            layout
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full"
                        >
                            <KashiwaElevationLegend className="w-full" />
                        </motion.div>
                    )}

                    {hasAnyRailLegend && (
                        <motion.div
                            key="legend-railway"
                            layout
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full"
                        >
                            <RailwayLegend
                                className="w-full"
                                railLinesVisible={railLinesVisible}
                                railStationsVisible={railStationsVisible}
                                stationPassengersVisible={stationPassengersVisible}
                                stationCoverageVisible={stationCoverageVisible}
                                stationCoverageRadiusMeters={null}
                            />
                        </motion.div>
                    )}

                    {hasAnyShops && (
                        <motion.div
                            key="legend-shops"
                            layout
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full"
                        >
                            <KashiwaShopsLegend
                                className="w-full"
                                categories={shopCategoriesLegend}
                                selectedCategories={selectedShopCategories}

                            />
                        </motion.div>
                    )}

                    {(busRoutesCommonVisible || busRoutesOtherVisible) && (
                        <motion.div
                            key="legend-bus-routes"
                            layout
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full"
                        >
                            <BusRoutesLinkedLegend
                                className="w-full"
                                commonVisible={busRoutesCommonVisible}
                                otherVisible={busRoutesOtherVisible}
                            />
                        </motion.div>
                    )}

                    {cityMaskVisible && (
                        <motion.div
                            key="city-mask"
                            layout
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full"
                        >
                            <CityMaskLegend
                                className="w-full"
                                visible={cityMaskVisible}
                                opacity={cityMaskOpacity}
                                onChange={setCityMaskOpacityState}
                            />
                        </motion.div>
                    )}


                    { /* OD legend */}
                    {kashiwakuruOdVisible && (
                        <motion.div
                            key="legend-od"
                            layout
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full"
                        >
                            <KashiwakuruOdLegend
                                className="w-full"
                                visible={kashiwakuruOdVisible}
                                filterOn={kashiwakuruOdFilterOn}
                                hour={kashiwakuruOdHour}
                            />
                        </motion.div>
                    )}

                    {hasAnyChomeLegend && (
                        <motion.div
                            key="legend-chome"
                            layout
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full"
                        >
                            <KashiwaChomePopulationLegend
                                map={mapRef.current || undefined}
                                totalVisible={chomeTotalVisible}
                                agingVisible={chomeAgingVisible}
                                densityVisible={chomeDensityVisible}
                                total2040Visible={chomeTotal2040Visible}
                                aging2040Visible={chomeAging2040Visible}
                            />
                        </motion.div>
                    )}

                    {chibaRoadsVisible && (
                        <motion.div
                            key="legend-chiba-roads"
                            layout
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full"
                        >
                            <ChibaRoadsLegend className="w-full" />
                        </motion.div>
                    )}

                    {hasAnyBusCoverage && (
                        <motion.div
                            key="legend-chome"
                            layout
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full"
                        >
                            <BusCoverageLegend
                                map={mapRef.current}
                                visible={busCoverageVisible || busStopPointsVisible}
                                radius={coverageRadius}
                                onRadiusChange={handleRadiusChange}
                                coverageOn={busCoverageVisible}
                                pointsOn={busStopPointsVisible}
                                onExport={handleExport}
                                onZoomToCoverage={zoomToCoverage}
                            />
                        </motion.div>
                    )}

                    {hasAnyMeshLegend && (
                        <motion.div
                            key="legend-mesh-population"
                            layout
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full"
                        >
                            <PopulationMeshLegend className="w-full" selectedMetric={selectedMetric} />
                        </motion.div>
                    )}



                </AnimatePresence>
            </LegendsStack>

            <h1 className={`absolute top-3 left-3 z-10 ${currentStyle === MAP_STYLES.ダーク ? "text-white" : "text-black"} text-lg font-mono rounded-2xl`}>
                FrameArk 1.0 Beta
            </h1>
            {!chatMeshRef && (
                <Card className='absolute bottom-10 right-3 z-10 text-black font-extrabold bg-white p-3 rounded-2xl'>
                    <h1>{cardTitle}</h1>
                </Card>
            )
            }
            <UserLayersPanel map={mapRef.current} open={userPanelOpen} onOpenChange={setUserPanelOpen} />

            <div ref={mapContainerRef} className="w-full h-full" />
        </div>
    );
}


