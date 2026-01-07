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
  const glowRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)

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

  const glowMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        uniforms: {
          uColor: { value: new THREE.Color('#b6c6ff') },
          uPower: { value: 3.6 },
          uIntensity: { value: 0.0 },
        },
        vertexShader:
          'varying vec3 vN;\n'
          + 'varying vec3 vV;\n'
          + 'void main() {\n'
          + '  vec4 wp = modelMatrix * vec4(position, 1.0);\n'
          + '  vN = normalize(normalMatrix * normal);\n'
          + '  vV = normalize(cameraPosition - wp.xyz);\n'
          + '  gl_Position = projectionMatrix * viewMatrix * wp;\n'
          + '}\n',
        fragmentShader:
          'uniform vec3 uColor;\n'
          + 'uniform float uPower;\n'
          + 'uniform float uIntensity;\n'
          + 'varying vec3 vN;\n'
          + 'varying vec3 vV;\n'
          + 'void main() {\n'
          + '  float fres = pow(1.0 - max(0.0, dot(normalize(vN), normalize(vV))), uPower);\n'
          + '  float a = fres * uIntensity;\n'
          + '  gl_FragColor = vec4(uColor, a);\n'
          + '}\n',
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

    if (glowRef.current) {
      const ph = clock.getElapsedTime() * 1.65
      const s = 0.5 + 0.5 * Math.sin(ph)
      const breath = s * s * (3 - 2 * s)
      const base = 0.8 + g * 0.65
      const amp = 1.55 + g * 1.15
      const target = base + amp * breath
      ;(glowMaterial.uniforms.uIntensity.value as number) = THREE.MathUtils.damp(
        glowMaterial.uniforms.uIntensity.value as number,
        target,
        2.2,
        1 / 60,
      )
      glowRef.current.rotation.z = m.rotation.z
      glowRef.current.scale.setScalar(1.24 + g * 0.12 + breath * 0.14)
    }

    if (lightRef.current) {
      const ph = clock.getElapsedTime() * 1.65
      const s = 0.5 + 0.5 * Math.sin(ph)
      const breath = s * s * (3 - 2 * s)
      const base = 1.0 + g * 1.2
      const amp = 2.2 + g * 1.8
      const target = base + amp * breath
      lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, target, 2.2, 1 / 60)

      const targetDist = 18 + g * 16 + breath * 8
      lightRef.current.distance = THREE.MathUtils.damp(lightRef.current.distance, targetDist, 2.2, 1 / 60)
    }
  })

  return (
    <group position={position}>
      <mesh ref={meshRef} geometry={geometry} material={material} />
      <mesh ref={glowRef} geometry={geometry} material={glowMaterial} />
      <pointLight
        ref={lightRef}
        position={[0, 0.1, 0.35]}
        intensity={0.75}
        color="#b6c6ff"
        distance={12}
        decay={2}
      />
    </group>
  )
}
