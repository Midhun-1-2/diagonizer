/* eslint-disable react-hooks/immutability -- three.js objects are mutated each frame by design, outside React's render. */
import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree, type RootState } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { SampleType } from '../../types'
import { sampleMeta } from '../ui/Tube'
import { makeTube } from './models'

const SLOTS = 6
const slotX = (index: number) => (index - (SLOTS - 1) / 2) * 0.86

interface Slot {
  type: SampleType
  group: THREE.Group
  fill: THREE.Object3D
  y: number
  level: number
  leaving: boolean
}

function Rack({ samples, tilt }: { samples: SampleType[]; tilt: { x: number; y: number } }) {
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const state = useMemo(() => {
    const root = new THREE.Group()
    const frame = new THREE.MeshStandardMaterial({ color: '#e8efeb', roughness: 0.4 })
    const dark = new THREE.MeshStandardMaterial({ color: '#0d1a15', roughness: 0.6 })
    const front = new THREE.Mesh(new THREE.BoxGeometry(SLOTS * 0.92, 0.5, 0.2), frame)
    front.position.set(0, -1.15, 0.42)
    const top = new THREE.Mesh(new THREE.BoxGeometry(SLOTS * 0.92, 0.1, 1.1), frame)
    top.position.set(0, -0.4, 0)
    const base = new THREE.Mesh(new THREE.BoxGeometry(SLOTS * 0.92, 0.14, 1.2), frame)
    base.position.set(0, -1.46, 0)
    root.add(front, top, base)
    const hole = new THREE.CylinderGeometry(0.31, 0.31, 0.02, 20)
    for (let i = 0; i < SLOTS; i++) {
      const socket = new THREE.Mesh(hole, dark)
      socket.position.set(slotX(i), -0.34, 0)
      root.add(socket)
    }
    return { root, slots: new Map<SampleType, Slot>() }
  }, [])

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = texture
    pmrem.dispose()
    invalidate()
    return () => texture.dispose()
  }, [gl, scene, invalidate])

  // Tubes for new sample types are created above the rack and drop in; removed ones lift out.
  useEffect(() => {
    samples.forEach((type) => {
      const existing = state.slots.get(type)
      if (existing) {
        existing.leaving = false
        return
      }
      const meta = sampleMeta(type)
      const tube = makeTube(meta.cap, meta.liquid)
      tube.group.scale.setScalar(0.92)
      tube.group.position.y = 3.2
      tube.fill.scale.y = 0.02
      state.root.add(tube.group)
      state.slots.set(type, { type, group: tube.group, fill: tube.fill, y: 3.2, level: 0.02, leaving: false })
    })
    state.slots.forEach((slot, type) => {
      if (!samples.includes(type)) slot.leaving = true
    })
    invalidate()
  }, [samples, state, invalidate])

  useFrame((frameState: RootState, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    let moving = false
    let index = 0
    state.slots.forEach((slot, type) => {
      if (!slot.leaving) {
        slot.group.position.x += (slotX(index) - slot.group.position.x) * (1 - Math.exp(-14 * dt))
        if (Math.abs(slotX(index) - slot.group.position.x) > 0.002) moving = true
        index += 1
      }
      const targetY = slot.leaving ? 3.4 : 0
      slot.y += (targetY - slot.y) * (1 - Math.exp(-9 * dt))
      slot.group.position.y = slot.y
      if (Math.abs(targetY - slot.y) > 0.004) moving = true
      const targetLevel = slot.leaving ? 0.02 : 1
      slot.level += (targetLevel - slot.level) * (1 - Math.exp(-5 * dt))
      slot.fill.scale.y = slot.level
      if (Math.abs(targetLevel - slot.level) > 0.004) moving = true
      if (slot.leaving && slot.y > 3.3) {
        state.root.remove(slot.group)
        state.slots.delete(type)
      }
    })
    const rotX = state.root.rotation.x + (0.22 + tilt.y * 0.16 - state.root.rotation.x) * (1 - Math.exp(-8 * dt))
    const rotY = state.root.rotation.y + (tilt.x * 0.34 - state.root.rotation.y) * (1 - Math.exp(-8 * dt))
    if (Math.abs(rotX - state.root.rotation.x) + Math.abs(rotY - state.root.rotation.y) > 0.0006) moving = true
    state.root.rotation.set(rotX, rotY, 0)
    if (moving) frameState.invalidate()
  })

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 6]} intensity={2} />
      <primitive object={state.root} />
    </>
  )
}

/** Own small canvas inside the bill. It only renders while something moves, so an idle bill costs nothing. */
export default function RackCanvas({ samples }: { samples: SampleType[] }) {
  const holder = useRef<HTMLDivElement>(null)
  const tilt = useMemo(() => ({ x: 0, y: 0 }), [])
  const invalidateRef = useRef<(() => void) | null>(null)

  return (
    <div
      ref={holder}
      className="h-full w-full"
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse') return
        const rect = event.currentTarget.getBoundingClientRect()
        tilt.x = (event.clientX - rect.left) / rect.width - 0.5
        tilt.y = (event.clientY - rect.top) / rect.height - 0.5
        invalidateRef.current?.()
      }}
      onPointerLeave={() => {
        tilt.x = 0
        tilt.y = 0
        invalidateRef.current?.()
      }}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, stencil: false, powerPreference: 'low-power' }}
        camera={{ fov: 30, position: [0, 0.1, 7.2] }}
        onCreated={(root) => {
          invalidateRef.current = root.invalidate
        }}
      >
        <Rack samples={samples} tilt={tilt} />
      </Canvas>
    </div>
  )
}
