import {useRef, useEffect} from "react";
import { Mat3, mat3, Point2D } from "../math/mat3";

export type RGBA = {r: number, g: number, b: number, a: number};

export type LineAlg = 'bresenham' | 'wu';

export function clampByte(v: number): number {
    return Math.min(Math.max(v, 0), 255);
}

export function hexToRGBA(hex: string, alpha = 255): RGBA {
    let hexCode: string = hex.replace('#', '');
    
    if (hex.length == 3){
        hexCode = hexCode[0]+hexCode[0] + hexCode[1]+hexCode[1] + hexCode[2]+hexCode[2];
    }

    const red = parseInt(hexCode.substring(0, 2), 16),
          green = parseInt(hexCode.substring(2, 4), 16),
          blue = parseInt(hexCode.substring(4, 6), 16);

    const color: RGBA = {r: red, g: green, b: blue, a: alpha};
    return color;
}

function fpart(x: number){
    return (x - Math.floor(x));
}
function rfpart(x: number){
    return (1 - fpart(x))
}
function swap(a: number, b: number){
    const c: number = a;
    a = b;
    b = c;
}

export class RasterRenderer {
    private ctx: CanvasRenderingContext2D;
    private imageData: ImageData | null = null;
    private buf!: Uint8ClampedArray;

    width = 0;
    height = 0;
    dpr = 1;

    private canvas: HTMLCanvasElement;
    private _onWindowResize: () => void;
    private lineAlg: LineAlg = 'bresenham';

    constructor (canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('No 2D context');
        }

        this.ctx = ctx;
        this._onWindowResize = () => this.resize();
        window.addEventListener('resize', this._onWindowResize);

