export type RGBA = {r: number, g: number, b: number, a: number};

export type LineAlg = 'bresenham' | 'wu';

export function clampByte(v: number): number {
    if (v<0)
        v = 0;
    else if (v > 255)
        v = 255;

    return v;
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

    // Это плохой blendPixel, ибо у него деление (StraightAlpha)
    private blendPixel(x: number, y: number, color: RGBA, alphaFactor = 1) {
        const buf = this.buf;
        const index = this.idx(x, y);

        const colorDest: RGBA = {r: buf[index], g: buf[index+1], b: buf[index+2], a: buf[index+3]};
        const alphaOut = color.a + colorDest.a*(1-color.a);

        //Тут я пока что так и не додумал
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
        alert("Method works");
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