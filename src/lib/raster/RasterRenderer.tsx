import {useRef, useEffect} from "react";

export type RGBA = {r: number, g: number, b: number, a: number};

export type LineAlg = 'bresenham' | 'wu';

export function clampByte(v: number): number {
    return Math.min(Math.max(v, 0), 255);
    // throw new Error('Not implemented: clampByte');
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
    // throw new Error('Not implemented hexToRGBA');
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
        // throw new Error('Not implemented: idx');
    }

    setPixel(x: number, y: number, color: RGBA) {

        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;

        const buf = this.buf;
        const index = this.idx(x, y);
        buf[index] = color.r;
        buf[index+1] = color.g;
        buf[index+2] = color.b;
        buf[index+3] = color.a;
        // throw new Error('Not implemented: setColor');
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
        // Наверное, рабочий... Чёрт его знает)
        // throw new Error('Not implemented: blendPixel');
    }

    resize() {
        this.canvas.width = window.innerWidth; //Тут что-то пошло не так...
        this.canvas.height = window.innerHeight; //Надо додумать
        this.dpr = window.devicePixelRatio || 1;

        this.width = Math.floor(this.canvas.width*this.dpr);
        this.height = Math.floor(this.canvas.height*this.dpr);

        this.buf = new Uint8ClampedArray(this.width * this.height * 4);
        // throw new Error('Not implemented: resize');
    }

    beginFrame(clear = true) {
        if (clear && this.buf) {
            this.buf.fill(0);
        }
        // throw new Error('Not implemented: beginFrame');
    }

    commit() {
        if (!this.buf) return;
        
        this.imageData = new ImageData(this.width, this.height);
        this.imageData.data.set(this.buf);
        this.ctx.putImageData(this.imageData, 0, 0);
        // throw new Error('Not implemented: commit');
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
        // Шиш знает, рабочий или нет... А проверить пока не получилось
        // throw new Error('Not implemented: drawLineBrassenham');
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
        // throw new Error('Not implemented: drawLineWu');
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
        // throw new Error('Not implemented: drawHSpan');
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
        // throw new Error('Not implemented: fillPolygon');
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
        // throw new Error('Not implemented: fillCircle');
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
        // throw new Error('Not implemented: strokeLine');
    }

    strokePolygon(points: {x: number, y: number}[], color: RGBA, width = 1) {
        for (let i = 0; i < points.length; ++i){
            const point1 = points[i];
            const point2 = points[(i+1) % points.length];

            this.strokeLine(point1.x, point1.y, point2.x, point2.y, color, width);
        }
        // throw new Error('Not implemented: strokePolygon');
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
            <canvas ref={canvasRef} className="w-full h-full border-1 border-amber-400" />
        </div>
    );
}