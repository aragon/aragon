import React, { useCallback, useContext } from 'react'
import PropTypes from 'prop-types'
import {
  ButtonBase,
  ButtonIcon,
  IconCross,
  IconCheck,
  GU,
  blockExplorerUrl,
  textStyle,
  useTheme,
} from '@aragon/ui'
import { ActivityContext } from '../../contexts/ActivityContext'
import { network } from '../../environment'
import { cssgu } from '../../utils'
import { transformAddresses } from '../../web3-utils'
import AppIcon from '../AppIcon/AppIcon'
import LocalIdentityBadge from '../IdentityBadge/LocalIdentityBadge'
import TimeTag from './TimeTag'
import TransactionProgress from './TransactionProgress'
import {
  ACTIVITY_STATUS_PENDING,
  ACTIVITY_STATUS_CONFIRMED,
  ACTIVITY_STATUS_FAILED,
  ACTIVITY_STATUS_TIMED_OUT,
} from '../../symbols'

const ActivityItem = ({ activity }) => {
  const theme = useTheme()
  const { clearActivity } = useContext(ActivityContext)
  const handleOpen = useCallback(() => {
    if (activity.transactionHash) {
      window.open(
        blockExplorerUrl('transaction', activity.transactionHash, {
          networkType: network.type,
        }),
        '_blank',
        'noopener'
      )
    }
  }, [activity])
  const handleClose = useCallback(() => {
    if (activity.transactionHash) {
      clearActivity(activity.transactionHash)
    }
  }, [activity, clearActivity])

  const { app } = activity

  return (
    <div
      css={`
        position: relative;
      `}
    >
      <ButtonBase
        element="div"
        onClick={handleOpen}
        css={`
          text-align: left;
          width: 100%;
        `}
      >
        <section
          css={`
            display: flex;
            flex-direction: column;
            overflow: hidden;
            padding: ${cssgu`2gu`};
            background: ${activity.read
              ? theme.surface
              : theme.surfaceHighlight};
            transition-property: background;
            transition-duration: 50ms;
            transition-timing-function: ease-in-out;

            &:active {
              background: ${theme.surfaceUnder};
            }
          `}
        >
          <h1
            css={`
              display: flex;
              align-items: center;
            `}
          >
            <div css="flex-shrink: 0">
              <AppIcon app={app} />
            </div>
            <div
              css={`
                margin-left: ${cssgu`1gu`};
                max-width: ${cssgu`12.5gu`};
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                ${textStyle('body2')}
                color: ${theme.surfaceContent};
              `}
            >
              {app ? app.name : 'Unknown'}
            </div>
            {activity.status !== ACTIVITY_STATUS_PENDING && (
              <TimeTag
                date={activity.createdAt}
                css={`
                  margin: 0 ${cssgu`1.5gu`};
                `}
              />
            )}
          </h1>
          <div
            css={`
              position: relative;
              margin-top: ${2 * GU}px;
            `}
          >
            <ItemContent text={activity.description} />
            <StatusMessage activity={activity} />
            <TransactionProgress
              status={activity.status}
              createdAt={activity.createdAt}
            />
          </div>
        </section>
      </ButtonBase>
      <ButtonIcon
        label="Remove"
        onClick={handleClose}
        css={`
          position: absolute;
          top: ${1 * GU}px;
          right: ${1 * GU}px;
          z-index: 1;
        `}
      >
        <IconCross
          css={`
            color: ${theme.surfaceIcon};
          `}
        />
      </ButtonIcon>
    </div>
  )
}

ActivityItem.propTypes = {
  activity: PropTypes.object.isRequired,
}

const ItemContent = React.memo(
  ({ text = '' }) => (
    <p
      css={`
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        white-space: normal;
        word-break: break-word;
        overflow: hidden;
        ${textStyle('body2')}
      `}
    >
      {transformAddresses(text, (part, isAddress, index) =>
        isAddress ? (
          <span title={part} key={index}>
            <LocalIdentityBadge entity={part} compact />
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </p>
  ),
  (prevProps, nextProps) => prevProps.text === nextProps.text
)

ItemContent.propTypes = {
  text: PropTypes.string.isRequired,
}

function getStatusData(activity, theme) {
  if (activity.status === ACTIVITY_STATUS_CONFIRMED) {
    return [
      <IconCheck size="small" />,
      <span>Transaction confirmed</span>,
      theme.positive,
    ]
  }
  if (activity.status === ACTIVITY_STATUS_FAILED) {
    return [
      <IconCross size="small" />,
      <span>Transaction failed</span>,
      theme.negative,
    ]
  }
  if (activity.status === ACTIVITY_STATUS_TIMED_OUT) {
    return [
      <IconCross size="small" />,
      <span>Transaction timed out</span>,
      theme.negative,
    ]
  }
  return [null, <span>Transaction pending</span>, theme.surfaceContentSecondary]
}

const StatusMessage = ({ activity }) => {
  const theme = useTheme()
  const [icon, content, color] = getStatusData(activity, theme)
  return (
    <div
      css={`
        display: flex;
        align-items: center;
        margin-top: ${2 * GU}px;
        ${textStyle('label2')}
        color: ${color}
      `}
    >
      {icon}
      {content}
    </div>
  )
}

StatusMessage.propTypes = {
  activity: PropTypes.object.isRequired,
}

export default ActivityItem
