import { z } from "zod";
import type { TodoistTool } from "../todoist-tool.js";

const ArgsSchema = {
	content: z.string().min(1).describe("The content of the task to create."),
	due: z
		.string()
		.optional()
		.describe(
			"The due date for the task, in natural language (e.g., 'tomorrow at 5pm', 'in 2 days', 'June 1st', 'every 23rd', etc.)",
		),
	reminder: z
		.string()
		.optional()
		.describe("A reminder for the task, in natural language."),
	autoReminder: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			"Whether to automatically add a reminder based on the due date.",
		),
	meta: z
		.boolean()
		.optional()
		.default(true)
		.describe("Whether to return extra metadata about the parsing."),
};

const quickAddTask = {
	name: "quickAddTask",
	description:
		"Quickly add a task using natural language for due date and other properties.",
	parameters: ArgsSchema,
	async execute(args, client) {
		const text = args.due ? `${args.content} ${args.due}` : args.content;
		const { reminder, autoReminder, meta } = args;
		return await client.quickAddTask({
			text,
			reminder,
			autoReminder,
			meta,
		});
	},
} satisfies TodoistTool<typeof ArgsSchema>;

export { quickAddTask };
