import { RasterRenderer, hexToRGBA, RGBA } from "./RasterRenderer";
import {mat3, Mat3, Point2D} from "../math/mat3";

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
    id = Math.floor(Math.random()*Number.MAX_SAFE_INTEGER);
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
        const curLocBounds = this.getLocalBounds();
        const localWidth = curLocBounds.maxX - curLocBounds.minX;
        const localHeight = curLocBounds.maxY - curLocBounds.minY;

        const targetWidth = maxX - minX;
        const targetHeight = maxY - minY;

        this.transform.scaleX = targetWidth / localWidth;
        this.transform.scaleY = targetHeight / localHeight;

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const localCenterX = (curLocBounds.minX + curLocBounds.maxX) / 2;
        const localCenterY = (curLocBounds.minY + curLocBounds.maxY) / 2;

        const sX = localCenterX * this.transform.scaleX;
        const sY = localCenterY * this.transform.scaleY;

        const cos = Math.cos(this.transform.rotation);
        const sin = Math.sin(this.transform.rotation);

        this.transform.x = centerX - (sX * cos - sY * sin);
        this.transform.y = centerY - (sX * sin + sY * cos);
        // throw new Error("Not implemented yet: resizeFromDeviceAABB()");
    }

    setBounds(minX: number, minY: number, maxX: number, maxY: number){
        throw new Error("Not implemented yet: setBounds()");
    }

    clone(){
        const copy: Shape = Object.create(this);
        copy.id = Math.floor(Math.random()*Number.MAX_SAFE_INTEGER);
        return copy;
        // throw new Error("Not implemented yet: clone()");
    }

    abstract drawRaster(r: RasterRenderer): void;
    abstract hitTest(px: number, py: number): boolean;
    abstract getBounds(): Bounds;
    abstract getLocalBounds(): Bounds;
    abstract toJSON(): string;
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

        r.fillPolygon(points, fillColor)
        r.strokePolygon(points, strokeColor, this.strokeWidth);
    }
    
    hitTest(px: number, py: number): boolean {
        var localPoint = this.transformPointToLocal(px, py);

        if (!localPoint) return false;

        if ((-this.width/2 <= localPoint.x && localPoint.x <= this.width/2)
            && (-this.height/2 <= localPoint.y && localPoint.y <= this.height/2)){
                return true;
        }
        else
            return false;
        // throw new Error("Not implemented yet: hitTest()");
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

    toJSON(): string {
        let rectProps = {
            id: this.id,
            type: 'rect',
            width: this.width,
            height: this.height,
            transform: {
                x: this.transform.x,
                y: this.transform.y,
                rotation: this.transform.rotation,
                scaleX: this.transform.scaleX,
                scaleY: this.transform.scaleY
            },
            fillStyle: this.fillStyle,
            fillOpacity: this.fillOpacity,
            strokeStyle: this.strokeStyle,
            strokeWidth: this.strokeWidth,
            strokeOpacity: this.strokeOpacity
        }

        let rectPropsJson = JSON.stringify(rectProps);
        return rectPropsJson;
    }
}

export class Line extends Shape{

    private length: number;
    constructor(public x0: number, public y0: number, public x1: number, public y1: number, public width: number = 1) {
        super();

        const dx = x1 - x0;
        const dy = y1 - y0;
        this.length = Math.sqrt(dx * dx + dy * dy);

        this.transform.x = (x0 + x1) / 2;
        this.transform.y = (y0 + y1) / 2;

        this.transform.rotation = Math.atan2(dy, dx);
    }
    
    
    drawRaster(r: RasterRenderer): void {
        const p0 = this.transformPointToDevice(-this.length / 2, 0);
        const p1 = this.transformPointToDevice(this.length / 2, 0);

        let fillColor: RGBA = hexToRGBA(this.fillStyle);
        fillColor.a = this.fillOpacity;
        this.strokeWidth = this.width;

        r.strokeLine(p0.x, p0.y, p1.x, p1.y, fillColor, this.strokeWidth);
    }
    
    hitTest(px: number, py: number): boolean {
        const localPoint = this.transformPointToLocal(px, py);
        if (!localPoint) return false;

        const halfLen = this.length / 2;
        const x = localPoint.x;
        const y = localPoint.y;

        const threshold = (this.strokeWidth / 2) + 5; 

        if (x >= -halfLen - threshold && x <= halfLen + threshold) {
            if (Math.abs(y) <= threshold) {
                return true;
            }
        }
        return false;
        // throw new Error("Not implemented yet: hitTest()");
    }

    getBounds(): Bounds {
        const p0 = this.transformPointToDevice(-this.length / 2, 0);
        const p1 = this.transformPointToDevice(this.length / 2, 0);
        return {
            minX: Math.min(p0.x, p1.x),
            minY: Math.min(p0.y, p1.y),
            maxX: Math.max(p0.x, p1.x),
            maxY: Math.max(p0.y, p1.y)
        };
    }

    getLocalBounds(): Bounds {
        return {
            minX: -this.length / 2,
            maxX: this.length / 2,
            minY: -0.5, // небольшая толщина для корректности математики
            maxY: 0.5
        }
        // throw new Error("Not implemented yet: getLocalBounds()");
    }

    toJSON(): string {
        let rectProps = {
            id: this.id,
            type: 'line',
            x0: this.x0,
            y0: this.y0,
            x1: this.x1,
            y1: this.y1,    
            transform: {
                x: this.transform.x,
                y: this.transform.y,
                rotation: this.transform.rotation,
                scaleX: this.transform.scaleX,
                scaleY: this.transform.scaleY
            },
            fillStyle: this.fillStyle,
            fillOpacity: this.fillOpacity,
            strokeStyle: this.strokeStyle,
            strokeWidth: this.strokeWidth,
            strokeOpacity: this.strokeOpacity
        }

        let rectPropsJson = JSON.stringify(rectProps);
        return rectPropsJson;
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

        r.fillPolygon(points, fillColor)
        r.strokePolygon(points, strokeColor, this.strokeWidth);
    }
    
