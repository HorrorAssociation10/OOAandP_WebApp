import {useState} from "react";
import {Link} from "react-router-dom";
import {AnimatePresence, motion} from "framer-motion"

let nextId = 0;

type Project = {
    id: number,
    name: string,
    date: string
}

export default function Gallery(){    
    const [projects, setProjects] = useState<Project[]>([]);

    const addProject = () => {
        setProjects(
            [
                ...projects,
                { id: nextId++, name: 'New Project'+(nextId-1), date: '2020.04.15' },
            ]
        );
    }

    if (!projects.length){
        return (
            <div>
                <button onClick={addProject}>Create Project</button>
                <div className="flex justify-around">
                    <p>Seems like you've got no projects yet... Let's fix that! <br/>
                    Hit the "Create Project" button in the top left corner</p>
                    <p>Current projects length: {nextId}</p>
                </div>
            </div>
        )
    }
    else {
        return (
            <div>
                <button onClick={addProject}>Create Project</button>
                <div className="grid grid-cols-1 md:grid-cols-3 p-4">
                    {projects.map(project => (
                        <Link to={`/editor/${project.id}`}>
                            <motion.div
                            className="flex bg-slate-800 p-4 rounded-lg border-1 border-amber-300"
                            whileHover={{scale: 1.1, backgroundColor: "#000060" }}
                            whileTap={{scale:0.9}}
                            >
                                {project.name}
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </div>
        )
    }   
}