        this.resize();
    }

    dispose() {
        window.removeEventListener('resize', this._onWindowResize);
    }

    setLineAlgorithm(a: LineAlg) {
        this.lineAlg = a;
    }

    getLineAlgorithm(): LineAlg {
        return this.lineAlg;
    }

    drawLine(x0: number, y0: number, x1: number, y1: number, color: RGBA) {
        if (this.lineAlg == 'wu') {
            this.drawLineWu(x0, y0, x1, y1, color);
        }
        else {
            this.drawLineBrassenham(x0, y0, x1, y1, color);
        }
    }

    // This is where the fun begins...

    private idx(x: number, y: number) {
        const x_floored = Math.floor(x);
        const y_floored = Math.floor(y);
        return (y_floored*this.width + x_floored) * 4;
    }

    setPixel(x: number, y: number, color: RGBA) {

        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;

        const buf = this.buf;
        const index = this.idx(x, y);
        buf[index] = color.r;
        buf[index+1] = color.g;
        buf[index+2] = color.b;
        buf[index+3] = color.a;
    }

    private blendPixel(x: number, y: number, color: RGBA, alphaFactor = 1) {
        const buf = this.buf;
        const index = this.idx(x, y);

        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;

        const a = (color.a/255) * alphaFactor;
        const Inv_a = 1 - a;

        buf[index] = color.r*a + Inv_a*buf[index];
        buf[index+1] = color.g*a + Inv_a*buf[index+1];
        buf[index+2] = color.b*a + Inv_a*buf[index+2];
        buf[index+3] = color.a*a + Inv_a*buf[index+3];
    }

    resize() {
        this.canvas.width = window.innerWidth; //Тут что-то пошло не так...
        this.canvas.height = window.innerHeight; //Надо додумать
        this.dpr = window.devicePixelRatio || 1;

        this.width = Math.floor(this.canvas.width*this.dpr);
        this.height = Math.floor(this.canvas.height*this.dpr);

        this.buf = new Uint8ClampedArray(this.width * this.height * 4);
    }

    beginFrame(clear = true) {
        if (clear && this.buf) {
            this.buf.fill(0);
        }
    }

    commit() {
        if (!this.buf) return;
        
        this.imageData = new ImageData(this.width, this.height);
        this.imageData.data.set(this.buf);
        this.ctx.putImageData(this.imageData, 0, 0);
    }

    drawLineBrassenham(x0: number, y0: number, x1: number, y1: number, color: RGBA) {
        const delta_x = Math.abs(x1-x0);
        const delta_y = Math.abs(y1-y0);
        const sign_x = (x0 < x1) ? 1 : -1;
        const sign_y = (y0 < y1) ? 1 : -1;

        let err = delta_x - delta_y;
        while (x0 != x1 || y0 != y1) {
            this.setPixel(x0, y0, color);
            let e2 = 2*err;
            if (e2 >= -delta_y){
                x0 += sign_x;
                err -= delta_y;
            }
            if (e2 <= delta_x){
                y0 += sign_y;
                err += delta_x;
            }
        }
    }

    drawLineWu(x0: number, y0: number, x1: number, y1: number, color: RGBA) {
        const steep: boolean = Math.abs(y1-y0) > Math.abs(x1-x0)
        if (steep){
            swap(x0, y0);
            swap(x1, y1);
        }
        if (x0 > x1){
            swap(x0, x1);
            swap(y0, y1);
        }

        const dx: number = x1-x0;
        const dy: number = y1-y0;
        let gradient: number;
        if (dx == 0.0){
            gradient = 1.0;
        }
        else{
            gradient = dy/dx;
        }

        //Первая точка
        let xend = Math.floor(x0);
        let yend = y0 + gradient * (xend -x0);
        let xgap = 1 - (x0 - xend);
        let xpxl1 = xend; // Будет использован в конечном цикле
        let ypxl1 = Math.floor(yend);

        if (steep) {
            this.blendPixel(ypxl1, xpxl1, {r: color.r, g: color.g, b: color.b, a: rfpart(yend)*xgap*255})
            this.blendPixel(ypxl1+1, xpxl1, {r: color.r, g: color.g, b: color.b, a: fpart(yend)*xgap*255})
        }
        else{
            this.blendPixel(xpxl1, ypxl1, {r: color.r, g: color.g, b: color.b, a: rfpart(yend)*xgap*255})
            this.blendPixel(xpxl1, ypxl1+1, {r: color.r, g: color.g, b: color.b, a: fpart(yend)*xgap*255})
        }
        let intery = yend + gradient;

        // Вторая точка
        xend = Math.ceil(x1);
        yend = y1 + gradient * (xend - x1);
        xgap = 1 - (xend - x1);
        let xpxl2 = xend;
        let ypxl2 = Math.floor(yend);

        if (steep){
            this.blendPixel(ypxl2, xpxl2, {r: color.r, g: color.g, b: color.b, a: rfpart(yend)*xgap*255})
            this.blendPixel(ypxl2+1, xpxl2, {r: color.r, g: color.g, b: color.b, a: fpart(yend)*xgap*255})
        }
        else{
            this.blendPixel(xpxl2, ypxl2, {r: color.r, g: color.g, b: color.b, a: rfpart(yend)*xgap*255})
            this.blendPixel(xpxl2, ypxl2+1, {r: color.r, g: color.g, b: color.b, a: fpart(yend)*xgap*255})
        }

        // Главный цикл
        if (steep) {
            for (let x = xpxl1+1; x < xpxl2-1; ++x){
                this.blendPixel(Math.floor(intery), x, {r: color.r, g: color.g, b: color.b, a: rfpart(intery)*255})
                this.blendPixel(Math.floor(intery)+1, x, {r: color.r, g: color.g, b: color.b, a: fpart(intery)*255})
                intery = intery + gradient;
            }
        }
        else{
            for (let x = xpxl1+1; x < xpxl2-1; ++x){
                this.blendPixel(x, Math.floor(intery), {r: color.r, g: color.g, b: color.b, a: rfpart(intery)*255})
                this.blendPixel(x, Math.floor(intery)+1, {r: color.r, g: color.g, b: color.b, a: fpart(intery)*255})
                intery = intery + gradient;
            }
        }
    }

    private drawHSpan(y: number, x0: number, x1: number, color: RGBA) {
        let start: number = Math.min(x0, x1);
        let end: number = Math.max(x0, x1);
        const row: number = Math.floor(y);

        if (row < 0 || row >= this.height) return;
        start = Math.max(0, start);
        end = Math.min(this.width-1, end);
        const isTransparent: boolean = color.a < 255;

        for (let x = start; x <= end; ++x){
            if (isTransparent){
                this.blendPixel(x, row, color);
            } else{
                this.setPixel(x, y, color);
            }
        }
    }

    fillPolygon(points: {x: number, y: number}[], color: RGBA) {
        if (points.length < 3) return;

        let minY = Math.min(...points.map(p => p.y));
        let maxY = Math.max(...points.map(p => p.y));

        for (let y = Math.floor(minY); y <= Math.ceil(maxY); ++y){
            const crosses: number[] = [];

            for (let i = 0; i < points.length; ++i){
                const point1 = points[i];
                const point2 = points[(i+1) % points.length];

                if ((point1.y <= y && point2.y > y) || (point2.y <= y && point1.y > y)) {
                    const t = (y-point1.y)/(point2.y-point1.y);
                    const x = point1.x + t * (point2.x - point1.x);
                    crosses.push(x);
                }
            }
            crosses.sort((a,b) => a-b);

            for (let i = 0; i < crosses.length; ++i){
                if (crosses[i+1] !== undefined){
                    this.drawHSpan(y, crosses[i], crosses[i+1], color);
                }
            }
        }
    }

    fillCircle(cx: number, cy: number, radius: number, color: RGBA) {
        let dx: number;
        let xstart: number;
        let xend: number;
        for (let y = cy - radius; y <= cy + radius; ++y){
            dx = Math.sqrt(radius*radius - (y-cy)*(y-cy));
            xstart = cx - dx;
            xend = cx + dx;
            this.drawHSpan(y, xstart, xend, color);
        }
    }

    strokeLine(x0: number, y0: number, x1: number, y1: number, color: RGBA, width = 1) {
        const v_vector: {x: number, y: number} = {x: x1-x0, y: y1-y0};
        const L = Math.sqrt(v_vector.x*v_vector.x + v_vector.y*v_vector.y);

        const n1_vector: {x: number, y: number} = {x: -v_vector.y/L, y: v_vector.x/L};
        const half: number = width/2;

        const pts = [
                    { x: x0 + half*n1_vector.x, y: y0 + half*n1_vector.y },
                    { x: x0 - half*n1_vector.x, y: y0 - half*n1_vector.y },
                    { x: x1 - half*n1_vector.x, y: y1 - half*n1_vector.y },
                    { x: x1 + half*n1_vector.x, y: y1 + half*n1_vector.y }
                ];
        
        this.fillPolygon(pts, color);
        this.fillCircle(x0, y0, width/2, color);
        this.fillCircle(x1, y1, width/2, color);        
    }

    strokePolygon(points: {x: number, y: number}[], color: RGBA, width = 1) {
        for (let i = 0; i < points.length; ++i){
            const point1 = points[i];
            const point2 = points[(i+1) % points.length];

            this.strokeLine(point1.x, point1.y, point2.x, point2.y, color, width);
        }
    }
}