    hitTest(px: number, py: number): boolean {
        var localPoint = this.transformPointToLocal(px, py);
        if (!localPoint) return false;

        var normCoords: Point2D = {x: localPoint.x/this.rx, y: localPoint.y/this.ry};
        if (normCoords.x*normCoords.x + normCoords.y*normCoords.y <= 1){
            return true;
        }
        else
            return false;
        // throw new Error("Not implemented yet: hitTest()");
    }

    getBounds(): Bounds {
        var points = [
            this.transformPointToDevice(-this.rx, -this.ry),
            this.transformPointToDevice(-this.rx,  this.ry),
            this.transformPointToDevice( this.rx,  this.ry),
            this.transformPointToDevice( this.rx, -this.ry)
        ]
        var bounds: Bounds = {
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
        // throw new Error("Not implemented yet: getLocalBounds()");
    }

    toJSON(): string {
        let rectProps = {
            id: this.id,
            type: 'ellipse',
            cx: this.cx,
            cy: this.cy,
            rx: this.rx,
            ry: this.ry,
            transform: {
                x: this.transform.x,
                y: this.transform.y,
                rotation: this.transform.rotation,
                scaleX: this.transform.scaleX,
                scaleY: this.transform.scaleY
            },
            fillStyle: this.fillStyle,
            fillOpacity: this.fillOpacity,
            strokeStyle: this.strokeStyle,
            strokeWidth: this.strokeWidth,
            strokeOpacity: this.strokeOpacity
        }

        let rectPropsJson = JSON.stringify(rectProps);
        return rectPropsJson;   
    }
}

export class Triangle extends Shape {
    constructor(public x1: number, public y1: number,
                public x2: number, public y2: number,
                public x3: number, public y3: number) {
        super();
    }
    
    drawRaster(r: RasterRenderer): void {
        const cx = (this.x1 + this.x2 + this.x3)/3;
        const cy = (this.y1 + this.y2 + this.y3)/3;
        let points = [
            this.transformPointToDevice(this.x1-cx, this.y1-cy),
            this.transformPointToDevice(this.x2-cx, this.y2-cy),
            this.transformPointToDevice(this.x3-cx, this.y3-cy),
        ];
        
        let fillColor: RGBA = hexToRGBA(this.fillStyle);
        fillColor.a = this.fillOpacity;
        let strokeColor: RGBA = hexToRGBA(this.strokeStyle);
        strokeColor.a = this.strokeOpacity;

        r.fillPolygon(points, fillColor)
        r.strokePolygon(points, strokeColor, this.strokeWidth);
        // throw new Error("Not implemented yet");
    }

    hitTest(px: number, py: number): boolean {
        let localPoint = this.transformPointToLocal(px, py);

        if (localPoint == null)
            return false;

        const cx = (this.x1 + this.x2 + this.x3)/3;
        const cy = (this.y1 + this.y2 + this.y3)/3;

        const ap: Point2D = {x: localPoint.x-(this.x1-cx), y: localPoint.y-(this.y1-cy)};
        const bp: Point2D = {x: localPoint.x-(this.x2-cx), y: localPoint.y-(this.y2-cy)};
        const cp: Point2D = {x: localPoint.x-(this.x3-cx), y: localPoint.y-(this.y3-cy)};

        const ab: Point2D = {x: this.x2-this.x1, y: this.y2-this.y1};
        const bc: Point2D = {x: this.x3-this.x2, y: this.y3-this.y2};
        const ca: Point2D = {x: this.x1-this.x3, y: this.y1-this.y3};

        const first = ab.x*ap.y - ab.y*ap.x;
        const second = bc.x*bp.y - bc.y*bp.x;
        const third = ca.x*cp.y - ca.y*cp.x;

        if (first > 0 && second > 0 && third > 0){
            return true;
        }
        else if (first < 0 && second < 0 && third < 0){
            return true;
        }
        else
            return false;
        // throw new Error("Not implemented yet");
    }

    getCenter(): Point2D {
        const center: Point2D = {x: this.transform.x, y: this.transform.y};
        return center;
        // throw new Error("Local getCenter called!");
    }

    getBounds(): Bounds {
        const cx = (this.x1 + this.x2 + this.x3)/3;
        const cy = (this.y1 + this.y2 + this.y3)/3;
        let globalPoints = [
            this.transformPointToDevice(this.x1-cx, this.y1-cx),
            this.transformPointToDevice(this.x2-cx, this.y2-cy),
            this.transformPointToDevice(this.x3-cx, this.y3-cy),
        ];
        let bounds: Bounds = {
            minX: Math.min(globalPoints[0].x, globalPoints[1].x, globalPoints[2].x),
            minY: Math.min(globalPoints[0].y, globalPoints[1].y, globalPoints[2].y),
            maxX: Math.max(globalPoints[0].x, globalPoints[1].x, globalPoints[2].x),
            maxY: Math.max(globalPoints[0].y, globalPoints[1].y, globalPoints[2].y)
        }
        return bounds;
        // throw new Error("Not implemented yet");
    }

