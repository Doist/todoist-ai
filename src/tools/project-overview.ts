import type { Section, TodoistApi } from "@doist/todoist-api-typescript";
import { z } from "zod";
import type { TodoistTool } from "../todoist-tool.js";
import { type Project, mapTask } from "./shared.js";

const ArgsSchema = {
	projectId: z
		.string()
		.min(1)
		.describe("The ID of the project to get an overview for."),
};

type MappedTask = ReturnType<typeof mapTask>;

type TaskTreeNode = MappedTask & { children: TaskTreeNode[] };

function buildTaskTree(tasks: MappedTask[]): TaskTreeNode[] {
	const byId: Record<string, TaskTreeNode> = {};
	for (const task of tasks) {
		byId[task.id] = { ...task, children: [] };
	}
	const roots: TaskTreeNode[] = [];
	for (const task of tasks) {
		const node = byId[task.id];
		if (!node) continue;
		if (!task.parentId) {
			roots.push(node);
			continue;
		}
		const parent = byId[task.parentId];
		if (parent) {
			parent.children.push(node);
		} else {
			roots.push(node);
		}
	}
	return roots;
}

function renderTaskTreeMarkdown(tasks: TaskTreeNode[], indent = ""): string[] {
	const lines: string[] = [];
	for (const task of tasks) {
		const idPart = `id=${task.id}`;
		const duePart = task.dueDate ? `; due=${task.dueDate}` : "";
		const contentPart = `; content=${task.content}`;
		lines.push(`${indent}- ${idPart}${duePart}${contentPart}`);
		if (task.children.length > 0) {
			lines.push(...renderTaskTreeMarkdown(task.children, `${indent}  `));
		}
	}
	return lines;
}

async function getAllTasksForProject(
	client: TodoistApi,
	projectId: string,
): Promise<MappedTask[]> {
	let allTasks: MappedTask[] = [];
	let cursor: string | undefined = undefined;
	do {
		const { results, nextCursor } = await client.getTasks({
			projectId,
			limit: 50,
			cursor: cursor ?? undefined,
		});
		allTasks = allTasks.concat(results.map(mapTask));
		cursor = nextCursor ?? undefined;
	} while (cursor);
	return allTasks;
}

async function getProjectSections(
	client: TodoistApi,
	projectId: string,
): Promise<Section[]> {
	const { results } = await client.getSections({ projectId });
	return results;
}

const projectOverview = {
	name: "project-overview",
	description:
		"Get a Markdown overview of a single project, including its sections and all tasks. Tasks are grouped by section, with tasks not in any section listed first. Each task is listed as '- id=TASKID; due=YYYY-MM-DD; content=TASK CONTENT' (omit due if not present). Subtasks are nested as indented list items.",
	parameters: ArgsSchema,
	async execute(args, client) {
		const { projectId } = args;
		const project: Project = await client.getProject(projectId);
		const sections = await getProjectSections(client, projectId);
		const allTasks = await getAllTasksForProject(client, projectId);

		// Group tasks by sectionId
		const tasksBySection: Record<string, MappedTask[]> = {};
		for (const section of sections) {
			tasksBySection[section.id] = [];
		}
		const tasksWithoutSection: MappedTask[] = [];
		for (const task of allTasks) {
			if (task.sectionId && tasksBySection[task.sectionId]) {
				// biome-ignore lint/style/noNonNullAssertion: the "if" above ensures that it is defined
				tasksBySection[task.sectionId]!.push(task);
			} else {
				tasksWithoutSection.push(task);
			}
		}

		const lines: string[] = [`# ${project.name}`];
		if (tasksWithoutSection.length > 0) {
			lines.push("");
			const tree = buildTaskTree(tasksWithoutSection);
			lines.push(...renderTaskTreeMarkdown(tree));
		}
		for (const section of sections) {
			lines.push("");
			lines.push(`## ${section.name}`);
			const sectionTasks = tasksBySection[section.id];
			if (!sectionTasks?.length) {
				continue;
			}
			const tree = buildTaskTree(sectionTasks);
			lines.push(...renderTaskTreeMarkdown(tree));
		}
		return lines.join("\n");
	},
} satisfies TodoistTool<typeof ArgsSchema>;

export { projectOverview };
