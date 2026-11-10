/* eslint-disable react-hooks/immutability -- three.js objects are mutated each frame by design, outside React's render. */
import { useEffect, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree, type RootState } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { bus, type Tier } from './bus'
import { applyThemeColors, makeBubbles, makeFlask, makeGears, makeGlucose, makeHelix, makeInvoiceStack, makeMicroscope, makeRoundFlask, makeTowers, makeTube, mats } from './models'

const SPACING = 18
const STATION_X: Record<string, number> = {
  '/login': -SPACING,
  '/': 0,
  '/patients': SPACING,
  '/master': SPACING * 2,
  '/billing': SPACING * 3,
  '/invoices': SPACING * 4,
  '/reports': SPACING * 5,
  '/settings': SPACING * 6,
  '/results': SPACING * 7,
  '/collections': SPACING * 8,
}

const stationX = (path: string) => STATION_X[path] ?? 0

/** The lab is built once, imperatively: seven stations spaced along a line for the camera to fly past. */
function buildWorld(tier: Tier) {
  const root = new THREE.Group()
  const updaters: { x: number; group: THREE.Group; tick: (t: number, dt: number) => void }[] = []
  const recolors: ((glow: string) => void)[] = []

  const station = (path: string, group: THREE.Group, tick: (t: number, dt: number) => void) => {
    const x = stationX(path)
    group.position.x = x
    root.add(group)
    updaters.push({ x, group, tick })
  }

  // Login: glucose molecule beside a floating tube.
  {
    const group = new THREE.Group()
    const molecule = makeGlucose()
    molecule.group.scale.setScalar(0.62)
    recolors.push(molecule.recolor)
    const tube = makeTube('#7e5bb5').group
    tube.position.set(2.7, -1.2, -1.2)
    tube.rotation.z = -0.35
    group.add(molecule.group, tube)
    station('/login', group, (t) => {
      molecule.group.rotation.set(-0.6 + bus.scrollEased * 0.002, t * 0.18, Math.sin(t * 0.2) * 0.2)
      // Above the headline on wide screens, tucked into the top corner on phones.
      group.scale.setScalar(bus.narrow ? 0.5 : 1)
      group.position.y = bus.narrow ? 3.3 : 0.45
      group.position.x = stationX('/login') + (bus.narrow ? 1.5 : 0)
      tube.position.y = -1.2 + Math.sin(t * 0.7) * 0.14
    })
  }
  // Dashboard: conical flask with molecules orbiting it.
  {
    const group = new THREE.Group()
    const flask = makeFlask()
    flask.scale.setScalar(1.15)
    const orbit = new THREE.Group()
    const satellites = [makeGlucose(), makeGlucose()]
    satellites.forEach((satellite, index) => {
      satellite.group.scale.setScalar(0.24)
      satellite.group.position.set(Math.cos(index * Math.PI) * 2, index ? 1 : -0.4, Math.sin(index * Math.PI) * 2)
      recolors.push(satellite.recolor)
      orbit.add(satellite.group)
    })
    const tube = makeTube('#d9a521').group
    tube.scale.setScalar(0.7)
    tube.position.set(0, 0.8, 2)
    tube.rotation.z = 0.5
    orbit.add(tube)
    group.add(flask, orbit)
    station('/', group, (t) => {
      flask.rotation.y = t * 0.12
      flask.position.y = Math.sin(t * 0.6) * 0.1
      orbit.rotation.y = t * 0.22
      satellites.forEach((satellite, index) => {
        satellite.group.rotation.set(t * 0.3 + index, t * 0.4, 0)
      })
    })
  }
  // Patients: DNA helix.
  {
    const group = new THREE.Group()
    const helix = makeHelix(tier === 'high' ? 34 : 24)
    helix.group.rotation.z = 0.3
    recolors.push(helix.recolor)
    group.add(helix.group)
    station('/patients', group, (t) => {
      helix.group.rotation.y = t * 0.3 + bus.scrollEased * 0.003
    })
  }
  // Test management: microscope with a row of sample tubes.
  {
    const group = new THREE.Group()
    const scope = makeMicroscope()
    scope.rotation.y = -0.6
    const tubes = ['#7e5bb5', '#d9a521', '#7d8490', '#4fa3d9'].map((cap, index) => {
      const tube = makeTube(cap).group
      tube.scale.setScalar(0.62)
      tube.position.set(-2.5 + index * 0.5, -1.3, 0.9)
      return tube
    })
    group.add(scope, ...tubes)
    station('/master', group, (t) => {
      scope.rotation.y = -0.6 + Math.sin(t * 0.25) * 0.25
      tubes.forEach((tube, index) => {
        tube.position.y = -1.3 + Math.sin(t * 0.9 + index) * 0.05
      })
    })
  }
  // Billing: round flask, kept quiet so staff are not distracted.
  {
    const group = new THREE.Group()
    const flask = makeRoundFlask()
    flask.scale.setScalar(1.05)
    group.add(flask)
    station('/billing', group, (t) => {
      flask.position.y = Math.sin(t * 0.5) * 0.08
      flask.rotation.y = t * 0.1
    })
  }
  // Invoices: a fanned stack of printed sheets.
  {
    const stack = makeInvoiceStack()
    stack.group.rotation.set(-0.12, -0.5, 0)
    station('/invoices', stack.group, (t) => {
      stack.sheets.forEach((sheet, index) => {
        sheet.position.y = -index * 0.12 + Math.sin(t * 0.7 + index * 0.8) * 0.06
      })
      stack.group.rotation.y = -0.5 + Math.sin(t * 0.3) * 0.12
    })
  }
  // Reports: live revenue towers.
  {
    const group = new THREE.Group()
    const towers = makeTowers()
    group.add(towers.group)
    station('/reports', group, (_t, dt) => {
      towers.update(dt)
    })
  }
  // Settings: meshing gears.
  {
    const gears = makeGears()
    gears.group.rotation.set(-0.3, -0.5, 0)
    station('/settings', gears.group, (t) => {
      gears.big.rotation.z = t * 0.2
      gears.small.rotation.z = -t * 0.2 * (14 / 9) + 0.2
    })
  }

  // Lab results: the microscope on its own, turning slowly under the bench light.
  {
    const scope = makeMicroscope()
    station('/results', scope, (t) => {
      scope.rotation.y = 0.5 + Math.sin(t * 0.22) * 0.3
    })
  }

  // Collections: a round flask beside an amber-capped tube, the order waiting to be settled.
  {
    const group = new THREE.Group()
    const flask = makeRoundFlask()
    flask.scale.setScalar(0.95)
    const tube = makeTube('#d9a521').group
    tube.position.set(2.4, -1.1, 0.6)
    tube.rotation.z = -0.3
    group.add(flask, tube)
    station('/collections', group, (t) => {
      flask.rotation.y = t * 0.12
      flask.position.y = Math.sin(t * 0.55) * 0.08
      tube.position.y = -1.1 + Math.sin(t * 0.8) * 0.08
    })
  }

  const bubbles = makeBubbles(tier === 'high' ? 110 : 36)
  root.add(bubbles.points)

  return { root, updaters, recolors, bubbles }
}