    getLocalBounds(): Bounds {
        const cx = (this.x1 + this.x2 + this.x3)/3;
        const cy = (this.y1 + this.y2 + this.y3)/3;
        let bounds: Bounds = {
            minX: Math.min(this.x1-cx, this.x2-cx, this.x3-cx),
            minY: Math.min(this.y1-cy, this.y2-cy, this.y3-cy),
            maxX: Math.max(this.x1-cx, this.x2-cx, this.x3-cx),
            maxY: Math.max(this.y1-cy, this.y2-cy, this.y3-cy),
        }
        return bounds;
        // throw new Error("Not implemented yet");
    }

    toJSON(): string {
        let triangleProps = {
            id: this.id,
            type: 'triangle',
            point1: {x: this.x1, y: this.y1},
            point2: {x: this.x2, y: this.y2},
            point3: {x: this.x3, y: this.y3},
            transform: {
                x: this.transform.x,
                y: this.transform.y,
                rotation: this.transform.rotation,
                scaleX: this.transform.scaleX,
                scaleY: this.transform.scaleY
            },
            fillStyle: this.fillStyle,
            fillOpacity: this.fillOpacity,
            strokeStyle: this.strokeStyle,
            strokeWidth: this.strokeWidth,
            strokeOpacity: this.strokeOpacity
        }

        let trianglePropsJson = JSON.stringify(triangleProps);
        return trianglePropsJson;
        // throw new Error("Not implemented yet");
    }
}

export class QuadraticBezier extends Shape {
    constructor (public p0x: number, public p0y: number,
                 public p1x: number, public p1y: number,
                 public p2x: number, public p2y: number,
                 public closed: boolean = false,
                 public width: number = 1)
    {
        super();
    }

    drawRaster(r: RasterRenderer): void {
        let strokeColor: RGBA = hexToRGBA(this.strokeStyle);
        strokeColor.a = this.strokeOpacity;
        this.strokeWidth = this.width;
        //Рекурсивный алгоритм де Кастельжо для разбиения кривой на отрезки
        const tolerance = 0.5;
        let prevPoint: Point2D | null = null;

        const firstDevicePoint = this.transformPointToDevice(this.p0x, this.p0y);
        

        const sample = (
            x1: number, y1: number,
            x2: number, y2: number,
            x3: number, y3: number
        ) => {
            const xmid12 = (x1 + x2)/2;
            const ymid12 = (y1 + y2)/2;
            const xmid23 = (x2 + x3)/2;
            const ymid23 = (y2 + y3)/2;

            const x_curve = (xmid12 + xmid23)/2;
            const y_curve = (ymid12 + ymid23)/2;

            const dx = (x3-x1);
            const dy = (y3-y1);

            const d = Math.abs((y1 - y3) * x_curve + (x3 - x1) * y_curve + (x1 * y3 - x3 * y1)) / Math.sqrt(dx * dx + dy * dy);
            const segmentLengthSqr = dx * dx + dy * dy;

            if (d > tolerance && segmentLengthSqr > 1) {
                sample(x1, y1, xmid12, ymid12, x_curve, y_curve);
                sample(x_curve, y_curve, xmid23, ymid23, x3, y3);
            } else {
                const devicePoint = this.transformPointToDevice(x3, y3);

                if (prevPoint != null) {
                    r.strokeLine(prevPoint.x, prevPoint.y, devicePoint.x, devicePoint.y, strokeColor, this.strokeWidth);
                }
                
                prevPoint = devicePoint;
            }
        }
        
        prevPoint = this.transformPointToDevice(this.p0x, this.p0y);
        sample(this.p0x, this.p0y, this.p1x, this.p1y, this.p2x, this.p2y);

        if (this.closed && prevPoint != null){
            r.strokeLine(prevPoint.x, prevPoint.y, firstDevicePoint.x, firstDevicePoint.y, strokeColor, this.strokeWidth);
        }
        // throw new Error("Not implemented yet");
    }

    hitTest(px: number, py: number): boolean {
        let localPoint = this.transformPointToLocal(px, py);
        const ClickPadding = 5;

        const minX = Math.min(this.p0x, this.p1x, this.p2x) - ClickPadding;
        const minY = Math.min(this.p0y, this.p1y, this.p2y) - ClickPadding;
        const maxX = Math.max(this.p0x, this.p1x, this.p2x) + ClickPadding;
        const maxY = Math.max(this.p0y, this.p1y, this.p2y) + ClickPadding;

        if (localPoint == null)
            return false;

        if (localPoint.x < minX || localPoint.x > maxX || localPoint.y < minY || localPoint.y > maxY){
            return false;
        }
        //Вновь алгоритм де Кастельжо
        const tolerance = 1.5;
        let prevPoint: Point2D = {x: this.p0x, y: this.p0y};
        //Вспомогательная функция подсчёта расстояния
        const distanceToSegment = (x1: number, y1: number, x2: number, y2: number): number => {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const l2 = dx * dx + dy * dy;
            if (l2 === 0) return Math.sqrt((localPoint.x - x1) ** 2 + (localPoint.y - y1) ** 2);
        
            // Проекция точки клика на вектор отрезка
            let t = ((localPoint.x - x1) * dx + (localPoint.y - y1) * dy) / l2;
            t = Math.max(0, Math.min(1, t)); // Ограничиваем концами отрезка
        
            const projX = x1 + t * dx;
            const projY = y1 + t * dy;
            return Math.sqrt((localPoint.x - projX) ** 2 + (localPoint.y - projY) ** 2);
        };

        const sample = (
            x1: number, y1: number,
            x2: number, y2: number,
            x3: number, y3: number
        ): boolean => {
            const xmid12 = (x1 + x2)/2;
            const ymid12 = (y1 + y2)/2;
            const xmid23 = (x2 + x3)/2;
            const ymid23 = (y2 + y3)/2;

            const x_curve = (xmid12 + xmid23)/2;
            const y_curve = (ymid12 + ymid23)/2;

            const dx = (x3-x1);
            const dy = (y3-y1);

            const dLine = Math.sqrt(dx*dx + dy*dy);
            let d = 0;
            if (dLine > 0.001){
                d = Math.abs((y1 - y3)* x_curve + (x3 - x1) * y_curve + (x1 * y3 - x3 * y1)) / dLine;
            }
            const segmentLengthSqr = dx * dx + dy * dy;

            if (d > tolerance && segmentLengthSqr > 1) {
                if (sample(x1, y1, xmid12, ymid12, x_curve, y_curve)) {
                    return true;
                };
                return sample(x_curve, y_curve, xmid23, ymid23, x3, y3);
            } else {
                const dist = distanceToSegment(prevPoint.x, prevPoint.y, x3, y3)
                prevPoint = {x: x3, y: y3};
                return dist <= (this.width/2 + ClickPadding);
            }
        };

        if (sample(this.p0x, this.p0y, this.p1x, this.p1y, this.p2x, this. p2y)){
            return true;
        }
        if (this.closed){
            const distToClosingSegment = distanceToSegment(this.p2x, this.p2y, this.p0x, this.p0y);
            return distToClosingSegment <= (this.width/2 + ClickPadding);
        }
        return false;
        // throw new Error("Not implemented yet");
    }

