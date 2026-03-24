export type RGBA = {r: number, g: number, b: number, a: number};

export type LineAlg = 'bresenham' | 'wu';

export function clampByte(v: number): number {
    throw new Error('Not implemented: clampByte');
}

export function hexToRGBA(hex: string, alpha = 255): RGBA {
    // Не успел
    throw new Error('Not implemented hexToRGBA');
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
        return (y*this.width + x) * 4;
        // throw new Error('Not implemented: idx');
    }

    setPixel(x: number, y: number, color: RGBA) {
        const buf = this.buf;
        const index = this.idx(x, y);
        buf[index] = color.r;
        buf[index+1] = color.g;
        buf[index+2] = color.b;
        buf[index+3] = color.a;
        // throw new Error('Not implemented: setColor');
    }

    private blendPixel(x: number, y: number, color: RGBA, alphaFactor = 1) {
        throw new Error('Not implemented: blendPixel');
    }

    resize() {
        throw new Error('Not implemented: resize');
    }

    beginFrame(clear = true) {
        throw new Error('Not implemented: beginFrame');
    }

    commit() {
        throw new Error('Not implemented: commit');
    }

    drawLineBrassenham(x0: number, y0: number, x1: number, y1: number, color: RGBA) {
        throw new Error('Not implemented: drawLineBrassenham');
    }

    drawLineWu(x0: number, y0: number, x1: number, y1: number, color: RGBA) {
        throw new Error('Not implemented: drawLineWu');
    }

    private drawHSpan(y: number, x0: number, x1: number, color: RGBA) {
        throw new Error('Not implemented: drawHSpan');
    }

    fillPolygon(points: {x: number, y: number}[], color: RGBA) {
        throw new Error('Not implemented: fillPolygon');
    }

    fillCircle(cx: number, cy: number, radius: number, color: RGBA) {
        throw new Error('Not implemented: fillCircle');
    }

    strokeLine(x0: number, y0: number, x1: number, y1: number, color: RGBA, width = 1) {
        throw new Error('Not implemented: strokeLine');
    }

    strokePolygon(points: {x: number, y: number}[], color: RGBA, width = 1) {
        throw new Error('Not implemented: strokePolygon');
    }
}