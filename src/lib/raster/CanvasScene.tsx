import { useRef, useEffect, useState } from "react";
import { Point2D } from "../math/mat3";
import { Shape, Rect, Line, Ellipse, Triangle, QuadraticBezier, CubicBezier, PathBezier } from "../raster/ShapesVisualization";
import {RasterRenderer, LineAlg} from "./RasterRenderer";

interface CanvasSceneProps {
    // shapes: Shape[];
    // selectedId: string | null;
    // onSelect: (id: string | null) => void;
    // onUpdate: () => void;
    // overlayTick: number;
    lineAlg: LineAlg;
}

type InteractionMode = "IDLE" | "DRAGGING" | "RESIZING" | "ROTATING" | "EDITING_POINTS";

type HandleType = "TL" | "TR" | "BL" | "BR" | "TOP" | "RIGHT" | "BOTTOM" | "LEFT" | "ROTATION";

interface InteractionState {
    mode: InteractionMode,
    startX: number,
    startY: number,
    activeHandle: HandleType | null;
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

export const CanvasScene = ({ lineAlg }: CanvasSceneProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<RasterRenderer>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    
    const [shapes, setShapes] = useState<Shape[]>([]);
    const [selectedId, setSelectedId] = useState<Number | null>(null);
    
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

        setShapes([SomeRect, SomeLine, SomePathBezier]);
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
                            width: (currentSelected as any).width || 100,
                            height: (currentSelected as any).height || 100
                        }
                    };
                    return;
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

            const currentAngle = Math.atan2(coords.y - centerY, coords.x - centerX);
            const baseAngle = -Math.PI/2;
            activeShape.transform.rotation = currentAngle - baseAngle;
        }

        else if (interaction.mode === "RESIZING" && interaction.activeHandle) {
            const rad = -interaction.startTransform.rotation;
  
            // Проекция экранного вектора смещения мыши на локальные оси фигуры
            const localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const localDy = dx * Math.sin(rad) + dy * Math.cos(rad);

            const startW = interaction.startTransform.width!;
            const startH = interaction.startTransform.height!;

            // Инициализируем коэффициенты изменения масштаба
            let factorX = 1;
            let factorY = 1;
  
            // Локальное смещение центра объекта (нужно для фиксации противоположного угла)
            let localCenterX = 0;
            let localCenterY = 0;

            switch (interaction.activeHandle) {
                case "BR": // Нижний-правый: фиксирован Top-Left
                    factorX = (startW + localDx) / startW;
                    factorY = (startH + localDy) / startH;
                    localCenterX = localDx / 2;
                    localCenterY = localDy / 2;
                    break;

                case "TR": // Верхний-правый: фиксирован Bottom-Left
                    factorX = (startW + localDx) / startW;
                    factorY = (startH - localDy) / startH;
                    localCenterX = localDx / 2;
                    localCenterY = localDy / 2;
                    break;

                case "BL": // Нижний-левый: фиксирован Top-Right
                    factorX = (startW - localDx) / startW;
                    factorY = (startH + localDy) / startH;
                    localCenterX = localDx / 2;
                    localCenterY = localDy / 2;
                    break;

                case "TL": // Верхний-левый: фиксирован Bottom-Right
                    factorX = (startW - localDx) / startW;
                    factorY = (startH - localDy) / startH;
                    localCenterX = localDx / 2;
                    localCenterY = localDy / 2;
                    break;

                // Боковые маркеры (опционально)
                case "RIGHT":
                    factorX = (startW + localDx) / startW;
                    localCenterX = localDx / 2;
                    break;
                case "LEFT":
                    factorX = (startW - localDx) / startW;
                    localCenterX = localDx / 2;
                    break;
                case "BOTTOM":
                    factorY = (startH + localDy) / startH;
                    localCenterY = localDy / 2;
                    break;
                case "TOP":
                    factorY = (startH - localDy) / startH;
                    localCenterY = localDy / 2;
                    break;
            }

            // Защита от «выворачивания» объекта наизнанку (минимальный масштаб)
            const minScale = 0.1;
            const newScaleX = Math.max(minScale, interaction.startTransform.scaleX * factorX);
            const newScaleY = Math.max(minScale, interaction.startTransform.scaleY * factorY);

            // Применяем новый масштаб к фигуре
            activeShape.transform.scaleX = newScaleX;
            activeShape.transform.scaleY = newScaleY;

            // Поворачиваем локальное смещение центра обратно в мировые координаты экрана
            const origRad = interaction.startTransform.rotation;
            const worldCenterX = localCenterX * Math.cos(origRad) - localCenterY * Math.sin(origRad);
            const worldCenterY = localCenterX * Math.sin(origRad) + localCenterY * Math.cos(origRad);

            // Сдвигаем позицию фигуры, чтобы противоположный угол оставался мертвой точкой при ресайзе
            activeShape.transform.x = interaction.startTransform.x + worldCenterX;
            activeShape.transform.y = interaction.startTransform.y + worldCenterY;
        }
    };

    const hadnlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.currentTarget.releasePointerCapture(e.pointerId);

        if (interactionRef.current.mode != "IDLE") {
            interactionRef.current.mode = "IDLE";
            setShapes([...shapesRef.current]);
        }
    };

    const getHandleAtPosition = (shape: Shape, mouseX: number, mouseY: number): HandleType | null => {
        const bounds = shape.getBounds();
        const padding = 4;

        const left = bounds.minX - padding;
        const right = bounds.maxX + padding;
        const top = bounds.minY - padding;
        const bottom = bounds.maxY + padding;
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;

        const hitRadius = 8;

        const isHit = (hx: number, hy: number) => {
            return Math.abs(mouseX - hx) <= hitRadius && Math.abs(mouseY - hy) <= hitRadius;
        };

        if (isHit(centerX, top - 25)) return "ROTATION";

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
                        const bounds = selectedShape.getBounds();
                        const padding = 4;
                        const left = bounds.minX - padding;
                        const right = bounds.maxX + padding;
                        const top = bounds.minY - padding;
                        const bottom = bounds.maxY + padding;
                        const centerX = (left + right) / 2;
                        
                        r.strokePolygon(
                            [{x: left, y: top}, {x: right, y: top},
                            {x: right, y: bottom}, {x: left, y: bottom}],
                            {r: 0, g: 122, b: 204, a: 255}, 2
                        );

                        r.strokePolygon(
                            [{ x: centerX, y: top },
                            { x: centerX, y: top - 25 }], 
                            { r: 0, g: 122, b: 204, a: 255 }, 1.5
                        );

                        r.fillCircle(centerX, top - 25, 6, { r: 46, g: 204, b: 113, a: 255 });

                        const handlePositions = [
                            {x: left, y: top}, {x: right, y: top},
                            {x: left, y: bottom}, {x: right, y: bottom}
                        ];

                        handlePositions.forEach(point => {
                            r.fillCircle(point.x, point.y, 5, { r: 255, g: 255, b: 255, a: 255 });
                            r.strokePolygon(
                                [{x: point.x - 4, y: point.y - 4}, {x: point.x + 4, y: point.y - 4},
                                {x: point.x + 4, y: point.y + 4}, {x: point.x - 4, y: point.y + 4}],
                                { r: 0, g: 122, b: 204, a: 255 }, 1
                            );
                        });
                    }
                }
                
                r.commit();

                // let SomeRect: Shape = new Rect(70, 120);
                // SomeRect.transform.x = 600;
                // SomeRect.transform.y = 150;
                // SomeRect.transform.rotation = 1;
                // SomeRect.fillStyle = "#990000";
                // SomeRect.fillOpacity = 128;
                // SomeRect.strokeStyle = "#54a4f2";
                // shapes.push(SomeRect);
                // SomeRect.drawRaster(r);

                // let SomeLine: Shape = new Line(0, 0, 100, 120, 30);
                // // SomeLine.transform.rotation = 0;
                // SomeLine.transform.y = 100;
                // SomeLine.transform.x = 100;
                // SomeLine.transform.rotation = 2.4
                // SomeLine.fillStyle = "#d31486";
                // shapes.push(SomeLine);
                // SomeLine.drawRaster(r);

                // let SomeEllipse: Shape = new Ellipse(800, 200, 60, 60);
                // shapes.push(SomeEllipse);
                // SomeEllipse.transform.x = 900;
                // SomeEllipse.transform.y = 100;
                // SomeEllipse.drawRaster(r);

                // let SomeClone = SomeRect.clone();
                // SomeClone.transform.x += 100;
                // SomeClone.transform.y += 100;
                // SomeClone.drawRaster(r);

                // let SomeTriangle: Shape = new Triangle(0, 0, 30, 100, 60, 15);
                // shapes.push(SomeTriangle);
                // SomeTriangle.transform.x = 600; SomeTriangle.transform.y = 500;
                // SomeTriangle.drawRaster(r);

                // let TriClone = SomeTriangle.clone();
                // TriClone.transform.x += 200;
                // TriClone.transform.y += 50;
                // TriClone.drawRaster(r);

                // let SomeBezier: Shape = new QuadraticBezier(0, 0, 30, -100, 100, 0, true, 3);
                // SomeBezier.transform.y += 100;
                // SomeBezier.transform.x -= 150;
                // // SomeBezier.setControlPoint(1, {x: -30, y: 30});
                // // alert(SomeBezier.evalLocal(0.5).x + " " + SomeBezier.evalLocal(0.5).y);
                // shapes.push(SomeBezier);
                // SomeBezier.drawRaster(r);

                // let SomeQBezier: Shape = new CubicBezier(0, 0, 30, -100, 100, 100, 150, 0, true, 3);
                // SomeQBezier.transform.x += 200; 
                // // SomeQBezier.setControlPoint(0, {x: -30, y: 30});
                // shapes.push(SomeQBezier);
                // SomeQBezier.drawRaster(r);

                // let pathPoints: Point2D[] = [
                //     {x:   0, y:    0},
                //     {x:  50, y:   80},
                //     {x: 100, y: -100},
                //     {x: 150, y:  -30},
                //     {x:  80, y:    0},
                //     {x: -70, y: -150},
                //     {x:  25, y: -150}
                // ];
                // let SomePathBezier: Shape = new PathBezier(pathPoints, 'bezier', true, 3);
                // SomePathBezier.strokeStyle = "#9f003d";
                // // SomePathBezier.removePoint(0);
                // // SomePathBezier.addPointLocal({x: 200, y: -200}, 3);
                // shapes.push(SomePathBezier);
                // SomePathBezier.drawRaster(r);

                // // let SomeBound: Shape = new Rect(SomePathBezier.getBounds().maxX-SomePathBezier.getBounds().minX, SomePathBezier.getBounds().maxY-SomePathBezier.getBounds().minY);
                // // SomeBound.transform.x = SomePathBezier.getCenter().x;
                // // SomeBound.transform.y = SomePathBezier.getCenter().y;
                // r.commit(); // Вывести на экран
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
                onPointerUp={hadnlePointerUp}
                onPointerMove={handlePointerMove}
                className="w-full h-full border border-amber-400" 
                style={{touchAction: "none"}}/>
        </div>
    );
}