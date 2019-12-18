import React, { useState, useEffect, useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'
import {
  Box,
  Header,
  Button,
  Info,
  TextInput,
  IconEnter,
  useTheme,
  useToast,
  GU,
} from '@aragon/ui'
import { performTransactionPaths } from '../../aragonjs-wrapper'
import {
  getInstallTransactionPath,
  getExecTransactionPath,
  getActTransactionPath,
} from './CommandHandlers'
import ConsoleFeedback from './ConsoleFeedback'
import { parseCommand } from './console-utils'
import IconPrompt from './IconPrompt'
import KEYCODES from '../../keycodes'
import { clamp } from '../../math-utils'
import { AragonType, AppType } from '../../prop-types'

const HISTORY_ARRAY = 'HISTORY_ARRAY'

function Console({ apps, wrapper }) {
  const [command, setCommand] = useState('')
  const [loading, setLoading] = useState(false)
  const [parsedState, setParsedState] = useState([])
  const theme = useTheme()
  const toast = useToast()
  const performIntents = useMemo(
    () => transactionPaths => {
      performTransactionPaths(wrapper, transactionPaths)
    },
    [wrapper]
  )

  const handleDaoInstall = useCallback(
    async params => {
      setLoading(true)
      try {
        const path = await getInstallTransactionPath(wrapper, apps, params)
        performIntents([path])
      } catch (error) {
        console.error(error)
        toast('Command execution failed')
      } finally {
        setLoading(false)
      }
    },
    [toast, apps, wrapper, performIntents]
  )

  const handleDaoExec = useCallback(
    async params => {
      try {
        setLoading(true)
        const path = await getExecTransactionPath(wrapper, params)
        performIntents([path])
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    },
    [wrapper, performIntents]
  )

  const handleDaoAct = useCallback(
    async params => {
      try {
        setLoading(true)
        const path = await getActTransactionPath(wrapper, params)
        performIntents([path])
      } catch (error) {
        console.error(error)
        toast('Command execution failed.')
      } finally {
        setLoading(false)
      }
    },
    [wrapper, toast, performIntents]
  )

  // handle input change
  const handleChange = useCallback(input => {
    const parsingResult = parseCommand(input)
    setParsedState(parsingResult)
    setCommand(input)
  }, [])

  // Handle command clicks
  const handleCommandClick = useCallback(
    clickedCommand => {
      const newCommand = `${command}${clickedCommand.toLowerCase()}/`
      const parsingResult = parseCommand(newCommand)
      setParsedState(parsingResult)
      setCommand(newCommand)
    },
    [command]
  )

  // Handle console command submission
  const handleSubmit = useCallback(() => {
    if (parsedState[0] === 'exec') {
      handleDaoExec(parsedState.slice(1))
    } else if (parsedState[0] === 'install') {
      handleDaoInstall(parsedState.slice(1))
    } else if (parsedState[0] === 'act') {
      handleDaoAct(parsedState.slice(1))
    } else {
      toast('Unrecognized command')
      handleChange('')
    }
  }, [
    handleDaoAct,
    handleDaoExec,
    handleDaoInstall,
    parsedState,
    toast,
    handleChange,
  ])

  return (
    <>
      <Header primary="Console" />
      <Box>
        <div
          css={`
            display: flex;
          `}
        >
          <Prompt
            command={command}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
          />
        </div>
        <Info
          css={`
            margin: ${2 * GU}px 0 ${2 * GU}px 0;
          `}
          background={`${theme.background}`}
          borderColor={`#ABBECF`}
          color={`${theme.content}`}
        >
          <ConsoleFeedback
            apps={apps}
            currentParsedCommand={parsedState}
            handleCommandClick={handleCommandClick}
            loading={loading}
          />
        </Info>
        {!loading && (
          <Info
            css={`
              margin-top: ${2 * GU}px;
            `}
          >
            You can use the top/down arrow on your keyboard to display the
            console history.
          </Info>
        )}
      </Box>
    </>
  )
}

Console.propTypes = {
  apps: PropTypes.arrayOf(AppType).isRequired,
  wrapper: AragonType,
}

function Prompt({ command, handleChange, handleSubmit }) {
  const [commandHistory, setCommandHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(0)

  useEffect(() => {
    const historyArray = localStorage.getItem(HISTORY_ARRAY)
    if (!historyArray) {
      return
    }
    const parsedHistoryArray = JSON.parse(historyArray)
    setCommandHistory(parsedHistoryArray)
    setHistoryIndex(parsedHistoryArray.length - 1)
  }, [])

  const isDisabled = useMemo(() => {
    const parsedCommand = parseCommand(command)
    const isValidInstall =
      parsedCommand[0] === 'install' && parsedCommand.length === 4
    const isValidExec =
      parsedCommand[0] === 'exec' && parsedCommand.length === 3
    const isValidAct = parsedCommand[0] === 'act' && parsedCommand.length === 4
    return !(isValidInstall || isValidExec || isValidAct)
  }, [command])

  return (
    <>
      <TextInput
        value={command}
        adornment={<IconPrompt />}
        adornmentPosition="start"
        onChange={e => handleChange(e.target.value)}
        onKeyDown={e => {
          if (e.keyCode === KEYCODES.enter && !isDisabled) {
            const newCommandHistory = [...commandHistory, command]
            localStorage.setItem(
              HISTORY_ARRAY,
              JSON.stringify(newCommandHistory)
            )
            setCommandHistory(newCommandHistory)
            setHistoryIndex(newCommandHistory.length - 1)
            handleSubmit()
          } else if (e.keyCode === KEYCODES.up || e.keyCode === KEYCODES.down) {
            if (commandHistory.length === 0) {
              return
            }
            const nextHistory = clamp(
              historyIndex + (e.keyCode === KEYCODES.up ? -1 : 1),
              0,
              commandHistory.length - 1
            )

            setHistoryIndex(nextHistory)
            handleChange(commandHistory[nextHistory])
          }
        }}
        css={`
          margin-right: ${1.5 * GU}px;
        `}
        wide
      />
      <Button
        mode="strong"
        icon={<IconEnter />}
        label="Enter"
        disabled={isDisabled}
        onClick={handleSubmit}
      />
    </>
  )
}

Prompt.propTypes = {
  command: PropTypes.string.isRequired,
  handleChange: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
}

export default Console
