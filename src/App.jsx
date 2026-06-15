import React, { Suspense, useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, PivotControls } from '@react-three/drei'
import * as THREE from 'three'
import { Paper } from './components/Paper'
import './index.css'

function Scene({ mode, isSticky, showGrid, committedFolds, onCommitFold }) {
  const matTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')
    
    ctx.fillStyle = '#3a5a40' // Craft mat green
    ctx.fillRect(0, 0, 1024, 1024)
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 2
    const GRID_SIZE = 32
    const step = 1024 / GRID_SIZE
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath()
      ctx.moveTo(i * step, 0)
      ctx.lineTo(i * step, 1024)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.moveTo(0, i * step)
      ctx.lineTo(1024, i * step)
      ctx.stroke()
    }
    
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(50 / 3, 50 / 3)
    tex.center.set(0.5, 0.5)
    tex.needsUpdate = true
    return tex
  }, [])

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
      <Environment preset="sunset" />
      
      <PivotControls 
        visible={mode === 'transform'} 
        disableAxes={mode !== 'transform'} 
        disableSliders={mode !== 'transform'} 
        disableRotations={mode !== 'transform'}
        disableScaling={true} // Removes the resizing dots
        depthTest={false}
        scale={2}
        anchor={[0, 0, 0]} 
      >
        <Paper position={[0, 0.05, 0]} mode={mode} isSticky={isSticky} showGrid={showGrid} committedFolds={committedFolds} onCommitFold={onCommitFold} />
      </PivotControls>

      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color={showGrid ? "#ffffff" : "#d9c5b2"} map={showGrid ? matTexture : null} />
      </mesh>
      
      <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={10} blur={2} far={4} />
      
      <OrbitControls 
        makeDefault 
        enablePan={false}
        minPolarAngle={0} 
        maxPolarAngle={Math.PI / 2 - 0.1} 
        minDistance={2} 
        maxDistance={15} 
        mouseButtons={{
          LEFT: mode === 'camera' ? THREE.MOUSE.ROTATE : THREE.MOUSE.NONE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE
        }}
      />
    </>
  )
}

function App() {
  const [mode, setMode] = useState('fold')
  const [isSticky, setIsSticky] = useState(false)
  const [showGrid, setShowGrid] = useState(false)
  const [committedFolds, setCommittedFolds] = useState([])
  const [undoneFolds, setUndoneFolds] = useState([])

  const handleCommitFold = (foldData) => {
    setCommittedFolds(prev => [...prev, foldData])
    setUndoneFolds([])
  }

  const handleUndo = () => {
    if (committedFolds.length === 0) return
    const popped = committedFolds[committedFolds.length - 1]
    setCommittedFolds(prev => prev.slice(0, -1))
    setUndoneFolds(prev => [...prev, popped])
  }

  const handleRedo = () => {
    if (undoneFolds.length === 0) return
    const popped = undoneFolds[undoneFolds.length - 1]
    setUndoneFolds(prev => prev.slice(0, -1))
    setCommittedFolds(prev => [...prev, popped])
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      
      <div className="glass-panel" style={{
        position: 'absolute', top: '20px', right: '20px', padding: '10px', zIndex: 10, display: 'flex', gap: '10px', borderRadius: '50px'
      }}>
        <button 
          className="cozy-btn" title="Undo"
          style={{ background: 'transparent', color: committedFolds.length > 0 ? 'var(--color-text-main)' : '#ccc', padding: '12px', display: 'flex', borderRadius: '50%', cursor: committedFolds.length > 0 ? 'pointer' : 'default' }}
          onClick={handleUndo}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
        </button>

        <button 
          className="cozy-btn" title="Redo"
          style={{ background: 'transparent', color: undoneFolds.length > 0 ? 'var(--color-text-main)' : '#ccc', padding: '12px', display: 'flex', borderRadius: '50%', cursor: undoneFolds.length > 0 ? 'pointer' : 'default' }}
          onClick={handleRedo}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 3.7"/></svg>
        </button>

        <div style={{ width: '1px', background: 'var(--glass-border)', margin: '0 5px' }}></div>

        <button 
          className="cozy-btn" title="Toggle Grid Overlay"
          style={{ background: showGrid ? '#362e26' : 'transparent', color: showGrid ? '#fff' : 'var(--color-text-main)', padding: '12px', display: 'flex', borderRadius: '50%' }}
          onClick={() => setShowGrid(!showGrid)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
        </button>

        <button 
          className="cozy-btn" title="Toggle Sticky Mode"
          style={{ background: isSticky ? '#362e26' : 'transparent', color: isSticky ? '#fff' : 'var(--color-text-main)', padding: '12px', display: 'flex', borderRadius: '50%' }}
          onClick={() => setIsSticky(!isSticky)}
        >
          <span style={{ fontSize: '22px', lineHeight: '22px' }}>💧</span>
        </button>

        <div style={{ width: '1px', background: 'var(--glass-border)', margin: '0 5px' }}></div>

        <button 
          className="cozy-btn" title="Fold Paper"
          style={{ background: mode === 'fold' ? '#362e26' : 'transparent', color: mode === 'fold' ? '#fff' : 'var(--color-text-main)', padding: '12px', display: 'flex', borderRadius: '50%' }}
          onClick={() => setMode('fold')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>
        </button>

        <button 
          className="cozy-btn" title="Move Camera"
          style={{ background: mode === 'camera' ? '#362e26' : 'transparent', color: mode === 'camera' ? '#fff' : 'var(--color-text-main)', padding: '12px', display: 'flex', borderRadius: '50%' }}
          onClick={() => setMode('camera')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
        </button>

        <button 
          className="cozy-btn" title="Transform Model (Move/Rotate)"
          style={{ background: mode === 'transform' ? '#362e26' : 'transparent', color: mode === 'transform' ? '#fff' : 'var(--color-text-main)', padding: '12px', display: 'flex', borderRadius: '50%' }}
          onClick={() => setMode('transform')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M3 12h6"/><path d="M15 12h6"/><path d="M12 3v6"/><path d="M12 15v6"/></svg>
        </button>

        <div style={{ width: '1px', background: 'var(--glass-border)', margin: '0 5px' }}></div>

        <button 
          className="cozy-btn" title="Clear Canvas"
          style={{ background: 'transparent', color: 'var(--color-text-main)', padding: '12px', display: 'flex', borderRadius: '50%', cursor: 'pointer' }}
          onClick={() => {
            setCommittedFolds([])
            setUndoneFolds([])
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>

      <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 10, color: '#888', fontSize: '0.9rem', pointerEvents: 'none' }}>
        <p>Left Click + Drag: {mode === 'fold' ? 'Fold Paper' : mode === 'transform' ? 'Transform Model' : 'Orbit Camera'}</p>
        <p>Right Click + Drag: Orbit Camera (Any Mode)</p>
        <p>Scroll Wheel: Zoom</p>
      </div>

      <Canvas shadows camera={{ position: [0, 5, 8], fov: 45 }}>
        <Suspense fallback={null}>
          <color attach="background" args={['#f9f6f0']} />
          <Scene mode={mode} isSticky={isSticky} showGrid={showGrid} committedFolds={committedFolds} onCommitFold={handleCommitFold} />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default App
