import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { scrollController } from '../interaction/ScrollController'
import { interactionState } from '../interaction/InteractionState'

export function Environment() {
  const { scene, camera } = useThree()
  const materialRef = useRef<THREE.ShaderMaterial>(null)

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

  const topBase = useMemo(() => new THREE.Color('#07080b'), [])
  const bottomBase = useMemo(() => new THREE.Color('#020308'), [])
  const topDark = useMemo(() => new THREE.Color('#04050a'), [])
  const bottomDark = useMemo(() => new THREE.Color('#010208'), [])

  useFrame(({ clock }) => {
    const m = materialRef.current
    if (!m) return

    const arrival = scrollController.getArrivalState()
    const focus = interactionState.getState().focusAmount
    const quiet = Math.min(1, Math.max(arrival.factor, focus))

    if (scene.fog && 'density' in scene.fog) {
      const target = baseFogDensity + quiet * 0.038
      ;(scene.fog as THREE.FogExp2).density = THREE.MathUtils.damp(
        (scene.fog as THREE.FogExp2).density,
        target,
        2.2,
        1 / 60,
      )
    }

    const z = camera.position.z
    const along = THREE.MathUtils.clamp((-z - 2) / 90, 0, 1)
    const t = clock.getElapsedTime() * 0.02
    const mix = THREE.MathUtils.clamp(along + Math.sin(t) * 0.08, 0, 1)
    m.uniforms.uMix.value = mix

    m.uniforms.uTop.value.copy(topBase).lerp(topDark, quiet * 0.85)
    m.uniforms.uBottom.value.copy(bottomBase).lerp(bottomDark, quiet * 0.85)
  })

  return (
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
  )
}
