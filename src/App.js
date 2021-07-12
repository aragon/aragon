import React from 'react'
import PropTypes from 'prop-types'
import { Spring, animated } from 'react-spring'
import { useTheme } from '@aragon/ui'
import { EthereumAddressType, ClientThemeType } from './prop-types'
import { useWallet } from './wallet'
import { network, web3Providers, enableMigrateBanner } from './environment'
import { useClientTheme } from './client-theme'
import { useRouting } from './routing'
import initWrapper, { pollConnectivity } from './aragonjs-wrapper'
import { Onboarding } from './onboarding'
import { getWeb3 } from './web3-utils'
import { log } from './utils'
import { ActivityProvider } from './contexts/ActivityContext'
import { FavoriteDaosProvider } from './contexts/FavoriteDaosContext'
import { PermissionsProvider } from './contexts/PermissionsContext'
import { IdentityProvider } from './components/IdentityManager/IdentityManager'
import { LocalIdentityModalProvider } from './components/LocalIdentityModal/LocalIdentityModalManager'
import LocalIdentityModal from './components/LocalIdentityModal/LocalIdentityModal'
import GlobalPreferences from './components/GlobalPreferences/GlobalPreferences'
import CustomToast from './components/CustomToast/CustomToast'
import OrgView from './components/OrgView/OrgView'

import { isKnownRepo } from './repo-utils'

import {
  APPS_STATUS_ERROR,
  APPS_STATUS_READY,
  APPS_STATUS_LOADING,
  APPS_STATUS_UNLOADED,
  DAO_STATUS_ERROR,
  DAO_STATUS_READY,
  DAO_STATUS_LOADING,
  DAO_STATUS_UNLOADED,
} from './symbols'

const MIGRATION_BANNER_HIDE = 'MIGRATION_BANNER_HIDE&'
const MIGRATION_LAST_DATE_ELIGIBLE_TIMESTAMP = new Date(
  '2021-05-14T15:43:08Z'
).getTime()

const getMigrateBannerKey = address => `${MIGRATION_BANNER_HIDE}${address}`

const INITIAL_DAO_STATE = {
  apps: [],
  appIdentifiers: {},
  appsStatus: APPS_STATUS_UNLOADED,
  daoAddress: { address: '', domain: '' },
  daoStatus: DAO_STATUS_UNLOADED,
  permissions: {},
  permissionsLoading: true,
  repos: [],
  showMigrateBanner: false,
}

const SELECTOR_NETWORKS = [
  ['main', 'Ethereum Mainnet', 'https://client.aragon.org/'],
  [
    'rinkeby',
    'Ethereum Testnet (Rinkeby)',
    'https://rinkeby.client.aragon.org/',
  ],
]
if (network.type === 'ropsten') {
  SELECTOR_NETWORKS.push([
    'ropsten',
    'Ethereum Testnet (Ropsten)',
    'https://aragon.ropsten.aragonpm.com/',
  ])
}

class App extends React.Component {
  static propTypes = {
    clientTheme: ClientThemeType.isRequired,
    routing: PropTypes.object.isRequired,
    theme: PropTypes.object.isRequired,
    walletAccount: EthereumAddressType,
  }

  state = {
    ...INITIAL_DAO_STATE,
    connected: false,
    fatalError: null,
    identityIntent: null,
    selectorNetworks: SELECTOR_NETWORKS,
    transactionBag: null,
    signatureBag: null,
    web3: getWeb3(web3Providers.default),
    wrapper: null,
  }

  componentDidMount() {
    // Only the default, because the app can work without the wallet
    pollConnectivity([web3Providers.default], connected => {
      this.setState({ connected })
    })
  }

  componentDidUpdate(prevProps, prevState) {
    const { clientTheme, routing, walletAccount } = this.props
    const { wrapper } = this.state

    if (wrapper && walletAccount !== prevProps.walletAccount) {
      wrapper.setAccounts(walletAccount === null ? [] : [walletAccount])
    }

    if (
      wrapper &&
      (!prevState.wrapper || clientTheme !== prevProps.clientTheme)
    ) {
      wrapper.setGuiStyle(clientTheme.appearance, clientTheme.theme)
    }

    const { mode } = routing
    const { mode: prevMode } = prevProps.routing
    if (mode.name === 'org' && mode.orgAddress !== prevMode.orgAddress) {
      this.updateDao(mode.orgAddress)
    }
  }

