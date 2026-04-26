/// <reference types="vite/client" />

import type { NetKeeperApi } from '../shared/api'

declare global {
  interface Window {
    netkeeper?: NetKeeperApi
  }
}

export {}
