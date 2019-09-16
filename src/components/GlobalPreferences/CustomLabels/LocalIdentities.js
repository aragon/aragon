import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import {
  Box,
  Button,
  DataView,
  DropDown,
  GU,
  IconArrowDown,
  IconArrowUp,
  IconDownload,
  IconExternal,
  IconGrid,
  IconSearch,
  IconShare,
  IconTrash,
  Info,
  TextInput,
  useTheme,
  useLayout,
  useToast,
  textStyle,
} from '@aragon/ui'
import EmptyFilteredIdentities from './EmptyFilteredIdentities'
import Import from './Import'
import LocalIdentityBadge from '../../IdentityBadge/LocalIdentityBadge'
import { ASC, DESC } from './useLocalIdentities'
import { iOS } from '../../../utils'

function LocalIdentities({
  allSelected,
  identities,
  identitiesSelected,
  onClear,
  onExport,
  onImport,
  onRemove,
  onSearchChange,
  onShare,
  onShowLocalIdentityModal,
  onToggleAll,
  onToggleIdentity,
  onToggleSort,
  searchTerm,
  someSelected,
  sortIdentities,
}) {
  if (!identities.length) {
    return (
      <Box>
        <EmptyFilteredIdentities onClear={onClear} />
      </Box>
    )
  }

  return (
    <DataView
      heading={
        <Filters
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          onImport={onImport}
          onShare={onShare}
          onExport={onExport}
          onRemove={onRemove}
          someSelected={someSelected}
        />
      }
      selection={identities.reduce(
        (p, { address }, index) => [
          ...p,
          ...(identitiesSelected.get(address) ? [index] : []),
        ],
        []
      )}
      onSelectEntries={(_, indexes) => {
        // toggle all
        if (
          ((allSelected || !someSelected) &&
            identities.length === indexes.length) ||
          indexes.length === 0
        ) {
          onToggleAll()
          return
        }

        // toggle some (in reality only one but same process)
        identities
          .filter(
            ({ address }, index) =>
              indexes.includes(index) !== identitiesSelected.get(address)
          )
          .map(({ address }) => address)
          .forEach(onToggleIdentity)
      }}
      fields={['Custom Label', 'Address']}
      entries={identities}
      renderEntry={({ address, name }) => [
        name,
        <LocalIdentityBadge entity={address} forceAddress />,
      ]}
      renderSelectionCount={count =>
        `${count} label${count > 1 ? 's' : ''} selected`
      }
    />
  )
}

LocalIdentities.propTypes = {
  allSelected: PropTypes.bool.isRequired,
  identities: PropTypes.array.isRequired,
  identitiesSelected: PropTypes.instanceOf(Map).isRequired,
  onClear: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onShare: PropTypes.func.isRequired,
  onShowLocalIdentityModal: PropTypes.func.isRequired,
  onToggleAll: PropTypes.func.isRequired,
  onToggleIdentity: PropTypes.func.isRequired,
  onToggleSort: PropTypes.func.isRequired,
  searchTerm: PropTypes.string.isRequired,
  someSelected: PropTypes.bool.isRequired,
  sortIdentities: PropTypes.oneOf([ASC, DESC]).isRequired,
}

function Filters({
  onExport,
  onImport,
  onRemove,
  onSearchChange,
  onShare,
  searchTerm,
  someSelected,
}) {
  const { layoutName } = useLayout()
  const compact = layoutName === 'small'
  const theme = useTheme()

  return (
    <div
      css={`
        display: grid;
        grid-template-columns: auto auto auto;
        grid-gap: ${1 * GU}px;
        align-items: center;
        justify-content: flex-end;
        margin-bottom: ${2 * GU}px;
      `}
    >
      <div
        css={`
          position: relative;
        `}
      >
        <TextInput
          adornment={
            <IconSearch
              css={`
                color: ${theme.surfaceOpened};
              `}
            />
          }
          adornmentPosition="end"
          placeholder="Search"
          onChange={onSearchChange}
          value={searchTerm}
          css={`
            width: ${compact ? 25 * GU : 30 * GU}px;
            ${textStyle('body2')};
            color: ${searchTerm.trim() ? theme.surfaceContent : theme.hint};
          `}
        />
      </div>
      {!iOS && (
        <Import
          onImport={onImport}
          button={
            <Button
              css={`
                ${compact &&
                  `
                      width: 50px;
                      min-width: unset;
                      padding: 0;
                    `}
              `}
            >
              <IconDownload
                css={`
                  color: ${theme.surfaceOpened};
                `}
              />
              {!compact && (
                <span
                  css={`
                    display: inline-block;
                    padding-left: ${1.5 * GU}px;
                  `}
                >
                  Import
                </span>
              )}
            </Button>
          }
        />
      )}
      <Actions
        disabled={!someSelected}
        onShare={onShare}
        onExport={onExport}
        onRemove={onRemove}
      />
    </div>
  )
}

function Actions({ onExport, onRemove, onShare, disabled }) {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const compact = layoutName === 'small'
  const toast = useToast()
  const handleChange = useCallback(
    index => {
      if (index === 0) {
        onShare()
        return
      }
      if (!iOS && index === 1) {
        toast('Custom labels exported successfully')
        onExport()
        return
      }
      onRemove()
    },
    [onShare, onExport, onRemove, toast]
  )

  return (
    <React.Fragment>
      <DropDown
        css={`
          box-shadow: ${disabled ? 'none' : '0px 1px 3px rgba(0, 0, 0, 0.1)'};
          ${compact ? 'min-width: unset' : ''}
        `}
        disabled={disabled}
        compact={compact}
        selected={-1}
        items={[
          <ActionSpan
            css={`
              color: ${theme.surfaceContent};
            `}
          >
            <IconShare
              css={`
                color: ${theme.surfaceIcon};
              `}
            />
            <span>Share</span>
          </ActionSpan>,
          ...(!iOS
            ? [
                <ActionSpan>
                  <IconExternal
                    css={`
                      color: ${theme.surfaceIcon};
                    `}
                  />
                  <span>Export</span>
                </ActionSpan>,
              ]
            : []),
          <ActionSpan>
            <IconTrash
              css={`
                color: ${theme.red};
              `}
            />
            <span>Remove</span>
          </ActionSpan>,
        ]}
        placeholder={
          <span
            css={`
              height: 24px;
              $textStyle('body2');
              color: ${
                disabled ? theme.contentSecondary : theme.surfaceContent
              };

              ${
                !compact
                  ? `
                  display: grid;
                  grid-template-columns: auto 1fr auto;
                  grid-gap: ${1.5 * GU}px;
                  width: 100%;
                  align-items: center;
                `
                  : ''
              }
            `}
          >
            <IconGrid
              css={`
                color: ${theme.surfaceIcon};
              `}
            />
            {!compact && <span css="text-align: left;">Actions</span>}
          </span>
        }
        onChange={handleChange}
      />
    </React.Fragment>
  )
}

Actions.propTypes = {
  onExport: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onShare: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
}

const ActionSpan = styled.span`
  display: grid;
  align-items: center;
  grid-template-columns: auto 1fr;
  grid-gap: ${1 * GU}px;
  ${textStyle('body2')};

  & span {
    text-align: left;
  }
`

export default React.memo(LocalIdentities)
