import * as THREE from 'three'
import { bus } from './bus'

/* Shared materials: one instance each, recoloured when the theme changes. */
export const mats = {
  glass: new THREE.MeshPhysicalMaterial({
    color: '#eafff6',
    transparent: true,
    opacity: 0.2,
    roughness: 0.06,
    metalness: 0.1,
    clearcoat: 1,
    envMapIntensity: 2.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  liquid: new THREE.MeshPhysicalMaterial({ color: '#1fbf8a', roughness: 0.18, clearcoat: 1, emissive: '#1fbf8a', emissiveIntensity: 0.28, transparent: true, opacity: 0.9 }),
  ceramic: new THREE.MeshStandardMaterial({ color: '#f4f7f5', roughness: 0.34, metalness: 0.05 }),
  dark: new THREE.MeshStandardMaterial({ color: '#16211d', roughness: 0.4, metalness: 0.5 }),
  accent: new THREE.MeshStandardMaterial({ color: '#1fbf8a', roughness: 0.3, metalness: 0.2, emissive: '#1fbf8a', emissiveIntensity: 0.18 }),
  paper: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 }),
  ink: new THREE.MeshStandardMaterial({ color: '#7f8c86', roughness: 0.8 }),
  instanced: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.28, metalness: 0.1 }),
}

export function applyThemeColors() {
  const style = getComputedStyle(document.documentElement)
  const glow = style.getPropertyValue('--stage-glow').trim() || '#1fbf8a'
  mats.liquid.color.set(glow)
  mats.liquid.emissive.set(glow)
  mats.accent.color.set(glow)
  mats.accent.emissive.set(glow)
  return glow
}

const lathe = (points: [number, number][], segments = 40) => new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments)

function arc(radius: number, centerY: number, from: number, to: number, steps = 10): [number, number][] {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = from + ((to - from) * index) / steps
    return [Math.cos(angle) * radius, centerY + Math.sin(angle) * radius] as [number, number]
  })
}

const geo = {
  tubeGlass: lathe([...arc(0.26, -1.1, -Math.PI / 2, 0), [0.26, 1.2], [0.3, 1.24]], 24),
  // Origin sits at the tube floor so scaling Y raises the liquid level from the bottom.
  tubeLiquid: lathe([...arc(0.235, -1.1, -Math.PI / 2, 0), [0.235, 0.2], [0, 0.2]], 20).translate(0, 1.36, 0),
  cap: new THREE.CylinderGeometry(0.31, 0.31, 0.34, 24),
  flaskGlass: lathe([[0, -1.3], [1.15, -1.3], [1.26, -1.18], [0.42, 0.62], [0.4, 1.35], [0.48, 1.42]]),
  flaskLiquid: lathe([[0, -1.24], [1.12, -1.24], [1.19, -1.14], [0.76, -0.2], [0, -0.2]]),
  roundGlass: lathe([...arc(1.15, 0, -Math.PI / 2, Math.PI / 2 - 0.34, 18), [0.34, 1.7], [0.42, 1.76]]),
  roundLiquid: lathe([...arc(1.08, 0, -Math.PI / 2, 0.02, 14), [0, 0.02]]),
  sphere: new THREE.SphereGeometry(1, 18, 14),
  rod: new THREE.CylinderGeometry(1, 1, 1, 10),
}

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const item = new THREE.Mesh(geometry, material)
  item.position.set(x, y, z)
  return item
}

export function makeTube(capColor: string, liquidColor?: string) {
  const group = new THREE.Group()
  const liquid = liquidColor
    ? new THREE.MeshPhysicalMaterial({ color: liquidColor, roughness: 0.2, clearcoat: 1 })
    : mats.liquid
  const fill = mesh(geo.tubeLiquid, liquid, 0, -1.36)
  const glass = mesh(geo.tubeGlass, mats.glass)
  glass.renderOrder = 2
  const cap = mesh(geo.cap, new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.35 }), 0, 1.36)
  group.add(fill, glass, cap)
  return { group, fill }
}

