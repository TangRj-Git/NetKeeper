import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { app, safeStorage } from 'electron'

import {
  CHECK_INTERVAL_MIN_SECONDS,
  createDefaultUserConfig,
  type UserConfig
} from '../shared/types'

type StoredConfig = Omit<UserConfig, 'password'> & {
  password?: string
}

const CONFIG_FILENAME = 'netkeeper.config.json'
const ENCRYPTED_PREFIX = 'safe:'
const FALLBACK_PREFIX = 'base64:'
const VALID_OPERATORS = new Set(['', 'faculty', 'telecom', 'unicom', 'mobile'])

function normalizeCheckInterval(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return createDefaultUserConfig().checkInterval
  }

  return Math.max(CHECK_INTERVAL_MIN_SECONDS, Math.floor(value))
}

function normalizeConfig(input?: Partial<UserConfig>): UserConfig {
  const defaults = createDefaultUserConfig()
  const operator = input?.operator ?? defaults.operator

  return {
    username: input?.username?.trim() ?? defaults.username,
    password: input?.password ?? defaults.password,
    operator: VALID_OPERATORS.has(operator) ? operator : defaults.operator,
    autoReconnect: input?.autoReconnect ?? defaults.autoReconnect,
    checkInterval: normalizeCheckInterval(input?.checkInterval),
    autoStart: input?.autoStart ?? defaults.autoStart
  }
}

// MVP 阶段优先使用 Electron safeStorage，后续可无缝替换为 keytar。
function encodePassword(password?: string): string | undefined {
  if (!password) {
    return undefined
  }

  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(password).toString('base64')
    return `${ENCRYPTED_PREFIX}${encrypted}`
  }

  return `${FALLBACK_PREFIX}${Buffer.from(password, 'utf8').toString('base64')}`
}

function decodePassword(serialized?: string): string {
  if (!serialized) {
    return ''
  }

  if (serialized.startsWith(ENCRYPTED_PREFIX) && safeStorage.isEncryptionAvailable()) {
    const encrypted = Buffer.from(serialized.slice(ENCRYPTED_PREFIX.length), 'base64')
    return safeStorage.decryptString(encrypted)
  }

  if (serialized.startsWith(FALLBACK_PREFIX)) {
    return Buffer.from(serialized.slice(FALLBACK_PREFIX.length), 'base64').toString('utf8')
  }

  return serialized
}

export class ConfigStore {
  private cache?: UserConfig

  async getConfig(): Promise<UserConfig> {
    if (this.cache) {
      return structuredClone(this.cache)
    }

    try {
      const raw = await readFile(this.filePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<StoredConfig>
      const config = normalizeConfig({
        ...parsed,
        password: decodePassword(parsed.password)
      })

      this.cache = config
      return structuredClone(config)
    } catch {
      const defaults = createDefaultUserConfig()
      this.cache = defaults
      return structuredClone(defaults)
    }
  }

  async saveConfig(config: UserConfig): Promise<UserConfig> {
    const normalized = normalizeConfig(config)
    const payload: StoredConfig = {
      ...normalized,
      password: encodePassword(normalized.password)
    }

    if (!payload.password) {
      delete payload.password
    }

    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(this.filePath, JSON.stringify(payload, null, 2), 'utf8')

    this.cache = normalized
    return structuredClone(normalized)
  }

  private get filePath(): string {
    return join(app.getPath('userData'), CONFIG_FILENAME)
  }
}
