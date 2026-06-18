import {Shape, Rect, Line, Ellipse, Triangle, QuadraticBezier, CubicBezier, PathBezier} from "./raster/ShapesVisualization";

export function shapeFromJSON (jsonObj: any): Shape | null {
    if (!jsonObj || !jsonObj.type) return null;

    let shape: Shape | null = null;

    switch (jsonObj.type) {
        case 'rect' : {
            shape = new Rect(jsonObj.width, jsonObj.height);
            break;
        }
        case 'line' : {
            shape = new Line(jsonObj.x0, jsonObj.y0, jsonObj.x1, jsonObj.y1, jsonObj.strokeWidth);
            break;
        }
        case 'ellipse' : {
            shape = new Ellipse(jsonObj.cx, jsonObj.cy, jsonObj.rx, jsonObj.ry);
            break;
        }
        case 'triangle' : {
            shape = new Triangle(
                jsonObj.point1.x, jsonObj.point1.y,
                jsonObj.point2.x, jsonObj.point2.y,
                jsonObj.point3.x, jsonObj.point3.y
            );
            break;
        }
        case 'quad' : {
            shape = new QuadraticBezier(
                jsonObj.p0.x, jsonObj.p0.y,
                jsonObj.p1.x, jsonObj.p1.y,
                jsonObj.p2.x, jsonObj.p2.y,
                jsonObj.closed,
                jsonObj.strokeWidth
            );
            break;
        }
        case 'cubic' : {
            shape = new CubicBezier(
                jsonObj.p0.x, jsonObj.p0.y,
                jsonObj.p1.x, jsonObj.p1.y,
                jsonObj.p2.x, jsonObj.p2.y,
                jsonObj.p3.x, jsonObj.p3.y,
                jsonObj.closed,
                jsonObj.strokeWidth
            )
            break;   
        }
        case 'path' : {
            shape = new PathBezier(
                jsonObj.points, jsonObj.mode,
                jsonObj.closed, jsonObj.strokeWidth
            );
            break;
        }
        default : {
            console.warn(`Неизвестный тип фигуры: ${jsonObj.type}`);
            return null;
        }
    }

    if (shape) {
        shape.id = jsonObj.id ?? shape.id;
        shape.fillStyle = jsonObj.fillStyle ?? shape.fillStyle;
        shape.fillOpacity = jsonObj.fillOpacity ?? shape.fillOpacity;
        shape.strokeStyle = jsonObj.strokeStyle ?? shape.strokeStyle;
        shape.strokeOpacity = jsonObj.strokeOpacity ?? shape.strokeOpacity;
        shape.strokeWidth = jsonObj.strokeWidth ?? shape.strokeWidth;

        if (jsonObj.transform) {
            shape.transform = {
                x: jsonObj.transform.x,
                y: jsonObj.transform.y,
                rotation: jsonObj.transform.rotation,
                scaleX: jsonObj.transform.scaleX,
                scaleY: jsonObj.transform.scaleY
            };
        }
    }
    return shape;
}