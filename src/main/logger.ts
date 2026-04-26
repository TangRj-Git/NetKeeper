import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'

import { LOG_LIMIT, type LogEntry, type LogLevel } from '../shared/types'

export function formatTimestamp(date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export class LoggerService {
  private readonly emitter = new EventEmitter()
  private entries: LogEntry[] = []

  onEntry(listener: (entry: LogEntry) => void): () => void {
    this.emitter.on('entry', listener)
    return () => {
      this.emitter.off('entry', listener)
    }
  }

  getEntries(): LogEntry[] {
    return [...this.entries]
  }

  info(message: string): LogEntry {
    return this.push('info', message)
  }

  success(message: string): LogEntry {
    return this.push('success', message)
  }

  warning(message: string): LogEntry {
    return this.push('warning', message)
  }

  error(message: string): LogEntry {
    return this.push('error', message)
  }

  private push(level: LogLevel, message: string): LogEntry {
    const entry: LogEntry = {
      id: randomUUID(),
      timestamp: formatTimestamp(),
      level,
      message
    }

    this.entries = [...this.entries, entry].slice(-LOG_LIMIT)
    this.emitter.emit('entry', entry)

    return entry
  }
}
