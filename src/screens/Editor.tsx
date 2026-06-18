import {RectangleHorizontal, Circle, Hexagon, ArrowBigLeft, Save} from "lucide-react"
import {useParams, Link} from "react-router-dom"
import {useState, useEffect} from "react"
import {motion} from "framer-motion"
import {LineAlg} from "../lib/raster/RasterRenderer"
import {Shape} from "../lib/raster/ShapesVisualization";
import {CanvasScene} from "../lib/raster/CanvasScene"

import {loadProject, saveProject} from "../lib/projectStorage";
import { shapeFromJSON } from "../lib/ShapeFactory";

export default function Editor(){
    const {id} = useParams<{id: string}>();
    console.log("The project ID is: " + id);

    const [alg, SetLineAlg] = useState<LineAlg>('bresenham');
    const [shapes, setShapes] = useState<Shape[]>([]);
    const [selectedId, setSelectedId] = useState<Number | null>(null);

    const [projectName, setProjectName] = useState<string>(`Проект №${id}`);
    const [createdAt, setCreatedAt] = useState<string>(new Date().toISOString());

    useEffect(() => {
        async function initProject() {
            if (!id) return;
            try {
                const project = await loadProject(id);
                if (project && project.shapes) {
                    console.log("Проект найден, восстанавливаем фигуры: ", project.shapes);
                    
                    const restoredShapes: Shape[] = project.shapes
                    .map((sData: any) => shapeFromJSON(sData))
                    .filter((s): s is Shape => s != null);

                    console.log("Восстановленные КЛАССЫ фигур:", restoredShapes); 

                    setShapes(restoredShapes);
                    setProjectName(project.name);
                    if (project.createdAt) setCreatedAt(project.createdAt);
                    if (project.lineAlgorithm) SetLineAlg(project.lineAlgorithm as LineAlg);
                    console.log("Проект успешно загружен!");
                } else {
                    console.log("Новый проект, холст остаётся чистым");
                    setShapes([]);
                    setProjectName("Новый рисунок");
                }
            } catch (err) {
                console.error("Ошибка автозагрузки проекта из URL", err);
            }
        }
        initProject();
    }, [id]);
    
    const handleSaveProject = async () => {
        if (!id) return;
        try {
            const serializedShapes = shapes.map(shape => JSON.parse(shape.toJSON()));

            const projectData = {
                id: id, 
                name: projectName,
                createdAt: createdAt,
                updatedAt: new Date().toISOString(),
                lineAlgorithm: alg,
                shapes: serializedShapes
            };

            await saveProject(projectData);
            alert("Проект успешно сохранён в Documents/VectorEngine!");
        } catch (error) {
            console.error("Ошибка сохранения проекта: ", error);
            alert("Не удалось сохранить проект.");
        }
    };

    const SwitchLineAlg = () => {
        (alg != 'wu') ? SetLineAlg('wu') : SetLineAlg('bresenham');
    }

    const bringToFront = () => {
        if (selectedId === null) return;
        setShapes((prevShapes) => {
            const target = prevShapes.find((shape) => shape.id === selectedId);
            if (!target) return prevShapes;
            const filtered = prevShapes.filter((shape) => shape.id !== selectedId);
            return [...filtered, target];
        });
    };

    const sendToBack = () => {
        if (selectedId === null) return;
        setShapes((prevShapes) => {
            const target = prevShapes.find((shape) => shape.id === selectedId);
            if (!target) return prevShapes;
            const filtered = prevShapes.filter((shape) => shape.id !== selectedId);
            return [target, ...filtered];
        });
    };

    const moveUp = () => {
        if (selectedId === null) return;
        setShapes((prevShapes) => {
            const index = prevShapes.findIndex((shape) => shape.id === selectedId);
            if (index === -1 || index === prevShapes.length - 1) return prevShapes; // Уже на вершине
            const newShapes = [...prevShapes];
            // Меняем местами с соседним элементом справа
            [newShapes[index], newShapes[index + 1]] = [newShapes[index + 1], newShapes[index]];
            return newShapes;
        });
    };

    const moveDown = () => {
        if (selectedId === null) return;
        setShapes((prevShapes) => {
            const index = prevShapes.findIndex((shape) => shape.id === selectedId);
            if (index <= 0) return prevShapes; // Уже в самом низу
            const newShapes = [...prevShapes];
            // Меняем местами с соседним элементом слева
            [newShapes[index], newShapes[index - 1]] = [newShapes[index - 1], newShapes[index]];
            return newShapes;
        });
    };

    return (
        <div className="h-screen flex flex-col">
            <header className="h-14 border-b bg-slate-600 w-auto flex justify-between items-center">
                <Link to={`/`}>
                    <motion.div
                    className="flex bg-slate-800 p-3 rounded-lg border border-amber-300 m-1"
                    whileHover={{scale: 1.1, backgroundColor: "#000060" }}
                    whileTap={{scale:0.9}}
                    >
                        <ArrowBigLeft/>
                    </motion.div>
                </Link>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="bg-slate-700 text-white border border-amber-300 rounded px-2 py-1 text-center">
                    </input>
                </div>
                <motion.div
                onClick={handleSaveProject}
                className="flex bg-slate-800 p-3 rounded-lg border border-amber-300 m-1 cursor-pointer"
                whileHover={{scale: 1.1, backgroundColor: "#000060" }}
                whileTap={{scale:0.9}}>
                    <Save/>
                </motion.div>
            </header>
            <div className="flex flex-1 justify-between">
                <aside className="w-16 border-r bg-slate-800 flex flex-col justify-evenly items-center">
                    <div className="bg-slate-600 w-12 h-12 flex justify-center items-center rounded-2xl hover:bg-slate-500"><RectangleHorizontal/></div>
                    <div className="bg-slate-600 w-12 h-12 flex justify-center items-center rounded-2xl hover:bg-slate-500"><Circle/></div>
                    <div className="bg-slate-600 w-12 h-12 flex justify-center items-center rounded-2xl hover:bg-slate-500"><Hexagon/></div>
                </aside>
                <CanvasScene 
                    lineAlg={alg} 
                    shapes={shapes} 
                    setShapes={setShapes} 
                    selectedId={selectedId} 
                    setSelectedId={setSelectedId}>
                </CanvasScene>
                {/* <main className="flex-1 bg-slate-100 m-2"></main> */}
                <aside className="w-64 border-l bg-slate-800 flex flex-col justify-between">
                    <div className="flex flex-col gap-2 p-2">
                        <button onClick={bringToFront} disabled={selectedId === null}>▲ На высший слой</button>
                        <button onClick={moveUp} disabled={selectedId === null} >↑ На слой выше</button>
                        <button onClick={moveDown} disabled={selectedId === null} >↓ На слой ниже</button>
                        <button onClick={sendToBack} disabled={selectedId === null} >▼ На низший слой</button>
                        <button onClick={SwitchLineAlg}>Сглаживание</button>
                    </div>
                    <p>Тут будут свойства</p>
                    <p>Наверное...</p>
                </aside>
            </div>
        </div>
    )
}