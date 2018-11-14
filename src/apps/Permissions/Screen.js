import React from 'react'
import styled from 'styled-components'
import { Transition, animated } from 'react-spring'
import springs from '../../springs'

const SCREEN_SHIFT = 0.05

const Screen = ({ position, children, animate }) => (
  <Transition
    items={children}
    from={{
      left: (position === 0 ? -SCREEN_SHIFT : SCREEN_SHIFT) * 100,
      opacity: 0,
    }}
    enter={{ left: 0, opacity: 1 }}
    leave={{
      left: (position === 0 ? -SCREEN_SHIFT : SCREEN_SHIFT) * 100,
      opacity: 0,
    }}
    config={springs.smooth}
    immediate={!animate}
    native
  >
    {children =>
      children &&
      (({ opacity, left }) => (
        <Main>
          <animated.div
            style={{
              opacity,
              transform: left.interpolate(t => `translate3d(${t}%, 0, 0)`),
            }}
          >
            {children}
          </animated.div>
        </Main>
      ))
    }
  </Transition>
)

const Main = styled.div`
  overflow: hidden;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 30px;
`

export default Screen
