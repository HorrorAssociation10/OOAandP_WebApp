import {useState} from "react"

export default function Gallery(){
    const [projects, setProjects] = useState(0);

    function CreateProjectButtonPressed(){
        setProjects(projects+1);
    }

    if (!projects){
        return (
            <div>
                <button onClick={CreateProjectButtonPressed}>Projects Created: {projects}</button>
                <p>Seems like you've got no projects yet... Let's fix that! <br/>
                Hit the "Create Project" button in the top left corner</p>

            </div>
        )
    }
    else {
        return (
            <div>
                <button onClick={CreateProjectButtonPressed}>Projects Created: {projects}</button>
                <div className="grid grid-cols-1 md:grid-cols-3">
                    <p>hi</p>
                    <p>hi</p>
                    <p>hi</p>
                    <p>hi</p>
                </div>
            </div>
        )
    }
    
}