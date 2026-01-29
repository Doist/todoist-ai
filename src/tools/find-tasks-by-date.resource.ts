import { RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server'

const TODOIST_WIDGET_CONNECT_DOMAINS = ['https://*.todoist.com']
const TODOIST_WIDGET_RESOURCE_DOMAINS = ['https://*.todoist.com']

function createFindTasksByDateWidgetResource(uri: string, rawHtml: string) {
    return {
        name: 'task-list-widget',
        uri,
        mimeType: 'text/html+skybridge',
        text: rawHtml,
        _meta: {
            /**
             * Renders the widget within a rounded border and shadow.
             * Otherwise, the HTML is rendered full-bleed in the conversation
             */
            'openai/widgetDescription': 'Shows tasks scheduled for a date',
            'openai/widgetPrefersBorder': true,
            'openai/widgetAccessible': true,
            'openai/toolInvocation/invoking': 'Displaying the task list',
            'openai/toolInvocation/invoked': 'Displayed the task list',
            'openai/widgetDomain': 'https://chatgpt.com',
            /**
             * Required to make external network requests from the HTML code.
             * Also used to validate `openai.openExternal()` requests.
             */
            'openai/widgetCSP': {
                // Maps to `connect-src` rule in the iframe CSP
                connect_domains: TODOIST_WIDGET_CONNECT_DOMAINS,
                // Maps to style-src, style-src-elem, img-src, font-src, media-src etc. in the iframe CSP
                resource_domains: TODOIST_WIDGET_RESOURCE_DOMAINS,
            },
        },
    }
}

function createFindTasksByDateAppResource(uri: string, rawHtml: string) {
    return {
        name: 'task-list-app',
        uri,
        mimeType: RESOURCE_MIME_TYPE,
        text: rawHtml,
        _meta: {
            ui: {
                csp: {
                    connectDomains: TODOIST_WIDGET_CONNECT_DOMAINS,
                    resourceDomains: TODOIST_WIDGET_RESOURCE_DOMAINS,
                },
            },
        },
    }
}

export { createFindTasksByDateAppResource, createFindTasksByDateWidgetResource }