export type Transform = {
    x: number,
    y: number,
    rotation: number,
    scaleX: number,
    scaleY: number
}

export type Bounds = {
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
}

export abstract class Shape {
    id = 0;
    transform: Transform = {
        x: 400,
        y: 400,
        rotation: 0,
        scaleX: 1,
        scaleY: 1
    };
    fillStyle: string = "#000000";
    fillOpacity: number = 255;
    strokeStyle: string = "#00ff00";
    strokeWidth: number = 10;
    strokeOpacity: number = 255;

    getLocalToDeviceMatrix(): Mat3{
        const tf = this.transform;
        const shapeMatrix = mat3.fromTransform(tf.x, tf.y, tf.rotation, tf.scaleX, tf.scaleY);

        return shapeMatrix;
    }
    
    getDeviceToLocalMatrix(): Mat3 | null{
        const tf = this.transform;
        const shapeMatrix = mat3.fromTransform(tf.x, tf.y, tf.rotation, tf.scaleX, tf.scaleY);
        const invMat = mat3.invert(shapeMatrix);

        return invMat;
        // throw new Error("Not implemented yet: getDeviceToLocalMatrix()");
    }

    transformPointToDevice(px: number, py: number){
        const mat: Mat3 = this.getLocalToDeviceMatrix();
        var devicePoint: Point2D = mat3.transformPoint(mat, px, py);
        return devicePoint;
    }