const QUALITY_SCALE = [1, 0.85, 0.72, 0.6]

/**
 * Canvas resolution from a pixel budget, not the raw device ratio: most of a frame's cost is
 * per pixel, and this scene is a soft backdrop, so spare GPU time is worth more than extra sharpness.
 */
function renderScale(tier: Tier) {
  const cores = navigator.hardwareConcurrency ?? 4
  const budget = tier !== 'high' ? 900_000 : cores >= 10 ? 2_600_000 : 1_500_000
  const fit = Math.sqrt(budget / (window.innerWidth * window.innerHeight))
  const scale = Math.min(window.devicePixelRatio || 1, 1.75, Math.max(fit, 1))
  return scale * QUALITY_SCALE[bus.quality]
}

function Lab({ tier }: { tier: Tier }) {
  const world = useMemo(() => buildWorld(tier), [tier])
  const motion = useMemo(() => ({ x: stationX(bus.station), pointerX: 0, pointerY: 0, frameAvg: 1 / 60, samples: 0 }), [])
  const scene = useThree((state) => state.scene)
  const gl = useThree((state) => state.gl)

  // One generated environment map gives all the glass its reflections, with no image to download.
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = texture
    pmrem.dispose()
    return () => {
      scene.environment = null
      texture.dispose()
    }
  }, [gl, scene])

  useEffect(() => {
    const recolor = () => {
      const glow = applyThemeColors()
      world.recolors.forEach((fn) => fn(glow))
      world.bubbles.material.color.set(glow).lerp(mats.paper.color, 0.55)
    }
    recolor()
    const observer = new MutationObserver(recolor)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-mode'] })
    return () => observer.disconnect()
  }, [world])

  useFrame((state: RootState, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const t = state.clock.elapsedTime

    // Frame guard: a sustained average under about 48 fps steps resolution down, one step at a time.
    // Gaps over 250 ms are route loads or a throttled tab, not GPU load, so they do not count.
    if (rawDt < 0.25) {
      motion.frameAvg += (rawDt - motion.frameAvg) * 0.03
      motion.samples += 1
      if (motion.samples > 90 && motion.frameAvg > 0.021 && bus.quality < 3) {
        bus.quality += 1
        motion.samples = 0
        motion.frameAvg = 1 / 60
        state.setDpr(renderScale(tier))
        if (bus.quality >= 2) world.bubbles.points.visible = false
        document.documentElement.dataset.gl = String(bus.quality)
      }
    }

    // Pointer and wheel arrive in steps; easing them here stops the camera visibly jumping between steps.
    const ease = 1 - Math.exp(-7 * dt)
    motion.pointerX += (bus.pointerX - motion.pointerX) * ease
    motion.pointerY += (bus.pointerY - motion.pointerY) * ease
    bus.scrollEased += (bus.scroll - bus.scrollEased) * (1 - Math.exp(-9 * dt))

    const aspect = state.size.width / state.size.height
    const wide = aspect > 1.05
    bus.narrow = !wide
    const target = stationX(bus.station) - (wide ? Math.min(3.3, aspect * 2) : 0)
    // At minimal quality the camera cuts straight to the station instead of flying.
    motion.x = bus.quality === 3 ? target : motion.x + (target - motion.x) * (1 - Math.exp(-3.8 * dt))
    const travel = Math.abs(target - motion.x)
    const baseZ = wide ? 9 : 12.5
    const baseY = wide ? -0.9 : -1.9
    const scrollDrop = bus.scrollEased * 0.0018
    state.camera.position.set(
      motion.x + motion.pointerX * 0.28,
      baseY - scrollDrop - motion.pointerY * 0.16,
      baseZ + Math.min(travel * 0.42, 8),
    )
    state.camera.lookAt(motion.x + motion.pointerX * 0.06, baseY * 0.8 - scrollDrop, 0)

    for (const item of world.updaters) {
      const near = Math.abs(item.x - motion.x) < SPACING * 1.15
      item.group.visible = near
      if (near) item.tick(t, dt)
    }
    world.bubbles.points.position.x = motion.x
    world.bubbles.update(dt)
  })

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 8, 7]} intensity={2.1} />
      <directionalLight position={[-7, -2, -3]} intensity={0.9} color="#9ff5d6" />
      <primitive object={world.root} />
    </>
  )
}

export default function Stage({ tier }: { tier: Tier }) {
  const [dpr, setDpr] = useState(() => renderScale(tier))

  useEffect(() => {
    const onResize = () => setDpr(renderScale(tier))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [tier])

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      bus.pointerX = (event.clientX / window.innerWidth) * 2 - 1
      bus.pointerY = (event.clientY / window.innerHeight) * 2 - 1
    }
    const onScroll = () => {
      bus.scroll = window.scrollY
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div className="stage-canvas" aria-hidden>
      <Canvas
        dpr={dpr}
        gl={{ antialias: tier === 'high', alpha: true, stencil: false, powerPreference: tier === 'high' ? 'high-performance' : 'low-power' }}
        camera={{ fov: 38, position: [0, -1, 9], near: 0.1, far: 80 }}
        style={{ pointerEvents: 'none' }}
        events={undefined}
      >
        <Lab tier={tier} />
      </Canvas>
    </div>
  )
}
