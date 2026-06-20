import { useRef, useEffect} from "react";
import { Point2D } from "../math/mat3";
import { Shape, Rect, Line, Ellipse, Triangle, QuadraticBezier, CubicBezier, PathBezier } from "../raster/ShapesVisualization";
import {RasterRenderer, LineAlg} from "./RasterRenderer";

interface CanvasSceneProps {
    shapes: Shape[];
    selectedId: Number | null;
    setSelectedId: (id: Number | null) => void,
    setShapes: React.Dispatch<React.SetStateAction<Shape[]>>;
    lineAlg: LineAlg;
    currentTool: toolType;
}

export type toolType = 'select' | 'rect' | 'line' | 'ellipse' | 'triangle' | 'quad' | 'cubic' | 'path';

type InteractionMode = "IDLE" | "DRAGGING" | "RESIZING" | "ROTATING" | "EDITING_POINTS";

type HandleType = "TL" | "TR" | "BL" | "BR" | "TOP" | "RIGHT" | "BOTTOM" | "LEFT" | "ROTATION";

interface InteractionState {
    mode: InteractionMode,
    startX: number,
    startY: number,
    activeHandle: HandleType | null;
    activePointIndex?: number;
    startTransform: {
        x: number, 
        y: number, 
        rotation: number,
        scaleX: number, 
        scaleY: number
        width?: number,
        height?: number
    } | null;
}