    getBounds(): Bounds {
        let minX = Number.MAX_SAFE_INTEGER; let minY = Number.MAX_SAFE_INTEGER;
        let maxX = Number.MIN_SAFE_INTEGER; let maxY = Number.MIN_SAFE_INTEGER;
        for (let t = 0; t<1; t+=0.05){
            let point: Point2D = {
                x: (1-t)*(1-t)*this.p0x + 2*(1-t)*t*this.p1x + t*t*this.p2x,
                y: (1-t)*(1-t)*this.p0y + 2*(1-t)*t*this.p1y + t*t*this.p2y
            };
            let devicePoint = this.transformPointToDevice(point.x, point.y);
            if (devicePoint.x < minX)
                minX = devicePoint.x;
            if (devicePoint.y < minY)
                minY = devicePoint.y;
            if (devicePoint.x > maxX)
                maxX = devicePoint.x;
            if (devicePoint.y > maxY)
                maxY = devicePoint.y;
        }
        const bounds: Bounds = {
            minX: minX,
            minY: minY,
            maxX: maxX,
            maxY: maxY
        }
        return bounds;
        // throw new Error("Not implemented yet");
    }

    getLocalBounds(): Bounds {
        let minX = Number.MAX_SAFE_INTEGER; let minY = Number.MAX_SAFE_INTEGER;
        let maxX = Number.MIN_SAFE_INTEGER; let maxY = Number.MIN_SAFE_INTEGER;
        for (let t = 0; t<1; t+=0.05){
            let point: Point2D = {
                x: (1-t)*(1-t)*this.p0x + 2*(1-t)*t*this.p1x + t*t*this.p2x,
                y: (1-t)*(1-t)*this.p0y + 2*(1-t)*t*this.p1y + t*t*this.p2y
            };
            if (point.x < minX)
                minX = point.x;
            if (point.y < minY)
                minY = point.y;
            if (point.x > maxX)
                maxX = point.x;
            if (point.y > maxY)
                maxY = point.y;
        }
        const bounds: Bounds = {
            minX: minX,
            minY: minY,
            maxX: maxX,
            maxY: maxY
        }
        return bounds;
        // throw new Error("Not implemented yet");
    }

    getControlPoints(): Point2D[]{
        const controlPoints: Point2D[] = [
            {x: this.p0x, y: this.p0y},
            {x: this.p1x, y: this.p1y},
            {x: this.p2x, y: this.p2y}
        ];
        return controlPoints;
        // throw new Error("Not implemented yet");
    }

    setControlPoint(idx: number, localPt: Point2D): void{
        switch (idx){
            case 0:{
                this.p0x = localPt.x;
                this.p0y = localPt.y;
                break;
            }
            case 1:{
                this.p1x = localPt.x;
                this.p1y = localPt.y;
                break;
            }
            case 2:{
                this.p2x = localPt.x;
                this.p2y = localPt.y;
                break;
            }
            default: {
                alert("Error! Your point index is out of range (0;2)");
                break;
            }
        }
    }

    evalLocal(t: number): Point2D {
        const point: Point2D = {
            x: (1-t)*(1-t)*this.p0x + 2*(1-t)*t*this.p1x + t*t*this.p2x,
            y: (1-t)*(1-t)*this.p0y + 2*(1-t)*t*this.p1y + t*t*this.p2y
        };
        return point;
        // throw new Error("Not implemented yet");
    }

    toJSON(): string {
        let curveProps = {
            id: this.id,
            type: 'quad',
            p0: {x: this.p0x, y: this.p0y},
            p1: {x: this.p1x, y: this.p1y},
            p2: {x: this.p2x, y: this.p2y},
            transform: {
                x: this.transform.x,
                y: this.transform.y,
                rotation: this.transform.rotation,
                scaleX: this.transform.scaleX,
                scaleY: this.transform.scaleY
            },
            closed: this.closed,
            fillStyle: this.fillStyle,
            fillOpacity: this.fillOpacity,
            strokeStyle: this.strokeStyle,
            strokeWidth: this.strokeWidth,
            strokeOpacity: this.strokeOpacity
        }

        let curvePropsJSON = JSON.stringify(curveProps);
        return curvePropsJSON;
        // throw new Error("Not implemented yet");
    }
}

export class CubicBezier extends Shape {
    constructor (public p0x: number, public p0y: number,
                 public p1x: number, public p1y: number,
                 public p2x: number, public p2y: number,
                 public p3x: number, public p3y: number,
                 public closed: boolean = false,
                 public width: number = 1)
    {
        super();
    }

