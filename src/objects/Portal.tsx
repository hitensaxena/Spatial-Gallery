import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { interactionState } from '../interaction/InteractionState'
import { scrollController } from '../interaction/ScrollController'

type PortalProps = {
  position: [number, number, number]
}

export function Portal({ position }: PortalProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const apertureRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const frameGeometry = useMemo(() => new THREE.TorusGeometry(1.08, 0.18, 22, 96), [])
  const apertureGeometry = useMemo(() => new THREE.CylinderGeometry(0.9, 0.9, 0.22, 56, 1, true), [])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#9aa4b2',
        roughness: 0.6,
        metalness: 0.2,
        emissive: new THREE.Color('#10151f'),
        emissiveIntensity: 0.62,
      }),
    [],
  )

  const apertureMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0b0d12',
        roughness: 0.95,
        metalness: 0.0,
        transparent: true,
        opacity: 0.55,
        emissive: new THREE.Color('#83ef45ff'),
        emissiveIntensity: 1.35,
        side: THREE.DoubleSide,
      }),
    [],
  )

  useFrame(({ clock }) => {
    const m = meshRef.current
    if (!m) return
    const state = interactionState.getState()
    const timeScale = state.mode === 'focus' ? 0.35 : 0.55
    const g = scrollController.getPortalGravity()
    const t = clock.getElapsedTime() * timeScale
    const still = 1 - g * 0.9
    m.rotation.z = t * (0.018 * still)

    if (apertureRef.current) {
      apertureRef.current.rotation.z = m.rotation.z
      const target = 0.48 + g * 0.25
      apertureMaterial.opacity = THREE.MathUtils.damp(apertureMaterial.opacity, target, 2.2, 1 / 60)
    }

    if (lightRef.current) {
      const ph = clock.getElapsedTime() * 1.65
      const s = 0.5 + 0.5 * Math.sin(ph)
      const breath = s * s * (3 - 2 * s)
      const base = 3.5 + g * 2.5
      const amp = 5.0 + g * 4.0
      const target = base + amp * breath
      lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, target, 2.2, 1 / 60)

      const targetDist = 38 + g * 28 + breath * 14
      lightRef.current.distance = THREE.MathUtils.damp(lightRef.current.distance, targetDist, 2.2, 1 / 60)
    }
  })

  return (
    <group position={position}>
      <mesh ref={meshRef} geometry={frameGeometry} material={material} />
      <mesh ref={apertureRef} geometry={apertureGeometry} material={apertureMaterial} rotation={[Math.PI / 2, 0, 0]} />
      <pointLight
        ref={lightRef}
        position={[0, 0.1, 0.35]}
        intensity={3.5}
        color="#e7eefc"
        distance={38}
        decay={2}
      />
    </group>
  )
}