  updateDao(orgAddress) {
    const { clientTheme, walletAccount } = this.props

    // Cancel the subscriptions / unload the wrapper
    if (this.state.wrapper) {
      this.state.wrapper.cancel()
      this.setState({ wrapper: null })
    }

    // Reset the DAO state
    this.setState({
      ...INITIAL_DAO_STATE,
    })

    if (orgAddress === null) {
      return
    }

    // Loading state
    this.setState({
      appsStatus: APPS_STATUS_LOADING,
      daoStatus: DAO_STATUS_LOADING,
    })

    log('Init DAO', orgAddress)
    initWrapper(orgAddress, {
      guiStyle: {
        appearance: clientTheme.appearance,
        theme: clientTheme.theme,
      },
      provider: web3Providers.default,
      walletAccount,
      onDaoAddress: ({ address, domain, createdAt }) => {
        log('dao address', address)
        log('dao domain', domain)
        log('dao createdAt', createdAt)
        const hideMigrateBanner = getMigrateBannerKey(address)
        const showMigrateBanner =
          enableMigrateBanner &&
          createdAt &&
          !localStorage.getItem(hideMigrateBanner) &&
          createdAt < MIGRATION_LAST_DATE_ELIGIBLE_TIMESTAMP

        this.setState({
          showMigrateBanner,
          daoStatus: DAO_STATUS_READY,
          daoAddress: { address, domain },
        })
      },
      onApps: apps => {
        log('apps updated', apps)
        this.setState({
          apps,
          appsStatus: APPS_STATUS_READY,
        })
      },
      onPermissions: permissions => {
        log('permissions updated', permissions)
        this.setState({
          permissions,
          permissionsLoading: false,
        })
      },
      onForwarders: forwarders => {
        log('forwarders', forwarders)
      },
      onAppIdentifiers: appIdentifiers => {
        log('app identifiers', appIdentifiers)
        this.setState({ appIdentifiers })
      },
      onInstalledRepos: repos => {
        log('installed repos', repos)
        const canUpgradeOrg = repos.some(
          ({ appId, currentVersion, latestVersion }) =>
            isKnownRepo(appId) &&
            // If the installed app version is not a published version,
            // never consider the organization for upgrades
            Boolean(currentVersion) &&
            currentVersion.version.split('.')[0] <
              latestVersion.version.split('.')[0]
        )
        this.setState({ canUpgradeOrg, repos })
      },
      onTransaction: transactionBag => {
        log('transaction bag', transactionBag)
        this.setState({ transactionBag })
      },
      onSignatures: signatureBag => {
        log('signature bag', signatureBag)
        this.setState({ signatureBag })
      },
      onIdentityIntent: async identityIntent => {
        // set the state for modifying a specific address identity
        let name = null
        try {
          const identity = await this.handleIdentityResolve(
            identityIntent.address
          )
          name = identity.name
        } catch (_) {}
        this.setState({
          identityIntent: {
            label: name,
            ...identityIntent,
          },
        })
      },
      onRequestPath: ({ appAddress, path, resolve, reject }) => {
        const { routing } = this.props
        if (appAddress !== routing.mode.instanceId) {
          reject(
            `Can’t change the path of ${appAddress}: the app is not currently active.`
          )
          return
        }

        resolve()

        routing.update(({ mode }) => ({
          mode: {
            name: 'org',
            orgAddress: mode.orgAddress,
            instanceId: mode.instanceId,
            instancePath: path,
          },
        }))
      },
    })
      .then(wrapper => {
        const { walletAccount } = this.props
        if (walletAccount !== null) {
          wrapper.setAccounts([walletAccount])
        }
        this.setState({ wrapper })
        return wrapper
      })
      .catch(err => {
        log(`Wrapper init, fatal error: ${err.name}. ${err.message}.`)
        this.setState({
          appsStatus: APPS_STATUS_ERROR,
          daoStatus: DAO_STATUS_ERROR,
          fatalError: err,
        })
      })
  }

  closeMigrateBanner = address => {
    this.setState({ showMigrateBanner: false })
    localStorage.setItem(getMigrateBannerKey(address), String(true))
  }

  handleIdentityCancel = () => {
    const { identityIntent } = this.state
    identityIntent.reject(new Error('Identity modification cancelled'))
    this.setState({ identityIntent: null })
  }

  handleIdentitySave = ({ address, label }) => {
    const { identityIntent } = this.state
    this.state.wrapper
      .modifyAddressIdentity(address, { name: label })
      .then(identityIntent.resolve)
      .then(() => this.setState({ identityIntent: null }))
      .catch(identityIntent.reject)
  }