    drawRaster(r: RasterRenderer): void {
        let strokeColor: RGBA = hexToRGBA(this.strokeStyle);
        strokeColor.a = this.strokeOpacity;
        this.strokeWidth = this.width;
        //Рекурсивный алгоритм де Кастельжо для разбиения кривой на отрезки
        const tolerance = 0.5;
        let prevPoint: Point2D | null = null;

        const firstDevicePoint = this.transformPointToDevice(this.p0x, this.p0y);

        const sample = (
            x1: number, y1: number,
            x2: number, y2: number,
            x3: number, y3: number,
            x4: number, y4: number,
        ) => {
            const xmid12 = (x1 + x2)/2;
            const ymid12 = (y1 + y2)/2;
            const xmid23 = (x2 + x3)/2;
            const ymid23 = (y2 + y3)/2;
            const xmid34 = (x3 + x4)/2;
            const ymid34 = (y3 + y4)/2;

            const xmid123 = (xmid12 + xmid23) / 2;
            const ymid123 = (ymid12 + ymid23) / 2;
            const xmid234 = (xmid23 + xmid34) / 2;
            const ymid234 = (ymid23 + ymid34) / 2;

            const x_curve = (xmid123 + xmid234)/2;
            const y_curve = (ymid123 + ymid234)/2;

            const dx = (x4-x1);
            const dy = (y4-y1);
            const dLine = Math.sqrt(dx*dx + dy*dy);

            let d1 = 0;
            let d2 = 0;

            if (dLine > 0.001){
                d1 = Math.abs((y1 - y4) * x2 + (x4 - x1) * y2 + (x1 * y4 - x4 * y1)) / dLine;
                d2 = Math.abs((y1 - y4) * x3 + (x4 - x1) * y3 + (x1 * y4 - x4 * y1)) / dLine;
            }

            const segmentLengthSqr = dx * dx + dy * dy;

            if ((d1 > tolerance || d2 > tolerance) && segmentLengthSqr > 1) {
                sample(x1, y1, xmid12, ymid12, xmid123, ymid123, x_curve, y_curve);
                sample(x_curve, y_curve, xmid234, ymid234, xmid34, ymid34, x4, y4);
            } else {
                const devicePoint = this.transformPointToDevice(x4, y4);

                if (prevPoint != null) {
                    r.strokeLine(prevPoint.x, prevPoint.y, devicePoint.x, devicePoint.y, strokeColor, this.strokeWidth);
                }
                
                prevPoint = devicePoint;
            }
        }
        
        prevPoint = this.transformPointToDevice(this.p0x, this.p0y);
        sample(this.p0x, this.p0y, this.p1x, this.p1y, this.p2x, this.p2y, this.p3x, this.p3y);

        if (this.closed && prevPoint != null){
            r.strokeLine(prevPoint.x, prevPoint.y, firstDevicePoint.x, firstDevicePoint.y, strokeColor, this.strokeWidth);
        }
        // throw new Error("Not implemented yet");
    }

    hitTest(px: number, py: number): boolean {
        let localPoint = this.transformPointToLocal(px, py);
        const ClickPadding = 5;

        const minX = Math.min(this.p0x, this.p1x, this.p2x, this.p3x) - ClickPadding;
        const minY = Math.min(this.p0y, this.p1y, this.p2y, this.p3y) - ClickPadding;
        const maxX = Math.max(this.p0x, this.p1x, this.p2x, this.p3x) + ClickPadding;
        const maxY = Math.max(this.p0y, this.p1y, this.p2y, this.p3y) + ClickPadding;

        if (localPoint == null)
            return false;

        if (localPoint.x < minX || localPoint.x > maxX || localPoint.y < minY || localPoint.y > maxY){
            return false;
        }
        //Вновь алгоритм де Кастельжо
        const tolerance = 1.5;
        let prevPoint: Point2D = {x: this.p0x, y: this.p0y};
        //Вспомогательная функция подсчёта расстояния
        const distanceToSegment = (x1: number, y1: number, x2: number, y2: number): number => {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const l2 = dx * dx + dy * dy;
            if (l2 === 0) return Math.sqrt((localPoint.x - x1) ** 2 + (localPoint.y - y1) ** 2);
        
            // Проекция точки клика на вектор отрезка
            let t = ((localPoint.x - x1) * dx + (localPoint.y - y1) * dy) / l2;
            t = Math.max(0, Math.min(1, t)); // Ограничиваем концами отрезка
        
            const projX = x1 + t * dx;
            const projY = y1 + t * dy;
            return Math.sqrt((localPoint.x - projX) ** 2 + (localPoint.y - projY) ** 2);
        };

        const sample = (
            x1: number, y1: number,
            x2: number, y2: number,
            x3: number, y3: number,
            x4: number, y4: number
        ): boolean => {
            const xmid12 = (x1 + x2)/2;
            const ymid12 = (y1 + y2)/2;
            const xmid23 = (x2 + x3)/2;
            const ymid23 = (y2 + y3)/2;
            const xmid34 = (x3 + x4)/2;
            const ymid34 = (y3 + y4)/2;

            const xmid123 = (xmid12 + xmid23) / 2;
            const ymid123 = (ymid12 + ymid23) / 2;
            const xmid234 = (xmid23 + xmid34) / 2;
            const ymid234 = (ymid23 + ymid34) / 2;

            const x_curve = (xmid123 + xmid234)/2;
            const y_curve = (ymid123 + ymid234)/2;

            const dx = (x4-x1);
            const dy = (y4-y1);
            const dLine = Math.sqrt(dx*dx + dy*dy);

            let d1 = 0; let d2 = 0;
            if (dLine > 0.001){
                d1 = Math.abs((y1 - y4)* x2 + (x4 - x1) * x2 + (x1 * y4 - x4 * y1)) / dLine;
                d2 = Math.abs((y1 - y4)* x3 + (x4 - x1) * x3 + (x1 * y4 - x4 * y1)) / dLine;
            }
            const segmentLengthSqr = dx * dx + dy * dy;

            if ((d1 > tolerance || d2 > tolerance) && segmentLengthSqr > 1) {
                if (sample(x1, y1, xmid12, ymid12, xmid123, ymid123, x_curve, y_curve)) {
                    return true;
                };
                return sample(x_curve, y_curve, xmid234, ymid234, xmid34, ymid34, x3, y3);
            } else {
                const dist = distanceToSegment(prevPoint.x, prevPoint.y, x4, y4)
                prevPoint = {x: x4, y: y4};
                return dist <= (this.width/2 + ClickPadding);
            }
        };

        if (sample(this.p0x, this.p0y, this.p1x, this.p1y, this.p2x, this.p2y, this.p3x, this.p3y)){
            return true;
        }
        if (this.closed){
            const distToClosingSegment = distanceToSegment(this.p3x, this.p3y, this.p0x, this.p0y);
            return distToClosingSegment <= (this.width/2 + ClickPadding);
        }
        return false;
        // throw new Error("Not implemented yet");
    }

