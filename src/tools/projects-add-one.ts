import { z } from "zod";
import type { TodoistTool } from "../todoist-tool.js";

const ArgsSchema = {
	name: z.string().min(1).describe("The name of the project to add."),
};

const projectsAddOne = {
	name: "projectsAddOne",
	description: "Add a new project.",
	parameters: ArgsSchema,
	async execute(args, client) {
		const project = await client.addProject({ name: args.name });
		return project;
	},
} satisfies TodoistTool<typeof ArgsSchema>;

export { projectsAddOne };
