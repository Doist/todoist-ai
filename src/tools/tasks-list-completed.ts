import { z } from "zod";
import type { TodoistTool } from "../todoist-tool";
import { mapTask } from "./shared";

const ArgsSchema = {
	getBy: z.enum(["completion", "due"]),
	since: z.string().date(),
	until: z.string().date(),
	workspaceId: z.string().optional(),
	projectId: z.string().optional(),
	sectionId: z.string().optional(),
	parentId: z.string().optional(),
	filterQuery: z.string().optional(),
	filterLang: z.string().optional(),
	limit: z.number().int().min(1).max(50).default(50),
	cursor: z.string().optional(),
};

const tasksListCompleted = {
	name: "tasks-list-completed",
	description: "Get completed tasks.",
	parameters: ArgsSchema,
	async execute(args, client) {
		const { getBy, ...rest } = args;
		const { items, nextCursor } =
			getBy === "completion"
				? await client.getCompletedTasksByCompletionDate(rest)
				: await client.getCompletedTasksByDueDate(args);
		return {
			tasks: items.map(mapTask),
			nextCursor,
		};
	},
} satisfies TodoistTool<typeof ArgsSchema>;

export { tasksListCompleted };
