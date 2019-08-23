import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import {
  Bar,
  BackButton,
  Box,
  Button,
  Split,
  Link,
  GU,
  blockExplorerUrl,
  textStyle,
  useViewport,
  useTheme,
} from '@aragon/ui'
import AppIcon from '../../../components/AppIcon/AppIcon'
import LocalIdentityBadge from '../../../components/IdentityBadge/LocalIdentityBadge'
import { MENU_PANEL_WIDTH } from '../../../components/MenuPanel/MenuPanel'
import Markdown from '../../../components/Markdown/Markdown'
import { RepoType } from '../../../prop-types'
import { useRepoDetails } from '../../../hooks'
import { network } from '../../../environment'
import Screenshots from '../Screenshots'

const GITHUB = 'https://github.com'
const GITLAB = 'https://gitlab.com'
const BITBUCKET = 'https://bitbucket.com'

const parseHub = url =>
  url.toLowerCase().indexOf(GITHUB) === 0
    ? 'GitHub'
    : url.toLowerCase().indexOf(GITLAB)
    ? 'GitLab'
    : url.toLowerCae().indexOf(BITBUCKET)
    ? 'Bitbucket'
    : url

// Exclude the width of MenuPanel
const appBelow = (below, value) =>
  below(value + (below('medium') ? 0 : MENU_PANEL_WIDTH))

const AppContent = React.memo(
  ({ repo, repoVersions, onRequestUpgrade, onClose }) => {
    const theme = useTheme()
    const {
      name,
      instances,
      baseUrl,
      currentVersion,
      latestVersion: {
        content: {
          author,
          icons,
          description = 'No description.',
          screenshots = [],
          source_url: sourceUrl,
          details_url: detailsUrl,
        },
        version: latestVersion,
      },
      repoAddress,
      repoName,
    } = repo
    const repoDetails = useRepoDetails(baseUrl, detailsUrl)
    const canUpgrade = currentVersion.version !== latestVersion
    const { below, breakpoints } = useViewport()
    const compact = appBelow(below, breakpoints.medium)

    return (
      <React.Fragment>
        <Bar>
          <BackButton onClick={onClose} />
        </Bar>
        <Split
          primary={
            <Box>
              <div
                css={`
                  display: grid;
                  grid-template-columns: auto;
                  grid-gap: ${4 * GU}px;
                `}
              >
                <div
                  css={`
                    display: grid;
                    grid-template-columns: auto auto 1fr;
                    grid-gap: ${2 * GU}px;

                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: space-between;
                  `}
                >
                  <div
                    css={`
                      display: grid;
                      grid-template-columns: auto auto;
                      grid-gap: ${2 * GU}px;
                    `}
                  >
                    <AppIcon app={{ baseUrl, icons }} size={80} radius={12} />
                    <div
                      css={`
                        display: flex;
                        flex-direction: column;
                        align-items: flex-start;
                        justify-content: center;
                        margin-right: ${2.5 * GU}px;
                      `}
                    >
                      <h1
                        css={`
                          color: ${theme.content};
                          ${textStyle('title3')};
                          white-space: nowrap;
                          margin-bottom: ${1 * GU}px;
                        `}
                      >
                        {name}
                      </h1>
                      {author && (
                        <h2
                          css={`
                          color: ${theme.contentSecondary};
                          textStyle('body2');
                          display: grid;
                          grid-gap: ${1.5 * GU}px;
                          grid-template-columns: auto auto;
                        `}
                        >
                          By <LocalIdentityBadge entity={author} />
                        </h2>
                      )}
                    </div>
                  </div>
                  {canUpgrade && onRequestUpgrade && (
                    <Button
                      mode="strong"
                      onClick={onRequestUpgrade}
                      css={`
                        width: 128px;
                        margin: ${2.5 * GU}px 0;
                        align-self: center;
                      `}
                    >
                      Install App
                    </Button>
                  )}
                </div>
                {screenshots.length > 0 && (
                  <Screenshots repo={repo} screenshots={screenshots} />
                )}
                <div
                  css={`
                    display: grid;
                    grid-template-columns: ${compact ? 'auto' : '60% 40%'};
                    grid-column-gap: ${compact ? 0 : 5 * GU}px;
                  `}
                >
                  <DetailsGroup>
                    <Heading2 theme={theme}>Description</Heading2>
                    <div>{description}</div>

                    {!!repoDetails && (
                      <React.Fragment>
                        <Heading2 theme={theme}>Details</Heading2>
                        <Markdown text={repoDetails} />
                      </React.Fragment>
                    )}
                  </DetailsGroup>
                  <div>
                    <DetailsGroup>
                      <Heading2 theme={theme}>Installed instances</Heading2>
                      <div
                        css={`
                          display: inline-grid;
                          grid-template-columns: auto;
                          grid-gap: ${1 * GU}px;
                          width: calc(100% - ${!compact ? 5 * GU : 0}px);
                        `}
                      >
                        {instances.map(({ proxyAddress }) => (
                          <LocalIdentityBadge
                            entity={proxyAddress}
                            key={proxyAddress}
                          />
                        ))}
                      </div>
                    </DetailsGroup>
                    <DetailsGroup>
                      <Heading2 theme={theme}>Source code</Heading2>
                      <BreakLink compact={compact}>
                        {sourceUrl ? (
                          <Link target="_blank" href={sourceUrl}>
                            {parseHub(sourceUrl)}
                          </Link>
                        ) : (
                          'No source code link.'
                        )}
                      </BreakLink>
                    </DetailsGroup>
                    {!!repoAddress && !!repoAddress && (
                      <DetailsGroup>
                        <Heading2 theme={theme}>Package Name</Heading2>
                        <BreakLink compact={compact}>
                          <Link
                            target="_blank"
                            href={blockExplorerUrl('address', repoAddress, {
                              networkType: network.type,
                            })}
                          >
                            {repoName}
                          </Link>
                        </BreakLink>
                      </DetailsGroup>
                    )}
                  </div>
                </div>
              </div>
            </Box>
          }
          secondary={
            <Box
              heading={
                <div
                  css={`
                    display: flex;
                    justify-content: space-between;
                    width: 100%;
                    padding: 0 ${2 * GU}px;
                  `}
                >
                  <ReposHeader theme={theme}>App version</ReposHeader>
                  <ReposHeader theme={theme}>Release date</ReposHeader>
                </div>
              }
            >
              {repoVersions}
            </Box>
          }
        />
      </React.Fragment>
    )
  }
)

AppContent.propTypes = {
  repo: RepoType.isRequired,
  repoVersions: PropTypes.node,
  onRequestUpgrade: PropTypes.func,
  onClose: PropTypes.func,
}

const ReposHeader = styled.span`
  color: ${({ theme }) => theme.contentSecondary};
  ${textStyle('label2')};
`

const Heading2 = styled.h2`
  margin-bottom: ${1 * GU}px;
  color: ${({ theme }) => theme.contentSecondary};
  ${textStyle('label2')};
`

const DetailsGroup = styled.div`
  margin-bottom: ${3.5 * GU}px;
`

const BreakLink = styled.div`
  width: ${({ compact }) => `calc(100% - ${!compact ? 5 * GU : 0}px)`};
  word-break: break-all;
`

export default AppContent
