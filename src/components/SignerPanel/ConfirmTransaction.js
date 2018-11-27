import React from 'react'
import styled from 'styled-components'
import { Info, theme } from '@aragon/ui'
import { noop } from '../../utils'
import providerString from '../../provider-strings'
import ActionPathsContent from './ActionPathsContent'
import SignerButton from './SignerButton'
import AddressLink from './AddressLink'

class ConfirmTransaction extends React.Component {
  static defaultProps = {
    intent: {},
    paths: [],
    pretransaction: null,
    onClose: noop,
    onSign: noop,
  }
  render() {
    const {
      direct,
      hasAccount,
      hasWeb3,
      intent,
      networkType,
      onClose,
      onSign,
      paths,
      pretransaction,
      signError,
      signingEnabled,
      walletNetworkType,
      walletProviderId,
      onRequestEnable,
    } = this.props

    if (!hasWeb3) {
      return (
        <Web3ProviderError
          intent={intent}
          onClose={onClose}
          neededText="You need to have a Web3 instance installed and enabled"
          actionText={`Please enable ${providerString(
            'your Ethereum provider',
            walletProviderId
          )}.`}
        />
      )
    }

    if (!hasAccount) {
      return (
        <Web3ProviderError
          intent={intent}
          onClose={onClose}
          neededText={`You need to unlock and enable ${providerString(
            'your Ethereum provider',
            walletProviderId
          )}`}
          actionText={
            <span>
              Please unlock and{' '}
              <ButtonLink onClick={onRequestEnable}>enable</ButtonLink>{' '}
              {providerString('your Ethereum provider', walletProviderId)}.
            </span>
          }
        />
      )
    }

    if (walletNetworkType !== networkType) {
      return (
        <Web3ProviderError
          intent={intent}
          onClose={onClose}
          neededText={`
            You need to be connected to the ${networkType} network
          `}
          actionText={`
            Please connect ${providerString(
              'your Ethereum provider',
              walletProviderId
            )} to the ${networkType} network.
          `}
        />
      )
    }

    const possible =
      (direct || (Array.isArray(paths) && paths.length)) && !signError

    return possible ? (
      <ActionPathsContent
        intent={intent}
        direct={direct}
        paths={paths}
        pretransaction={pretransaction}
        signingEnabled={signingEnabled}
        onSign={onSign}
        walletProviderId={walletProviderId}
      />
    ) : (
      <ImpossibleContent error={signError} intent={intent} onClose={onClose} />
    )
  }
}

const ImpossibleContent = ({
  error,
  intent: { description, name, to },
  onClose,
}) => (
  <React.Fragment>
    <Info.Permissions title="Action impossible">
      The action {description && `“${description}”`} failed to execute on{' '}
      <AddressLink to={to}>{name}</AddressLink>.{' '}
      {error
        ? 'An error occurred when we tried to find a path or send a transaction for this action.'
        : 'You might not have the necessary permissions.'}
    </Info.Permissions>
    <SignerButton onClick={onClose}>Close</SignerButton>
  </React.Fragment>
)

const Web3ProviderError = ({
  intent: { description, name, to },
  onClose,
  neededText = '',
  actionText = '',
}) => {
  return (
    <React.Fragment>
      <Info.Action title="You can't perform any action">
        {neededText} in order to perform{' '}
        {description ? `"${description}"` : 'this action'}
        {' on '}
        <AddressLink to={to}>{name}</AddressLink>.
        <ActionMessage>{actionText}</ActionMessage>
      </Info.Action>
      <SignerButton onClick={onClose}>Close</SignerButton>
    </React.Fragment>
  )
}

const ActionMessage = styled.p`
  margin-top: 15px;
`

const ButtonLink = styled.button.attrs({ type: 'button' })`
  padding: 0;
  font-size: inherit;
  text-decoration: underline;
  color: ${theme.textPrimary};
  cursor: pointer;
  background: none;
  border: 0;
`

export default ConfirmTransaction
