import {
	type Task,
	type TodoistApi,
	getSanitizedContent,
} from "@doist/todoist-api-typescript";
import z from "zod";

/**
 * Map Todoist tasks to a more structured format, for LLM consumption.
 * @param tasks - The tasks to map.
 * @returns The mapped tasks.
 */
function mapTasks(tasks: Task[]) {
	return tasks.map((task) => ({
		id: task.id,
		content: getSanitizedContent(task.content),
		description: getSanitizedContent(task.description),
		dueDate: task.due?.date,
		recurring:
			task.due?.isRecurring && task.due.string ? task.due.string : false,
		priority: task.priority,
		projectId: task.projectId,
		sectionId: task.sectionId,
		parentId: task.parentId,
		labels: task.labels,
	}));
}

const ErrorSchema = z.object({
	httpStatusCode: z.number(),
	responseData: z.object({
		error: z.string(),
		errorCode: z.number(),
		errorTag: z.string(),
	}),
});

async function getTasksByFilter({
	client,
	query,
	limit,
	cursor,
}: {
	client: TodoistApi;
	query: string;
	limit: number | undefined;
	cursor: string | undefined;
}) {
	try {
		const { results, nextCursor } = await client.getTasksByFilter({
			query,
			cursor,
			limit,
		});

		return {
			tasks: mapTasks(results),
			nextCursor,
		};
	} catch (error) {
		const parsedError = ErrorSchema.safeParse(error);
		if (!parsedError.success) {
			throw error;
		}
		const { responseData } = parsedError.data;
		if (responseData.errorTag === "INVALID_SEARCH_QUERY") {
			throw new Error(`Invalid filter query: ${query}`);
		}
		throw new Error(
			`${responseData.error} (tag: ${responseData.errorTag}, code: ${responseData.errorCode})`,
		);
	}
}

export { getTasksByFilter, mapTasks };
