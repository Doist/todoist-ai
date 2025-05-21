import { addDays, formatISO } from "date-fns";
import { z } from "zod";
import type { TodoistTool } from "../todoist-tool.js";
import { getTasksByFilter } from "./shared.js";

const ArgsSchema = {
	startDate: z
		.string()
		.regex(/^(\d{4}-\d{2}-\d{2}|today)$/)
		.describe(
			"The start date to get the tasks for. Format: YYYY-MM-DD or 'today'.",
		),
	daysCount: z
		.number()
		.int()
		.min(1)
		.max(30)
		.default(1)
		.describe(
			"The number of days to get the tasks for, starting from the start date.",
		),
	limit: z
		.number()
		.int()
		.min(1)
		.max(50)
		.default(10)
		.describe("The maximum number of tasks to return."),
	cursor: z
		.string()
		.optional()
		.describe(
			"The cursor to get the next page of tasks (cursor is obtained from the previous call to this tool, with the same parameters).",
		),
};

const tasksByDateRange = {
	name: "tasksByDateRange",
	description: "Get tasks by date range",
	parameters: ArgsSchema,
	async execute(args, client) {
		const startDate =
			args.startDate === "today"
				? formatISO(new Date(), { representation: "date" })
				: args.startDate;
		const endDate = addDays(startDate, args.daysCount + 1);
		const endDateStr = formatISO(endDate, { representation: "date" });
		const query = `(due after: ${startDate} | due: ${startDate}) & due before: ${endDateStr}`;
		return await getTasksByFilter({
			client,
			query,
			cursor: args.cursor,
			limit: args.limit,
		});
	},
} satisfies TodoistTool<typeof ArgsSchema>;

export { tasksByDateRange };
