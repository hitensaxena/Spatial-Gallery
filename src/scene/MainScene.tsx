import { Canvas, useFrame } from '@react-three/fiber'
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
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)
  const keyRef = useRef<THREE.PointLight>(null)

  useFrame((_, dt) => {
    const focus = interactionState.getState().focusAmount
    const ease = focus * focus * (3 - 2 * focus)

    if (ambientRef.current) ambientRef.current.intensity = THREE.MathUtils.damp(ambientRef.current.intensity, 0.26 - ease * 0.07, 2.2, dt)
    if (hemiRef.current) hemiRef.current.intensity = THREE.MathUtils.damp(hemiRef.current.intensity, 0.35 - ease * 0.12, 2.2, dt)
    if (keyRef.current) keyRef.current.intensity = THREE.MathUtils.damp(keyRef.current.intensity, 0.65 + ease * 0.25, 2.2, dt)
  })

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.26} />
      <hemisphereLight ref={hemiRef} intensity={0.35} color="#5a6b8f" groundColor="#06070d" />
      <pointLight ref={keyRef} position={[0.6, 1.2, 1.2]} intensity={0.65} color="#c9d3e8" distance={22} />
      <pointLight position={[-1.2, -0.4, -2.5]} intensity={0.25} color="#3d4a68" distance={28} />
      <directionalLight position={[2, 3.5, 2.5]} intensity={0.25} color="#b8c2d6" />
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
