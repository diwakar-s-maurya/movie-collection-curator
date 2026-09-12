const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS ?? 10_000)

/** A crashed process is already in an undefined state, so it gets a far
 * shorter budget to drain than an orderly signal does. */
const FATAL_TIMEOUT_MS = Number(process.env.FATAL_TIMEOUT_MS ?? 2_000)

/** Something to close on the way down: the HTTP server, a database pool, … */
export type Closer = { name: string; close: () => Promise<unknown> }

/**
 * Drains the given resources on SIGINT/SIGTERM, and on the two failure
 * conditions a Node process cannot recover from, before exiting. Closers run in
 * order, so put the ones that accept new work first.
 *
 * A signal is a request to stop and exits 0 once everything drains.
 * `uncaughtException` and `unhandledRejection` leave the process untrustworthy,
 * so they exit non-zero for the supervisor and drain within `FATAL_TIMEOUT_MS`.
 */
export function registerGracefulShutdown(closers: Closer[]): void {
  let shuttingDown = false

  const shutdown = async (
    reason: string,
    { code, timeoutMs }: { code: number; timeoutMs: number },
  ): Promise<void> => {
    shuttingDown = true
    console.log(`${reason}, shutting down (exit ${code})`)

    // Force exit if something refuses to drain in time. Unref'd so the timer
    // itself never holds the process open once the closers have released it.
    setTimeout(() => {
      console.error(`shutdown timed out after ${timeoutMs}ms, forcing exit`)
      process.exit(code === 0 ? 1 : code)
    }, timeoutMs).unref()

    try {
      for (const { name, close } of closers) {
        await close()
        console.log(`${name} closed`)
      }
      process.exit(code)
    } catch (err) {
      console.error('error during shutdown:', err)
      process.exit(code === 0 ? 1 : code)
    }
  }

  const onSignal = (signal: string) => () => {
    if (shuttingDown) {
      console.log(`${signal} received again, already shutting down`)
      return
    }
    void shutdown(`${signal} received`, {
      code: 0,
      timeoutMs: SHUTDOWN_TIMEOUT_MS,
    })
  }

  process.on('SIGINT', onSignal('SIGINT'))
  process.on('SIGTERM', onSignal('SIGTERM'))

  const onFatal = (label: string) => (err: unknown) => {
    console.error(`${label}:`, err)
    // Nothing left to do gracefully, and exiting here keeps a signal's exit 0
    // from reporting success for a process that crashed.
    if (shuttingDown) {
      console.error(`${label} during shutdown, exiting immediately`)
      process.exit(1)
    }
    void shutdown(label, { code: 1, timeoutMs: FATAL_TIMEOUT_MS })
  }

  process.on('unhandledRejection', onFatal('unhandled rejection'))
  process.on('uncaughtException', onFatal('uncaught exception'))
}
