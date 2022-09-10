import './style.css'
import * as THREE from 'three'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import spriteTextureUrl from '/out-horizontal-correct.png'
import starsUrl from '/stars-3.png'
import * as dat from 'lil-gui'
import Stats from 'stats.js'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader'

// Monitor performance
const stats = new Stats()
stats.showPanel(0)
document.body.appendChild(stats.dom)

// Canvas
const canvas: HTMLElement | null = document.querySelector('canvas#webgl')

// Load the model
const loader = new GLTFLoader()
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')
loader.setDRACOLoader(dracoLoader)

let rocketMeshes: {
  body: THREE.Mesh
  wings: THREE.Mesh
  bottom: THREE.Mesh
  window_glass: THREE.Mesh
  window_frame: THREE.Mesh
}

const rocketGroup = new THREE.Group()

loader.load('/rocket-9.glb', (gltf) => {
  rocketMeshes = {
    body: gltf.scene.children.find((o) => o.name === 'body') as THREE.Mesh,
    wings: gltf.scene.children.find((o) => o.name === 'wings') as THREE.Mesh,
    bottom: gltf.scene.children.find((o) => o.name === 'bottom') as THREE.Mesh,
    window_glass: gltf.scene.children.find(
      (o) => o.name === 'window_glass',
    ) as THREE.Mesh,
    window_frame: gltf.scene.children.find(
      (o) => o.name === 'window_frame',
    ) as THREE.Mesh,
  }
  for (let mesh of Object.values(rocketMeshes)) {
    rocketGroup.add(mesh)
  }
  const whiteMaterial = new THREE.MeshStandardMaterial({color: '#fff'})
  const redMaterial = new THREE.MeshStandardMaterial({color: '#ce4221'})
  redMaterial.roughness = 0.5
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: '#312f4c',
  })

  rocketMeshes.wings.material = whiteMaterial
  rocketMeshes.body.material = whiteMaterial
  rocketMeshes.bottom.material = redMaterial
  rocketMeshes.window_glass.material = glassMaterial
  rocketMeshes.window_frame.material = redMaterial
  rocketMeshes.wings.material = redMaterial

  rocketGroup.scale.set(0.3, 0.3, 0.3)
  rocketGroup.position.set(0, 0.35, 0)
})

if (!canvas) {
  throw new Error(
    'You need to have a canvas element with the id "webgl" in your html document',
  )
}

// Scene
const scene = new THREE.Scene()
scene.add(rocketGroup)

// Texture
const tilesHoriz = 4
const textureLoader = new THREE.TextureLoader()
const spriteTexture = textureLoader.load(spriteTextureUrl)

spriteTexture.wrapS = THREE.RepeatWrapping
spriteTexture.wrapT = THREE.RepeatWrapping
spriteTexture.repeat.set(1 / tilesHoriz, 1)

const gui = new dat.GUI()
gui.add(spriteTexture.offset, 'x', 0, 1, 0.25).name('offsetX').listen()

// Sprite
const spriteMaterial = new THREE.SpriteMaterial({
  map: spriteTexture,
  transparent: true,
})

const sprite = new THREE.Sprite(spriteMaterial)
scene.add(sprite)
sprite.position.y = -1

/* const planeGeometry = new THREE.PlaneGeometry(2, 2)
const planeMaterial = new THREE.MeshBasicMaterial({
  color: 0x2ec27e,
  wireframe: false,
  side: THREE.DoubleSide,
})

const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial)
scene.add(planeMesh)
planeMesh.position.x = -2 */

// Stars
const starsGeometry = new THREE.PlaneGeometry(1, 1)
const starsTexture = textureLoader.load(starsUrl)
starsTexture.wrapS = THREE.RepeatWrapping
starsTexture.wrapT = THREE.RepeatWrapping

// Lights
const ambientLight = new THREE.AmbientLight('#5b4269', 1)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight('#fff', 0.8)
directionalLight.position.set(3, 3, 3)
directionalLight.castShadow = true
scene.add(directionalLight)

const pointLight = new THREE.PointLight('#f29b05', 0.8, 10)
pointLight.position.set(0, -1.3, 0)
pointLight.castShadow = true
scene.add(pointLight)

const rectLight = new THREE.RectAreaLight('#5b4269', 1, 10, 10)
rectLight.position.set(-4.5, -0.8, 0)
rectLight.lookAt(rocketGroup.position)
scene.add(rectLight)

// Stars
const starsMaterial = new THREE.MeshBasicMaterial({
  map: starsTexture,
  transparent: true,
})
const starsMesh = new THREE.Mesh(starsGeometry, starsMaterial)
scene.add(starsMesh)
starsMesh.scale.set(8, 8, 8)
starsMesh.position.z = -3

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
}

window.addEventListener('resize', () => {
  // Update sizes
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  // Update camera
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()

  // Update renderer
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100,
)
camera.position.z = 3
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: true,
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor('#312f4c')

// Animate
const clock = new THREE.Clock()

const spriteParams = {
  framesPerSecond: 9,
}

/** The time between switching frames of the flame animation in seconds. */
let showNewFrame = 1 / spriteParams.framesPerSecond

gui.add(spriteParams, 'framesPerSecond', 1, 30, 1).onChange((v: number) => {
  showNewFrame = 1 / v
})

let flameTimeTracker = 0

const baseRotationSpeed = 1

const tick = () => {
  stats.begin()
  // `clock.getDelta()` will return the seconds passed since the last call (in this case).
  const deltaTime = clock.getDelta()

  flameTimeTracker += deltaTime

  if (flameTimeTracker >= showNewFrame) {
    flameTimeTracker = 0
    spriteTexture.offset.x += 0.25
  }

  starsTexture.offset.y += (spriteParams.framesPerSecond / 9) * deltaTime

  if (rocketGroup.rotation.y >= 2 * Math.PI) rocketGroup.rotation.y = 0
  rocketGroup.rotation.y +=
    baseRotationSpeed * Math.PI * deltaTime * (spriteParams.framesPerSecond / 9)

  // Update controls
  controls.update()

  // Render
  renderer.render(scene, camera)

  stats.end()
  // Call tick again on the next frame
  window.requestAnimationFrame(tick)
}

tick()
