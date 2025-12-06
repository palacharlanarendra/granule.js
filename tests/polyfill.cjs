try {
  const nodeCrypto = require('crypto')
  if (!globalThis.crypto || !globalThis.crypto.getRandomValues) {
    globalThis.crypto = nodeCrypto.webcrypto || globalThis.crypto
  }
} catch (e) {
}