    getBounds(): Bounds {
        let minX = Number.MAX_SAFE_INTEGER; let minY = Number.MAX_SAFE_INTEGER;
        let maxX = Number.MIN_SAFE_INTEGER; let maxY = Number.MIN_SAFE_INTEGER;
        for (let t = 0; t<1; t+=0.05){
            let point: Point2D = {
                x: (1-t)*(1-t)*(1-t)*this.p0x + 3*(1-t)*(1-t)*t*this.p1x + 3*(1-t)*t*t*this.p2x + t*t*t*this.p3x,
                y: (1-t)*(1-t)*(1-t)*this.p0y + 3*(1-t)*(1-t)*t*this.p1y + 3*(1-t)*t*t*this.p2y + t*t*t*this.p3y
            };
            let devicePoint = this.transformPointToDevice(point.x, point.y);
            if (devicePoint.x < minX)
                minX = devicePoint.x;
            if (devicePoint.y < minY)
                minY = devicePoint.y;
            if (devicePoint.x > maxX)
                maxX = devicePoint.x;
            if (devicePoint.y > maxY)
                maxY = devicePoint.y;
        }
        const bounds: Bounds = {
            minX: minX,
            minY: minY,
            maxX: maxX,
            maxY: maxY
        }
        return bounds;
        // throw new Error("Not implemented yet");
    }

    getLocalBounds(): Bounds {
        let minX = Number.MAX_SAFE_INTEGER; let minY = Number.MAX_SAFE_INTEGER;
        let maxX = Number.MIN_SAFE_INTEGER; let maxY = Number.MIN_SAFE_INTEGER;
        for (let t = 0; t<1; t+=0.05){
            let point: Point2D = {
                x: (1-t)*(1-t)*(1-t)*this.p0x + 3*(1-t)*(1-t)*t*this.p1x + 3*(1-t)*t*t*this.p2x + t*t*t*this.p3x,
                y: (1-t)*(1-t)*(1-t)*this.p0y + 3*(1-t)*(1-t)*t*this.p1y + 3*(1-t)*t*t*this.p2y + t*t*t*this.p3y
            };
            if (point.x < minX)
                minX = point.x;
            if (point.y < minY)
                minY = point.y;
            if (point.x > maxX)
                maxX = point.x;
            if (point.y > maxY)
                maxY = point.y;
        }
        const bounds: Bounds = {
            minX: minX,
            minY: minY,
            maxX: maxX,
            maxY: maxY
        }
        return bounds;
        // throw new Error("Not implemented yet");
    }

    getControlPoints(): Point2D[]{
        const controlPoints: Point2D[] = [
            {x: this.p0x, y: this.p0y},
            {x: this.p1x, y: this.p1y},
            {x: this.p2x, y: this.p2y},
            {x: this.p3x, y: this.p3y}
        ];
        return controlPoints;
        // throw new Error("Not implemented yet");
    }

    setControlPoint(idx: number, localPt: Point2D): void{
        switch (idx){
            case 0:{
                this.p0x = localPt.x;
                this.p0y = localPt.y;
                break;
            }
            case 1:{
                this.p1x = localPt.x;
                this.p1y = localPt.y;
                break;
            }
            case 2:{
                this.p2x = localPt.x;
                this.p2y = localPt.y;
                break;
            }
            case 3:{
                this.p3x = localPt.x;
                this.p3y = localPt.y;
                break;
            }
            default: {
                alert("Error! Your point index is out of range (0;3)");
                break;
            }
        }
    }

    evalLocal(t: number): Point2D {
        const point: Point2D = {
            x: (1-t)*(1-t)*(1-t)*this.p0x + 3*(1-t)*(1-t)*t*this.p1x + 3*(1-t)*t*t*this.p2x + t*t*t*this.p3x,
            y: (1-t)*(1-t)*(1-t)*this.p0y + 3*(1-t)*(1-t)*t*this.p1y + 3*(1-t)*t*t*this.p2y + t*t*t*this.p3y
        };
        return point;
        // throw new Error("Not implemented yet");
    }