    transformPointToLocal(px: number, py: number){
        const invMat = this.getDeviceToLocalMatrix();

        if (invMat != null){
            var localPoint: Point2D = mat3.transformPoint(invMat, px, py);
            return localPoint;
        }
    }

    getCenter(): Point2D{
        var bounds = this.getBounds();
        var center: Point2D = {
            x: (bounds.maxX + bounds.minX)/2,
            y: (bounds.maxY + bounds.minY)/2
        }
        return center;
    }

    resizeFromDeviceAABB(minX: number, minY: number, maxX: number, maxY: number){
        throw new Error("Not implemented yet: resizeFromDeviceAABB()");
    }

    setBounds(minX: number, minY: number, maxX: number, maxY: number){
        throw new Error("Not implemented yet: setBounds()");
    }

    clone(){
        throw new Error("Not implemented yet: clone()");
    }

    abstract drawRaster(r: RasterRenderer): void;
    abstract hitTest(px: number, py: number): boolean;
    abstract getBounds(): Bounds;
    abstract getLocalBounds(): Bounds;
    abstract toJSON(): void;
}

export class Rect extends Shape {
    constructor(public width: number, public height: number) {
        super();
    }

    drawRaster(r: RasterRenderer): void {
        let points = [
            {x: -this.width/2, y: -this.height/2},
            {x:  this.width/2, y: -this.height/2},
            {x:  this.width/2, y:  this.height/2},
            {x: -this.width/2, y:  this.height/2}
        ];

        for (let i = 0; i<4; ++i){
            var devicePoint = this.transformPointToDevice(points[i].x, points[i].y);
            points[i].x = devicePoint.x;
            points[i].y = devicePoint.y;
        }

        let fillColor: RGBA = hexToRGBA(this.fillStyle);
        fillColor.a = this.fillOpacity;

        let strokeColor: RGBA = hexToRGBA(this.strokeStyle);
        strokeColor.a = this.strokeOpacity;

        r.strokePolygon(points, strokeColor, this.strokeWidth);
        r.fillPolygon(points, fillColor)
    }
    
    hitTest(px: number, py: number): boolean {
        throw new Error("Not implemented yet: hitTest()");
    }

    getBounds(): Bounds {
        let points = [
            {x: -this.width/2, y: -this.height/2},
            {x:  this.width/2, y: -this.height/2},
            {x:  this.width/2, y:  this.height/2},
            {x: -this.width/2, y:  this.height/2}
        ];
        for (let i = 0; i<4; ++i){
            var devicePoint = this.transformPointToDevice(points[i].x, points[i].y);
            points[i].x = devicePoint.x;
            points[i].y = devicePoint.y;
        }

        let bounds: Bounds = {
            minX: Math.min(points[0].x, points[1].x, points[2].x, points[3].x),
            minY: Math.min(points[0].y, points[1].y, points[2].y, points[3].y),
            maxX: Math.max(points[0].x, points[1].x, points[2].x, points[3].x),
            maxY: Math.max(points[0].y, points[1].y, points[2].y, points[3].y)
        }
        return bounds;
    }

    getLocalBounds(): Bounds {
        let points = [
            {x: -this.width/2, y: -this.height/2},
            {x:  this.width/2, y: -this.height/2},
            {x:  this.width/2, y:  this.height/2},
            {x: -this.width/2, y:  this.height/2}
        ];
        let bounds: Bounds = {
            minX: Math.min(points[0].x, points[1].x, points[2].x, points[3].x),
            minY: Math.min(points[0].y, points[1].y, points[2].y, points[3].y),
            maxX: Math.max(points[0].x, points[1].x, points[2].x, points[3].x),
            maxY: Math.max(points[0].y, points[1].y, points[2].y, points[3].y)
        }
        return bounds;
        // throw new Error("Not implemented yet: getLocalBounds()");
    }

