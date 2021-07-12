import Web3 from 'web3'
import appIds from './known-app-ids'
import { parseAppLocator } from './app-locator'
import {
  getAppLocator,
  getDefaultEthNode,
  getEthNetworkType,
  getIpfsGateway,
} from './local-settings'
import { getNetworkConfig } from './network-config'

const appsOrder = ['TokenManager', 'Voting', 'Finance', 'Agent']

const networkType = getEthNetworkType()

// Utility to sort a pair of apps (to be used with Array.prototype.sort)
export const sortAppsPair = (app1, app2) => {
  const pairs = Object.entries(appIds)
  const [name1] = pairs.find(([_, id]) => id === app1.appId) || []
  const [name2] = pairs.find(([_, id]) => id === app2.appId) || []
  const index1 = name1 ? appsOrder.indexOf(name1) : -1
  const index2 = name2 ? appsOrder.indexOf(name2) : -1

  // Keep kernel first
  if (app1.name === 'Kernel') {
    return -1
  }
  if (app2.name === 'Kernel') {
    return 1
  }

  // Internal apps first
  if (app1.isAragonOsInternalApp !== app2.isAragonOsInternalApp) {
    return app1.isAragonOsInternalApp ? -1 : 1
  }

  // Try to sort it if the app exists in the list
  if (index1 === -1 && index2 > -1) {
    return 1
  }
  if (index1 > -1 && index2 === -1) {
    return -1
  }
  if (index1 > -1 && index2 > -1) {
    return index1 - index2
  }

  // Missing app name
  if (!(app1.name && app2.name)) {
    return 0
  }

  // Otherwise, alphabetical order
  const unknownName1 = app1.name.toLowerCase()
  const unknownName2 = app2.name.toLowerCase()
  if (unknownName1 === unknownName2) {
    return 0
  }
  return unknownName1 < unknownName2 ? -1 : 1
}

// Use appOverrides to override specific keys in an app instance, e.g. the start_url or script location
export const appOverrides = {
  // Needed to change app name on sidebar for old versions whose aragonPM repo content cannot be changed anymore
  [appIds['TokenManager']]: { name: 'Tokens' },
}

export const appLocator = parseAppLocator(getAppLocator())

export const ipfsDefaultConf = {
  gateway: getIpfsGateway(),
}

const networkConfig = getNetworkConfig(networkType)
export const network = networkConfig.settings
export const providers = networkConfig.providers
export const connectGraphEndpoint = networkConfig.connectGraphEndpoint
export const enableMigrateBanner = networkConfig.enableMigrateBanner || false

export const contractAddresses = {
  ensRegistry: networkConfig.addresses.ensRegistry,
}
if (process.env.NODE_ENV !== 'production') {
  if (Object.values(contractAddresses).some(address => !address)) {
    // Warn if any contracts are not given addresses in development
    console.error(
      'Some contracts are missing addresses in your environment! You most likely need to specify them as environment variables.'
    )
    console.error('Current contract address configuration', contractAddresses)
  }
  if (network.type === 'unknown') {
    console.error(
      'This app was configured to connect to an unsupported network. You most likely need to change your network environment variables.'
    )
  }
}

export const defaultEthNode =
  getDefaultEthNode() || networkConfig.nodes.defaultEth

export const web3Providers = {
  default: new Web3.providers.WebsocketProvider(defaultEthNode),
}
