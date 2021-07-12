import resolvePathname from 'resolve-pathname'
import Aragon, {
  apm,
  ensResolve,
  getRecommendedGasLimit,
  providers,
} from '@aragon/wrapper'
import {
  appOverrides,
  sortAppsPair,
  ipfsDefaultConf,
  web3Providers,
  contractAddresses,
} from './environment'
import { NoConnection, DAONotFound } from './errors'
import { getEthSubscriptionEventDelay } from './local-settings'
import { workerFrameSandboxDisabled } from './security/configuration'
import { appBaseUrl } from './url-utils'
import { noop, removeStartingSlash, pollEvery } from './utils'
import {
  getGasPrice,
  getWeb3,
  isEmptyAddress,
  isValidEnsName,
} from './web3-utils'
import SandboxedWorker from './worker/SandboxedWorker'
import WorkerSubscriptionPool from './worker/WorkerSubscriptionPool'
import { getOrganizationByAddress } from './services/gql'

const POLL_DELAY_CONNECTIVITY = 2000

const applyAppOverrides = apps =>
  apps.map(app => ({ ...app, ...(appOverrides[app.appId] || {}) }))

// Sort apps, apply URL overrides, and attach data useful to the frontend
const prepareAppsForFrontend = (apps, daoAddress, gateway) => {
  const hasWebApp = app => Boolean(app['start_url'])

  const getAPMRegistry = ({ appName = '' }) =>
    appName.substr(appName.indexOf('.') + 1) // everything after the first '.'

  const getAppTags = app => {
    const apmRegistry = getAPMRegistry(app)

    const tags = []
    if (app.status) {
      tags.push(app.status)
    }
    if (apmRegistry && apmRegistry !== 'aragonpm.eth') {
      tags.push(`${apmRegistry} registry`)
    }
    if (!hasWebApp(app)) {
      tags.push('contract-only')
    }

    return tags
  }

  return applyAppOverrides(apps)
    .map(app => {
      const baseUrl = appBaseUrl(app, gateway)
      // Remove the starting slash from the start_url field
      // so the absolute path can be resolved from baseUrl.
      const startUrl = removeStartingSlash(app['start_url'] || '')
      const src = baseUrl ? resolvePathname(startUrl, baseUrl) : ''

      return {
        ...app,
        src,
        baseUrl,
        apmRegistry: getAPMRegistry(app),
        hasWebApp: hasWebApp(app),
        tags: getAppTags(app),
      }
    })
    .sort(sortAppsPair)
}

export const pollConnectivity = pollEvery((providers = [], onConnectivity) => {
  let lastFound = null
  return {
    request: async () => {
      try {
        await Promise.all(
          providers.map(p => getWeb3(p).eth.net.getNetworkType())
        )
        return true
      } catch (err) {
        return false
      }
    },
    onResult: connected => {
      if (connected !== lastFound) {
        lastFound = connected
        onConnectivity(connected)
      }
    },
  }
  // web.eth.net.isListening()
}, POLL_DELAY_CONNECTIVITY)

export const resolveEnsDomain = async domain => {
  try {
    return await ensResolve(domain, {
      provider: web3Providers.default,
      registryAddress: contractAddresses.ensRegistry,
    })
  } catch (err) {
    if (err.message === 'ENS name not defined.') {
      return ''
    }
    throw err
  }
}

export const isEnsDomainAvailable = async name => {
  const addr = await resolveEnsDomain(name)
  return addr === '' || isEmptyAddress(addr)
}

export const fetchApmArtifact = async (
  repoAddress,
  ipfsConf = ipfsDefaultConf
) => {
  return apm(getWeb3(web3Providers.default), {
    ipfsGateway: ipfsConf.gateway,
  }).fetchLatestRepoContent(repoAddress)
}

export const performTransactionPaths = async (wrapper, transactionPaths) => {
  if (Array.isArray(transactionPaths) && transactionPaths.length) {
    for (const transaction of transactionPaths) {
      await wrapper.performTransactionPath(transaction)
    }
  } else {
    await wrapper.performTransactionPath([])
  }
}