    toJSON(): void {
        
    }
}

export class Line extends Shape{
    constructor(public x0: number, public y0: number, public x1: number, public y1: number, public width: number = 1) {
        super();
    }
    
    drawRaster(r: RasterRenderer): void {
        var point_0 = this.transformPointToDevice((this.x0-this.x1)/2, (this.y0-this.y1)/2);
        var point_1 = this.transformPointToDevice((this.x1-this.x0)/2, (this.y1-this.y0)/2);

        let fillColor: RGBA = hexToRGBA(this.fillStyle);
        fillColor.a = this.fillOpacity;
        this.strokeWidth = this.width;

        r.strokeLine(point_0.x, point_0.y, point_1.x, point_1.y, fillColor, this.strokeWidth);
    }
    
    hitTest(px: number, py: number): boolean {
        throw new Error("Not implemented yet: hitTest()");
    }

    getBounds(): Bounds {
        var point_0 = this.transformPointToDevice((this.x0-this.x1)/2, (this.y0-this.y1)/2);
        var point_1 = this.transformPointToDevice((this.x1-this.x0)/2, (this.y1-this.y0)/2);

        let bounds: Bounds = {
            minX: Math.min(point_0.x, point_1.x),
            minY: Math.min(point_0.y, point_1.y),
            maxX: Math.max(point_0.x, point_1.x),
            maxY: Math.max(point_0.y, point_1.y)
        }
        return bounds;
    }

    getLocalBounds(): Bounds {
        let bounds: Bounds = {
            minX: Math.min(this.x0, this.x1),
            minY: Math.min(this.y0, this.y1),
            maxX: Math.max(this.x0, this.x1),
            maxY: Math.max(this.y0, this.y1)
        }
        return bounds;
        // throw new Error("Not implemented yet: getLocalBounds()");
    }

    toJSON(): void {
        
    }
}

export class Ellipse extends Shape {
    constructor(public cx: number, public cy: number, public rx: number, public ry: number) {
        super();
    }

    drawRaster(r: RasterRenderer): void {
        let points = [];
        for (let i = 0; i < 2*Math.PI; i += Math.PI/30){
            const point: Point2D = {x: this.rx * Math.cos(i), y: this.ry * Math.sin(i)};
            var ellipsePoint = this.transformPointToDevice(point.x, point.y);
            points.push(ellipsePoint);
        }

        let fillColor: RGBA = hexToRGBA(this.fillStyle);
        fillColor.a = this.fillOpacity;

        let strokeColor: RGBA = hexToRGBA(this.strokeStyle);
        strokeColor.a = this.strokeOpacity;

        r.strokePolygon(points, strokeColor, this.strokeWidth);
        r.fillPolygon(points, fillColor)
    }
    
    hitTest(px: number, py: number): boolean {
        throw new Error("Not implemented yet: hitTest()");
    }

    getBounds(): Bounds {
        var points = [
            this.transformPointToDevice(-this.rx, -this.ry),
            this.transformPointToDevice(-this.rx,  this.ry),
            this.transformPointToDevice( this.rx,  this.ry),
            this.transformPointToDevice( this.rx, -this.ry)
        ]
        var bounds: Bounds ={
            minX: Math.min(points[0].x, points[1].x, points[2].x, points[3].x),
            minY: Math.min(points[0].y, points[1].y, points[2].y, points[3].y),
            maxX: Math.max(points[0].x, points[1].x, points[2].x, points[3].x),
            maxY: Math.max(points[0].y, points[1].y, points[2].y, points[3].y)
        }
        return bounds;
        // throw new Error("Not implemented yet: getBounds()");
    }

