import React from 'react'
import PropTypes from 'prop-types'
import { ButtonIcon, IconCross, GU } from '@aragon/ui'

export const BANNER_HEIGHT = 38

function Banner({ text, textColor, button, color, height, compact, onClose }) {
  return (
    <div
      color={color}
      css={`
        display: flex;
        height: ${height}px;
        background: ${({ color }) => color};
        ${compact
          ? `
            flex-flow: column nowrap;
            align-items: flex-start;
            justify-content: flex-start;
            padding: ${0.5 * GU}px ${2 * GU}px;
          `
          : `
            flex-wrap: nowrap;
            align-items: center;
            justify-content: center;
            padding: ${0.5 * GU}px ${1 * GU}px;
        `};
      `}
    >
      <div
        css={`
          white-space: nowrap;
          color: ${textColor};
        `}
      >
        {text}
      </div>
      <div
        css={`
          display: flex;
          ${compact
            ? `
              justify-content: flex-start;
            `
            : `
              justify-content: center;
              margin-left: ${1 * GU}px;
          `};
        `}
      >
        {button}
      </div>
      {onClose && (
        <ButtonIcon
          label="Close"
          onClick={onClose}
          css={`
            position: absolute;
            z-index: 2;
            top: ${0.5 * GU}px;
            right: ${2 * GU}px;
            color: #f6f9fc;
          `}
        >
          <IconCross />
        </ButtonIcon>
      )}
    </div>
  )
}

Banner.propTypes = {
  button: PropTypes.node,
  color: PropTypes.string,
  text: PropTypes.node,
  textColor: PropTypes.string,
  height: PropTypes.number,
  compact: PropTypes.bool,
  onClose: PropTypes.func,
}

Banner.defaultProps = {
  height: BANNER_HEIGHT,
  compact: false,
}

export default Banner
