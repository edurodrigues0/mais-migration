import type { ConnectionConfig } from '@domain/plugin/types'

export class DemoConnector {
  private connected = false

  async connect(connection: ConnectionConfig): Promise<void> {
    if (!connection.source?.trim()) {
      throw new Error('Informe a origem da conexão (ex.: demo://local)')
    }
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  isConnected(): boolean {
    return this.connected
  }

  async detect(connection: ConnectionConfig): Promise<boolean> {
    const source = connection.source.trim().toLowerCase()
    return source.startsWith('demo://') || source === 'demo'
  }
}
