import React from 'react'
import styled from 'styled-components'
import { Info } from '@aragon/ui'
import { noop } from '../../utils'
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
      account,
      signingEnabled,
      signError,
      intent,
      direct,
      paths,
      pretransaction,
      onClose,
      onSign,
      web3,
    } = this.props

    if (!web3) {
      return (
        <Web3ProviderError
          intent={intent}
          onClose={onClose}
          neededText="You need to be connected to a Web3 instance"
        />
      )
    }

    if (!account) {
      return (
        <Web3ProviderError
          intent={intent}
          onClose={onClose}
          neededText="You need to unlock your account"
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
}) => {
  return (
    <React.Fragment>
      <Info.Action title="You can't perform any action">
        {neededText} in order to perform{' '}
        {description ? `"${description}"` : 'this action'}
        {' on '}
        <AddressLink to={to}>{name}</AddressLink>.
        <InstallMessage>
          Please unlock or enable your Ethereum provider.
        </InstallMessage>
      </Info.Action>
      <SignerButton onClick={onClose}>Close</SignerButton>
    </React.Fragment>
  )
}

const InstallMessage = styled.p`
  margin-top: 15px;
`

export default ConfirmTransaction