  handleIdentityDelete = addresses => {
    const { identityIntent } = this.state
    this.state.wrapper
      .removeLocalIdentities(addresses)
      .then(identityIntent.resolve)
      .then(this.setState({ identityIntent: null }))
      .catch(identityIntent.reject)
  }

  handleIdentityResolve = address => {
    // returns promise
    if (this.state.wrapper) {
      return this.state.wrapper.resolveAddressIdentity(address)
    } else {
      // wrapper has not been initialized
      // re-request in 100 ms
      return new Promise(resolve => {
        setTimeout(async () => {
          resolve(await this.handleIdentityResolve(address))
        }, 100)
      })
    }
  }

  handleOpenLocalIdentityModal = address => {
    return this.state.wrapper.requestAddressIdentityModification(address)
  }

  render() {
    const { theme, routing } = this.props
    const {
      apps,
      appIdentifiers,
      appsStatus,
      canUpgradeOrg,
      daoAddress,
      daoStatus,
      fatalError,
      identityIntent,
      permissions,
      permissionsLoading,
      repos,
      selectorNetworks,
      transactionBag,
      signatureBag,
      web3,
      wrapper,
      showMigrateBanner,
    } = this.state

    const { address: intentAddress = null, label: intentLabel = '' } =
      identityIntent || {}

    if (!routing.mode) {
      return null
    }

    if (fatalError !== null) {
      throw fatalError
    }

    const appsWithIdentifiers = apps.map(app => {
      const identifier = appIdentifiers[app.proxyAddress]
      return identifier
        ? {
            identifier,
            ...app,
          }
        : app
    })

    return (
      <Spring
        from={{ opacity: 0, scale: 0.98 }}
        to={{ opacity: 1, scale: 1 }}
        native
      >
        {({ opacity, scale }) => (
          <animated.div
            style={{
              opacity,
              background: theme.background,
            }}
          >
            <animated.div
              style={{
                transform: scale.interpolate(v => `scale3d(${v}, ${v}, 1)`),
              }}
            >
              <CustomToast>
                <IdentityProvider onResolve={this.handleIdentityResolve}>
                  <LocalIdentityModalProvider
                    onShowLocalIdentityModal={this.handleOpenLocalIdentityModal}
                  >
                    <LocalIdentityModal
                      address={intentAddress}
                      label={intentLabel}
                      opened={identityIntent !== null}
                      onCancel={this.handleIdentityCancel}
                      onDelete={this.handleIdentityDelete}
                      onSave={this.handleIdentitySave}
                    />
                    <FavoriteDaosProvider>
                      <ActivityProvider
                        daoDomain={daoAddress.domain}
                        web3={web3}
                      >
                        <PermissionsProvider
                          wrapper={wrapper}
                          apps={appsWithIdentifiers}
                          permissions={permissions}
                        >
                          <div css="position: relative; z-index: 0">
                            <OrgView
                              apps={appsWithIdentifiers}
                              appsStatus={appsStatus}
                              canUpgradeOrg={canUpgradeOrg}
                              daoAddress={daoAddress}
                              daoStatus={daoStatus}
                              historyBack={routing.back}
                              onRequestAppsReload={this.handleRequestAppsReload}
                              permissionsLoading={permissionsLoading}
                              repos={repos}
                              signatureBag={signatureBag}
                              transactionBag={transactionBag}
                              visible={routing.mode.name === 'org'}
                              web3={web3}
                              wrapper={wrapper}
                              showMigrateBanner={showMigrateBanner}
                              closeMigrateBanner={() =>
                                this.closeMigrateBanner(daoAddress.address)
                              }
                            />
                          </div>
                        </PermissionsProvider>

                        <Onboarding
                          selectorNetworks={selectorNetworks}
                          web3={web3}
                        />

                        <GlobalPreferences
                          apps={appsWithIdentifiers}
                          wrapper={wrapper}
                        />
                      </ActivityProvider>
                    </FavoriteDaosProvider>
                  </LocalIdentityModalProvider>
                </IdentityProvider>
              </CustomToast>
            </animated.div>
          </animated.div>
        )}
      </Spring>
    )
  }
}

export default function AppHooksWrapper(props) {
  const { account } = useWallet()
  const theme = useTheme()
  const clientTheme = useClientTheme()
  const routing = useRouting()

  return (
    <App
      clientTheme={clientTheme}
      routing={routing}
      theme={theme}
      walletAccount={account}
      {...props}
    />
  )
}
