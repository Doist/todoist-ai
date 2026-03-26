import '@doist/todoist-api-typescript'

declare module '@doist/todoist-api-typescript' {
    export interface ViewAttachmentResponse {
        ok: boolean
        status: number
        statusText: string
        headers: Record<string, string>
        arrayBuffer(): Promise<ArrayBuffer>
        text(): Promise<string>
        json(): Promise<unknown>
    }

    interface TodoistApi {
        viewAttachment(fileUrl: string): Promise<ViewAttachmentResponse>
    }
}
