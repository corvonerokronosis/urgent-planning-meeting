import { useState } from 'react'
import { GameScreen } from './components/GameScreen'
import { ResultScreen } from './components/ResultScreen'
import { StartScreen } from './components/StartScreen'
import { scenario } from './data/scenario'
import { DEFAULT_SETTINGS, getEventById } from './game/engine'
import { emitGameEvent, useGameController } from './game/useGameController'

type Screen = 'start' | 'game' | 'result'

export function App() {
  const {
    snapshot,
    choose,
    nextEvent,
    resolveCrisis,
    finishRun,
    reset,
    startRun,
    lastSavedAt,
    hasSavedRun,
  } = useGameController()
  const [screen, setScreen] = useState<Screen>(() => snapshot.finishedReason ? 'result' : 'start')
  const currentEvent = getEventById(scenario, snapshot.currentEventId)

  const enterGame = () => {
    setScreen('game')
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
  }

  const start = () => {
    startRun(DEFAULT_SETTINGS)
    emitGameEvent('start', { format: 'express' })
    enterGame()
  }

  const resume = () => {
    emitGameEvent('resume', { completedDecisions: snapshot.decisions.length })
    enterGame()
  }

  const restart = () => {
    reset()
    setScreen('start')
  }

  const finish = () => {
    finishRun('completed')
    emitGameEvent('finish', { completedDecisions: snapshot.decisions.length, reason: 'completed' })
    setScreen('result')
  }

  const finishAfterCrisis = () => {
    finishRun('crisis')
    emitGameEvent('finish', { completedDecisions: snapshot.decisions.length, reason: 'crisis' })
    setScreen('result')
  }

  if (screen === 'start') {
    return (
      <StartScreen
        hasSavedRun={hasSavedRun}
        onContinue={resume}
        onStart={start}
        savedSummary={hasSavedRun ? {
          stage: currentEvent.stage,
          time: currentEvent.time,
          lastSavedAt,
        } : undefined}
      />
    )
  }
  if (screen === 'result') {
    return (
      <ResultScreen
        decisions={snapshot.decisions}
        endTime={snapshot.endTime ?? currentEvent.time}
        finishReason={snapshot.finishedReason}
        flags={snapshot.flags}
        minimumStats={snapshot.minimumStats}
        onRestart={restart}
        relationships={snapshot.relationships}
        settings={snapshot.settings}
        stats={snapshot.stats}
      />
    )
  }

  return (
    <GameScreen
      snapshot={snapshot}
      lastSavedAt={lastSavedAt}
      onChoose={choose}
      onCrisisEnd={finishAfterCrisis}
      onCrisisRecover={resolveCrisis}
      onFinish={finish}
      onNext={nextEvent}
    />
  )
}