export const CanvasScene = ({ lineAlg, shapes, setShapes, selectedId, setSelectedId, currentTool }: CanvasSceneProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<RasterRenderer>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const currentToolRef = useRef<toolType>(currentTool);

    useEffect(() => {
        currentToolRef.current = currentTool;
    }, [currentTool]);
    
    useEffect(() => {
        const SomeRect: Shape = new Rect(70, 120);
        SomeRect.transform.x = 600;
        SomeRect.transform.y = 150;
        SomeRect.transform.rotation = 1;
        SomeRect.fillStyle = "#990000";
        SomeRect.fillOpacity = 128;
        SomeRect.strokeWidth = 4;
        SomeRect.strokeStyle = "#54a4f2";

        const SomeLine: Shape = new Line(0, 0, 100, 120, 30);
        // SomeLine.transform.rotation = 0;
        SomeLine.transform.y = 100;
        SomeLine.transform.x = 100;
        SomeLine.transform.rotation = 2.4
        SomeLine.fillStyle = "#d31486";

        const pathPoints: Point2D[] = [
            {x:   0, y:    0},
            {x:  50, y:   80},
            {x: 100, y: -100},
            {x: 150, y:  -30},
            {x:  80, y:    0},
            {x: -70, y: -150},
            {x:  25, y: -150}
        ];
        const SomePathBezier: Shape = new PathBezier(pathPoints, 'bezier', true, 3);
        SomePathBezier.strokeStyle = "#9f003d";

        const SomeBezier: Shape = new QuadraticBezier(0, 0, 30, -100, 100, 0, true, 3);
        SomeBezier.transform.y += 100;
        SomeBezier.transform.x -= 150;

        const SomeQBezier: Shape = new CubicBezier(0, 0, 30, -100, 100, 100, 150, 0, true, 3);
        SomeQBezier.transform.x += 200;

        const SomeEllipse: Shape = new Ellipse(800, 200, 60, 60);
        SomeEllipse.transform.x = 900;
        SomeEllipse.transform.y = 100;

        const SomeTriangle: Shape = new Triangle(0, 0, 30, 100, 60, 15);
        SomeTriangle.transform.x = 600; SomeTriangle.transform.y = 500;

        setShapes([SomeRect, SomeLine, SomePathBezier, SomeBezier,
            SomeQBezier, SomeEllipse, SomeTriangle]);
    }, []);

    const shapesRef = useRef<Shape[]>([]);
    const selectedIdRef = useRef<Number | null>(null);
    useEffect(() => {shapesRef.current = shapes;}, [shapes]);
    useEffect(() => {selectedIdRef.current = selectedId;}, [selectedId]);

    const interactionRef = useRef<InteractionState>({
        mode: "IDLE",
        startX: 0, 
        startY: 0,
        activeHandle: null,
        startTransform: null
    });

    const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point2D => {
        const canvas = canvasRef.current;
        if (!canvas) return {x: 0, y: 0};
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        return {
            x: (e.clientX - rect.left) * dpr,
            y: (e.clientY - rect.top) * dpr
        };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const coords = getCanvasCoords(e);
        e.currentTarget.setPointerCapture(e.pointerId);

        const currentShapes = shapesRef.current;
        // let hitShape: Shape | null = null;
        if (selectedIdRef.current != null) {
            const currentSelected = currentShapes.find(shape => shape.id == selectedIdRef.current);
            if (currentSelected) {
                const hitHandle = getHandleAtPosition(currentSelected, coords.x, coords.y);

                if (hitHandle) {
                    let mode: InteractionMode = hitHandle == "ROTATION" ? "ROTATING" : "RESIZING";
                    
                    const localBounds = currentSelected.getLocalBounds();
                    const localWidth = localBounds.maxX - localBounds.minX;
                    const localHeight = localBounds.maxY - localBounds.minY;

                    interactionRef.current = {
                        mode: mode,
                        startX: coords.x,
                        startY: coords.y,
                        activeHandle: hitHandle,
                        startTransform: {
                            x: currentSelected.transform.x,
                            y: currentSelected.transform.y,
                            rotation: currentSelected.transform.rotation,
                            scaleX: currentSelected.transform.scaleX,
                            scaleY: currentSelected.transform.scaleY,
                            width: localWidth,
                            height: localHeight
                        }
                    };
                    return;
                }
            }
            if (currentSelected && typeof (currentSelected as any).getControlPoints == "function") {
                const localMouse = currentSelected.transformPointToLocal(coords.x, coords.y);

                if (localMouse != null) {
                    const localPoints: Point2D[] = (currentSelected as any).getControlPoints();
                    const hitRadius = 8;

                    const hitIndex = localPoints.findIndex(pt => 
                        Math.hypot(localMouse.x - pt.x, localMouse.y - pt.y) <= hitRadius
                    );
                    
                    if(hitIndex !== -1) {
                        interactionRef.current = {
                            mode: "EDITING_POINTS",
                            activeHandle: null,
                            activePointIndex: hitIndex,
                            startX: coords.x,
                            startY: coords.y,
                            startTransform: {...currentSelected.transform}
                        };
                        return;
                    }
                }
            }
        }

        let hitShape: Shape | null = null;
        for (let i = currentShapes.length - 1; i>= 0; --i){
            if (currentShapes[i].hitTest(coords.x, coords.y)){
                hitShape = currentShapes[i];
                break;
            }
        }

        if (hitShape){
            setSelectedId(hitShape.id);
            interactionRef.current = {
                mode: "DRAGGING",
                startX: coords.x,
                startY: coords.y,
                activeHandle: null,
                startTransform:{
                    x: hitShape.transform.x,
                    y: hitShape.transform.y,
                    rotation: hitShape.transform.rotation,
                    scaleX: hitShape.transform.scaleX,
                    scaleY: hitShape.transform.scaleY
                }
            };
        } else {
            const tool: toolType = currentToolRef.current;
            
            if (tool != 'select'){
                let newShape: Shape | null = null;

                switch (tool) {
                    case 'rect': {
                        newShape = new Rect(100, 80);
                        break;
                    }
                    case 'line': {
                        newShape = new Line(0, 0, 150, 100, 5);
                        break;
                    }
                    case 'ellipse': {
                        newShape = new Ellipse(0, 0, 50, 50);
                        break;
                    }
                    case 'triangle': {
                        newShape = new Triangle(0, 0, 50, 100, 100, 20);
                        break;
                    }
                    case 'quad': {
                        newShape = new QuadraticBezier(0, 0, 50, -50, 100, 0, true, 3);
                        break;
                    }
                    case 'cubic': {
                        newShape = new CubicBezier(0, 0, 30, -50, 70, 50, 100, 0, true, 3);
                        break;
                    }
                    case 'path': {
                        const defaultPoints = [{x: 0, y: 0}, {x: 50, y: 50}, {x: 100, y: 0}];
                        newShape = new PathBezier(defaultPoints, 'bezier', true, 3);
                        break;
                    }
                    default:{
                        break;
                    }
                }

                if (newShape) {
                    newShape.transform.x = coords.x;
                    newShape.transform.y = coords.y;
                    newShape.strokeStyle = '#54a4f2';
                    newShape.strokeWidth = 3;

                    const updatedShapes = [...currentShapes, newShape];
                    setShapes(updatedShapes);
                    setSelectedId(newShape.id);
                    
                    interactionRef.current = {
                        mode: "DRAGGING",
                        startX: coords.x,
                        startY: coords.y,
                        activeHandle: null,
                        startTransform: {
                            x: newShape.transform.x,
                            y: newShape.transform.y,
                            rotation: 0,
                            scaleX: 1,
                            scaleY: 1
                        }
                    };
                    return;
                }
            }
            setSelectedId(null);
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const interaction = interactionRef.current;
        if (interaction.mode == "IDLE" || !interaction.startTransform) return;

        const coords = getCanvasCoords(e);
        const activeShape = shapesRef.current.find(shape => shape.id == selectedIdRef.current);
        if (!activeShape) return;

        const dx = coords.x - interaction.startX;
        const dy = coords.y - interaction.startY;

        if (interaction.mode  == "DRAGGING") {
            activeShape.transform.x = interaction.startTransform.x + dx;
            activeShape.transform.y = interaction.startTransform.y + dy;
        }
        
        else if (interaction.mode == "ROTATING") {
            const centerX = interaction.startTransform.x;
            const centerY = interaction.startTransform.y;

            const mouseDx = coords.x - centerX;
            const mouseDy = coords.y - centerY;

            const currentAngle = Math.atan2(mouseDx, -mouseDy);
            const baseAngle = 0;
            activeShape.transform.rotation = currentAngle - baseAngle;
        }

        else if (interaction.mode === "RESIZING" && interaction.activeHandle) {
            const startTransform = interaction.startTransform;
            const origRad = startTransform.rotation;

            const dx = coords.x - interaction.startX;
            const dy = coords.y - interaction.startY;

            const localDx = dx * Math.cos(-origRad) - dy * Math.sin(-origRad);
            const localDy = dx * Math.sin(-origRad) + dy * Math.cos(-origRad);

            const baseW = startTransform.width ?? 1;
            const baseH = startTransform.height ?? 1;

            const currentW = baseW * startTransform.scaleX;
            const currentH = baseH * startTransform.scaleY;

            let factorX = 1;
            let factorY = 1;
            const bounds = activeShape.getLocalBounds();
            let localAnchorX = 0;
            let localAnchorY = 0;

            switch (interaction.activeHandle) {
                case "BR":
                    factorX = (currentW + localDx) / currentW;
                    factorY = (currentH + localDy) / currentH;
                    localAnchorX = bounds.minX;
                    localAnchorY = bounds.minY;
                    break;

                case "TL":
                    factorX = (currentW - localDx) / currentW;
                    factorY = (currentH - localDy) / currentH;
                    localAnchorX = bounds.maxX;
                    localAnchorY = bounds.maxY;
                    break;

                case "TR":
                    factorX = (currentW + localDx) / currentW;
                    factorY = (currentH - localDy) / currentH;
                    localAnchorX = bounds.minX;
                    localAnchorY = bounds.maxY;
                    break;

                case "BL": 
                    factorX = (currentW - localDx) / currentW;
                    factorY = (currentH + localDy) / currentH;
                    localAnchorX = bounds.maxX;
                    localAnchorY = bounds.minY;
                    break;
            }

            const minScale = 0.1;
            const maxScale = 20.0;
            
            let newScaleX = Math.max(minScale, Math.min(maxScale, startTransform.scaleX * factorX));
            let newScaleY = Math.max(minScale, Math.min(maxScale, startTransform.scaleY * factorY));
            
            const anchorWorldBeforeX = startTransform.x + (localAnchorX * startTransform.scaleX * Math.cos(origRad) - localAnchorY * startTransform.scaleY * Math.sin(origRad));
            const anchorWorldBeforeY = startTransform.y + (localAnchorX * startTransform.scaleX * Math.sin(origRad) + localAnchorY * startTransform.scaleY * Math.cos(origRad));
            
            activeShape.transform.scaleX = newScaleX;
            activeShape.transform.scaleY = newScaleY;
            
            const anchorWorldAfterX = localAnchorX * newScaleX * Math.cos(origRad) - localAnchorY * newScaleY * Math.sin(origRad);
            const anchorWorldAfterY = localAnchorX * newScaleX * Math.sin(origRad) + localAnchorY * newScaleY * Math.cos(origRad);
            
            activeShape.transform.x = anchorWorldBeforeX - anchorWorldAfterX;
            activeShape.transform.y = anchorWorldBeforeY - anchorWorldAfterY;
        }

        else if (interaction.mode === "EDITING_POINTS" && interaction.activePointIndex != undefined) {
            const idx = interaction.activePointIndex;

            const localMouse = activeShape.transformPointToLocal(coords.x, coords.y);
            if (localMouse != null) {
                (activeShape as any).setControlPoint(idx, localMouse);
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.currentTarget.releasePointerCapture(e.pointerId);

        if (interactionRef.current.mode != "IDLE") {
            interactionRef.current.mode = "IDLE";
            setShapes([...shapesRef.current]);
        }
    };

    const getHandleAtPosition = (shape: Shape, mouseX: number, mouseY: number): HandleType | null => {
        const localMouse = shape.transformPointToLocal(mouseX, mouseY);
        if (!localMouse) return null;
        
        const bounds = shape.getLocalBounds();
        
        const deviceTL = shape.transformPointToDevice(bounds.minX, bounds.minY);
        const deviceTR = shape.transformPointToDevice(bounds.maxX, bounds.minY);

        const middleTopX = (deviceTL.x + deviceTR.x) / 2;
        const middleTopY = (deviceTL.y + deviceTR.y) / 2;

        const origRad = shape.transform.rotation;
        const sin = Math.sin(origRad);
        const cos = Math.cos(origRad);

        const deviceRotX = middleTopX + 25 * sin;
        const deviceRotY = middleTopY - 25 * cos;

        const dx = mouseX - deviceRotX;
        const dy = mouseY - deviceRotY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const clickRadius = 10;
        if (distance <= clickRadius) return "ROTATION";

        const left = bounds.minX;
        const right = bounds.maxX;
        const top = bounds.minY;
        const bottom = bounds.maxY;
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;
        const hitRadius = 8 / shape.transform.scaleX;

        const isHit = (hx: number, hy: number) => {
            return Math.abs(localMouse.x - hx) <= hitRadius && Math.abs(localMouse.y - hy) <= hitRadius;
        };

        // if (isHit(centerX, top - 25)) return "ROTATION";

        if (isHit(left, top)) return "TL";
        if (isHit(right, top)) return "TR";
        if (isHit(left, bottom)) return "BL";
        if (isHit(right, bottom)) return "BR";

        if (isHit(centerX, top)) return "TOP";
        if (isHit(right, centerY)) return "RIGHT";
        if (isHit(centerX, bottom)) return "BOTTOM";
        if (isHit(left, centerY)) return "RIGHT";

        return null
    }

    // react to lineAlg changes
    useEffect(() => {
        if (rendererRef.current) {
            rendererRef.current.setLineAlgorithm(lineAlg);
        }
    }, [lineAlg]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        
        const renderer = new RasterRenderer(canvas);
        renderer.setLineAlgorithm(lineAlg)
        rendererRef.current = renderer;

        const ro = new ResizeObserver(() => {
            renderer.resize();
        });
        ro.observe(containerRef.current || canvas);
    
        let raf = 0;

        const frame = () => {
            const r = rendererRef.current;
            if (r) {
                r.beginFrame(true); // очистить

                const currentShapes = shapesRef.current;
                const currentSelectedId = selectedIdRef.current;

                currentShapes.forEach((shape) => {
                    shape.drawRaster(r);
                });

                if (currentSelectedId != null) {
                    const selectedShape = currentShapes.find(shape => shape.id == currentSelectedId);
                    if (selectedShape) {
                        const localBounds = selectedShape.getLocalBounds();
                        
                        const left = localBounds.minX;
                        const right = localBounds.maxX;
                        const top = localBounds.minY;
                        const bottom = localBounds.maxY;

                        const deviceTL = selectedShape.transformPointToDevice(left, top);
                        const deviceTR = selectedShape.transformPointToDevice(right, top);
                        const deviceBR = selectedShape.transformPointToDevice(right, bottom);
                        const deviceBL = selectedShape.transformPointToDevice(left, bottom);

                        const origRad = selectedShape.transform.rotation;
                        const cos = Math.cos(origRad);
                        const sin = Math.sin(origRad);

                        const middleTopX = (deviceTL.x + deviceTR.x) / 2;
                        const middleTopY = (deviceTL.y + deviceTR.y) / 2;

                        const deviceRotationHandleLineEnd = {x: middleTopX, y: middleTopY};
                        const deviceRotationHandleLineStart = {
                            x: middleTopX + 25*sin,
                            y: middleTopY - 25*cos
                        };
                        
                        r.strokePolygon(
                            [deviceTL, deviceTR, deviceBR, deviceBL],
                            {r: 0, g: 122, b: 204, a: 255}, 2
                        );

                        r.strokePolygon(
                            [deviceRotationHandleLineStart, deviceRotationHandleLineEnd], 
                            { r: 0, g: 122, b: 204, a: 255 }, 1.5
                        );

                        r.fillCircle(deviceRotationHandleLineStart.x, deviceRotationHandleLineStart.y, 6, { r: 46, g: 204, b: 113, a: 255 });

                        const handlePositions = [deviceTL, deviceTR, deviceBR, deviceBL];
                        handlePositions.forEach(point => {
                            r.fillCircle(point.x, point.y, 5, { r: 255, g: 255, b: 255, a: 255 });
                            r.strokePolygon(
                                [{x: point.x - 4, y: point.y - 4}, {x: point.x + 4, y: point.y - 4},
                                {x: point.x + 4, y: point.y + 4}, {x: point.x - 4, y: point.y + 4}],
                                { r: 0, g: 122, b: 204, a: 255 }, 1
                            );
                        });

                        if (typeof (selectedShape as any).getControlPoints === "function") {
                                const localPoints: Point2D[] = (selectedShape as any).getControlPoints();

                                // 1. Сначала переводим ВСЕ локальные точки в экранные координаты
                                const devicePoints = localPoints.map(pt => 
                                    selectedShape.transformPointToDevice(pt.x, pt.y)
                                );

                                // 2. Рисуем соединительные линии между точками кривой для наглядности
                                for (let i = 0; i < devicePoints.length - 1; i++) {
                                    r.strokePolygon(
                                        [devicePoints[i], devicePoints[i + 1]], 
                                        { r: 128, g: 128, b: 128, a: 150 }, // серые линии-"усики"
                                        1
                                    );
                                }

                                // 3. Рисуем кружочки на месте каждой точки
                                devicePoints.forEach((point, idx) => {
                                // Крайние точки сделаем синими, а управляющие — белыми с синим контуром
                                const isAnchor = (idx === 0 || idx === devicePoints.length - 1);
                                const color = isAnchor ? { r: 0, g: 122, b: 204, a: 255 } : { r: 255, g: 255, b: 255, a: 255 };

                                // Рисуем сам кружочек
                                r.fillCircle(point.x, point.y, 5, color);

                                // Рисуем рамку вокруг кружочка
                                r.strokePolygon(
                                    [{ x: point.x - 4, y: point.y - 4 }, { x: point.x + 4, y: point.y - 4 },
                                    { x: point.x + 4, y: point.y + 4 }, { x: point.x - 4, y: point.y + 4 }],
                                    { r: 0, g: 122, b: 204, a: 255 }, 
                                    1
                                );
                            });
                        }
                    }
                }
                
                r.commit();
            }
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            renderer.dispose();
        };
    }, []);

    return (
        <div ref={containerRef}>
            <canvas 
                ref={canvasRef} 
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerMove={handlePointerMove}
                className="w-full h-full border border-amber-400" 
                style={{touchAction: "none"}}/>
        </div>
    );
}