const UP = new THREE.Vector3(0, 1, 0)
const tmpMatrix = new THREE.Matrix4()
const tmpQuat = new THREE.Quaternion()
const tmpDir = new THREE.Vector3()
const tmpMid = new THREE.Vector3()
const tmpScale = new THREE.Vector3()

function placeRod(target: THREE.InstancedMesh, index: number, a: THREE.Vector3, b: THREE.Vector3, radius: number) {
  tmpDir.subVectors(b, a)
  const length = tmpDir.length()
  tmpQuat.setFromUnitVectors(UP, tmpDir.normalize())
  tmpMid.addVectors(a, b).multiplyScalar(0.5)
  tmpScale.set(radius, length, radius)
  target.setMatrixAt(index, tmpMatrix.compose(tmpMid, tmpQuat, tmpScale))
}

function placeBall(target: THREE.InstancedMesh, index: number, at: THREE.Vector3, radius: number) {
  tmpQuat.identity()
  tmpScale.setScalar(radius)
  target.setMatrixAt(index, tmpMatrix.compose(at, tmpQuat, tmpScale))
}

/** Double helix: two instanced draw calls however many base pairs it has. */
export function makeHelix(pairs = 34) {
  const group = new THREE.Group()
  const balls = new THREE.InstancedMesh(geo.sphere, mats.instanced.clone(), pairs * 2)
  const rods = new THREE.InstancedMesh(geo.rod, mats.instanced.clone(), pairs)
  const white = new THREE.Color('#f6faf8')
  const glow = new THREE.Color('#1fbf8a')
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  for (let i = 0; i < pairs; i++) {
    const angle = i * 0.44
    const y = (i - pairs / 2) * 0.24
    a.set(Math.cos(angle) * 1.15, y, Math.sin(angle) * 1.15)
    b.set(-Math.cos(angle) * 1.15, y, -Math.sin(angle) * 1.15)
    placeBall(balls, i * 2, a, 0.17)
    placeBall(balls, i * 2 + 1, b, 0.17)
    placeRod(rods, i, a, b, 0.035)
    balls.setColorAt(i * 2, glow)
    balls.setColorAt(i * 2 + 1, white)
    rods.setColorAt(i, i % 2 ? white : glow)
  }
  group.add(balls, rods)
  return { group, recolor: (color: string) => {
    glow.set(color)
    for (let i = 0; i < pairs; i++) {
      balls.setColorAt(i * 2, glow)
      rods.setColorAt(i, i % 2 ? white : glow)
    }
    balls.instanceColor!.needsUpdate = true
    rods.instanceColor!.needsUpdate = true
  } }
}

