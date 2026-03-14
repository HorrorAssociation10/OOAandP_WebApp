import {BoxSelect, RectangleHorizontal, Circle, ArrowBigLeft, Save} from "lucide-react"
import {useParams, Link} from "react-router-dom"
import {motion} from "framer-motion"

export default function Editor(){
    const {id} = useParams();
    console.log("The project ID is: " + id);
    return (
        <div className="h-screen flex flex-col">
            <header className="h-14 border-b bg-slate-600 w-auto flex justify-between items-center">
                <Link to={`/`}>
                    <motion.div
                    className="flex bg-slate-800 p-3 rounded-lg border-1 border-amber-300 m-1"
                    whileHover={{scale: 1.1, backgroundColor: "#000060" }}
                    whileTap={{scale:0.9}}
                    >
                        <ArrowBigLeft/>
                    </motion.div>
                </Link>
                <p>Редактирование проекта №{id}</p>
                <motion.div
                className="flex bg-slate-800 p-3 rounded-lg border-1 border-amber-300 m-1"
                whileHover={{scale: 1.1, backgroundColor: "#000060" }}
                whileTap={{scale:0.9}}
                >
                    <Save/>
                </motion.div>
            </header>
            <div className="flex flex-1">
                <aside className="w-16 border-r bg-slate-800 flex flex-col justify-evenly items-center">
                    <div className="bg-slate-600 w-12 h-12 flex justify-center items-center rounded-2xl hover:bg-slate-500"><BoxSelect/></div>
                    <div className="bg-slate-600 w-12 h-12 flex justify-center items-center rounded-2xl hover:bg-slate-500"><RectangleHorizontal/></div>
                    <div className="bg-slate-600 w-12 h-12 flex justify-center items-center rounded-2xl hover:bg-slate-500"><Circle/></div>
                </aside>
                <main className="flex-1 bg-slate-100 m-2"></main>
                <aside className="w-64 border-l bg-slate-800 flex flex-col justify-between">
                    <p>Тут будут свойства</p>
                    <p>Наверное...</p>
                </aside>
            </div>
        </div>
    )
}