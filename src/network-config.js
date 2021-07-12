import {
  getLocalChainId,
  getEnsRegistryAddress,
  getFortmaticApiKey,
  getPortisDappId,
} from './local-settings'

const localEnsRegistryAddress = getEnsRegistryAddress()
const fortmaticApiKey = getFortmaticApiKey()
const portisDappId = getPortisDappId()

// connectGraphEndpoint is https://github.com/aragon/connect/tree/master/packages/connect-thegraph
export const networkConfigs = {
  main: {
    enableMigrateBanner: false,
    addresses: {
      ensRegistry:
        localEnsRegistryAddress || '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    },
    nodes: {
      defaultEth: 'wss://mainnet.eth.aragon.network/ws',
    },
    connectGraphEndpoint:
      'https://api.thegraph.com/subgraphs/name/aragon/aragon-mainnet',
    settings: {
      chainId: 1,
      name: 'Mainnet',
      shortName: 'Mainnet',
      type: 'main', // as returned by web3.eth.net.getNetworkType()
      live: true,
    },
    providers: [
      { id: 'provided' },
      { id: 'frame' },
      fortmaticApiKey ? { id: 'fortmatic', conf: fortmaticApiKey } : null,
      portisDappId ? { id: 'portis', conf: portisDappId } : null,
    ].filter(p => p),
  },
  rinkeby: {
    enableMigrateBanner: true,
    addresses: {
      ensRegistry:
        localEnsRegistryAddress || '0x98df287b6c145399aaa709692c8d308357bc085d',
    },
    nodes: {
      defaultEth: 'wss://rinkeby.eth.aragon.network/ws',
    },
    connectGraphEndpoint:
      'https://api.thegraph.com/subgraphs/name/aragon/aragon-rinkeby',
    settings: {
      chainId: 4,
      name: 'Rinkeby testnet',
      shortName: 'Rinkeby',
      type: 'rinkeby', // as returned by web3.eth.net.getNetworkType()
      live: true,
    },
    // providers: ['injected', 'frame'],
    providers: [
      { id: 'provided' },
      { id: 'frame' },
      fortmaticApiKey ? { id: 'fortmatic', conf: fortmaticApiKey } : null,
      portisDappId ? { id: 'portis', conf: portisDappId } : null,
    ].filter(p => p),
  },
  ropsten: {
    enableMigrateBanner: true,
    addresses: {
      ensRegistry:
        localEnsRegistryAddress || '0x6afe2cacee211ea9179992f89dc61ff25c61e923',
    },
    nodes: {
      defaultEth: 'wss://ropsten.eth.aragon.network/ws',
    },
    connectGraphEndpoint: null,
    settings: {
      chainId: 3,
      name: 'Ropsten testnet',
      shortName: 'Ropsten',
      type: 'ropsten', // as returned by web3.eth.net.getNetworkType()
      live: true,
    },
    providers: [{ id: 'provided' }, { id: 'frame' }],
  },
  local: {
    enableMigrateBanner: true,
    addresses: {
      ensRegistry: localEnsRegistryAddress,
    },
    nodes: {
      defaultEth: 'ws://localhost:8545',
    },
    connectGraphEndpoint: null,
    settings: {
      // Local development environments by convention use
      // a chainId of value 1337, but for the sake of configuration
      // we expose a way to change this value.
      chainId: Number(getLocalChainId()),
      name: 'local testnet',
      shortName: 'Local',
      type: 'private',
      live: false,
    },
    providers: [{ id: 'provided' }, { id: 'frame' }],
  },
  // xDai is an experimental chain in the Aragon Client. It's possible
  // and expected that a few things will break.
  xdai: {
    enableMigrateBanner: false,
    addresses: {
      ensRegistry:
        localEnsRegistryAddress || '0xaafca6b0c89521752e559650206d7c925fd0e530',
    },
    nodes: {
      defaultEth: 'wss://xdai.poanetwork.dev/wss',
    },
    connectGraphEndpoint: null,
    settings: {
      chainId: 100,
      name: 'xDai',
      shortName: 'xdai',
      type: 'private',
      live: true,
    },
    providers: [
      { id: 'provided' },
      { id: 'frame' },
      portisDappId ? { id: 'portis', conf: portisDappId } : null,
    ].filter(p => p),
  },
  unknown: {
    enableMigrateBanner: true,
    addresses: {
      ensRegistry: localEnsRegistryAddress,
    },
    nodes: {
      defaultEth: 'ws://localhost:8545',
    },
    connectGraphEndpoint: null,
    settings: {
      name: `Unknown network`,
      shortName: 'Unknown',
      type: 'unknown',
      live: false,
    },
    providers: [{ id: 'provided' }, { id: 'frame' }],
  },
}

export function getNetworkConfig(type) {
  return (
    networkConfigs[type] || {
      ...networkConfigs.unknown,
      settings: {
        ...networkConfigs.unknown.settings,
        name: `Unsupported network (${type})`,
      },
    }
  )
}

export function getNetworkByChainId(chainId = -1) {
  chainId = Number(chainId)
  return (
    Object.values(networkConfigs).find(
      network => network.settings.chainId === chainId
    ) || networkConfigs.unknown
  )
}

export function sanitizeNetworkType(networkType) {
  if (networkType === 'private') {
    return 'localhost'
  } else if (networkType === 'main') {
    return 'mainnet'
  }
  return networkType
}