    toJSON(): string {
        let curveProps = {
            id: this.id,
            type: 'cubic',
            p0: {x: this.p0x, y: this.p0y},
            p1: {x: this.p1x, y: this.p1y},
            p2: {x: this.p2x, y: this.p2y},
            p3: {x: this.p3x, y: this.p3y},
            transform: {
                x: this.transform.x,
                y: this.transform.y,
                rotation: this.transform.rotation,
                scaleX: this.transform.scaleX,
                scaleY: this.transform.scaleY
            },
            closed: this.closed,
            fillStyle: this.fillStyle,
            fillOpacity: this.fillOpacity,
            strokeStyle: this.strokeStyle,
            strokeWidth: this.strokeWidth,
            strokeOpacity: this.strokeOpacity
        }

        let curvePropsJSON = JSON.stringify(curveProps);
        return curvePropsJSON;
        // throw new Error("Not implemented yet");
    }
}

export type PathBezierMode = 'polyline' | 'bezier' | 'catmull';
export class PathBezier extends Shape {
    constructor (
        public points: Point2D[],
        public mode: PathBezierMode,
        public closed: boolean,
        public width: number = 1) {
        super();
        this.strokeWidth = width;
    }

    private getSegemnts(toDevice: boolean): {p1: Point2D, p2: Point2D}[]{
        const segments: {p1: Point2D, p2: Point2D}[] = [];
        if (this.points.length < 2) return segments;

        const pts = this.points.map( //Вероятно, и не пригодится
            p => toDevice ? this.transformPointToDevice(p.x, p.y) : {x: p.x, y: p.y});
        const count = pts.length;
        const tolerance = 0.5;
        //Отрезки из кубической Безье
        const sampleCubic = (p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D) => {
            const recurse = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) => {
                const xmid12 = (x1 + x2)/2;
                const ymid12 = (y1 + y2)/2;
                const xmid23 = (x2 + x3)/2;
                const ymid23 = (y2 + y3)/2;
                const xmid34 = (x3 + x4)/2;
                const ymid34 = (y3 + y4)/2;

                const xmid123 = (xmid12 + xmid23) / 2;
                const ymid123 = (ymid12 + ymid23) / 2;
                const xmid234 = (xmid23 + xmid34) / 2;
                const ymid234 = (ymid23 + ymid34) / 2;

                const x_curve = (xmid123 + xmid234)/2;
                const y_curve = (ymid123 + ymid234)/2;

                const dx = (x4-x1);
                const dy = (y4-y1);
                const segmentLengthSqr = dx * dx + dy * dy;
                const d = Math.abs((y1 - y4) * x_curve + (x4 - x1) * y_curve + (x1 * y4 - x4 * y1)) / (Math.sqrt(dx * dx + dy * dy) || 1);

                if (d > tolerance && segmentLengthSqr > 1){
                    recurse(x1, y1, xmid12, ymid12, xmid123, ymid123, x_curve, y_curve);
                    recurse(x_curve, y_curve, xmid234, ymid234, xmid34, ymid34, x4, y4);
                } else {
                    segments.push({p1: {x: x1, y: y1}, p2: {x: x4, y: y4}});
                }
            };
            recurse(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        };
        //Отрезки из квадратичной Безье
        const sampleQuadratic = (p0: Point2D, p1: Point2D, p2: Point2D) => {
            const recurse = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
                const xmid12 = (x1 + x2)/2;
                const ymid12 = (y1 + y2)/2;
                const xmid23 = (x2 + x3)/2;
                const ymid23 = (y2 + y3)/2;

                const x_curve = (xmid12 + xmid23)/2;
                const y_curve = (ymid12 + ymid23)/2;

                const dx = (x3-x1);
                const dy = (y3-y1);
                const segmentLengthSqr = dx * dx + dy * dy;
                const d = Math.abs((y1 - y3)* x_curve + (x3 - x1) * y_curve + (x1 * y3 - x3 * y1)) / (Math.sqrt(dx * dx + dy * dy) || 1);

                if (d > tolerance && segmentLengthSqr > 1) {
                    recurse(x1, y1, xmid12, ymid12, x_curve, y_curve);
                    recurse(x_curve, y_curve, xmid23, ymid23, x3, y3);
                } else {
                    segments.push({p1: {x: x1, y: y1}, p2: {x: x3, y: y3}});
                }
            };
            recurse(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y);
        };
        //Режимы отрисовки
        if (this.mode == 'polyline') {
            for (let i = 0; i<(this.closed ? count : count - 1); ++i) {
                segments.push({p1: pts[i], p2: pts[(i+1) % count]});
            }
        }
        else if (this.mode == 'bezier') {
            if (this.closed) {
                // --- ЗАМКНУТЫЙ РЕЖИМ ---
                // Стартовая точка — середина между последней и первой точками
                let pStart = {
                    x: (pts[count - 1].x + pts[0].x) / 2,
                    y: (pts[count - 1].y + pts[0].y) / 2
                };
                let currentStart = pStart;

                for (let i = 0; i < count; ++i) {
                    const cp = pts[i]; // Текущая точка массива выступает как контрольная
                    const nextPt = pts[(i + 1) % count];
                    
                    // Конечная точка сегмента — середина между текущей контрольной и следующей
                    const pEnd = {
                        x: (cp.x + nextPt.x) / 2,
                        y: (cp.y + nextPt.y) / 2
                    };

                    sampleQuadratic(currentStart, cp, pEnd);
                    currentStart = pEnd; // Конец этой кривой — начало следующей
                }
            } else {
                // --- РАЗОМКНУТЫЙ РЕЖИМ ---
                // Линия начинается строго в первой точке и заканчивается строго в последней
                let currentStart = pts[0];

                for (let i = 1; i < count - 1; ++i) {
                    const cp = pts[i]; // Контрольная точка
                    const nextPt = pts[i + 1];
                    
                    // Точка на кривой (середина между управляющими)
                    const pEnd = {
                        x: (cp.x + nextPt.x) / 2,
                        y: (cp.y + nextPt.y) / 2
                    };

                    sampleQuadratic(currentStart, cp, pEnd);
                    currentStart = pEnd;
                }

                // Рисуем финальный сегмент до самой последней жесткой точки pts[count-1]
                if (count > 2) {
                    sampleQuadratic(currentStart, pts[count - 1], pts[count - 1]);
                }
            }
        }
        else if (this.mode == 'catmull') {
            for (let i = 0; i < (this.closed ? count : count - 1); ++i) {
                const p0 = pts[this.closed ? (i-1+count) % count : Math.max(0, i - 1)];
                const p1 = pts[i];
                const p2 = pts[(i+1) % count];
                const p3 = pts[this.closed ? (i+2) % count: Math.min(count - 1, i + 2)];

                const cp1 = {x: p1.x + (p2.x - p0.x)/6, y: p1.y + (p2.y - p0.y)/6};
                const cp2 = {x: p2.x - (p3.x - p1.x)/6, y: p2.y - (p3.y - p1.y)/6};
                
                sampleCubic(p1, cp1, cp2, p2);
            }
        }
        return segments;
        // throw new Error("Not implemented yet");
    }

