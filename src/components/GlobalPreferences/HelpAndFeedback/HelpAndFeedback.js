import React, { useCallback } from 'react'
import { Box, Checkbox, Info, GU, textStyle, useTheme } from '@aragon/ui'
import helpAndFeedbackSvg from './help-and-feedback.svg'
import { useHelpScout } from '../../HelpScoutBeacon/useHelpScout'

function HelpAndFeedback() {
  const theme = useTheme()
  const { optedOut, setOptedOut } = useHelpScout()
  const handleOptOutChange = useCallback(() => setOptedOut(!optedOut), [
    setOptedOut,
    optedOut,
  ])

  return (
    <Box heading="Help Scout">
      <div
        css={`
          display: flex;
          justify-content: center;
          margin-bottom: ${4 * GU}px;
        `}
      >
        <label css="cursor: pointer">
          <Checkbox onChange={handleOptOutChange} checked={!optedOut} />
          <span
            css={`
              color: ${theme.surfaceContentSecondary};
              ${textStyle('title4')}
            `}
          >
            Allow Help Scout feedback module
          </span>
        </label>
      </div>
      <img
        src={helpAndFeedbackSvg}
        alt="Help Scout"
        css={`
          display: block;
          margin: 0 auto;
          margin-bottom: ${4 * GU}px;
          width: 300px;
          height: 156px;
        `}
      />
      <Info>
        Help Scout lets you easily browse the knowledge base and open tickets so
        you can get support when using Aragon organizations. Disabling it will
        disable that functionality as well.
      </Info>
    </Box>
  )
}

export default React.memo(HelpAndFeedback)
