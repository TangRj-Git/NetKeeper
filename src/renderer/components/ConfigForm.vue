<script setup lang="ts">
import { ref } from 'vue'

import type { OperatorOption, UserConfig } from '../../shared/types'

const props = defineProps<{
  config: UserConfig
  operatorOptions: OperatorOption[]
  saving: boolean
  autoReconnectChanging: boolean
}>()

const emit = defineEmits<{
  patch: [patch: Partial<UserConfig>]
  save: []
  autoReconnectChange: [enabled: boolean]
}>()

const passwordVisible = ref(false)

function patchValue(patch: Partial<UserConfig>): void {
  emit('patch', patch)
}

function onUsernameInput(event: Event): void {
  patchValue({ username: (event.target as HTMLInputElement).value })
}

function onPasswordInput(event: Event): void {
  patchValue({ password: (event.target as HTMLInputElement).value })
}

function onOperatorChange(event: Event): void {
  patchValue({ operator: (event.target as HTMLSelectElement).value })
}

function onIntervalInput(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  patchValue({ checkInterval: Number.isFinite(value) ? value : props.config.checkInterval })
}

function togglePasswordVisible(): void {
  passwordVisible.value = !passwordVisible.value
}

function toggleAutoReconnect(): void {
  emit('autoReconnectChange', !props.config.autoReconnect)
}

function toggleAutoStart(): void {
  patchValue({ autoStart: !props.config.autoStart })
}
</script>

<template>
  <section class="panel config-panel">
    <div class="section-head">
      <div>
        <p class="section-kicker">Configuration</p>
        <h2 class="section-title">认证配置</h2>
      </div>
    </div>

    <form
      class="form-grid"
      @submit.prevent="emit('save')"
    >
      <label class="field">
        <span class="field-label">校园网账号</span>
        <input
          :value="config.username"
          type="text"
          autocomplete="username"
          placeholder="只填写学号，不要加 @aust"
          @input="onUsernameInput"
        />
      </label>

      <label class="field">
        <span class="field-label">校园网密码</span>
        <div class="password-control">
          <input
            :value="config.password ?? ''"
            :type="passwordVisible ? 'text' : 'password'"
            autocomplete="current-password"
            placeholder="请输入认证密码"
            @input="onPasswordInput"
          />
          <button
            type="button"
            class="password-toggle"
            :aria-label="passwordVisible ? '隐藏密码' : '显示密码'"
            :title="passwordVisible ? '隐藏密码' : '显示密码'"
            @mousedown.prevent
            @click="togglePasswordVisible"
          >
            <svg
              v-if="passwordVisible"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M2 4.27 4.28 2 22 19.72 19.73 22l-3.18-3.18A10.9 10.9 0 0 1 12 20C6.48 20 2.16 16.4 1 12c.53-2 1.8-3.86 3.56-5.28L2 4.27Z" />
              <path d="M12 4c5.52 0 9.84 3.6 11 8a10.25 10.25 0 0 1-3.14 5.02l-3.17-3.17A5 5 0 0 0 10.15 7.3L7.87 5.02A10.83 10.83 0 0 1 12 4Z" />
              <path d="M8.6 9.43 10.12 11A2.06 2.06 0 0 0 10 12a2 2 0 0 0 2 2c.35 0 .68-.09.97-.25l1.54 1.54A5 5 0 0 1 8.6 9.43Z" />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 5c5.52 0 9.84 3.6 11 8-1.16 4.4-5.48 8-11 8S2.16 17.4 1 13c1.16-4.4 5.48-8 11-8Zm0 3.5A4.5 4.5 0 1 0 12 17a4.5 4.5 0 0 0 0-9Zm0 2A2.5 2.5 0 1 1 12 15a2.5 2.5 0 0 1 0-5Z" />
            </svg>
          </button>
        </div>
      </label>

      <label class="field field-full">
        <span class="field-label">运营商 / 认证出口</span>
        <select
          :value="config.operator"
          @change="onOperatorChange"
        >
          <option
            v-for="option in operatorOptions"
            :key="option.value || option.label"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="field">
        <span class="field-label">检测间隔（秒）</span>
        <input
          :value="config.checkInterval"
          type="number"
          min="10"
          step="1"
          @input="onIntervalInput"
        />
      </label>

      <div class="switch-group">
        <div class="toggle-row">
          <div>
            <span class="field-label">自动重连</span>
            <p>断网后自动检测并重新认证</p>
          </div>
          <button
            type="button"
            class="switch"
            :class="{ 'is-on': config.autoReconnect }"
            :aria-pressed="config.autoReconnect"
            :disabled="autoReconnectChanging"
            @click="toggleAutoReconnect"
          >
            <span></span>
          </button>
        </div>

        <div class="toggle-row">
          <div>
            <span class="field-label">开机自启动</span>
            <p>开机后自动启动 NetKeeper</p>
          </div>
          <button
            type="button"
            class="switch"
            :class="{ 'is-on': config.autoStart }"
            :aria-pressed="config.autoStart"
            @click="toggleAutoStart"
          >
            <span></span>
          </button>
        </div>
      </div>

      <div class="form-actions field-full">
        <button
          class="button-primary"
          type="submit"
          :disabled="saving"
        >
          {{ saving ? '保存中...' : '保存配置' }}
        </button>
      </div>

    </form>
  </section>
</template>

<style scoped>
.config-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
  overflow: auto;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field {
  display: grid;
  gap: 6px;
}

.field-full {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.field input,
.field select {
  width: 100%;
  min-height: 58px;
  border: 1px solid rgba(28, 66, 112, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  padding: 12px 14px;
  font: inherit;
  color: var(--ink);
  outline: none;
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.field input:focus,
.field select:focus {
  border-color: rgba(25, 97, 156, 0.38);
  box-shadow: 0 0 0 4px rgba(25, 97, 156, 0.08);
  transform: translateY(-1px);
}

.password-control {
  position: relative;
  display: flex;
  align-items: stretch;
  width: 100%;
}

.password-control input {
  flex: 1;
  min-width: 0;
  height: 58px;
  padding-right: 58px;
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 12px;
  padding: 0;
  background: rgba(17, 45, 79, 0.06);
  color: var(--muted);
  cursor: pointer;
  line-height: 0;
  transform: translateY(-50%);
  appearance: none;
  transition: background-color 180ms ease, color 180ms ease, transform 180ms ease;
}

.password-toggle:hover {
  background: rgba(25, 97, 156, 0.12);
  color: var(--accent-strong);
  transform: translateY(-50%) scale(1.04);
}

.password-toggle svg {
  display: block;
  width: 20px;
  height: 20px;
  flex: none;
  fill: currentColor;
}

.switch-group {
  grid-column: 1 / -1;
  display: grid;
  gap: 12px;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(249, 252, 255, 0.78);
  border: 1px solid rgba(28, 66, 112, 0.08);
}

.toggle-row p {
  margin: 2px 0 0;
  color: var(--muted);
  font-size: 0.92rem;
}

.switch {
  position: relative;
  width: 58px;
  height: 32px;
  border: none;
  border-radius: 999px;
  background: rgba(142, 160, 183, 0.4);
  cursor: pointer;
  transition: background-color 180ms ease;
}

.switch:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.switch span {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(18, 47, 79, 0.18);
  transition: transform 180ms ease;
}

.switch.is-on {
  background: linear-gradient(120deg, #1d6fb0, #2997bc);
}

.switch.is-on span {
  transform: translateX(26px);
}

.form-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 760px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
