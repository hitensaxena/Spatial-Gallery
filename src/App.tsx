import { MainScene } from './scene/MainScene'
import './App.css'

function App() {
  return (
    <div className="app">
      <div className="scene" aria-hidden>
        <MainScene />
      </div>
      <div className="scroll-space" aria-hidden />
    </div>
  )
}

export default App
