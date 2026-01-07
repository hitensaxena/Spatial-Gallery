import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

import { interactionState } from '../interaction/InteractionState'
import { scrollController } from '../interaction/ScrollController'
import { projects } from '../data/projects'
import { projectUFromIndex, sampleCameraPath } from './CameraPath'
import { audioManager } from '../audio/AudioManager'

function smoothStep(x: number) {
  const t = THREE.MathUtils.clamp(x, 0, 1)
  return t * t * (3 - 2 * t)
}

function projectProgressById(id: string) {
  const index = projects.findIndex((p) => p.id === id)
  if (index < 0) return 0.5
  return projectUFromIndex(index, projects.length)
}

export function CameraRig() {
  const { camera } = useThree()
  const lookAt = useRef(new THREE.Vector3(0, 0, 0))
  const desiredPos = useRef(new THREE.Vector3(0, 0.2, 4))
  const baseFov = useRef((camera as THREE.PerspectiveCamera).fov)
  const tmpFollow = useRef({
    point: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    right: new THREE.Vector3(),
  })
  const tmpAhead = useRef({
    point: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    right: new THREE.Vector3(),
  })
  const tmpFocus = useRef({
    point: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    right: new THREE.Vector3(),
  })

  const cleanup = useMemo(() => {
    return scrollController.attachWindowScroll()
  }, [])

  useEffect(() => cleanup, [cleanup])

  useFrame(({ clock }, dt) => {
    interactionState.update(dt)
    const state = interactionState.getState()

    const focusAmount = state.focusAmount
    const focusEase = focusAmount * focusAmount * (3 - 2 * focusAmount)

    audioManager.setGlobalMix(1 - focusEase * 0.6)
    audioManager.setProjectMix(focusEase)

    const isFocus = state.mode === 'focus'
    const portalGravity = scrollController.getPortalGravity()
    const portalEase = portalGravity * portalGravity * (3 - 2 * portalGravity)
    const timeScale = (1 - focusEase * 0.55) * (1 - portalEase * 0.12)
    const scaledDt = dt * timeScale

    scrollController.update(scaledDt)

    if (state.mode === 'journey') {
      scrollController.applyScrollMagnet()
    }

    if (state.mode === 'journey') {
      interactionState.setJourneyProgress(scrollController.getProgress())
    }

    const journeyP = state.mode === 'journey' ? scrollController.getProgress() : state.journeyProgress

    const focusP = state.mode === 'focus' && state.focusedProjectId
      ? projectProgressById(state.focusedProjectId)
      : journeyP

    const p = state.mode === 'focus' ? focusP : journeyP

    const wobble = Math.sin(p * Math.PI * 2) * (0.008 * (1 - portalEase * 0.8))
    const modulated = THREE.MathUtils.clamp(p + wobble, 0, 1)
    const eased = smoothStep(modulated)

    const follow = sampleCameraPath(eased, tmpFollow.current)
    const ahead = sampleCameraPath(THREE.MathUtils.clamp(eased + 0.015, 0, 1), tmpAhead.current)

    const journeyPos = follow.point.clone()
    const journeyLook = follow.point.clone().add(ahead.tangent.clone().multiplyScalar(2.2))

    let focusPos = journeyPos
    let focusLook = journeyLook

    if (isFocus && state.focusedProjectId) {
      const idx = projects.findIndex((pr) => pr.id === state.focusedProjectId)
      const focusU = idx < 0 ? 0.5 : projectUFromIndex(idx, projects.length)
      const focus = sampleCameraPath(focusU, tmpFocus.current)

      const t = clock.getElapsedTime() * 0.05
      const side = (idx % 2 === 0 ? -1 : 1) * 1.1
      const projectAnchor = focus.point.clone().add(focus.right.clone().multiplyScalar(side))

      const camTarget = projectAnchor
        .clone()
        .add(focus.tangent.clone().multiplyScalar(-3.15))
        .add(new THREE.Vector3(0, 0.16, 0))
        .add(focus.right.clone().multiplyScalar(0.18))
        .add(focus.right.clone().multiplyScalar(Math.sin(t) * 0.008))

      focusPos = camTarget
      focusLook = projectAnchor
    } else {
      focusPos = journeyPos
      focusLook = journeyLook
    }

    desiredPos.current.copy(journeyPos).lerp(focusPos, focusEase)
    lookAt.current.copy(journeyLook).lerp(focusLook, focusEase)

    const cam = camera as THREE.PerspectiveCamera
    const targetFov = baseFov.current - focusEase * 2
    cam.fov = THREE.MathUtils.damp(cam.fov, targetFov, 3.2, scaledDt)
    cam.updateProjectionMatrix()

    camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredPos.current.x, 3.2, scaledDt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredPos.current.y, 3.2, scaledDt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredPos.current.z, 3.2, scaledDt)

    const cx = THREE.MathUtils.damp((camera as any).__lookAtX ?? 0, lookAt.current.x, 3.0, scaledDt)
    const cy = THREE.MathUtils.damp((camera as any).__lookAtY ?? 0, lookAt.current.y, 3.0, scaledDt)
    const cz = THREE.MathUtils.damp((camera as any).__lookAtZ ?? 0, lookAt.current.z, 3.0, scaledDt)

    ;(camera as any).__lookAtX = cx
    ;(camera as any).__lookAtY = cy
    ;(camera as any).__lookAtZ = cz

    camera.lookAt(cx, cy, cz)
  })

  return null
}