    getLocalBounds(): Bounds {
        var points = [
            {x: -this.rx, y: -this.ry},
            {x: -this.rx, y:  this.ry},
            {x:  this.rx, y:  this.ry},
            {x:  this.rx, y: -this.ry}
        ]
        var bounds: Bounds ={
            minX: Math.min(points[0].x, points[1].x, points[2].x, points[3].x),
            minY: Math.min(points[0].y, points[1].y, points[2].y, points[3].y),
            maxX: Math.max(points[0].x, points[1].x, points[2].x, points[3].x),
            maxY: Math.max(points[0].y, points[1].y, points[2].y, points[3].y)
        }
        return bounds;
        throw new Error("Not implemented yet: getLocalBounds()");
    }

    toJSON(): void {
        
    }
}

interface CanvasSceneProps {
    // shapes: Shape[];
    // selectedId: string | null;
    // onSelect: (id: string | null) => void;
    // onUpdate: () => void;
    // overlayTick: number;
    lineAlg: LineAlg;
}

export const CanvasScene = ({ lineAlg }: CanvasSceneProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<RasterRenderer>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    
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
    
        if (containerRef.current) {
            ro.observe(containerRef.current);
        } else {
            ro.observe(canvas);
        }
    
        let raf = 0;

        const frame = () => {
            const r = rendererRef.current;
            if (r) {
                r.beginFrame(true); // очистить
                // Нарисовать фигуры (Пока фигур нет, этот код закомментирован)
                // for (const shape of shapes) {
                    // shape.drawRaster(r);
                // }
                // Попробуйте нарисвать красный полигон с черной обводкой или что-нибудь ещё
                r.drawLine(100, 100, 600, 450, {r: 255, g:255, b: 0, a: 255})

                r.fillCircle(650, 275, 150, {r: 255, g: 0, b: 0, a: 255});
                r.fillCircle(800, 275, 150, {r: 0, g: 255, b: 0, a: 240});
                r.fillCircle(725, 350, 150, {r: 0, g: 0, b: 255, a: 128});

                r.fillCircle(0, 0, 50, {r: 0, g: 0, b: 255, a: 128});
                r.fillCircle(1366, 768, 50, {r: 0, g: 0, b: 255, a: 128});

                const pts = [
                    { x: 100, y: 100 },
                    { x: 600, y: 100 },
                    { x: 50, y: 450 }
                ];

                const red = { r: 255, g: 0, b: 0, a: 255 };
                const black = { r: 0, g: 0, b: 0, a: 255 };
                r.fillPolygon(pts, red);
                r.strokeLine(725, 350, 1200, 600, black, 8);
                r.strokePolygon(pts, black, 2.5);

                r.drawLine(15, 15, 30, 5, {r: 255, g:0, b:0, a:255});

                //Primary shape
                let otherShape: Shape = new Line(0, 0, 100, 120, 15);
                otherShape.transform.rotation = 3;
                otherShape.transform.y = 500;
                otherShape.transform.x = 500;
                otherShape.drawRaster(r);

                //Dots for marking center and anchor
                r.fillCircle(otherShape.getCenter().x, otherShape.getCenter().y, 5, {r: 255, g: 0, b: 0, a: 255});
                r.fillCircle(otherShape.transform.x, otherShape.transform.y, 5, {r: 0, g: 255, b: 0, a: 255});

                //Alerts
                // alert("Transform: (" + otherShape.transform.x + ", " + otherShape.transform.y + ")");
                // alert("Bounds: " + otherShape.getBounds().minX + " " + otherShape.getBounds().minY + " " + otherShape.getBounds().maxX + " " + otherShape.getBounds().maxY + " ");
                // alert("Center: (" + otherShape.getCenter().x + ", " + otherShape.getCenter().y + ")");

                r.commit(); // Вывести на экран
            }
            raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            renderer.dispose();
            renderer.dispose();
        };
    }, []);

    return (
        <div ref={containerRef}>
            <canvas ref={canvasRef} className="w-full h-full border border-amber-400" />
        </div>
    );
}