/** Beta-D-glucopyranose in approximate chair geometry: what a fasting blood sugar test measures. */
export function makeGlucose() {
  type Atom = { p: THREE.Vector3; kind: 'C' | 'O' | 'H' }
  const atoms: Atom[] = []
  const bonds: [number, number][] = []
  const add = (x: number, y: number, z: number, kind: Atom['kind']) => atoms.push({ p: new THREE.Vector3(x, y, z), kind }) - 1
  const ring: number[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    ring.push(add(Math.cos(angle) * 1.45, Math.sin(angle) * 1.45, i % 2 ? -0.26 : 0.26, i === 0 ? 'O' : 'C'))
  }
  ring.forEach((atom, i) => bonds.push([atom, ring[(i + 1) % 6]]))
  for (let i = 1; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    const up = i % 2 ? -1 : 1
    const c = ring[i]
    const z = atoms[c].p.z
    bonds.push([c, add(Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, z + up, 'H')])
    const o = add(Math.cos(angle) * 2.75, Math.sin(angle) * 2.75, z - up * 0.3, i === 5 ? 'C' : 'O')
    bonds.push([c, o])
    if (i === 5) {
      const o6 = add(Math.cos(angle + 0.28) * 3.95, Math.sin(angle + 0.28) * 3.95, atoms[o].p.z + 0.55, 'O')
      bonds.push([o, o6], [o6, add(Math.cos(angle + 0.28) * 4.7, Math.sin(angle + 0.28) * 4.7, atoms[o6].p.z + 0.1, 'H')])
    } else {
      bonds.push([o, add(Math.cos(angle + 0.22) * 3.45, Math.sin(angle + 0.22) * 3.45, atoms[o].p.z - up * 0.25, 'H')])
    }
  }
  const group = new THREE.Group()
  const balls = new THREE.InstancedMesh(geo.sphere, mats.instanced.clone(), atoms.length)
  const rods = new THREE.InstancedMesh(geo.rod, mats.instanced.clone(), bonds.length)
  const radius = { C: 0.36, O: 0.33, H: 0.18 }
  const color = { C: new THREE.Color('#10201a'), O: new THREE.Color('#1fbf8a'), H: new THREE.Color('#ffffff') }
  atoms.forEach((atom, i) => {
    placeBall(balls, i, atom.p, radius[atom.kind])
    balls.setColorAt(i, color[atom.kind])
  })
  const grey = new THREE.Color('#a9b8b1')
  bonds.forEach(([x, y], i) => {
    placeRod(rods, i, atoms[x].p, atoms[y].p, 0.06)
    rods.setColorAt(i, grey)
  })
  group.add(balls, rods)
  return { group, recolor: (glow: string) => {
    color.O.set(glow)
    atoms.forEach((atom, i) => {
      if (atom.kind === 'O') balls.setColorAt(i, color.O)
    })
    balls.instanceColor!.needsUpdate = true
  } }
}

export function makeFlask() {
  const group = new THREE.Group()
  const glass = mesh(geo.flaskGlass, mats.glass)
  glass.renderOrder = 2
  group.add(mesh(geo.flaskLiquid, mats.liquid), glass)
  return group
}

export function makeRoundFlask() {
  const group = new THREE.Group()
  const glass = mesh(geo.roundGlass, mats.glass)
  glass.renderOrder = 2
  group.add(mesh(geo.roundLiquid, mats.liquid), glass)
  return group
}

export function makeMicroscope() {
  const group = new THREE.Group()
  const base = mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.26, 40), mats.ceramic, 0, -1.9)
  const arm = mesh(new THREE.TorusGeometry(1.45, 0.2, 14, 36, Math.PI * 0.92), mats.ceramic, -0.15, -0.35)
  arm.rotation.z = -Math.PI / 2.3
  const plate = mesh(new THREE.BoxGeometry(1.5, 0.1, 1.2), mats.dark, 0.25, -0.95)
  const barrel = mesh(new THREE.CylinderGeometry(0.27, 0.27, 1.9, 24), mats.ceramic, 0.3, 0.75)
  barrel.rotation.z = 0.28
  const eyepiece = mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.6, 20), mats.dark, 0.72, 2.0)
  eyepiece.rotation.z = 0.28
  const nosepiece = mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.25, 20), mats.accent, 0.05, -0.28)
  const lens = mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.42, 14), mats.dark, 0.05, -0.56)
  const knob = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.18, 24), mats.accent, -1.5, -0.55)
  knob.rotation.x = Math.PI / 2
  group.add(base, arm, plate, barrel, eyepiece, nosepiece, lens, knob)
  return group
}

export function makeInvoiceStack() {
  const group = new THREE.Group()
  const sheet = new THREE.BoxGeometry(2.3, 3.2, 0.03)
  const line = new THREE.BoxGeometry(1, 0.05, 0.005)
  const sheets: THREE.Group[] = []
  for (let i = 0; i < 4; i++) {
    const page = new THREE.Group()
    page.add(mesh(sheet, mats.paper))
    const head = mesh(new THREE.BoxGeometry(1.8, 0.12, 0.005), mats.accent, 0, 1.25, 0.02)
    page.add(head)
    for (let row = 0; row < 8; row++) {
      const bar = mesh(line, mats.ink, -0.25 + (row % 3) * 0.04, 0.85 - row * 0.28, 0.02)
      bar.scale.x = row % 3 === 2 ? 1.5 : 1.25
      page.add(bar)
    }
    const stamp = mesh(new THREE.BoxGeometry(0.6, 0.24, 0.005), mats.accent, 0.62, -1.3, 0.02)
    page.add(stamp)
    page.position.set(i * 0.34 - 0.5, -i * 0.12, -i * 0.42)
    page.rotation.set(0, 0, -0.06 + i * 0.05)
    group.add(page)
    sheets.push(page)
  }
  return { group, sheets }
}

