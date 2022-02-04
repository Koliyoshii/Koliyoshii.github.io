import * as THREE from "./build/three.module.js";
import { GLTFLoader } from "./GLTFLoader.js";
import { ARButton } from "./ARButton.js";

let gltfScene, landscape, renderer, light, camera, scene;
let claptraps = [];
let container;
let findTarget;
let hitTestSource = null;
let hitTestSourceRequested = false;
let controller;

init();
animate();

function init() {
  // create container
  container = document.createElement("div");
  document.body.appendChild(container);

  // create the scene
  scene = new THREE.Scene();

  // create and set the camera
  const angleOfView = 55;
  const aspectRatio = window.innerWidth / window.innerHeight;
  const nearPlane = 0.1;
  const farPlane = 1000;
  camera = new THREE.PerspectiveCamera(
    angleOfView,
    aspectRatio,
    nearPlane,
    farPlane
  );

  // LIGHTS
  // directional lighting
  const color = 0xffffff;
  const intensity = 0.7;
  light = new THREE.DirectionalLight(color, intensity);
  light.position.set(0, 30, 30);
  scene.add(light);
  // ambient lighting
  const ambientColor = 0xaaaaff;
  const ambientIntensity = 0.2;
  const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
  scene.add(ambientLight);

  // create renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.autoClear = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  //Create AR Button
  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
  );

  // GEOMETRY gltf Loader
  const gltfLoader = new GLTFLoader();
  gltfLoader.load(
    // resource URL
    "./claptrap.gltf",
    // called when the resource is loaded
    function (gltf) {
      //Save the GLTF Scene in a global variable for cloning later
      gltfScene = gltf.scene;
      //Scale claptrap to 0.1. This value gives proper size for the claptrap in a small sized room.
      gltfScene.scale.set(0.1, 0.1, 0.1);
      //gltfScene.children[0].children[0].rotation.x = -Math.PI / 2;
      console.log(gltfScene);
    }
  );

  // create an AudioListener and add it to the camera
  const listener = new THREE.AudioListener();
  camera.add(listener);

  // create a global audio source
  const sound = new THREE.Audio(listener);

  // load a sound and set it as the Audio object's buffer
  const audioLoader = new THREE.AudioLoader();
  audioLoader.load("sounds/ende.wav", function (buffer) {
    sound.setBuffer(buffer);
    sound.setLoop(true);
    sound.setVolume(0.5);
    sound.play();
  });

  //Add controller
  //Code from WebXR Examples Hit-Test.
  //https://github.com/mrdoob/three.js/blob/master/examples/webxr_ar_hittest.html
  controller = renderer.xr.getController(0);
  controller.addEventListener("select", onSelect);
  //controller.addEventListener("select", setRandomPosition, false);
  scene.add(controller);

  //Add TargetHitter Mesh to Scene
  findTarget = new THREE.Mesh(
    new THREE.RingGeometry(0.03, 0.04, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial()
  );
  findTarget.matrixAutoUpdate = false;
  findTarget.visible = false;
  scene.add(findTarget);

  window.addEventListener("resize", onWindowResize);
} //end function init()

//Function to Resize Display
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
} //end function onWindowResize()

//Function to spawn claptrap
function onSelect() {
  if (findTarget.visible) {
    let newClaptrapScene = gltfScene.clone();
    claptraps.push(newClaptrapScene);
    newClaptrapScene.position.setFromMatrixPosition(findTarget.matrix);
    scene.add(claptraps[claptraps.length - 1]);
  }
} //end function onSelect()

function animate() {
  renderer.setAnimationLoop(draw);
} //end function animate()

// DRAW
function draw(time, frame) {
  time *= 0.001; //convert time to seconds

  //Resize Display Size and update Projection Matrix
  if (resizeDisplay) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  //Rotation of the tire
  var tireRotationSpeed = 0.1;
  //check if claptraps objects exist in the claptraps[] array
  if (claptraps.length > 0) {
    claptraps.forEach((element) => {
      //For each claptrap, get the Tire components and rotate them
      element.children[0].children[7].rotation.x += tireRotationSpeed; //"Reifen" is children Nr. 7
    });
  }

  //Arm movement
  var armMovementSpeed = 0.003;
  //check if claptraps objects exist in the claptraps[] array
  if (claptraps.length > 0) {
    //For each claptrap, get the Arm components and rotate them
    claptraps.forEach((element) => {
      element.children[0].children[0].rotation.x =
        Math.sin(Date.now() * armMovementSpeed) * Math.PI * 0.3;
    });
  }

  //Functionality of detecting surface and place objects with a circle as a Finder
  //Code from WebXR Examples Hit-Test.
  //https://github.com/mrdoob/three.js/blob/master/examples/webxr_ar_hittest.html
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();
    if (hitTestSourceRequested === false) {
      session.requestReferenceSpace("viewer").then(function (referenceSpace) {
        session
          .requestHitTestSource({ space: referenceSpace })
          .then(function (source) {
            hitTestSource = source;
          });
      });

      session.addEventListener("end", function () {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });
      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length) {
        const hit = hitTestResults[0];
        findTarget.visible = true;
        findTarget.matrix.fromArray(
          hit.getPose(referenceSpace).transform.matrix
        );
      } else {
        findTarget.visible = false;
      }
    }
  } //end if frame

  //Render scene
  renderer.render(scene, camera);
} //end function draw

// UPDATE RESIZE
function resizeDisplay() {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width != width || canvas.height != height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
} //end function resizeDisplay
