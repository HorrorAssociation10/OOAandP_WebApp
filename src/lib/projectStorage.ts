import {writeTextFile, readTextFile, mkdir, exists} from '@tauri-apps/plugin-fs';
import {documentDir, join} from '@tauri-apps/api/path';
import {ProjectData, ProjectIndexItem} from '../types/project';

async function getPaths() {
    const docDir = await documentDir();
    const baseDir = await join(docDir, 'VectorEngine');
    const projectsDir = await join(baseDir, 'projects');
    const indexPath = await join(baseDir, 'index.json');

    return {baseDir, projectsDir, indexPath};
}

async function ensureDirectories() {
    const {projectsDir} = await getPaths();
    if (!(await exists(projectsDir))) {
        await mkdir(projectsDir, {recursive: true});
    }
}

export async function saveProject(project: ProjectData): Promise<void> {
    await ensureDirectories();
    const {projectsDir, indexPath} = await getPaths();
    
    project.updatedAt = new Date().toISOString();
    const projectPath = await join(projectsDir, `${project.id}.json`);

    await writeTextFile(projectPath, JSON.stringify(project, null, 2));

    let index: ProjectIndexItem[] = [];
    if (await exists(indexPath)) {
        try {
            index = JSON.parse(await readTextFile(indexPath));
        } catch {
            index = [];
        }
    }

    const existingIdx = index.findIndex(p => p.id == project.id);
    const indexItem: ProjectIndexItem = {
        id: project.id,
        name: project.name, 
        updatedAt: project.updatedAt
    };

    if (existingIdx > -1) {
        index[existingIdx] = indexItem;
    } else {
        index.push(indexItem);
    }

    await writeTextFile(indexPath, JSON.stringify(index, null, 2));
}

export async function loadProject(id: string): Promise<ProjectData | null> {
    const {projectsDir} = await getPaths();
    const projectPath = await join (projectsDir, `${id}.json`);

    if (!(await exists (projectPath))) return null;

    const content = await readTextFile(projectPath);
    return JSON.parse(content) as ProjectData;
}

export async function loadProjectIndex(): Promise<ProjectIndexItem[]> {
    const {indexPath} = await getPaths();
    if (!(await exists(indexPath))) return [];

    try {
        const content = await readTextFile(indexPath);
        return JSON.parse(content) as ProjectIndexItem[];
    } catch {
        return [];
    }
}