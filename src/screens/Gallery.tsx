import {useState, useEffect} from "react";
import {Link, useNavigate} from "react-router-dom";
import {motion} from "framer-motion"
import { loadProjectIndex } from "../lib/projectStorage";
import { ProjectIndexItem } from "../types/project";

export default function Gallery(){    
    const [projects, setProjects] = useState<ProjectIndexItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchProjects() {
            try {
                const indexList = await loadProjectIndex();
                setProjects(indexList);
            } catch (error) {
                console.error();
            } finally {
                setIsLoading(false);
            }
        }
        fetchProjects();
    }, []);

    const createNewProject = () => {
        const newId = crypto.randomUUID();
        navigate(`editor/${newId}`);
    };

    if (isLoading) {
        return <div className="text-white text-center p-10">Загрузка...</div>;
    }

    if (!projects.length){
        return (
            <div>
                <button onClick={createNewProject}>Create Project</button>
                <div className="flex justify-around">
                    <p>Seems like you've got no projects yet... Let's fix that! <br/>
                    Hit the "Create Project" button in the top left corner</p>
                    <p>Current projects length: {projects.length}</p>
                </div>
            </div>
        )
    }
    else {
        return (
            <div>
                <button onClick={createNewProject}>Create Project</button>
                <div className="grid grid-cols-1 md:grid-cols-3 p-4">
                    {projects.map(project => (
                        <Link to={`/editor/${project.id}`}>
                            <motion.div
                            className="flex bg-slate-800 p-4 rounded-lg border border-amber-300 m-1"
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