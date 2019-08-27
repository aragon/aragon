import React, { useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import {
  Button,
  Link,
  Info,
  SidePanel,
  SidePanelSeparator,
  SidePanelSplit,
  GU,
  textStyle,
  useTheme,
} from '@aragon/ui'
import {
  AragonType,
  DaoAddressType,
  ReposListType,
  RepoContentType,
} from '../../prop-types'
import AppIcon from '../../components/AppIcon/AppIcon'
import { KERNEL_APP_BASE_NAMESPACE } from '../../aragonos-utils'
import { network } from '../../environment'
import { KNOWN_ICONS, isKnownRepo } from '../../repo-utils'
import { repoBaseUrl } from '../../url-utils'
import RepoBadge from '../../components/RepoBadge/RepoBadge'
import { sanitizeCodeRepositoryUrl } from '../../url-utils'

const VERSION = '0.8 Camino'
const SOURCE = [
  'github.com/aragon/aragon-apps',
  'https://github.com/aragon/aragon-apps',
]
const REGISTRY = ['aragonpm.eth', 'https://etherscan.io/address/aragonpm.eth']

const UpgradeOrganizationPanel = React.memo(
  ({ repos = [], opened, onClose, daoAddress, wrapper }) => {
    const theme = useTheme()
    const [currentVersions, newVersions] = useMemo(
      () =>
        repos
          .filter(repo => isKnownRepo(repo.appId))
          .reduce(
            (results, repo) => [
              [...results[0], repo.currentVersion],
              [...results[1], repo.latestVersion],
            ],
            [[], []]
          ),
      [repos]
    )

    const handleUpgradeAll = useCallback(async () => {
      const upgradeIntents = repos.map(({ appId, versions }) => {
        const newContractAddress = versions[versions.length - 1].contractAddress
        return [
          daoAddress.address,
          'setApp',
          [KERNEL_APP_BASE_NAMESPACE, appId, newContractAddress],
        ]
      })

      // Close the panel early, to allow the SignerPanel to open
      // The animation helps us a little bit with the lag on calculating the path
      onClose()

      const {
        path,
        transactions,
      } = await wrapper.getTransactionPathForIntentBasket(upgradeIntents, {
        checkMode: 'single',
      })

      if (Array.isArray(path) && path.length) {
        // We can use the power of calls scripts to do a single transaction!
        await wrapper.performTransactionPath(path)
      } else if (Array.isArray(transactions) && transactions.length) {
        // User has direct access, so we need to send these intents one by one
        for (const transaction of transactions) {
          await wrapper.performTransactionPath([transaction])
        }
      } else {
        // The user just can't perform this action, show the signing panel's error screen
        await wrapper.performTransactionPath([])
      }
    }, [daoAddress, onClose, repos, wrapper])

    return (
      <SidePanel
        title={`Upgrade to ${VERSION}`}
        opened={opened}
        onClose={onClose}
      >
        <SidePanelSplit
          css={`
            border-bottom: 1px solid ${theme.border};
            ${textStyle('body2')};
          `}
        >
          <div>
            <Heading2 theme={theme}>Current version</Heading2>
            <div>
              {currentVersions.map(appVersion => (
                <AppVersion key={appVersion.content.appId} repo={appVersion} />
              ))}
            </div>
          </div>
          <div>
            <Heading2 theme={theme}>New version</Heading2>
            {newVersions.map(appVersion => (
              <AppVersion key={appVersion.content.appId} repo={appVersion} />
            ))}
          </div>
        </SidePanelSplit>

        <Part>
          <Heading2 theme={theme}>Source code</Heading2>
          <p>
            <Link external href={SOURCE[1]}>
              {sanitizeCodeRepositoryUrl(SOURCE[0])}
            </Link>
          </p>

          <Heading2 theme={theme}>Aragon official registry</Heading2>
          <p>
            <Link external href={REGISTRY[1]}>
              {REGISTRY[0]}
            </Link>
          </p>
        </Part>

        <SidePanelSeparator />

        <Part>
          <div
            css={`
              margin: ${2 * GU}px 0;
            `}
          >
            <Button mode="strong" wide onClick={handleUpgradeAll}>
              Upgrade your organization
            </Button>
          </div>
          <div
            css={`
              margin: ${2 * GU}px 0;
            `}
          >
            <Info>
              <p
                css={`
                  margin-top: ${GU}px;
                  font-size: 15px;
                `}
              >
                All your app instances will be upgraded to Aragon {VERSION}.
              </p>
            </Info>
          </div>
        </Part>
      </SidePanel>
    )
  }
)

UpgradeOrganizationPanel.propTypes = {
  opened: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  repos: ReposListType,
  daoAddress: DaoAddressType.isRequired,
  theme: PropTypes.object,
  wrapper: AragonType,
}

const AppVersion = ({ repo }) => {
  const { version } = repo
  return (
    <div
      css={`
        display: inline-grid;
        grid-template-columns: auto auto;
        grid-gap: ${2 * GU}px;
        align-items: center;
        margin: ${0.5 * GU}px 0;
      `}
    >
      <div css="width: 26px;">{version}</div>
      <RepoBadge repo={repo} />
    </div>
  )
}

AppVersion.propTypes = {
  repo: PropTypes.shape({
    content: RepoContentType.isRequired,
    version: PropTypes.string.isRequired,
  }),
}

const Heading2 = styled.h2`
  color: ${({ theme }) => theme.contentSecondary};
  ${textStyle('label2')};
  white-space: nowrap;
  margin-bottom: ${2 * GU}px;
`

const Part = styled.div`
  ${textStyle('body2')};
  padding: ${GU}px 0 ${3 * GU}px;
  h2 {
    margin: ${2 * GU}px 0 ${GU}px;
  }
`

export default UpgradeOrganizationPanel