    drawRaster(r: RasterRenderer): void {
        let strokeColor: RGBA = hexToRGBA(this.strokeStyle);
        strokeColor.a = this.strokeOpacity;

        const segments = this.getSegemnts(true);
        for (const seg of segments) {
            r.strokeLine(seg.p1.x, seg.p1.y,seg.p2.x, seg.p2.y, strokeColor, this.strokeWidth);
        }
        // throw new Error("Not implemented yet");
    }

    hitTest(px: number, py: number): boolean {
        let localPoint = this.transformPointToLocal(px, py);
        if (!localPoint) return false;

        const ClickPadding = 5;
        const segments = this.getSegemnts(false);
        const distanceToSegment = (p1: Point2D, p2: Point2D, pt: Point2D): number => {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const l2 = dx*dx + dy*dy;
            if (l2 == 0)
                return Math.sqrt((pt.x = p1.x) ** 2 + (pt.y - p1.y) ** 2);

            let t = ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / l2;
            t = Math.max(0, Math.min(1, t));
            return Math.sqrt((pt.x - (p1.x + t * dx)) ** 2 + (pt.y - (p1.y + t * dy)) ** 2);
        }

        for (const seg of segments) {
            if (distanceToSegment(seg.p1, seg.p2, localPoint) <= (this.width / 2 + ClickPadding)){
                return true;
            }
        }
        return false;
        // throw new Error("Not implemented yet");
    }

    private calculateBounds(toDevice: boolean): Bounds {
        if (this.points.length == 0) {
            return {minX: 0, minY: 0, maxX: 0, maxY: 0};
        }

        let minX = Number.MAX_SAFE_INTEGER; let minY = Number.MAX_SAFE_INTEGER;
        let maxX = Number.MIN_SAFE_INTEGER; let maxY = Number.MIN_SAFE_INTEGER;

        const segments = this.getSegemnts(toDevice);

        for (const seg of segments) {
            minX = Math.min(minX, seg.p1.x, seg.p2.x);
            minY = Math.min(minY, seg.p1.y, seg.p2.y);
            maxX = Math.max(maxX, seg.p1.x, seg.p2.x);
            maxY = Math.max(maxY, seg.p1.y, seg.p2.y);
        }
        return {minX, minY, maxX, maxY};
        // throw new Error("NOt implemented yet");
    }

    getBounds(): Bounds {
        return this.calculateBounds(true);
        // throw new Error("Not implemented yet");
    }

    getLocalBounds(): Bounds {
        return this.calculateBounds(false);
        // throw new Error("Not implemented yet");
    }

    getControlPoints(): Point2D[] {
        return this.points;
    }

    setControlPoint(idx: number, localPt: Point2D): void {
        if (idx > this.points.length - 1 || idx < 0)
            alert("Error! Your point index is out of range (0;" + (this.points.length - 1) +")");
        else{
            this.points[idx].x = localPt.x;
            this.points[idx].y = localPt.y;
        }
    }

    addPointLocal(localPt: Point2D, insertAtIndex?: number): void {
        if (insertAtIndex == null){
            this.points.push(localPt);
        }
        else {
            this.points.splice(insertAtIndex, 0, localPt);
        }
    }

    removePoint(index: number): void {
        this.points.splice(index, 1);
    }

    toJSON(): string {
        let curveProps = {
            id: this.id,
            type: 'path',
            points: this.points,
            mode: this.mode,
            transform: {
                x: this.transform.x,
                y: this.transform.y,
                rotation: this.transform.rotation,
                scaleX: this.transform.scaleX,
                scaleY: this.transform.scaleY
            },
            closed: this.closed,
            fillStyle: this.fillStyle,
            fillOpacity: this.fillOpacity,
            strokeStyle: this.strokeStyle,
            strokeWidth: this.strokeWidth,
            strokeOpacity: this.strokeOpacity
        }

        let curvePropsJSON = JSON.stringify(curveProps);
        return curvePropsJSON;
        // throw new Error("Not implemented yet");
    }
}