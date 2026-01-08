import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { scrollController } from '../interaction/ScrollController'
import { interactionState } from '../interaction/InteractionState'

export function Environment() {
  const { scene, camera } = useThree()
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const starsNearRef = useRef<THREE.InstancedMesh>(null)
  const starsFarRef = useRef<THREE.InstancedMesh>(null)
  const motesGroupRef = useRef<THREE.Group>(null)
  const motesRef = useRef<THREE.InstancedMesh>(null)
  const formsRef = useRef<THREE.InstancedMesh>(null)

  const baseFogDensity = 0.032

  useEffect(() => {
    scene.fog = new THREE.FogExp2('#07080b', baseFogDensity)

    return () => {
      scene.fog = null
    }
  }, [scene])

  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color('#07080b') },
      uBottom: { value: new THREE.Color('#020308') },
      uMix: { value: 0.0 },
    }),
    [],
  )

  const isMobile = useMemo(() => {
    try {
      return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    } catch {
      return false
    }
  }, [])

  const starGeom = useMemo(() => new THREE.SphereGeometry(1, 8, 8), [])

  const motesGeom = useMemo(() => new THREE.SphereGeometry(1, 6, 6), [])
  const motes = useMemo(() => {
    const count = isMobile ? 140 : 260
    const spread = 18

    let s = 424242
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0
      return (s & 0xfffffff) / 0xfffffff
    }

    const offsets = new Array<THREE.Vector3>(count)
    const vels = new Array<THREE.Vector3>(count)
    const scales = new Array<number>(count)
    const colors = new Array<THREE.Color>(count)

    for (let i = 0; i < count; i++) {
      offsets[i] = new THREE.Vector3(
        (rand() * 2 - 1) * spread,
        (rand() * 2 - 1) * (spread * 0.65),
        (rand() * 2 - 1) * spread,
      )

      const vx = (rand() * 2 - 1) * 0.015
      const vy = (rand() * 2 - 1) * 0.01
      const vz = (rand() * 2 - 1) * 0.015
      vels[i] = new THREE.Vector3(vx, vy, vz)

      scales[i] = 0.04 + Math.pow(rand(), 0.6) * 0.11
      const c = new THREE.Color().setHSL(0.58 + rand() * 0.06, 0.12, 0.72)
      colors[i] = c
    }

    const mat = new THREE.MeshStandardMaterial({
      color: '#0b0d12',
      roughness: 1,
      metalness: 0,
      emissive: new THREE.Color('#cfd6e6'),
      emissiveIntensity: 0.12,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      vertexColors: true,
    })

    return { count, spread, offsets, vels, scales, colors, mat }
  }, [isMobile])

  const formsGeom = useMemo(() => new THREE.IcosahedronGeometry(1, 0), [])
  const forms = useMemo(() => {
    const count = isMobile ? 10 : 18
    const spread = 140

    let s = 909090
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0
      return (s & 0xfffffff) / 0xfffffff
    }

    const offsets = new Array<THREE.Vector3>(count)
    const scales = new Array<number>(count)
    const rots = new Array<THREE.Euler>(count)

    for (let i = 0; i < count; i++) {
      offsets[i] = new THREE.Vector3(
        (rand() * 2 - 1) * spread,
        (rand() * 2 - 1) * spread * 0.35,
        (rand() * 2 - 1) * spread,
      )
      scales[i] = 7 + Math.pow(rand(), 0.7) * 20
      rots[i] = new THREE.Euler(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
    }

    const mat = new THREE.MeshStandardMaterial({
      color: '#0b0d12',
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      emissive: new THREE.Color('#0b0d12'),
      emissiveIntensity: 0.0,
    })

    return { count, offsets, scales, rots, mat }
  }, [isMobile])

  const stars = useMemo(() => {
    const seeded = (seed: number) => {
      let s = seed >>> 0
      return () => {
        s = (s * 1664525 + 1013904223) >>> 0
        return (s & 0xfffffff) / 0xfffffff
      }
    }

    const build = ({ count, rMin, rMax, sizeMin, sizeMax, seed }: { count: number; rMin: number; rMax: number; sizeMin: number; sizeMax: number; seed: number }) => {
      const rand = seeded(seed)
      const positions = new Array<THREE.Vector3>(count)
      const scales = new Array<number>(count)
      const colors = new Array<THREE.Color>(count)

      for (let i = 0; i < count; i++) {
        const u = rand() * 2 - 1
        const phi = Math.acos(u)
        const theta = rand() * Math.PI * 2

        const rr = rMin + (rMax - rMin) * Math.pow(rand(), 0.58)
        const x = rr * Math.sin(phi) * Math.cos(theta)
        const y = rr * Math.cos(phi)
        const z = rr * Math.sin(phi) * Math.sin(theta)

        positions[i] = new THREE.Vector3(x, y, z)

        const s = sizeMin + (sizeMax - sizeMin) * Math.pow(rand(), 0.7)
        scales[i] = s

        const c = new THREE.Color('#0b0d12')
        const tint = new THREE.Color().setHSL(0.58 + rand() * 0.06, 0.18, 0.78)
        c.lerp(tint, 0.18)
        colors[i] = c
      }

      return { count, positions, scales, colors }
    }

    const near = build({ count: 320, rMin: 55, rMax: 125, sizeMin: 0.08, sizeMax: 0.18, seed: 1337 })
    const far = build({ count: 520, rMin: 95, rMax: 190, sizeMin: 0.06, sizeMax: 0.14, seed: 7331 })

    const nearMat = new THREE.MeshStandardMaterial({
      color: '#0b0d12',
      roughness: 1,
      metalness: 0,
      emissive: new THREE.Color('#cfd6e6'),
      emissiveIntensity: 1.05,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      vertexColors: true,
    })
    nearMat.fog = false

    const farMat = new THREE.MeshStandardMaterial({
      color: '#0b0d12',
      roughness: 1,
      metalness: 0,
      emissive: new THREE.Color('#cfd6e6'),
      emissiveIntensity: 0.95,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      vertexColors: true,
    })
    farMat.fog = false

    return { near, far, nearMat, farMat }
  }, [])

  const topBase = useMemo(() => new THREE.Color('#07080b'), [])
  const bottomBase = useMemo(() => new THREE.Color('#020308'), [])
  const topDark = useMemo(() => new THREE.Color('#04050a'), [])
  const bottomDark = useMemo(() => new THREE.Color('#010208'), [])

  useFrame(({ clock }) => {
    const m = materialRef.current
    if (!m) return

    const arrival = scrollController.getArrivalState()
    const focus = interactionState.getState().focusAmount
    const portal = scrollController.getPortalGravity()
    const quiet = Math.min(1, Math.max(arrival.factor, focus))
    const inner = portal * portal * (3 - 2 * portal)

    if (scene.fog && 'density' in scene.fog) {
      const target = baseFogDensity + quiet * 0.038 + (1 - inner) * 0.02 - inner * 0.014
      ;(scene.fog as THREE.FogExp2).density = THREE.MathUtils.damp(
        (scene.fog as THREE.FogExp2).density,
        target,
        2.2,
        1 / 60,
      )
    }

    const z = camera.position.z
    const along = THREE.MathUtils.clamp((-z - 2) / 90, 0, 1)
    const t = clock.getElapsedTime() * 0.04
    const mix = THREE.MathUtils.clamp(along + Math.sin(t) * (0.08 * (1 - portal * 0.75)), 0, 1)
    m.uniforms.uMix.value = mix

    const lift = inner * 0.22
    m.uniforms.uTop.value.copy(topBase).lerp(topDark, quiet * 0.85).lerp(topBase, lift)
    m.uniforms.uBottom.value.copy(bottomBase).lerp(bottomDark, quiet * 0.85).lerp(bottomBase, lift)

    const tStar = clock.getElapsedTime()
    const reveal = inner

    if (starsNearRef.current) {
      starsNearRef.current.rotation.y = tStar * 0.002
      starsNearRef.current.rotation.x = Math.sin(tStar * 0.01) * 0.01
      const mat = stars.nearMat
      mat.opacity = THREE.MathUtils.damp(mat.opacity, 0.18 + reveal * 0.22, 2.2, 1 / 60)
      mat.emissiveIntensity = THREE.MathUtils.damp(mat.emissiveIntensity, 0.75 + reveal * 0.35, 2.2, 1 / 60)
    }

    if (starsFarRef.current) {
      starsFarRef.current.rotation.y = tStar * 0.0014
      starsFarRef.current.rotation.x = Math.sin(tStar * 0.008) * 0.008
      const mat = stars.farMat
      mat.opacity = THREE.MathUtils.damp(mat.opacity, 0.04 + reveal * 0.28, 2.2, 1 / 60)
      mat.emissiveIntensity = THREE.MathUtils.damp(mat.emissiveIntensity, 0.7 + reveal * 0.45, 2.2, 1 / 60)
    }

    if (motesGroupRef.current) {
      motesGroupRef.current.position.copy(camera.position)
    }

    if (motesRef.current) {
      const tmp = new THREE.Object3D()
      const spread = motes.spread
      const flow = 0.28 + inner * 0.75
      const baseOpacity = (1 - quiet) * 0.08 + inner * 0.06
      motes.mat.opacity = THREE.MathUtils.damp(motes.mat.opacity, baseOpacity, 2.2, 1 / 60)
      motes.mat.emissiveIntensity = THREE.MathUtils.damp(motes.mat.emissiveIntensity, 0.1 + inner * 0.18, 2.2, 1 / 60)

      for (let i = 0; i < motes.count; i++) {
        const o = motes.offsets[i]!
        const v = motes.vels[i]!
        const x = THREE.MathUtils.euclideanModulo(o.x + v.x * tStar * 60 * flow + spread, spread * 2) - spread
        const y = THREE.MathUtils.euclideanModulo(o.y + v.y * tStar * 60 * flow + spread * 0.65, spread * 1.3) - spread * 0.65
        const z = THREE.MathUtils.euclideanModulo(o.z + v.z * tStar * 60 * flow + spread, spread * 2) - spread
        tmp.position.set(x, y, z)
        tmp.scale.setScalar(motes.scales[i]!)
        tmp.rotation.set(0, 0, 0)
        tmp.updateMatrix()
        motesRef.current.setMatrixAt(i, tmp.matrix)
      }
      motesRef.current.instanceMatrix.needsUpdate = true
    }

    if (formsRef.current) {
      const tmp = new THREE.Object3D()
      const vis = 0.015 + inner * 0.05
      forms.mat.opacity = THREE.MathUtils.damp(forms.mat.opacity, vis, 2.2, 1 / 60)
      forms.mat.emissiveIntensity = THREE.MathUtils.damp(forms.mat.emissiveIntensity, 0.02 + inner * 0.06, 2.2, 1 / 60)

      for (let i = 0; i < forms.count; i++) {
        tmp.position.copy(forms.offsets[i]!)
        tmp.scale.setScalar(forms.scales[i]!)
        const e = forms.rots[i]!
        tmp.rotation.set(e.x + tStar * 0.0003, e.y + tStar * 0.0002, e.z)
        tmp.updateMatrix()
        formsRef.current.setMatrixAt(i, tmp.matrix)
      }
      formsRef.current.instanceMatrix.needsUpdate = true
    }
  })

  useEffect(() => {
    const tmp = new THREE.Object3D()

    if (starsNearRef.current) {
      for (let i = 0; i < stars.near.count; i++) {
        tmp.position.copy(stars.near.positions[i]!)
        const s = stars.near.scales[i]!
        tmp.scale.setScalar(s)
        tmp.rotation.set(0, 0, 0)
        tmp.updateMatrix()
        starsNearRef.current.setMatrixAt(i, tmp.matrix)
        starsNearRef.current.setColorAt(i, stars.near.colors[i]!)
      }
      starsNearRef.current.instanceMatrix.needsUpdate = true
      if (starsNearRef.current.instanceColor) starsNearRef.current.instanceColor.needsUpdate = true
    }

    if (starsFarRef.current) {
      for (let i = 0; i < stars.far.count; i++) {
        tmp.position.copy(stars.far.positions[i]!)
        const s = stars.far.scales[i]!
        tmp.scale.setScalar(s)
        tmp.rotation.set(0, 0, 0)
        tmp.updateMatrix()
        starsFarRef.current.setMatrixAt(i, tmp.matrix)
        starsFarRef.current.setColorAt(i, stars.far.colors[i]!)
      }
      starsFarRef.current.instanceMatrix.needsUpdate = true
      if (starsFarRef.current.instanceColor) starsFarRef.current.instanceColor.needsUpdate = true
    }
  }, [stars])

  useEffect(() => {
    const tmp = new THREE.Object3D()

    if (motesRef.current) {
      for (let i = 0; i < motes.count; i++) {
        tmp.position.copy(motes.offsets[i]!)
        tmp.scale.setScalar(motes.scales[i]!)
        tmp.rotation.set(0, 0, 0)
        tmp.updateMatrix()
        motesRef.current.setMatrixAt(i, tmp.matrix)
        motesRef.current.setColorAt(i, motes.colors[i]!)
      }
      motesRef.current.instanceMatrix.needsUpdate = true
      if (motesRef.current.instanceColor) motesRef.current.instanceColor.needsUpdate = true
    }

    if (formsRef.current) {
      for (let i = 0; i < forms.count; i++) {
        tmp.position.copy(forms.offsets[i]!)
        tmp.scale.setScalar(forms.scales[i]!)
        tmp.rotation.copy(forms.rots[i]!)
        tmp.updateMatrix()
        formsRef.current.setMatrixAt(i, tmp.matrix)
      }
      formsRef.current.instanceMatrix.needsUpdate = true
    }
  }, [forms, motes])

  return (
    <>
      <instancedMesh ref={starsFarRef} args={[starGeom, stars.farMat, stars.far.count]} frustumCulled={false} renderOrder={-999} />
      <instancedMesh ref={starsNearRef} args={[starGeom, stars.nearMat, stars.near.count]} frustumCulled={false} renderOrder={-998} />
      <instancedMesh ref={formsRef} args={[formsGeom, forms.mat, forms.count]} frustumCulled={false} renderOrder={-997} />
      <group ref={motesGroupRef}>
        <instancedMesh ref={motesRef} args={[motesGeom, motes.mat, motes.count]} frustumCulled={false} renderOrder={-996} />
      </group>
      <mesh scale={120} frustumCulled={false} renderOrder={-1000}>
        <sphereGeometry args={[1, 32, 32]} />
        <shaderMaterial
          ref={materialRef}
          side={THREE.BackSide}
          depthWrite={false}
          uniforms={uniforms}
          vertexShader={
            'varying vec3 vWorld;\n'
            + 'void main() {\n'
            + '  vec4 wp = modelMatrix * vec4(position, 1.0);\n'
            + '  vWorld = wp.xyz;\n'
            + '  gl_Position = projectionMatrix * viewMatrix * wp;\n'
            + '}\n'
          }
          fragmentShader={
            'uniform vec3 uTop;\n'
            + 'uniform vec3 uBottom;\n'
            + 'uniform float uMix;\n'
            + 'varying vec3 vWorld;\n'
            + 'void main() {\n'
            + '  float h = clamp((vWorld.y + 12.0) / 24.0, 0.0, 1.0);\n'
            + '  vec3 a = mix(uBottom, uTop, h);\n'
            + '  vec3 b = mix(uBottom * 0.8, uTop * 1.15, h);\n'
            + '  vec3 col = mix(a, b, uMix);\n'
            + '  gl_FragColor = vec4(col, 1.0);\n'
            + '}\n'
          }
        />
      </mesh>
    </>
  )
}
