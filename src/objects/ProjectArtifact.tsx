import { Text, useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import type { Project } from '../data/projects'
import { spatialAudioSystem } from '../audio/spatial'
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
  const emissiveMemoryStrength = useRef(0)
  const emissiveMemoryTau = useRef(1.25)
  const tmpWorldPos = useRef(new THREE.Vector3())
  const tmpForward = useRef(new THREE.Vector3())
  const tmpToObj = useRef(new THREE.Vector3())
  const wasFocusedRef = useRef(false)
  const spatialEmitterRef = useRef<ReturnType<typeof spatialAudioSystem.getOrCreateEmitter> | null>(null)
  const spatialAttachedRef = useRef(false)
  const lightMemoryStrength = useRef(0)
  const lightMemoryTau = useRef(1.3)
  const lightMemoryColor = useRef(new THREE.Color('#b8c2d6'))
  const prevFocused = useRef(false)

  useEffect(() => {
    return () => {
      const group = groupRef.current
      const emitter = spatialEmitterRef.current
      if (group && emitter && spatialAttachedRef.current) {
        group.remove(emitter.positional)
      }
      spatialEmitterRef.current = null
      spatialAttachedRef.current = false
    }
  }, [])

  const { geometry, glowGeometry, personality } = useMemo(() => {
    let h = 2166136261
    for (let i = 0; i < project.id.length; i++) {
      h ^= project.id.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    const r = ((h >>> 0) % 1000) / 1000
    const pick = Math.floor(r * 6)

    const tintH = r
    const tintS = 0.06 + ((h >>> 0) % 7) / 7 * 0.08
    const tintL = 0.58
    const roughness = 0.28 + ((h >>> 0) % 13) / 13 * 0.52
    const metalness = 0.03 + ((h >>> 0) % 11) / 11 * 0.14
    const size = 0.92 + ((h >>> 0) % 17) / 17 * 0.18
    const density = 0.85 + ((h >>> 0) % 19) / 19 * 0.3

    const jitter = (g: THREE.BufferGeometry, amount: number) => {
      const pos = g.attributes.position as THREE.BufferAttribute
      const v = new THREE.Vector3()
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i)
        const n = Math.sin((i * 12.9898 + r * 78.233) * 0.7) * 43758.5453
        const j = (n - Math.floor(n) - 0.5) * 2
        const k = 1 + amount * j
        v.multiplyScalar(k)
        pos.setXYZ(i, v.x, v.y, v.z)
      }
      pos.needsUpdate = true
      g.computeVertexNormals()
      return g
    }

    const baseScale = new THREE.Vector3(1, 1, 1)
    const glowScale = new THREE.Vector3(1.07, 1.07, 1.07)

    let base: THREE.BufferGeometry

    if (pick === 0) {
      // distorted sphere
      base = new THREE.SphereGeometry(0.52, 32, 22)
      baseScale.set(1.05, 0.92, 1.0)
      jitter(base, 0.08)
    } else if (pick === 1) {
      // elongated torus
      base = new THREE.TorusGeometry(0.42, 0.12, 20, 72)
      baseScale.set(1.25, 0.92, 1.0)
    } else if (pick === 2) {
      // fractured poly
      base = new THREE.IcosahedronGeometry(0.54, 2)
      baseScale.set(1.0, 1.0, 1.0)
      jitter(base, 0.11)
    } else if (pick === 3) {
      // soft knot / shell
      base = new THREE.TorusKnotGeometry(0.28, 0.085, 96, 14, 2, 3)
      baseScale.set(1.1, 1.05, 1.0)
    } else if (pick === 4) {
      // layered ring / shell
      base = new THREE.TorusGeometry(0.46, 0.08, 20, 90)
      baseScale.set(1.0, 1.0, 1.0)
    } else {
      const pts: THREE.Vector3[] = []
      for (let i = 0; i < 12; i++) {
        const t = i / 11
        const y = -0.36 + t * 0.72
        const rad = 0.11 + 0.18 * Math.sin(t * Math.PI) + 0.06 * Math.sin(t * Math.PI * 2 + r * Math.PI * 2)
        pts.push(new THREE.Vector3(rad, y, 0))
      }
      base = new THREE.LatheGeometry(pts as any, 40)
      baseScale.set(1.05, 0.95, 1.05)
      jitter(base, 0.06)
    }

    base.applyMatrix4(new THREE.Matrix4().makeScale(baseScale.x, baseScale.y, baseScale.z))

    const glow = base.clone()
    glow.applyMatrix4(new THREE.Matrix4().makeScale(glowScale.x, glowScale.y, glowScale.z))

    return {
      geometry: base,
      glowGeometry: glow,
      personality: {
        r,
        tintH,
        tintS,
        tintL,
        roughness,
        metalness,
        size,
        density,
      },
    }
  }, [project.id])
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
        blending: THREE.NormalBlending,
        side: THREE.BackSide,
        uniforms: {
          uColor: { value: new THREE.Color('#b6c6ff') },
          uPower: { value: 4.4 },
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
  const neutralEmissive = useMemo(() => new THREE.Color('#0b0d12'), [])
  const tmpEmissive = useMemo(() => new THREE.Color(), [])

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

  const coverUrl = useMemo(() => {
    const img = project.media?.find((m) => m.kind === 'image')
    return img?.href ?? null
  }, [project.media])

  const loadedCoverTex = useTexture(coverUrl || '/vite.svg')
  const coverTex = useMemo(() => {
    if (!loadedCoverTex) return null
    loadedCoverTex.colorSpace = THREE.SRGBColorSpace
    loadedCoverTex.needsUpdate = true

    loadedCoverTex.generateMipmaps = false
    loadedCoverTex.minFilter = THREE.LinearFilter
    loadedCoverTex.magFilter = THREE.LinearFilter

    loadedCoverTex.wrapS = THREE.RepeatWrapping
    loadedCoverTex.wrapT = THREE.RepeatWrapping

    const img = loadedCoverTex.image as { width?: number; height?: number } | undefined
    const iw = img?.width ?? 1
    const ih = img?.height ?? 1
    const texAspect = iw / ih
    const frameAspect = 1.05 / 1.38

    if (texAspect > frameAspect) {
      const sx = frameAspect / texAspect
      loadedCoverTex.repeat.set(sx, 1)
      loadedCoverTex.offset.set((1 - sx) * 0.5, 0)
    } else {
      const sy = texAspect / frameAspect
      loadedCoverTex.repeat.set(1, sy)
      loadedCoverTex.offset.set(0, (1 - sy) * 0.5)
    }

    return loadedCoverTex
  }, [loadedCoverTex])

  const coverMat = useMemo(() => {
    if (!coverTex) return null
    return new THREE.MeshStandardMaterial({
      map: coverTex,
      transparent: true,
      opacity: 0,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.55,
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
    })
  }, [coverTex])

  const titleLine = useMemo(() => {
    const raw = project.title ?? ''
    const maxChars = 26
    if (raw.length <= maxChars) return raw
    return raw.slice(0, maxChars - 1).trimEnd() + '…'
  }, [project.title])

  const subtitleLine = useMemo(() => {
    const raw = project.subtitle ?? ''
    const maxChars = 32
    if (raw.length <= maxChars) return raw
    return raw.slice(0, maxChars - 1).trimEnd() + '…'
  }, [project.subtitle])

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
    const timeScale = state.mode === 'focus' ? 0.08 : 0.12
    const t = clock.getElapsedTime() * timeScale

    const arrival = scrollController.getArrivalState()
    const isNearest = arrival.projectId === project.id
    const cue = isNearest ? arrival.factor : 0
    const deEmphasis = isNearest ? 1 : 1 - arrival.factor * 0.75

    const settle = 1 - cue * 0.35
    group.position.set(
      position[0],
      position[1] + Math.sin(t * 0.18 + pulsePhase) * (0.008 * settle) + Math.sin(t * 0.041 + pulsePhase * 2.1) * (0.004 * (0.5 + cue)),
      position[2],
    )
    mesh.rotation.y = Math.sin(t * 0.17 + pulsePhase * 6.1) * (0.12 * settle)
    mesh.rotation.x = Math.sin(t * 0.11 + pulsePhase * 3.9) * (0.08 * settle)
    mesh.rotation.z = Math.sin(t * 0.07 + pulsePhase * 5.3) * (0.06 * settle)

    const artifactWorldPos = tmpWorldPos.current
    group.getWorldPosition(artifactWorldPos)

    if (!spatialEmitterRef.current) {
      spatialEmitterRef.current = spatialAudioSystem.getOrCreateEmitter(project.id)
    }
    const emitter = spatialEmitterRef.current
    if (emitter) {
      if (!spatialAttachedRef.current) {
        group.add(emitter.positional)
        emitter.positional.position.set(0, 0, 0)
        spatialAttachedRef.current = true
      }
    }

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
    const focusAmt = isFocused ? state.focusAmount : 0

    const focusJustEnded = prevFocused.current && !isFocused
    if (focusJustEnded) {
      lightMemoryTau.current = 2.2
      lightMemoryStrength.current = Math.min(1, Math.max(lightMemoryStrength.current, 0.65))
    } else if (cue > 0.08 || focusAmt > 0.08) {
      lightMemoryTau.current = 1.3
    }
    prevFocused.current = isFocused

    const personalityNow = THREE.MathUtils.clamp(cue * 0.7 + focusAmt * 0.85, 0, 1)
    if (personalityNow > 0.08) {
      lightMemoryStrength.current = Math.max(lightMemoryStrength.current, personalityNow)
      if (project.lighting?.color) {
        lightMemoryColor.current.lerp(new THREE.Color(project.lighting.color), 1 - Math.exp(-2.0 * dt))
      }
    }

    lightMemoryStrength.current = THREE.MathUtils.damp(lightMemoryStrength.current, 0, 1 / lightMemoryTau.current, dt)
    const trail = THREE.MathUtils.clamp(lightMemoryStrength.current, 0, 1)

    if (focusJustEnded) {
      emissiveMemoryTau.current = 2.2
      emissiveMemoryStrength.current = Math.min(1, Math.max(emissiveMemoryStrength.current, 0.65))
    } else if (cue > 0.08 || focusAmt > 0.08) {
      emissiveMemoryTau.current = 1.25
    }

    if (personalityNow > 0.06) {
      emissiveMemoryStrength.current = Math.max(emissiveMemoryStrength.current, personalityNow)
    }
    emissiveMemoryStrength.current = THREE.MathUtils.damp(emissiveMemoryStrength.current, 0, 1 / emissiveMemoryTau.current, dt)
    const glowMemory = THREE.MathUtils.clamp(emissiveMemoryStrength.current, 0, 1)

    const proxAudio = THREE.MathUtils.clamp((28.0 - dist) / (28.0 - 2.75), 0, 1)

    if (project.audio) {
      spatialAudioSystem.applyProjectDrive(
        project.id,
        {
          base: project.audio.base,
          filterType: project.audio.filter.type,
          filterFreq: project.audio.filter.freq,
          filterQ: project.audio.filter.q,
          reverbWet: project.audio.reverb,
          reverbDecay: 2.4 + project.audio.reverb * 2.2,
          width: project.audio.width,
        },
        {
          proximity: proxAudio * (0.85 + cue * 0.55),
          focus: isFocused ? state.focusAmount : 0,
        },
      )
    }

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
    const tint = tmpEmissive.setHSL(personality.tintH, personality.tintS, personality.tintL)
    material.roughness = THREE.MathUtils.damp(material.roughness, personality.roughness, 2.0, dt)
    material.metalness = THREE.MathUtils.damp(material.metalness, personality.metalness, 2.0, dt)
    material.emissive.copy(neutralEmissive).lerp(tint, 0.06)

    const proximityClarity = THREE.MathUtils.clamp((18.0 - dist) / (18.0 - 3.5), 0, 1)
    const clarityEase = proximityClarity * proximityClarity * (3 - 2 * proximityClarity)
    const presence = Math.max(personalityNow, glowMemory * 0.85)
    const emissiveTarget = 0.14 + presence * (0.22 + clarityEase * 0.08) + (isFocused ? 0.08 : 0)
    material.emissiveIntensity = THREE.MathUtils.damp(material.emissiveIntensity, emissiveTarget, 1.8, dt)

    const glowTarget = 0.09 + presence * 0.08 + (isFocused ? 0.05 : 0)
    ;(glowMaterial.uniforms.uIntensity.value as number) = THREE.MathUtils.damp(
      glowMaterial.uniforms.uIntensity.value as number,
      glowTarget,
      2.2,
      dt,
    )
    if (glowRef.current) {
      glowRef.current.rotation.copy(mesh.rotation)
    }

    if (lightRef.current) {
      const profile = project.lighting
      const baseColor = new THREE.Color('#b8c2d6')
      const targetColor = new THREE.Color(profile?.color ?? '#b8c2d6')

      const personality = personalityNow
      const trailColor = baseColor.clone().lerp(lightMemoryColor.current, trail * 0.18)
      const color = baseColor.lerp(targetColor, personality * 0.35).lerp(trailColor, (1 - personality) * trail)
      lightRef.current.color.lerp(color, 1 - Math.exp(-2.2 * dt))

      const baseI = 0.18
      const profI = profile?.intensity ?? 1
      const targetI = baseI * (0.8 + profI * 0.75) + personality * (0.28 + profI * 0.34) + trail * 0.06
      lightRef.current.intensity = THREE.MathUtils.damp(lightRef.current.intensity, targetI, 2.6, dt)

      const baseD = profile?.distance ?? 11
      const targetD = baseD * 1.35 + personality * (9 + baseD * 0.35) + trail * 2.2
      lightRef.current.distance = THREE.MathUtils.damp(lightRef.current.distance, targetD, 2.6, dt)
      lightRef.current.decay = 2
    }

    if (textRef.current) {
      const scale = isFocused
        ? 1.0
        : THREE.MathUtils.clamp(clarity + cue * 0.5, 0, 1)
      textRef.current.scale.setScalar(THREE.MathUtils.damp(textRef.current.scale.x, scale, 6, 1 / 60))
    }

    const baseSize = personality.size
    const targetGroupScale = (isFocused ? 1.03 : 0.94 + cue * 0.12) * baseSize
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

          <group position={[-0.74, 0.02, 0.01]}>
            <mesh material={coverMat ?? detailMat} scale={[1.05, 1.38, 1]}>
              <planeGeometry args={[1, 1]} />
            </mesh>
          </group>

          <group position={[0.38, 0.45, 0.02]}>
            <group ref={titleRef} scale={0}>
              <Text
                fontSize={0.22}
                color="#e3e9f6"
                anchorX="left"
                anchorY="middle"
              >
                {titleLine}
              </Text>
            </group>
            <group ref={subRef} position={[0, -0.22, 0]} scale={0}>
              <Text
                fontSize={0.14}
                color="#9aa4b2"
                anchorX="left"
                anchorY="middle"
              >
                {subtitleLine}
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
      >
        {titleLine}
      </Text>
      <Text
        fontSize={0.16}
        color="#7f889c"
        anchorX="center"
        anchorY="middle"
        position={[0, -0.28, 0]}
      >
        {subtitleLine}
      </Text>
    </group>
  </group>
  )
}
