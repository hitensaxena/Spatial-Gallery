import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

import type { Project } from '../data/projects'
import { audioManager } from '../audio/AudioManager'
import { interactionState } from '../interaction/InteractionState'
import { scrollController } from '../interaction/ScrollController'

type ProjectArtifactProps = {
  project: Project
  position: [number, number, number]
}

export function ProjectArtifact({ project, position }: ProjectArtifactProps) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const textRef = useRef<THREE.Group>(null)
  const tmpWorldPos = useRef(new THREE.Vector3())
  const tmpForward = useRef(new THREE.Vector3())
  const tmpToObj = useRef(new THREE.Vector3())
  const wasFocusedRef = useRef(false)

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(0.55, 0), [])
  const glowGeometry = useMemo(() => new THREE.IcosahedronGeometry(0.62, 0), [])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#d7dde7',
        roughness: 0.35,
        metalness: 0.05,
        transparent: true,
        opacity: 0.0,
        emissive: new THREE.Color('#0b0d12'),
        emissiveIntensity: 0.5,
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
          uPower: { value: 3.8 },
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

  const coverRef = useRef<THREE.Group>(null)
  const titleRef = useRef<THREE.Group>(null)
  const subRef = useRef<THREE.Group>(null)
  const descRef = useRef<THREE.Group>(null)
  const linksRef = useRef<THREE.Group>(null)
  const detailGroupRef = useRef<THREE.Group>(null)

  const baseColor = useMemo(() => new THREE.Color('#d7dde7'), [])
  const brightColor = useMemo(() => new THREE.Color('#f1f5ff'), [])

  const detailMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0b0d12',
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
      }),
    [],
  )

  const coverTex = useMemo(() => {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    let h = 0
    for (let i = 0; i < project.id.length; i++) h = (h * 31 + project.id.charCodeAt(i)) >>> 0

    const c1 = `hsl(${h % 360} 45% 24%)`
    const c2 = `hsl(${(h + 120) % 360} 55% 18%)`
    const g = ctx.createLinearGradient(0, 0, size, size)
    g.addColorStop(0, c1)
    g.addColorStop(1, c2)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)

    ctx.globalAlpha = 0.12
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 140; i++) {
      const x = ((h + i * 9973) % size) + Math.sin(i) * 8
      const y = ((h + i * 7919) % size) + Math.cos(i * 0.7) * 8
      const r = 1 + (i % 4)
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalAlpha = 0.9
    ctx.fillStyle = 'rgba(5, 6, 10, 0.45)'
    ctx.fillRect(0, size * 0.72, size, size * 0.28)

    ctx.fillStyle = 'rgba(240, 245, 255, 0.95)'
    ctx.font = 'bold 48px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(project.title.slice(0, 18), 28, size * 0.82)
    ctx.globalAlpha = 0.7
    ctx.font = '28px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    ctx.fillText(project.subtitle.slice(0, 22), 28, size * 0.9)

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.needsUpdate = true
    return tex
  }, [project.id, project.subtitle, project.title])

  const coverMat = useMemo(() => {
    if (!coverTex) return null
    return new THREE.MeshStandardMaterial({
      map: coverTex,
      transparent: true,
      opacity: 0,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
    })
  }, [coverTex])

  const descriptionText = useMemo(() => {
    const maxChars = 170
    const raw = project.description ?? ''
    if (raw.length <= maxChars) return raw
    return raw.slice(0, maxChars - 1).trimEnd() + '…'
  }, [project.description])

  const pulsePhase = useMemo(() => {
    let h = 0
    for (let i = 0; i < project.id.length; i++) h = (h * 31 + project.id.charCodeAt(i)) >>> 0
    return (h % 1000) / 1000
  }, [project.id])

  useFrame(({ camera, clock }, dt) => {
    const group = groupRef.current
    const mesh = meshRef.current
    if (!group || !mesh) return

    const state = interactionState.getState()
    const timeScale = state.mode === 'focus' ? 0.35 : 0.55
    const t = clock.getElapsedTime() * timeScale

    const arrival = scrollController.getArrivalState()
    const isNearest = arrival.projectId === project.id
    const cue = isNearest ? arrival.factor : 0
    const deEmphasis = isNearest ? 1 : 1 - arrival.factor * 0.75

    const settle = 1 - cue * 0.65
    group.position.set(
      position[0],
      position[1] + Math.sin(t * 0.22) * (0.018 * settle) + Math.sin(t * 0.06) * (0.006 * (0.5 + cue)),
      position[2],
    )
    mesh.rotation.y = t * (0.07 * settle)
    mesh.rotation.x = t * (0.05 * settle)

    const artifactWorldPos = tmpWorldPos.current
    group.getWorldPosition(artifactWorldPos)

    const dist = camera.position.distanceTo(artifactWorldPos)

    const forward = tmpForward.current
    camera.getWorldDirection(forward)
    const toObj = tmpToObj.current
    toObj.copy(artifactWorldPos).sub(camera.position)
    const along = toObj.dot(forward)

    const ahead = THREE.MathUtils.clamp((14.0 - Math.max(0, along)) / (14.0 - 3.0), 0, 1)
    const behind = THREE.MathUtils.clamp((10.0 - Math.max(0, -along)) / (10.0 - 1.8), 0, 1)
    const proximity = THREE.MathUtils.clamp((14.0 - dist) / (14.0 - 4.0), 0, 1)
    const journeyFade = proximity * ahead * behind

    const isFocused = state.mode === 'focus' && state.focusedProjectId === project.id

    const prox = THREE.MathUtils.clamp((14.0 - dist) / (14.0 - 2.5), 0, 1)
    const audioLevel = Math.min(1, prox * 0.85 + cue * 0.65 + (isFocused ? 0.9 : 0))
    audioManager.setProjectLevel(project.id, audioLevel)

    const focusAmt = isFocused ? state.focusAmount : 0
    const cover = THREE.MathUtils.clamp((focusAmt - 0.05) / 0.35, 0, 1)
    const title = THREE.MathUtils.clamp((focusAmt - 0.18) / 0.45, 0, 1)
    const sub = THREE.MathUtils.clamp((focusAmt - 0.28) / 0.55, 0, 1)
    const desc = THREE.MathUtils.clamp((focusAmt - 0.4) / 0.6, 0, 1)
    const links = THREE.MathUtils.clamp((focusAmt - 0.5) / 0.7, 0, 1)

    detailMat.opacity = THREE.MathUtils.damp(detailMat.opacity, cover * 0.92, 3.2, 1 / 60)

    if (coverMat) {
      coverMat.opacity = THREE.MathUtils.damp(coverMat.opacity, cover * 0.98, 3.2, 1 / 60)
    }

    if (detailGroupRef.current) {
      if (!isFocused) {
        detailGroupRef.current.rotation.y = 0
        wasFocusedRef.current = false
      } else {
        const dx = camera.position.x - artifactWorldPos.x
        const dz = camera.position.z - artifactWorldPos.z
        const targetYaw = Math.atan2(dx, dz)

        if (!wasFocusedRef.current) {
          detailGroupRef.current.rotation.y = targetYaw
          wasFocusedRef.current = true
        } else {
          const currentYaw = detailGroupRef.current.rotation.y
          const delta = THREE.MathUtils.euclideanModulo(targetYaw - currentYaw + Math.PI, Math.PI * 2) - Math.PI
          const lambda = 8
          const nextYaw = currentYaw + delta * (1 - Math.exp(-lambda * dt))
          detailGroupRef.current.rotation.y = nextYaw
        }
      }
    }

    if (coverRef.current) coverRef.current.scale.setScalar(THREE.MathUtils.damp(coverRef.current.scale.x, 0.9 + cover * 0.1, 4, 1 / 60))
    if (titleRef.current) titleRef.current.scale.setScalar(THREE.MathUtils.damp(titleRef.current.scale.x, title, 4, 1 / 60))
    if (subRef.current) subRef.current.scale.setScalar(THREE.MathUtils.damp(subRef.current.scale.x, sub, 4, 1 / 60))
    if (descRef.current) descRef.current.scale.setScalar(THREE.MathUtils.damp(descRef.current.scale.x, desc, 4, 1 / 60))
    if (linksRef.current) linksRef.current.scale.setScalar(THREE.MathUtils.damp(linksRef.current.scale.x, links, 4, 1 / 60))
    const clarity = journeyFade * deEmphasis
    const targetOpacity = isFocused ? 1 : THREE.MathUtils.clamp(clarity + cue * 0.6, 0, 1)

    material.opacity = THREE.MathUtils.damp(material.opacity, targetOpacity, 4.5, 1 / 60)

    const brightness = isFocused ? 1 : THREE.MathUtils.clamp(0.7 + cue * 0.6, 0, 1)
    material.color.lerpColors(baseColor, brightColor, brightness)
    material.emissiveIntensity = THREE.MathUtils.damp(material.emissiveIntensity, 0.34 + cue * 1.15 + (isFocused ? 0.35 : 0), 3.5, 1 / 60)

    const ph = clock.getElapsedTime() * 1.8 + pulsePhase * Math.PI * 2
    const s = 0.5 + 0.5 * Math.sin(ph)
    const breath = s * s * (3 - 2 * s)
    const baseGlow = 0.25 + cue * 0.35 + (isFocused ? 0.55 : 0)
    const ampGlow = 0.9 + cue * 0.8 + (isFocused ? 0.95 : 0)
    const glowTarget = baseGlow + ampGlow * breath
    ;(glowMaterial.uniforms.uIntensity.value as number) = THREE.MathUtils.damp(
      glowMaterial.uniforms.uIntensity.value as number,
      glowTarget,
      4.0,
      1 / 60,
    )
    if (glowRef.current) {
      glowRef.current.rotation.copy(mesh.rotation)
      const sTarget = 1.1 + cue * 0.12 + (isFocused ? 0.18 : 0.08) + breath * 0.14
      glowRef.current.scale.setScalar(THREE.MathUtils.damp(glowRef.current.scale.x, sTarget, 5.0, 1 / 60))
    }

    if (lightRef.current) {
      const profile = project.lighting
      const baseColor = new THREE.Color('#b8c2d6')
      const targetColor = new THREE.Color(profile?.color ?? '#b8c2d6')

      const personality = THREE.MathUtils.clamp(cue * 0.7 + focusAmt * 0.85, 0, 1)
      const color = baseColor.lerp(targetColor, personality * 0.35)
      lightRef.current.color.lerp(color, 1 - Math.exp(-2.2 * dt))

      const baseI = 0.12
      const profI = profile?.intensity ?? 1
      const targetI = baseI * (0.7 + profI * 0.6) + personality * (0.18 + profI * 0.22)
      lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, targetI, 2.6, dt)

      const baseD = profile?.distance ?? 11
      const targetD = baseD + personality * (6 + baseD * 0.25)
      lightRef.current.distance = THREE.MathUtils.damp(lightRef.current.distance, targetD, 2.6, dt)
      lightRef.current.decay = 2
    }

    if (textRef.current) {
      const scale = isFocused
        ? 1.0
        : THREE.MathUtils.clamp(clarity + cue * 0.5, 0, 1)
      textRef.current.scale.setScalar(THREE.MathUtils.damp(textRef.current.scale.x, scale, 6, 1 / 60))
    }

    const targetGroupScale = isFocused ? 1.03 : 0.94 + cue * 0.12
    group.scale.setScalar(THREE.MathUtils.damp(group.scale.x, targetGroupScale, 4.0, 1 / 60))

    if (detailGroupRef.current && isFocused) {
      detailGroupRef.current.scale.setScalar(
        THREE.MathUtils.damp(detailGroupRef.current.scale.x, 0.9, 6, dt),
      )
    }
  })

  const onClick = () => {
    const state = interactionState.getState()
    if (state.mode === 'focus') {
      if (state.focusedProjectId === project.id) {
        interactionState.exitFocus()
        scrollController.beginNeutralPhase(0.75)
        scrollController.setTargetProgress(state.journeyProgress)
        return
      }

      interactionState.focusProject(project.id, state.journeyProgress)
      return
    }

    interactionState.focusProject(project.id, scrollController.getProgress())
  }

  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      <mesh ref={meshRef} geometry={geometry} material={material} />
      <mesh ref={glowRef} geometry={glowGeometry} material={glowMaterial} />
      <pointLight
        ref={lightRef}
        position={[0, 0.15, 0.35]}
        intensity={0.22}
        color="#b6c6ff"
        distance={7.5}
        decay={2}
      />
      <group ref={detailGroupRef}>
        <group ref={coverRef} position={[0, 0.18, 0.42]} scale={0.9}>
          <mesh material={detailMat} position={[0, 0, 0]} scale={[2.65, 1.6, 1]}>
            <planeGeometry args={[1, 1]} />
          </mesh>

          <group position={[-0.86, 0.02, 0.01]}>
            <mesh material={coverMat ?? detailMat} scale={[1.05, 1.38, 1]}>
              <planeGeometry args={[1, 1]} />
            </mesh>
          </group>

          <group position={[0.55, 0.45, 0.02]}>
            <group ref={titleRef} scale={0}>
              <Text
                fontSize={0.22}
                color="#e3e9f6"
                anchorX="left"
                anchorY="middle"
                maxWidth={1.65}
              >
                {project.title}
              </Text>
            </group>
            <group ref={subRef} position={[0, -0.22, 0]} scale={0}>
              <Text
                fontSize={0.14}
                color="#9aa4b2"
                anchorX="left"
                anchorY="middle"
                maxWidth={1.65}
              >
                {project.subtitle}
              </Text>
            </group>
            <group ref={descRef} position={[0, -0.55, 0]} scale={0}>
              <Text
                fontSize={0.09}
                color="#7f889c"
                anchorX="left"
                anchorY="top"
                maxWidth={1.7}
                lineHeight={1.2}
              >
                {descriptionText}
              </Text>
            </group>

            <group ref={linksRef} position={[0, -1.22, 0]} scale={0}>
              {project.links?.slice(0, 4).map((l, i) => (
                <Text
                  key={l.href + i}
                  fontSize={0.1}
                  color="#c9d3e8"
                  anchorX="left"
                  anchorY="middle"
                  position={[0, -i * 0.2, 0]}
                  onClick={() => {
                    if (!l.href || l.href === '#') return
                    window.open(l.href, '_blank', 'noopener,noreferrer')
                  }}
                >
                  {l.label}
                </Text>
              ))}
            </group>
          </group>
        </group>
      </group>
      <group ref={textRef} position={[0, -1.0, 0]} scale={0}>
        <Text
          fontSize={0.26}
          color="#cfd6e6"
          anchorX="center"
          anchorY="middle"
          maxWidth={2.8}
        >
          {project.title}
        </Text>
        <Text
          fontSize={0.16}
          color="#7f889c"
          anchorX="center"
          anchorY="middle"
          position={[0, -0.35, 0]}
          maxWidth={3.2}
        >
          {project.subtitle}
        </Text>
      </group>
    </group>
  )
}
