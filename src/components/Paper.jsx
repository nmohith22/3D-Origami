import React, { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useDrag } from '@use-gesture/react'
import * as THREE from 'three'

const PAPER_SIZE = 3
const GRID_SIZE = 32
const CELL = PAPER_SIZE / GRID_SIZE
const snapToGrid = (val) => Math.round(val / CELL) * CELL

const initialHandles = [
  { id: 'c_tl', type: 'corner', p: new THREE.Vector2(-1.5, 1.5) },
  { id: 'c_tr', type: 'corner', p: new THREE.Vector2(1.5, 1.5) },
  { id: 'c_br', type: 'corner', p: new THREE.Vector2(1.5, -1.5) },
  { id: 'c_bl', type: 'corner', p: new THREE.Vector2(-1.5, -1.5) },
  { id: 'e_t', type: 'edge', p: new THREE.Vector2(0, 1.5), normal: new THREE.Vector2(0, -1), p1: new THREE.Vector2(-1.5, 1.5), p2: new THREE.Vector2(1.5, 1.5) },
  { id: 'e_r', type: 'edge', p: new THREE.Vector2(1.5, 0), normal: new THREE.Vector2(-1, 0), p1: new THREE.Vector2(1.5, 1.5), p2: new THREE.Vector2(1.5, -1.5) },
  { id: 'e_b', type: 'edge', p: new THREE.Vector2(0, -1.5), normal: new THREE.Vector2(0, 1), p1: new THREE.Vector2(-1.5, -1.5), p2: new THREE.Vector2(1.5, -1.5) },
  { id: 'e_l', type: 'edge', p: new THREE.Vector2(-1.5, 0), normal: new THREE.Vector2(1, 0), p1: new THREE.Vector2(-1.5, 1.5), p2: new THREE.Vector2(-1.5, -1.5) },
]

