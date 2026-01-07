import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { interactionState } from '../interaction/InteractionState'

type PortalProps = {
  position: [number, number, number]
}

export function Portal({ position }: PortalProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const geometry = useMemo(() => new THREE.TorusGeometry(1.1, 0.08, 16, 64), [])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#9aa4b2',
        roughness: 0.6,
        metalness: 0.2,
        emissive: new THREE.Color('#10151f'),
        emissiveIntensity: 0.35,
      }),
    [],
  )

  useFrame(({ clock }) => {
    const m = meshRef.current
    if (!m) return
    const state = interactionState.getState()
    const timeScale = state.mode === 'focus' ? 0.35 : 0.55
    const t = clock.getElapsedTime() * timeScale
    m.rotation.z = t * 0.03
  })

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} position={position} />
  )
}
