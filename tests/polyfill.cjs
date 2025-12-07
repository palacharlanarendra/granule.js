try {
  const nodeCrypto = require('node:crypto')
  if (nodeCrypto && nodeCrypto.webcrypto) {
    if (!globalThis.crypto || !globalThis.crypto.getRandomValues) {
      globalThis.crypto = nodeCrypto.webcrypto
    }
    if (!nodeCrypto.getRandomValues && nodeCrypto.webcrypto.getRandomValues) {
      // patch module export to include getRandomValues for libraries that import 'node:crypto'
      nodeCrypto.getRandomValues = nodeCrypto.webcrypto.getRandomValues.bind(nodeCrypto.webcrypto)
    }
  }
} catch (e) {}
