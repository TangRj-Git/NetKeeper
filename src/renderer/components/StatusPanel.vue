<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import type { AppStatus, LogEntry } from '../../shared/types'

const props = defineProps<{
  status: AppStatus
  logs: LogEntry[]
}>()

const statusMeta = computed(() => {
  switch (props.status.networkStatus) {
    case 'checking':
      return { label: '正在检测', tone: 'is-checking' }
    case 'online':
      return { label: '网络正常', tone: 'is-online' }
    case 'offline':
      return { label: '网络异常', tone: 'is-offline' }
    case 'logging-in':
      return { label: '正在重新登录', tone: 'is-logging' }
    case 'login-failed':
      return { label: '登录失败', tone: 'is-failed' }
    default:
      return { label: '未连接', tone: 'is-idle' }
  }
})

const keepAliveText = computed(() =>
  props.status.isKeepAliveRunning ? '已开启' : '已暂停'
)

const lastCheckedAt = computed(() => props.status.lastCheckedAt ?? '尚未检测')

const logBody = ref<HTMLElement | null>(null)

watch(
  () => props.logs.length,
  async () => {
    await nextTick()
    if (logBody.value) {
      logBody.value.scrollTop = logBody.value.scrollHeight
    }
  }
)
</script>

<template>
  <section class="panel status-panel">
    <div class="section-head">
      <div>
        <p class="section-kicker">Status</p>
        <h2 class="section-title">运行状态</h2>
      </div>

    </div>

    <div
      class="status-hero"
      :class="statusMeta.tone"
    >
      <span class="status-dot"></span>
      <div>
        <p class="hero-label">当前状态</p>
        <h3>{{ statusMeta.label }}</h3>
        <p class="hero-message">{{ status.message }}</p>
      </div>
    </div>

    <div class="metrics">
      <article class="metric-card">
        <span>最近检测时间</span>
        <strong>{{ lastCheckedAt }}</strong>
      </article>

      <article class="metric-card">
        <span>自动重连</span>
        <strong>{{ keepAliveText }}</strong>
      </article>

    </div>

    <div class="log-section">
      <div class="log-head">
        <div>
          <p class="section-kicker">Runtime Log</p>
          <h3>运行日志</h3>
        </div>
        <span class="section-chip">{{ logs.length }} 条</span>
      </div>

      <div
        ref="logBody"
        class="log-body"
      >
        <div
          v-if="!logs.length"
          class="log-empty"
        >
          保存配置并连接后，关键运行事件会出现在这里。
        </div>

        <template v-else>
          <article
            v-for="entry in logs"
            :key="entry.id"
            class="log-row"
            :class="`level-${entry.level}`"
          >
            <span class="log-time">[{{ entry.timestamp }}]</span>
            <span class="log-dot"></span>
            <p class="log-message">{{ entry.message }}</p>
          </article>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.status-panel {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
}

.status-hero {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  padding: 18px;
  border-radius: 24px;
  color: #f9fcff;
  background: linear-gradient(140deg, rgba(86, 108, 132, 0.92), rgba(57, 73, 96, 0.88));
}

.status-hero.is-online {
  background: linear-gradient(140deg, rgba(31, 106, 92, 0.94), rgba(29, 151, 116, 0.88));
}

.status-hero.is-offline,
.status-hero.is-failed {
  background: linear-gradient(140deg, rgba(116, 58, 49, 0.94), rgba(190, 90, 66, 0.86));
}

.status-hero.is-checking,
.status-hero.is-logging {
  background: linear-gradient(140deg, rgba(24, 70, 110, 0.94), rgba(39, 120, 170, 0.9));
}

.status-dot {
  width: 18px;
  height: 18px;
  margin-top: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 0 0 8px rgba(255, 255, 255, 0.12);
}

.hero-label {
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.78rem;
  color: rgba(249, 252, 255, 0.8);
}

.status-hero h3 {
  margin: 0;
  font-size: 1.78rem;
  line-height: 1;
  letter-spacing: -0.05em;
}

.hero-message {
  margin: 8px 0 0;
  line-height: 1.5;
  color: rgba(249, 252, 255, 0.9);
}

.metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.metric-card {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 16px;
  background: rgba(249, 252, 255, 0.88);
  border: 1px solid rgba(28, 66, 112, 0.08);
}

.metric-card span {
  color: var(--muted);
  font-size: 0.82rem;
}

.metric-card strong {
  font-size: 0.92rem;
  color: var(--ink);
}

.log-section {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
  min-height: 0;
}

.log-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.log-head h3 {
  margin: 0;
  font-size: 1.18rem;
  letter-spacing: -0.04em;
}

.log-body {
  min-height: 180px;
  overflow: auto;
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(13, 25, 40, 0.95), rgba(20, 38, 59, 0.95)),
    linear-gradient(transparent 23px, rgba(255, 255, 255, 0.04) 24px);
  color: #f0f7ff;
}

.log-empty {
  align-self: center;
  justify-self: center;
  color: rgba(240, 247, 255, 0.72);
  text-align: center;
}

.log-row {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 8px;
  align-items: start;
  padding: 8px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
}

.log-time {
  color: rgba(240, 247, 255, 0.72);
  font-family: 'Cascadia Code', 'Consolas', monospace;
  font-size: 0.76rem;
}

.log-dot {
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 50%;
  background: rgba(240, 247, 255, 0.6);
}

.log-message {
  margin: 0;
  line-height: 1.45;
  font-size: 0.84rem;
  word-break: break-word;
}

.level-success .log-dot {
  background: #72e5ab;
}

.level-warning .log-dot {
  background: #ffd77a;
}

.level-error .log-dot {
  background: #ff9074;
}

@media (max-width: 1080px) {
  .metrics {
    grid-template-columns: 1fr;
  }

  .log-body {
    min-height: 220px;
  }
}
</style>
