import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

import { Environment } from './Environment'
import { CameraRig } from './CameraRig'
import { Portal } from '../objects/Portal'
import { ProjectArtifact } from '../objects/ProjectArtifact'
import { projects } from '../data/projects'
import { projectUFromIndex, sampleCameraPath } from './CameraPath'
import { interactionState } from '../interaction/InteractionState'
import { scrollController } from '../interaction/ScrollController'

const portalU = 0.06
scrollController.setPortalU(portalU)

function LightRig() {
  const { camera } = useThree()
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const moonRef = useRef<THREE.PointLight>(null)
  const tmpColor = useRef(new THREE.Color())
  const memoryColor = useRef(new THREE.Color('#b8c2d6'))
  const memoryStrength = useRef(0)
  const memoryTau = useRef(1.6)
  const prevFocusedId = useRef<string | null>(null)

  useFrame((_, dt) => {
    const focus = interactionState.getState().focusAmount
    const focusEase = focus * focus * (3 - 2 * focus)
    const arrival = scrollController.getArrivalState().factor
    const arrivalId = scrollController.getArrivalState().projectId
    const portal = scrollController.getPortalGravity()
    const focusedId = interactionState.getState().focusedProjectId

    const activeId = focusedId ?? arrivalId
    const profile = projects.find((p) => p.id === activeId)?.lighting
    const profileColor = profile?.color ?? '#b8c2d6'
    const profileIntensity = profile?.intensity ?? 1

    const lift = Math.min(1, arrival * 0.9 + portal * 0.9)
    const dim = 1 - focusEase * 0.33

    const personality = THREE.MathUtils.clamp(arrival * 0.6 + focusEase * 0.85, 0, 1)

    const focusJustEnded = prevFocusedId.current && !focusedId
    if (focusJustEnded) {
      memoryTau.current = 2.6
      memoryStrength.current = Math.min(1, Math.max(memoryStrength.current, 0.55))
    } else if (personality > 0.08) {
      memoryTau.current = 1.6
    }

    prevFocusedId.current = focusedId

    if (activeId && personality > 0.08) {
      memoryColor.current.lerp(new THREE.Color(profileColor), 1 - Math.exp(-2.2 * dt))
      memoryStrength.current = Math.max(memoryStrength.current, personality)
    }

    memoryStrength.current = THREE.MathUtils.damp(memoryStrength.current, 0, 1 / memoryTau.current, dt)
    const trail = THREE.MathUtils.clamp(memoryStrength.current, 0, 1)

    tmpColor.current.set('#b8c2d6').lerp(memoryColor.current, trail * 0.22)

    if (ambientRef.current) {
      const target = (0.07 + lift * 0.05 + trail * 0.02) * dim
      ambientRef.current.intensity = THREE.MathUtils.damp(ambientRef.current.intensity, target, 2.2, dt)
      ambientRef.current.color.lerp(tmpColor.current, 1 - Math.exp(-1.5 * dt))
    }

    if (moonRef.current) {
      const forward = new THREE.Vector3()
      camera.getWorldDirection(forward)
      const pos = camera.position
        .clone()
        .add(forward.multiplyScalar(18))
        .add(new THREE.Vector3(0, 10, 0))

      moonRef.current.position.lerp(pos, 1 - Math.exp(-3.0 * dt))

      const target = (0.35 + lift * 0.35 + trail * 0.05) * dim * (0.95 + 0.08 * profileIntensity)
      moonRef.current.intensity = THREE.MathUtils.damp(moonRef.current.intensity, target, 2.2, dt)
      moonRef.current.distance = THREE.MathUtils.damp(moonRef.current.distance, 55 + lift * 35, 2.2, dt)
      moonRef.current.color.lerp(tmpColor.current, 1 - Math.exp(-1.5 * dt))
    }
  })

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.07} color="#cfd6e6" />
      <pointLight
        ref={moonRef}
        position={[0, 10, 10]}
        intensity={0.35}
        color="#b8c2d6"
        distance={55}
        decay={2}
      />
    </>
  )
}

export function MainScene() {
  return (
    <Canvas
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.75]}
      camera={{ fov: 55, near: 0.1, far: 200, position: [0, 0.2, 4] }}
    >
      <LightRig />

      <Environment />
      <CameraRig />

      {(() => {
        const s = sampleCameraPath(portalU)
        const pos = s.point
          .clone()
          .add(s.tangent.clone().multiplyScalar(6.5))
          .add(s.right.clone().multiplyScalar(0.65))
          .add(new THREE.Vector3(0, 0.25, 0))
        return <Portal position={[pos.x, pos.y, pos.z]} />
      })()}

      {projects.map((p, i) => {
        const u = projectUFromIndex(i, projects.length)
        const s = sampleCameraPath(u)
        const side = (i % 2 === 0 ? -1 : 1) * 1.25
        const pos = s.point.clone().add(s.right.clone().multiplyScalar(side))
        return (
          <ProjectArtifact
            key={p.id}
            project={p}
            position={[pos.x, pos.y, pos.z]}
          />
        )
      })}
    </Canvas>
  )
}