function gearShape(teeth: number, outer: number, inner: number) {
  const shape = new THREE.Shape()
  const step = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    const points: [number, number][] = [
      [inner, a],
      [outer, a + step * 0.15],
      [outer, a + step * 0.45],
      [inner, a + step * 0.6],
    ]
    points.forEach(([r, t], index) => {
      const x = Math.cos(t) * r
      const y = Math.sin(t) * r
      if (i === 0 && index === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    })
  }
  shape.closePath()
  const hole = new THREE.Path()
  hole.absarc(0, 0, inner * 0.42, 0, Math.PI * 2, true)
  shape.holes.push(hole)
  return shape
}

export function makeGears() {
  const group = new THREE.Group()
  const options = { depth: 0.34, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 18 }
  const big = mesh(new THREE.ExtrudeGeometry(gearShape(14, 1.5, 1.22), options), mats.ceramic, -0.7, 0.2)
  const small = mesh(new THREE.ExtrudeGeometry(gearShape(9, 1, 0.74), options), mats.accent, 1.28, -0.9)
  group.add(big, small)
  return { group, big, small }
}

const towerMatrix = new THREE.Matrix4()
const towerPos = new THREE.Vector3()
const towerScale = new THREE.Vector3()
const towerQuat = new THREE.Quaternion()

/** Revenue towers: real weekly figures from the Reports page, drawn as one instanced mesh. */
export function makeTowers(count = 12) {
  const group = new THREE.Group()
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats.accent, count)
  bars.frustumCulled = false
  const plate = mesh(new THREE.BoxGeometry(count * 0.56 + 0.5, 0.12, 2), mats.ceramic, 0, -1.72, 0)
  const heights = new Float32Array(count)
  group.add(bars, plate)
  group.rotation.set(0.24, -0.5, 0)

  let version = -1
  const targets = new Float32Array(count).fill(0.3)
  return {
    group,
    update(dt: number) {
      if (version !== bus.towersVersion) {
        version = bus.towersVersion
        const values = bus.towers.slice(-count)
        const max = Math.max(...values, 1)
        targets.fill(0.12)
        values.forEach((value, index) => {
          targets[count - values.length + index] = 0.12 + (value / max) * 3.4
        })
      }
      for (let i = 0; i < count; i++) {
        const delta = targets[i] - heights[i]
        heights[i] += delta * (1 - Math.exp(-4 * dt))
        towerPos.set((i - (count - 1) / 2) * 0.56, -1.66 + heights[i] / 2, 0)
        towerScale.set(0.4, Math.max(heights[i], 0.01), 0.9)
        bars.setMatrixAt(i, towerMatrix.compose(towerPos, towerQuat, towerScale))
      }
      bars.instanceMatrix.needsUpdate = true
    },
  }
}

export function makeBubbles(count: number) {
  const positions = new Float32Array(count * 3)
  const speeds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 22
    positions[i * 3 + 1] = (Math.random() - 0.5) * 12
    positions[i * 3 + 2] = -Math.random() * 7 + 1
    speeds[i] = 0.12 + Math.random() * 0.3
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({ color: '#bff5df', size: 0.05, transparent: true, opacity: 0.55, depthWrite: false })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  return {
    points,
    material,
    update(dt: number) {
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] += speeds[i] * dt
        if (positions[i * 3 + 1] > 6) positions[i * 3 + 1] = -6
      }
      geometry.attributes.position.needsUpdate = true
    },
  }
}
