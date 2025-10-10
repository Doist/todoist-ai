import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'

let sdk: NodeSDK | undefined

function isTelemetryConfigured() {
    return Boolean(
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT && process.env.OTEL_EXPORTER_OTLP_HEADERS,
    )
}

function initializeTelemetry() {
    if (sdk || !isTelemetryConfigured()) {
        return sdk
    }

    configureDiagnostics()

    const headers = parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS ?? '')
    const traceExporter = new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
    })

    sdk = new NodeSDK({
        traceExporter,
        resource: buildResource(),
        instrumentations: [],
    })

    sdk.start()

    return sdk
}

async function shutdownTelemetry() {
    if (!sdk) {
        return
    }

    try {
        await sdk.shutdown()
    } catch (error) {
        console.error('Error shutting down OpenTelemetry SDK', error)
    } finally {
        sdk = undefined
    }
}

function configureDiagnostics() {
    if (process.env.OTEL_DIAGNOSTIC_LOGGING === 'false') {
        return
    }

    if (process.env.NODE_ENV !== 'production' || process.env.OTEL_DIAGNOSTIC_LOGGING === 'true') {
        diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)
    }
}

function parseHeaders(headers: string) {
    return headers
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .reduce<Record<string, string>>((acc, entry) => {
            const separatorIndex = entry.indexOf('=')
            if (separatorIndex <= 0) {
                return acc
            }

            const key = entry.slice(0, separatorIndex).trim()
            const value = entry.slice(separatorIndex + 1).trim()

            if (!key || !value) {
                return acc
            }

            acc[key] = value
            return acc
        }, {})
}

function buildResource() {
    const serviceName = process.env.OTEL_SERVICE_NAME ?? 'todoist-mcp'
    const serviceVersion =
        process.env.OTEL_SERVICE_VERSION ?? process.env.npm_package_version ?? 'unknown'
    const environment = process.env.OTEL_SERVICE_ENV ?? process.env.NODE_ENV ?? 'development'

    const resource = resourceFromAttributes({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
    })

    return defaultResource().merge(resource)
}

export { initializeTelemetry, shutdownTelemetry, isTelemetryConfigured }
