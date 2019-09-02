import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { AppType } from '../../../prop-types'
import {
  Box,
  Button,
  GU,
  IconTrash,
  IconCheck,
  LoadingRing,
  useTheme,
  Split,
} from '@aragon/ui'
import { getSubscriptions, deleteAccount } from './notification-service-api'
import {
  NOTIFICATION_SERVICE_TOKEN_KEY,
  NOTIFICATION_SERVICE_EMAIL_KEY,
} from './constants'
import SubscriptionsForm from './SubscriptionsForm'
import SubscriptionsTable from './SubscriptionsTable'
import { DeleteAccountConfirmationModal } from './NotificationModals'

export default function ManageNotifications({
  apps,
  dao,
  email,
  onLogout,
  token,
  onServiceUnavailable,
}) {
  const [apiError, setApiError] = useState(null)
  const [isFetching, setIsFetching] = useState(true)
  const [subscriptions, setSubscriptions] = useState([])

  const fetchSubscriptions = useCallback(() => {
    setIsFetching(true)
    return getSubscriptions(token)
      .then(subscriptions => {
        setApiError(null) // reset the error after successfully fetching
        setSubscriptions(subscriptions)
        setIsFetching(false)
        return subscriptions
      })
      .catch(error => {
        setIsFetching(false)
        setApiError(error)
      })
  }, [token, setSubscriptions, setIsFetching, setApiError])

  useEffect(() => {
    if (!token) {
      return
    }
    fetchSubscriptions()
  }, [fetchSubscriptions, token])

  useEffect(() => {
    // Effect for handling api errors
    if (!apiError) {
      return
    }
    if (apiError instanceof TypeError) {
      onServiceUnavailable()
    } else {
      console.error('Unhandled API error:', apiError)
    }
  }, [apiError, onServiceUnavailable])

  return (
    <React.Fragment>
      <Split
        primary={
          <SubscriptionsForm
            onApiError={setApiError}
            fetchSubscriptions={fetchSubscriptions}
            dao={dao}
            apps={apps}
            token={token}
            isFetchingSubscriptions={isFetching}
            subscriptions={subscriptions}
          />
        }
        secondary={
          <React.Fragment>
            <Box heading="Signed In With Email">
              {email}
              <Button
                css={`
                  margin-top: ${2 * GU}px;
                `}
                wide
                onClick={onLogout}
              >
                Sign Out
              </Button>
            </Box>
            <DeleteAccount
              onApiError={setApiError}
              token={token}
              onLogout={onLogout}
            />
          </React.Fragment>
        }
      />
      {(apiError || subscriptions.length > 0) && (
        <SubscriptionsTable
          apps={apps}
          apiError={apiError}
          onApiError={setApiError}
          authToken={token}
          subscriptions={subscriptions}
          fetchSubscriptions={fetchSubscriptions}
          isFetchingSubscriptions={isFetching}
        />
      )}
    </React.Fragment>
  )
}

ManageNotifications.propTypes = {
  apps: PropTypes.arrayOf(AppType).isRequired,
  dao: PropTypes.string,
  email: PropTypes.string,
  onLogout: PropTypes.func,
  onServiceUnavailable: PropTypes.func,
  token: PropTypes.string,
}

function DeleteAccount({ token, onLogout, onApiError }) {
  const [isFetching, setIsFetching] = useState(false)
  const [isAccountDeleted, setIsAccountDeleted] = useState(false)
  const theme = useTheme()

  const handleDeleteAccount = useCallback(async () => {
    try {
      setIsFetching(true)
      await deleteAccount(token)
      localStorage.removeItem(NOTIFICATION_SERVICE_TOKEN_KEY)
      localStorage.removeItem(NOTIFICATION_SERVICE_EMAIL_KEY)
      setIsAccountDeleted(true)
      onLogout()
    } catch (e) {
      onApiError(e)
    }
    setIsFetching(false)
  }, [token, onLogout, onApiError])

  const [isModalOpen, setIsModalOpen] = useState(false)

  const onClick = useCallback(() => {
    setIsModalOpen(true)
  }, [setIsModalOpen])

  const onCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [setIsModalOpen])

  const onModalConfirm = useCallback(() => {
    setIsModalOpen(false)
    handleDeleteAccount()
  }, [handleDeleteAccount, setIsModalOpen])

  return (
    <React.Fragment>
      <DeleteAccountConfirmationModal
        visible={isModalOpen}
        onConfirm={onModalConfirm}
        onClose={onCloseModal}
      />
      <Box heading="Email Notification Data">
        <Button wide onClick={onClick}>
          {isFetching ? (
            <LoadingRing />
          ) : isAccountDeleted ? (
            <IconCheck />
          ) : (
            <IconTrash
              css={`
                color: ${theme.negative};
                margin-right: ${GU}px;
              `}
            />
          )}
          Delete your email
        </Button>
      </Box>
    </React.Fragment>
  )
}

DeleteAccount.propTypes = {
  onApiError: PropTypes.func,
  onLogout: PropTypes.func,
  token: PropTypes.string,
}
