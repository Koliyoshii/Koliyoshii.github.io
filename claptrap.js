import * as THREE from "./build/three.module.js";
import { GLTFLoader } from "./GLTFLoader.js";
import { ARButton } from "./ARButton.js";

let gTire, gArm, gBody, gltfScene, renderer, light, camera, scene, mesh;
let claptraps = [];
let container;
let findTarget;
let hitTestSource = null;
let hitTestSourceRequested = false;
let controller;

//Settings for Claptrap Animation
let kmh = 0.05; //set pace
let direction = new THREE.Vector3();
let delta;
var clock = new THREE.Clock();
let shift = new THREE.Vector3();

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
  //camera.matrixAutoUpdate = false;
  //camera.position.set(0, 8, 30);

  // add fog
  const fog = new THREE.Fog("gray", 1, 90);
  scene.fog = fog;

  // LIGHTS
  // directional lighting
  let color = 0xffffff;
  let intensity = 0.7;
  light = new THREE.DirectionalLight(color, intensity);
  light.position.set(0, 30, 30);
  scene.add(light);
  // ambient lighting
  let ambientColor = 0xaaaaff;
  let ambientIntensity = 0.2;
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
      //save the scene in a global Variable to use it later for cloning
      gltfScene = gltf.scene;
      gltfScene.scale.set(0.1, 0.1, 0.1); //scale 3D model
      gltfScene.add(positionalSound); //add positional Sound to scene

      gBody = gltfScene.getObjectByName("Body");
      gArm = gltfScene.getObjectByName("Arme");
      gTire = gltfScene.getObjectByName("Reifen");
    }
  );

  //Implement sound
  // create an AudioListener and add it to the camera
  const listener = new THREE.AudioListener();
  camera.add(listener);

  // create a global audio source
  const sound = new THREE.Audio(listener);

  // create the PositionalAudio object (passing in the listener)
  const positionalSound = new THREE.PositionalAudio(listener);

  // load a sound and set it as the PositionalAudio object's buffer
  const positionalAudioLoader = new THREE.AudioLoader();
  positionalAudioLoader.load("sounds/ende.wav", function (buffer) {
    positionalSound.setBuffer(buffer);
    positionalSound.setRefDistance(0.05);
    positionalSound.setLoop(true);
    positionalSound.play(0);
  });

  //Add controller
  //Code from WebXR Examples Hit-Test.
  //https://github.com/mrdoob/three.js/blob/master/examples/webxr_ar_hittest.html
  controller = renderer.xr.getController(0);
  controller.addEventListener("select", onSelect);
  //controller.addEventListener("select", setRandomPosition, false);
  scene.add(controller);

  //Add TargetHitter
  findTarget = new THREE.Mesh(
    new THREE.RingGeometry(0.03, 0.04, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial()
  );
  findTarget.matrixAutoUpdate = false;
  findTarget.visible = false;
  scene.add(findTarget);

  window.addEventListener("resize", onWindowResize);
} //end function init()

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

//Function to clone GLTFScene and spawn claptrap
function onSelect() {
  if (findTarget.visible) {
    //Clone the scene from GLTF Loader
    let newClaptrapScene = gltfScene.clone();
    //Save the scene in an array
    claptraps.push[newClaptrapScene];
    //give the new Scene the position of findTarget (the ring for target Hitter)
    newClaptrapScene.position.setFromMatrixPosition(findTarget.matrix);
    scene.add(claptraps[claptraps.length - 1]);
  }
} //end function onSelect

//Function to generate random direction vector for claptrap movement
//not implemented yet, because animation code for the movement does crash the app
function setRandomPosition() {
  direction = (Math.random() * 2 - 1, 0, Math.random() * 2 - 1);
  console.log(direction);
}

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

  //Animation for Claptrap Body
  //Quelle Code: https://jsfiddle.net/prisoner849/qqoouo2w/
  //noch fehlerhaft, Fehlermeldung in Zeile 200 setRandomPosition
  if (gltfScene) {
    //this code does not work yet. Error in setRandomPosition function
    // delta = clock.getDelta();
    // shift.copy(direction).multiplyScalar(delta * kmh);
    // gClaptrapModel.position.add(shift);
    //gClaptrapModel.translateZ(10); Frage: Richtung, in die Claptrap guckt anpassen
  }

  //Rotation of the tire
  var tireRotationSpeed = 0.1;
  if (gTire) {
    gTire.rotation.x += tireRotationSpeed;
  }

  //Arm movement
  var armMovementSpeed = 0.003;
  if (gArm) {
    //Die Date.now() Methode gibt die Anzahl der Millisekunden,
    //die seit dem 01.01.1970 00:00:00 UTC vergangen sind zurück.
    //Math.PI * 0.5 um 180 Grad einzuschränken
    gArm.rotation.x = Math.sin(Date.now() * armMovementSpeed) * Math.PI * 0.5;
  }

  //Code from WebXR Examples Hit-Test.
  //Functionality of detecting surface and place objects with a circle as a Finder
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
