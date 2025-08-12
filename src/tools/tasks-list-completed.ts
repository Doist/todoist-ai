import { z } from "zod";
import type { TodoistTool } from "../todoist-tool";
import { mapTask } from "./shared";

const ArgsSchema = {
	getBy: z
		.enum(["completion", "due"])
		.describe(
			'The method to use to get the tasks: "completion" to get tasks by completion date (ie, when the task was actually completed), "due" to get tasks by due date (ie, when the task was due to be completed by).',
		),
	since: z
		.string()
		.date()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.describe("The start date to get the tasks for. Format: YYYY-MM-DD."),
	until: z
		.string()
		.date()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.describe("The start date to get the tasks for. Format: YYYY-MM-DD."),
	workspaceId: z
		.string()
		.optional()
		.describe("The ID of the workspace to get the tasks for."),
	projectId: z
		.string()
		.optional()
		.describe("The ID of the project to get the tasks for."),
	sectionId: z
		.string()
		.optional()
		.describe("The ID of the section to get the tasks for."),
	parentId: z
		.string()
		.optional()
		.describe("The ID of the parent task to get the tasks for."),
	filterQuery: z
		.string()
		.optional()
		.describe(
			"The filter query to use to filter the tasks. If set, you must provide a `filterLang` parameter.",
		),
	filterLang: z
		.string()
		.optional()
		.describe(
			"The filter language to use to filter the tasks. Should only be provided if the `filterQuery` parameter is set.",
		),
	limit: z
		.number()
		.int()
		.min(1)
		.max(200)
		.default(50)
		.describe(
			"The maximum number of tasks to return. Default is 50, maximum is 200.",
		),
	cursor: z
		.string()
		.optional()
		.describe(
			"The cursor to get the next page of tasks (cursor is obtained from the previous call to this tool, with the same parameters).",
		),
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
