export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly cause?: unknown
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

export class PluginNotFoundError extends DomainError {
  constructor(pluginId: string) {
    super(`Plugin não encontrado: ${pluginId}`, 'PLUGIN_NOT_FOUND')
  }
}

export class DetectionFailedError extends DomainError {
  constructor(pluginId: string) {
    super(`ERP não detectado pelo plugin: ${pluginId}`, 'DETECTION_FAILED')
  }
}

export class StageFailedError extends DomainError {
  constructor(stage: string, message: string, cause?: unknown) {
    super(`[${stage}] ${message}`, 'STAGE_FAILED', cause)
  }
}
