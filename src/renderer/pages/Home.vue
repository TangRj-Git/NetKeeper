<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, toRaw } from 'vue'

import ConfigForm from '../components/ConfigForm.vue'
import StatusPanel from '../components/StatusPanel.vue'
import { operatorOptions } from '../../shared/operators'
import {
  LOG_LIMIT,
  createDefaultAppStatus,
  createDefaultUserConfig,
  type AppStatus,
  type LogEntry,
  type UserConfig
} from '../../shared/types'

const config = reactive<UserConfig>(createDefaultUserConfig())
const status = reactive<AppStatus>(createDefaultAppStatus())

const logs = ref<LogEntry[]>([])

const saving = ref(false)
const autoReconnectChanging = ref(false)

let unbindLog: (() => void) | undefined
let unbindStatus: (() => void) | undefined

function getNetKeeperApi() {
  if (!window.netkeeper) {
    throw new Error('Electron preload API 未加载，请重启 npm run dev 打开的桌面窗口后再试')
  }

  return window.netkeeper
}

function createIpcConfig(): UserConfig {
  return JSON.parse(JSON.stringify(toRaw(config))) as UserConfig
}

function applyPatch(patch: Partial<UserConfig>): void {
  Object.assign(config, patch)
}

function applyStatus(nextStatus: AppStatus): void {
  Object.assign(status, nextStatus)
}

function pushLog(entry: LogEntry): void {
  logs.value = [...logs.value, entry].slice(-LOG_LIMIT)
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : '发生未知错误'
}

async function loadInitialState(): Promise<void> {
  try {
    const api = getNetKeeperApi()
    const [savedConfig, currentStatus, entries] = await Promise.all([
      api.getConfig(),
      api.getStatus(),
      api.getLogs()
    ])

    Object.assign(config, savedConfig)
    applyStatus(currentStatus)
    logs.value = entries
  } catch (error) {
    status.message = `初始化失败：${readError(error)}`
  }
}

async function saveConfig(): Promise<void> {
  saving.value = true

  try {
    const api = getNetKeeperApi()
    const saved = await api.saveConfig(createIpcConfig())
    Object.assign(config, saved)
  } catch (error) {
    status.message = `保存失败：${readError(error)}`
  } finally {
    saving.value = false
  }
}

async function changeAutoReconnect(enabled: boolean): Promise<void> {
  const previousValue = config.autoReconnect
  autoReconnectChanging.value = true
  config.autoReconnect = enabled

  try {
    const api = getNetKeeperApi()
    const result = await api.setAutoReconnect(createIpcConfig())
    Object.assign(config, result.config)
    applyStatus(result.status)
  } catch (error) {
    config.autoReconnect = previousValue
    status.message = `自动重连切换失败：${readError(error)}`
  } finally {
    autoReconnectChanging.value = false
  }
}

onMounted(async () => {
  await loadInitialState()

  const api = window.netkeeper
  if (!api) {
    return
  }

  unbindLog = api.onLog((entry) => {
    pushLog(entry)
  })

  unbindStatus = api.onStatusChange((nextStatus) => {
    applyStatus(nextStatus)
    config.autoReconnect = nextStatus.autoReconnectEnabled
  })
})

onBeforeUnmount(() => {
  unbindLog?.()
  unbindStatus?.()
})
</script>

<template>
  <div class="home-page">
    <div class="orb orb-left"></div>
    <div class="orb orb-right"></div>

    <header class="panel hero-panel">
      <div class="hero-copy">
        <p class="hero-kicker">Campus Network Guardian</p>
        <h1>NetKeeper</h1>
        <p class="hero-subtitle">
          持续监测校园网连通状态，外网不可达时自动认证重连，保障网络连接稳定可用。
        </p>
      </div>

    </header>

    <section class="content-grid">
      <ConfigForm
        :config="config"
        :operator-options="operatorOptions"
        :saving="saving"
        :auto-reconnect-changing="autoReconnectChanging"
        @patch="applyPatch"
        @save="saveConfig"
        @auto-reconnect-change="changeAutoReconnect"
      />

      <StatusPanel
        :status="status"
        :logs="logs"
      />
    </section>
  </div>
</template>

<style scoped>
.home-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  padding: 16px 20px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  overflow: hidden;
}

.orb {
  position: absolute;
  z-index: 0;
  border-radius: 999px;
  filter: blur(16px);
  opacity: 0.18;
}

.orb-left {
  width: 240px;
  height: 240px;
  top: -32px;
  left: -56px;
  background: radial-gradient(circle, #87c6ff 0%, rgba(135, 198, 255, 0) 70%);
}

.orb-right {
  width: 300px;
  height: 300px;
  right: -72px;
  top: 120px;
  background: radial-gradient(circle, #ffe3a3 0%, rgba(255, 227, 163, 0) 70%);
}

.hero-panel,
.content-grid {
  position: relative;
  z-index: 1;
}

.hero-panel {
  display: block;
  padding: 16px 20px;
}

.hero-copy h1 {
  margin: 0;
  font-size: clamp(2.2rem, 4vw, 3.4rem);
  line-height: 0.94;
  letter-spacing: -0.06em;
}

.hero-kicker {
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.28em;
  font-size: 0.75rem;
  color: var(--accent-strong);
}

.hero-subtitle {
  max-width: 760px;
  margin: 8px 0 0;
  font-size: 0.98rem;
  line-height: 1.42;
  color: var(--muted);
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(380px, 0.8fr);
  gap: 18px;
  min-height: 0;
  align-items: stretch;
}

@media (max-width: 1080px) {
  .home-page {
    padding: 18px;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .home-page {
    padding: 16px;
  }

  .hero-copy h1 {
    font-size: 2.2rem;
  }

  .hero-subtitle {
    font-size: 0.96rem;
  }
}
</style>
