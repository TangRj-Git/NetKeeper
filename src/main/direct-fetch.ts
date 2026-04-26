import { session, type Session } from 'electron'

const DIRECT_SESSION_PARTITION = 'netkeeper-direct-network'

let directSessionPromise: Promise<Session> | undefined

async function getDirectSession(): Promise<Session> {
  if (!directSessionPromise) {
    directSessionPromise = (async () => {
      const directSession = session.fromPartition(DIRECT_SESSION_PARTITION)
      await directSession.setProxy({ mode: 'direct' })
      await directSession.closeAllConnections()

      return directSession
    })()
  }

  return directSessionPromise
}

export async function directFetch(
  input: Parameters<Session['fetch']>[0],
  init?: Parameters<Session['fetch']>[1]
): ReturnType<Session['fetch']> {
  const directSession = await getDirectSession()

  return directSession.fetch(input, {
    ...init,
    bypassCustomProtocolHandlers: true
  })
}
