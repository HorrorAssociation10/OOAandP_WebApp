export interface BaseShapeData {
    type: 'rect' | 'line' | 'ellipse' | 'triangle' | 'quad' | 'cubic' | 'path';
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    rotation?: number;
    scaleX?: number,
    scaleY?: number,
    [key: string]: any; // Для специфичных полей фигур
}

export interface ProjectData {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    lineAlgorithm?: 'bresenham' | 'wu';
    shapes: any[];
}

export interface ProjectIndexItem {
    id: string;
    name: string;
    updatedAt: string;
}