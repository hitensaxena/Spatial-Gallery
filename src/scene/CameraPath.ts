import * as THREE from 'three'

type Sample = {
  point: THREE.Vector3
  tangent: THREE.Vector3
  right: THREE.Vector3
}

const points: THREE.Vector3[] = [
  new THREE.Vector3(0.0, 0.18, 4.0),
  new THREE.Vector3(0.25, 0.22, -10.0),
  new THREE.Vector3(-0.35, 0.26, -24.0),
  new THREE.Vector3(0.55, 0.22, -40.0),
  new THREE.Vector3(-0.45, 0.28, -58.0),
  new THREE.Vector3(0.35, 0.24, -78.0),
  new THREE.Vector3(-0.25, 0.20, -92.0),
  new THREE.Vector3(0.45, 0.22, -112.0),
  new THREE.Vector3(-0.35, 0.26, -132.0),
  new THREE.Vector3(0.15, 0.20, -148.0),
]

export const cameraPath = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.6)

cameraPath.arcLengthDivisions = 420
cameraPath.updateArcLengths()

const up = new THREE.Vector3(0, 1, 0)

export function sampleCameraPath(u: number, target?: Sample): Sample {
  const clamped = THREE.MathUtils.clamp(u, 0, 1)

  const point = target?.point ?? new THREE.Vector3()
  const tangent = target?.tangent ?? new THREE.Vector3()
  const right = target?.right ?? new THREE.Vector3()

  cameraPath.getPointAt(clamped, point)
  cameraPath.getTangentAt(clamped, tangent).normalize()

  right.copy(up).cross(tangent).normalize()

  return { point, tangent, right }
}

export function projectUFromIndex(index: number, total: number) {
  if (total <= 0) return 0.5
  return (index + 1) / (total + 1)
}
