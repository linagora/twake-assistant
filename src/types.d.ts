/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Type declarations for modules without TypeScript support
 */

declare module 'cozy-ui/transpiled/react/Buttons' {
  const Button: any
  export default Button
}

declare module 'cozy-ui/transpiled/react/Spinner' {
  const Spinner: any
  export default Spinner
}

declare module 'twake-i18n' {
  export function useI18n(): {
    t: (key: string, options?: Record<string, unknown>) => string
    lang: string
  }
}

declare module 'cozy-realtime/dist/useRealtime' {
  interface RealtimeConfig {
    [doctype: string]: {
      created?: (doc: any) => void
      updated?: (doc: any) => void
      deleted?: (doc: any) => void
    }
  }

  export default function useRealtime(
    client: any,
    config: RealtimeConfig,
    deps: any[]
  ): void
}

declare module 'cozy-minilog' {
  interface Minilog {
    debug(...args: any[]): void
    info(...args: any[]): void
    warn(...args: any[]): void
    error(...args: any[]): void
    log(...args: any[]): void
  }

  function Minilog(namespace: string): Minilog
  export default Minilog
}