// Subscribe to aragon.js observables
const subscribe = (
  wrapper,
  {
    onAppIdentifiers,
    onApps,
    onForwarders,
    onIdentityIntent,
    onInstalledRepos,
    onPermissions,
    onRequestPath,
    onSignatures,
    onTransaction,
  },
  { ipfsConf }
) => {
  const {
    appIdentifiers,
    apps,
    forwarders,
    identityIntents,
    installedRepos,
    pathIntents,
    permissions,
    signatures,
    transactions,
  } = wrapper

  const workerSubscriptionPool = new WorkerSubscriptionPool()

  const subscriptions = {
    appIdentifiers: appIdentifiers.subscribe(onAppIdentifiers),
    connectedApp: null,
    connectedWorkers: workerSubscriptionPool,
    forwarders: forwarders.subscribe(onForwarders),
    identityIntents: identityIntents.subscribe(onIdentityIntent),
    installedRepos: installedRepos.subscribe(onInstalledRepos),
    pathIntents: pathIntents.subscribe(onRequestPath),
    permissions: permissions.subscribe(onPermissions),
    signatures: signatures.subscribe(onSignatures),
    transactions: transactions.subscribe(onTransaction),

    apps: apps.subscribe(apps => {
      onApps(
        prepareAppsForFrontend(
          apps,
          wrapper.kernelProxy.address,
          ipfsConf.gateway
        )
      )
    }),
    workers: apps.subscribe(apps => {
      // Asynchronously launch webworkers for each new or updated app that has
      // a background script defined
      applyAppOverrides(apps)
        .filter(app => app.script)
        .filter(
          ({ proxyAddress, updated }) =>
            updated || !workerSubscriptionPool.hasWorker(proxyAddress)
        )
        .forEach(async app => {
          const { name, proxyAddress, script, updated } = app
          const workerName = `${name}(${proxyAddress})`
          const baseUrl = appBaseUrl(app, ipfsConf.gateway)

          // If the app URL is empty, the script can’t be retrieved
          if (!baseUrl) {
            return
          }

          // Remove the starting slash from the script field to force it to
          // load relative to the app's base url
          const scriptUrl = resolvePathname(
            removeStartingSlash(script),
            baseUrl
          )

          const connectApp = await wrapper.runApp(proxyAddress)

          // If the app has been updated, reset its cache and restart its worker
          if (updated && workerSubscriptionPool.hasWorker(proxyAddress)) {
            await workerSubscriptionPool.removeWorker(proxyAddress, {
              clearCache: true,
            })
          }

          // If another execution context already loaded this app's worker
          // before we got to it here, let's short circuit
          if (!workerSubscriptionPool.hasWorker(proxyAddress)) {
            const worker = new SandboxedWorker(scriptUrl, { name: workerName })

            const provider = new providers.MessagePortMessage(worker)
            workerSubscriptionPool.addWorker({
              app,
              worker,
              connection: connectApp(provider),
            })
          }
        })
    }),
  }

  return subscriptions
}

const initWrapper = async (
  dao,
  {
    guiStyle = null,
    ipfsConf = ipfsDefaultConf,
    onAppIdentifiers = noop,
    onApps = noop,
    onDaoAddress = noop,
    onForwarders = noop,
    onIdentityIntent = noop,
    onInstalledRepos = noop,
    onPermissions = noop,
    onRequestPath = noop,
    onSignatures = noop,
    onTransaction = noop,
    provider,
    walletAccount = null,
  } = {}
) => {
  const isDomain = isValidEnsName(dao)
  const daoAddress = isDomain ? await resolveEnsDomain(dao) : dao

  if (!daoAddress) {
    throw new DAONotFound(dao)
  }

  const daoData = {
    address: daoAddress,
    domain: dao,
  }

  const data = await getOrganizationByAddress(daoAddress)
  if (data?.createdAt) {
    // transform into ml seconds
    daoData.createdAt = parseInt(data.createdAt) * 1000
  }

  onDaoAddress(daoData)

  const wrapper = new Aragon(daoAddress, {
    provider,
    // Let web3 provider handle gas estimations on mainnet
    defaultGasPriceFn: () =>
      getGasPrice({ mainnet: { disableEstimate: true } }),
    apm: {
      ensRegistryAddress: contractAddresses.ensRegistry,
      ipfs: ipfsConf,
    },
    cache: {
      // If the worker's origin sandbox is disabed, it has full access to IndexedDB.
      // We force a downgrade to localStorage to avoid using IndexedDB.
      forceLocalStorage: workerFrameSandboxDisabled,
    },
    events: {
      // Infura hack: delay event processing for specified number of ms
      subscriptionEventDelay: getEthSubscriptionEventDelay(),
    },
  })

  try {
    await wrapper.init({
      accounts: {
        providedAccounts: walletAccount ? [walletAccount] : [],
      },
      guiStyle,
    })
  } catch (err) {
    if (err.message === 'Provided daoAddress is not a DAO') {
      throw new DAONotFound(dao)
    }
    if (err.message === 'connection not open') {
      throw new NoConnection('No Ethereum connection detected')
    }

    throw err
  }

  const subscriptions = subscribe(
    wrapper,
    {
      onAppIdentifiers,
      onApps,
      onForwarders,
      onIdentityIntent,
      onInstalledRepos,
      onPermissions,
      onRequestPath,
      onSignatures,
      onTransaction,
    },
    { ipfsConf }
  )

  wrapper.connectAppIFrame = async (iframeElt, proxyAddress) => {
    const provider = new providers.WindowMessage(iframeElt.contentWindow)
    const appContext = (await wrapper.runApp(proxyAddress))(provider)

    if (subscriptions.connectedApp) {
      subscriptions.connectedApp.unsubscribe()
    }
    subscriptions.connectedApp = {
      unsubscribe: appContext.shutdown,
    }
    return appContext
  }

  wrapper.cancel = () => {
    Object.values(subscriptions).forEach(subscription => {
      if (subscription) {
        subscription.unsubscribe()
      }
    })
  }

  return wrapper
}

export { getRecommendedGasLimit }
export default initWrapper