export function Paper({ mode, isSticky, showGrid, committedFolds, onCommitFold, ...props }) {
  const frontGeomRef = useRef()
  const backGeomRef = useRef()
  const xrayGeomRef = useRef()
  
  const [active, setActive] = useState(false)
  const [hoveredHandle, setHoveredHandle] = useState(null)
  
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [hoveredVLine, setHoveredVLine] = useState(null)
  const [hoveredHLine, setHoveredHLine] = useState(null)
  
  const activeHandleRef = useRef(null)
  const dragState = useRef({ rawB: new THREE.Vector2(0,0), A: null, B: null, angle: 0 })

  const handles = useMemo(() => {
    const arr = [...initialHandles]
    const H = PAPER_SIZE / 2
    
    committedFolds.forEach((fold, index) => {
      const intersections = []
      
      const checkIntersection = (t) => {
        const x = fold.p1.x + t * fold.axis.x
        const y = fold.p1.y + t * fold.axis.y
        if (x >= -H - 0.001 && x <= H + 0.001 && y >= -H - 0.001 && y <= H + 0.001) {
          intersections.push(new THREE.Vector2(x, y))
        }
      }
      
      if (Math.abs(fold.axis.x) > 0.0001) {
        checkIntersection((H - fold.p1.x) / fold.axis.x) // Right edge
        checkIntersection((-H - fold.p1.x) / fold.axis.x) // Left edge
      }
      if (Math.abs(fold.axis.y) > 0.0001) {
        checkIntersection((H - fold.p1.y) / fold.axis.y) // Top edge
        checkIntersection((-H - fold.p1.y) / fold.axis.y) // Bottom edge
      }
      
      const unique = []
      intersections.forEach(pt => {
        if (!unique.some(u => u.distanceTo(pt) < 0.01)) {
          unique.push(pt)
        }
      })
      
      if (unique.length === 2) {
        const i1 = unique[0]
        const i2 = unique[1]
        
        arr.push({ id: `f${index}_c1`, type: 'corner', p: i1 })
        arr.push({ id: `f${index}_c2`, type: 'corner', p: i2 })
        
        const mid = new THREE.Vector2().addVectors(i1, i2).multiplyScalar(0.5)
        const edgeNormal = new THREE.Vector2(-fold.normal.x, -fold.normal.y).normalize()
        
        arr.push({ 
          id: `f${index}_e`, 
          type: 'edge', 
          p: mid, 
          normal: edgeNormal, 
          p1: i1, 
          p2: i2 
        })
      }
    })
    
    return arr
  }, [committedFolds])

  const getGrabHandle = (x, y) => {
    let closestCorner = null
    let minCornerDistSq = 0.4 * 0.4
    
    for (const h of handles) {
      if (h.type !== 'corner') continue
      const dSq = (h.p.x - x)**2 + (h.p.y - y)**2
      if (dSq < minCornerDistSq) {
        closestCorner = h
        minCornerDistSq = dSq
      }
    }
    
    if (closestCorner) return closestCorner
    
    let closestEdge = null
    let minEdgeDistSq = 0.4 * 0.4
    let edgeGrabPoint = null

    for (const h of handles) {
      if (h.type !== 'edge') continue
      
      const l2 = (h.p2.x - h.p1.x)**2 + (h.p2.y - h.p1.y)**2;
      let dSq, projX, projY;
      if (l2 === 0) {
        dSq = (x - h.p1.x)**2 + (y - h.p1.y)**2;
        projX = h.p1.x; projY = h.p1.y;
      } else {
        let t = ((x - h.p1.x) * (h.p2.x - h.p1.x) + (y - h.p1.y) * (h.p2.y - h.p1.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        projX = h.p1.x + t * (h.p2.x - h.p1.x);
        projY = h.p1.y + t * (h.p2.y - h.p1.y);
        dSq = (x - projX)**2 + (y - projY)**2;
      }
      
      if (dSq < minEdgeDistSq) {
        closestEdge = h
        minEdgeDistSq = dSq
        edgeGrabPoint = new THREE.Vector2(projX, projY)
      }
    }
    
    if (closestEdge) return { ...closestEdge, p: edgeGrabPoint }
    return null
  }



  const emissiveTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')
    
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, 1024, 1024)

    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.lineWidth = 2
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
    }
    
    ctx.fillStyle = '#ffffff'
    const hlWidth = 16
    const toCanvasX = (val) => ((val + (PAPER_SIZE / 2)) / PAPER_SIZE) * 1024
    const toCanvasY = (val) => 1024 - ((val + (PAPER_SIZE / 2)) / PAPER_SIZE) * 1024

    if (!active && hoveredHandle) {
      if (hoveredHandle.type === 'edge') {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 32
        ctx.beginPath()
        ctx.moveTo(toCanvasX(hoveredHandle.p1.x), toCanvasY(hoveredHandle.p1.y))
        ctx.lineTo(toCanvasX(hoveredHandle.p2.x), toCanvasY(hoveredHandle.p2.y))
        ctx.stroke()
      } else if (hoveredHandle.type === 'corner') {
        ctx.beginPath()
        ctx.arc(toCanvasX(hoveredHandle.p.x), toCanvasY(hoveredHandle.p.y), 80, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (active) {
      if (hoveredVLine !== null) {
        const cx = toCanvasX(hoveredVLine)
        ctx.fillRect(cx - hlWidth / 2, 0, hlWidth, 1024)
      }
      if (hoveredHLine !== null) {
        const cy = toCanvasY(hoveredHLine)
        ctx.fillRect(0, cy - hlWidth / 2, 1024, hlWidth)
      }
      if (hoveredPoint !== null) {
        const cx = toCanvasX(hoveredPoint.x)
        const cy = toCanvasY(hoveredPoint.y)
        ctx.beginPath()
        ctx.arc(cx, cy, 32, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [active, hoveredHandle, hoveredPoint, hoveredVLine, hoveredHLine, showGrid])

  const bind = useDrag(({ movement: [mx, my], active: dragActive, cancel, event, first }) => {
    if (mode !== 'fold') {
      cancel()
      return
    }

    if (first) {
      if (!event || !event.uv || (typeof event.button === 'number' && event.button !== 0)) {
        cancel()
        return
      }
      const localX = event.uv.x * PAPER_SIZE - (PAPER_SIZE / 2)
      const localY = event.uv.y * PAPER_SIZE - (PAPER_SIZE / 2)
      
      const handle = getGrabHandle(localX, localY)
      if (!handle) {
        cancel()
        return
      }
      
      activeHandleRef.current = handle
    }

    const handle = activeHandleRef.current
    if (!handle) return

    setActive(dragActive)
    
    if (first) {
      setHoveredHandle(null)
    }

    const scale = 0.015
    const H = PAPER_SIZE / 2
    const rawBx = Math.max(-H, Math.min(H, handle.p.x + mx * scale))
    const rawBy = Math.max(-H, Math.min(H, handle.p.y - my * scale))
    
    dragState.current.rawB.set(rawBx, rawBy)
    dragState.current.A = handle.p

    let B = new THREE.Vector2()
    if (handle.type === 'edge') {
      const rawDir = new THREE.Vector2(rawBx - handle.p.x, rawBy - handle.p.y)
      let projection = rawDir.dot(handle.normal)
      projection = Math.max(0, projection) // Prevent dragging outwards (unfolding) which causes math glitches
      const projectedX = handle.p.x + handle.normal.x * projection
      const projectedY = handle.p.y + handle.normal.y * projection
      
      B.set(snapToGrid(projectedX), snapToGrid(projectedY))
      
      if (Math.abs(handle.normal.y) < 0.01) {
        setHoveredVLine(B.x)
        setHoveredHLine(null)
        setHoveredPoint(null)
      } else if (Math.abs(handle.normal.x) < 0.01) {
        setHoveredHLine(B.y)
        setHoveredVLine(null)
        setHoveredPoint(null)
      } else {
        setHoveredPoint({ x: B.x, y: B.y })
        setHoveredVLine(null)
        setHoveredHLine(null)
      }
    } else {
      B.set(snapToGrid(rawBx), snapToGrid(rawBy))
      setHoveredPoint({ x: B.x, y: B.y })
      setHoveredHLine(null)
      setHoveredVLine(null)
    }
    
    dragState.current.B = B

    let angle = 0
    const A = handle.p
    if (A.distanceTo(B) > 0.01) {
      const vectorAB = new THREE.Vector2().subVectors(B, A)
      const vectorARaw = new THREE.Vector2().subVectors(dragState.current.rawB, A)
      const t = vectorARaw.dot(vectorAB) / vectorAB.lengthSq()
      const clampedT = Math.max(0, Math.min(1, t))
      angle = Math.acos(1 - 2 * clampedT)
    }

    if (angle > 0) {
      const midpoint = new THREE.Vector2().addVectors(A, B).multiplyScalar(0.5)
      const activeNormal = new THREE.Vector3(A.x - B.x, A.y - B.y, 0).normalize()
      const activeP1 = new THREE.Vector3(midpoint.x, midpoint.y, 0)
      
      let maxFoldCount = 0
      for (let i = 0; i < originalPositions.length; i += 3) {
        let vOrig = new THREE.Vector3(originalPositions[i], originalPositions[i+1], 0)
        let count = 0
        for (const fold of committedFolds) {
          const toVertex = new THREE.Vector3().subVectors(vOrig, fold.p1)
          if (toVertex.dot(fold.normal) > 0) {
            count++
          }
        }
        const toActive = new THREE.Vector3().subVectors(vOrig, activeP1)
        if (toActive.dot(activeNormal) > 0) {
          count++
        }
        if (count > maxFoldCount) maxFoldCount = count
        if (maxFoldCount > 8) break
      }
      
      if (maxFoldCount > 8) {
        angle = 0 // Prevent folding if it exceeds 8 layers
      }
    }

    dragState.current.angle = angle

    if (!dragActive) {
      setHoveredHLine(null)
      setHoveredVLine(null)
      setHoveredPoint(null)

      if (A.distanceTo(B) > 0.1 && angle > 0) {
        let finalAngle = angle
        if (!isSticky) {
          if (angle > Math.PI * 0.85) {
            finalAngle = Math.PI 
          } else {
            return 
          }
        } else {
          // Magnetic snapping for Sticky Mode to make it easier to use
          if (finalAngle > Math.PI * 0.95) finalAngle = Math.PI
          else if (Math.abs(finalAngle - Math.PI / 2) < 0.08) finalAngle = Math.PI / 2
        }
        
        const midpoint = new THREE.Vector2().addVectors(A, B).multiplyScalar(0.5)
        const dirAB = new THREE.Vector2().subVectors(B, A)
        const axis = new THREE.Vector3(-dirAB.y, dirAB.x, 0).normalize()
        const normal = new THREE.Vector3(A.x - B.x, A.y - B.y, 0).normalize()

        onCommitFold({
          id: Date.now(),
          p1: new THREE.Vector3(midpoint.x, midpoint.y, 0),
          axis,
          normal,
          angle: finalAngle
        })
      }
    }
  })

  const handlePointerMove = (e) => {
    if (mode !== 'fold' || active) return
    if (e.uv) {
      const localX = e.uv.x * PAPER_SIZE - (PAPER_SIZE / 2)
      const localY = e.uv.y * PAPER_SIZE - (PAPER_SIZE / 2)
      
      const handle = getGrabHandle(localX, localY)
      if (handle) {
        setHoveredHandle(handle)
      } else {
        setHoveredHandle(null)
      }
    }
  }

  const handlePointerOut = () => {
    if (!active) {
      setHoveredHandle(null)
    }
  }

  const originalPositions = useMemo(() => {
    const geom = new THREE.PlaneGeometry(PAPER_SIZE, PAPER_SIZE, 64, 64)
    return geom.attributes.position.array.slice()
  }, [])

  useFrame(() => {
    if (!frontGeomRef.current || !backGeomRef.current) return

    const positions = frontGeomRef.current.attributes.position.array
    const backPositions = backGeomRef.current.attributes.position.array

    if (!frontGeomRef.current.attributes.color) {
      const colors = new Float32Array(originalPositions.length)
      frontGeomRef.current.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      backGeomRef.current.setAttribute('color', new THREE.BufferAttribute(colors.slice(), 3))
    }
    const frontColors = frontGeomRef.current.attributes.color.array
    const backColors = backGeomRef.current.attributes.color.array

    let activeCrease = null
    if (active && dragState.current.A && dragState.current.B && dragState.current.A.distanceTo(dragState.current.B) > 0.01) {
      const A = dragState.current.A
      const B = dragState.current.B
      const midpoint = new THREE.Vector2().addVectors(A, B).multiplyScalar(0.5)
      const dirAB = new THREE.Vector2().subVectors(B, A)
      activeCrease = {
        p1: new THREE.Vector3(midpoint.x, midpoint.y, 0),
        axis: new THREE.Vector3(-dirAB.y, dirAB.x, 0).normalize(),
        normal: new THREE.Vector3(A.x - B.x, A.y - B.y, 0).normalize(),
        angle: dragState.current.angle
      }
    }

    for (let i = 0; i < positions.length; i += 3) {
      let vOrig = new THREE.Vector3(originalPositions[i], originalPositions[i+1], 0)
      
      let vf = new THREE.Vector3(originalPositions[i], originalPositions[i+1], 0.001)
      let countF = 0
      let totalLiftF = 0

      let commitCount = 0
      for (const fold of committedFolds) {
        const toVertex = new THREE.Vector3().subVectors(vOrig, fold.p1)
        if (toVertex.dot(fold.normal) > 0) commitCount++
      }

      if (activeCrease) {
        const toVertex = new THREE.Vector3().subVectors(vOrig, activeCrease.p1)
        const dist = toVertex.dot(activeCrease.normal)
        if (dist > 0) {
          const pivotF = new THREE.Vector3(activeCrease.p1.x, activeCrease.p1.y, 0.001)
          const adjustedAngle = commitCount % 2 === 1 ? -activeCrease.angle : activeCrease.angle
          const rot = new THREE.Matrix4().makeRotationAxis(activeCrease.axis, adjustedAngle)
          vf.sub(pivotF).applyMatrix4(rot).add(pivotF)
          countF++
          totalLiftF += 0.004 * Math.min(1, dist / 0.1) * (activeCrease.angle / Math.PI)
        }
      }

      for (let j = committedFolds.length - 1; j >= 0; j--) {
        const fold = committedFolds[j]
        const toVertex = new THREE.Vector3().subVectors(vOrig, fold.p1)
        const dist = toVertex.dot(fold.normal)
        if (dist > 0) {
          const pivotF = new THREE.Vector3(fold.p1.x, fold.p1.y, 0.001)
          const rot = new THREE.Matrix4().makeRotationAxis(fold.axis, fold.angle)
          vf.sub(pivotF).applyMatrix4(rot).add(pivotF)
          countF++
          totalLiftF += 0.004 * Math.min(1, dist / 0.1)
        }
      }
      
      vf.z += totalLiftF
      positions[i] = vf.x
      positions[i+1] = vf.y 
      positions[i+2] = vf.z

      const densityF = Math.max(0, 1 - countF * 0.1)
      frontColors[i] = 1.0 * densityF
      frontColors[i+1] = 0.56 * densityF
      frontColors[i+2] = 0.64 * densityF

      let vb = new THREE.Vector3(originalPositions[i], originalPositions[i+1], -0.001)
      let countB = 0
      let totalLiftB = 0

      if (activeCrease) {
        const toVertex = new THREE.Vector3().subVectors(vOrig, activeCrease.p1)
        const dist = toVertex.dot(activeCrease.normal)
        if (dist > 0) {
          const pivotB = new THREE.Vector3(activeCrease.p1.x, activeCrease.p1.y, -0.001)
          const adjustedAngle = commitCount % 2 === 1 ? -activeCrease.angle : activeCrease.angle
          const rot = new THREE.Matrix4().makeRotationAxis(activeCrease.axis, adjustedAngle)
          vb.sub(pivotB).applyMatrix4(rot).add(pivotB)
          countB++
          totalLiftB += 0.004 * Math.min(1, dist / 0.1) * (activeCrease.angle / Math.PI)
        }
      }

      for (let j = committedFolds.length - 1; j >= 0; j--) {
        const fold = committedFolds[j]
        const toVertex = new THREE.Vector3().subVectors(vOrig, fold.p1)
        const dist = toVertex.dot(fold.normal)
        if (dist > 0) {
          const pivotB = new THREE.Vector3(fold.p1.x, fold.p1.y, -0.001)
          const rot = new THREE.Matrix4().makeRotationAxis(fold.axis, fold.angle)
          vb.sub(pivotB).applyMatrix4(rot).add(pivotB)
          countB++
          totalLiftB += 0.004 * Math.min(1, dist / 0.1)
        }
      }

      vb.z += totalLiftB
      backPositions[i] = vb.x
      backPositions[i+1] = vb.y 
      backPositions[i+2] = vb.z

      const densityB = Math.max(0.3, 1 - countB * 0.1)
      backColors[i] = 1.0 * densityB
      backColors[i+1] = 1.0 * densityB
      backColors[i+2] = 1.0 * densityB
    }

    frontGeomRef.current.attributes.position.needsUpdate = true
    backGeomRef.current.attributes.position.needsUpdate = true
    frontGeomRef.current.attributes.color.needsUpdate = true
    backGeomRef.current.attributes.color.needsUpdate = true
    frontGeomRef.current.computeVertexNormals()
    backGeomRef.current.computeVertexNormals()
    frontGeomRef.current.computeBoundingSphere()
    backGeomRef.current.computeBoundingSphere()

    if (xrayGeomRef.current) {
      xrayGeomRef.current.attributes.position.array.set(frontGeomRef.current.attributes.position.array)
      xrayGeomRef.current.attributes.position.needsUpdate = true
    }
  })

  return (
    <group {...props} {...bind()} style={{ cursor: active ? 'grabbing' : (mode === 'fold' ? 'crosshair' : 'default') }}>
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        castShadow 
        receiveShadow
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      >
        <planeGeometry ref={frontGeomRef} args={[PAPER_SIZE, PAPER_SIZE, 64, 64]} />
        <meshStandardMaterial 
          color="#ffffff" 
          side={THREE.FrontSide} 
          vertexColors={true}
          roughness={0.8} 
          emissive={emissiveTexture ? "#ffffff" : "#000000"}
          emissiveIntensity={1}
          emissiveMap={emissiveTexture}
        />
      </mesh>
      
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        castShadow 
        receiveShadow
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      >
        <planeGeometry ref={backGeomRef} args={[PAPER_SIZE, PAPER_SIZE, 64, 64]} />
        <meshStandardMaterial 
          color="#ffffff" 
          side={THREE.BackSide} 
          vertexColors={true}
          roughness={0.8} 
          emissive={emissiveTexture ? "#ffffff" : "#000000"}
          emissiveIntensity={1}
          emissiveMap={emissiveTexture}
        />
      </mesh>

      {/* X-Ray Highlight Overlay */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        renderOrder={10}
      >
        <planeGeometry ref={xrayGeomRef} args={[PAPER_SIZE, PAPER_SIZE, 64, 64]} />
        <meshBasicMaterial 
          color="#ffffff" 
          map={emissiveTexture}
          blending={THREE.AdditiveBlending}
          depthTest={false}
          transparent={true}
          opacity={0.8}
        />
      </mesh>
    </group>
  )
}
