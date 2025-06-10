const PI = Math.PI;
const _settings = {
  // 3D model:
  GLTFModelURL: "assets/earringsSimple.glb",

  // lighting:
  // envmapURL: "assets/venice_sunset_512.hdr",
  envmapURL: "assets/blue_photo_studio_2k.hdr",
  pointLightIntensity: 0.9,
  pointLightY: 20, // larger -> move the pointLight to the top
  hemiLightIntensity: 0.9,

  // bloom (set to null to disable):
  bloom: {
    threshold: 0.78, //0.99,
    strength: 3.13,
    radius: 1,
  },

  // temporal anti aliasing. Number of samples. 0 -> disabled:
  taaLevel: 3,

  // occluder parameters:
  earsOccluderCylinderRadius: 2,
  earsOccluderCylinderHeight: 0.5, // height of the cylinder, so depth in fact
  earsOccluderCylinderOffset: [0, 1, 0], // +Y -> pull up
  earsOccluderCylinderEuler: [0, PI / 6, PI / 2, "XYZ"],

  // debug flags:
  debugCube: false,
  debugOccluder: false, // set to true to tune earsOccluderCylinder* settings
};

const _canvases = {
  face: null,
  three: null,
};

let _three = null;

let currentEarring = 0;

// const products = [
// {
//   id:0,
//   name: "Earring 1",
//   imageurl: "assets/previews/earring_0.jpg",
//   modelurl: "assets/earringsSimple_0.glb",
//   price: 10.99,
// }
// ];

function SetModelVisibility(model, visible) {
  if (model) {
    model.visible = visible;
    // console.log(`Visible: ${visible}`);
  }
}

function HideAllModels() {
  if (_three) {
    // Unload previous model from right ear
    if (_three.earringRight.children.length > 0) {
      _three.earringRight.children.forEach((model) =>
        SetModelVisibility(model, false)
      );
    }
    // Unload previous model from left ear
    if (_three.earringLeft.children.length > 0) {
      _three.earringLeft.children.forEach((model) =>
        SetModelVisibility(model, false)
      );
    }
  }
}

function NextEarring() {
  currentEarring++;
  if (currentEarring >= 2) {
    currentEarring = 0;
  }
  console.log("Current Earring: " + currentEarring);

  // Update the 3D model when changing earrings
  if (_settings.GLTFModelURL && _three) {
    HideAllModels();
    let modelURL = `assets/earringsSimple_${currentEarring}.glb`;
    load_GLTF(modelURL, true, true);
  }
}

function PreviousEarring() {
  currentEarring--;
  if (currentEarring < 0) {
    currentEarring = 1;
  }
  console.log("Current Earring: " + currentEarring);

  // Update the 3D model when changing earrings
  if (_settings.GLTFModelURL && _three) {
    HideAllModels();
    let modelURL = `assets/earringsSimple_${currentEarring}.glb`;
    load_GLTF(modelURL, true, true);
  }
}

function SelectModel(index) {
  // Remove selected class from all product cards
  document.querySelectorAll('.product-card').forEach(card => {
    card.style.border = '2px solid #e5e7eb';
    card.style.backgroundColor = 'transparent';
    card.style.boxShadow = 'none';
  });
  
  // Add selected class to the clicked card
  const selectedCard = document.querySelector(`.product-card[data-earring="${index}"]`);
  if (selectedCard) {
    selectedCard.style.border = '2px solid #ca8a04'; // Yellow-600
    selectedCard.style.backgroundColor = '#fefce8'; // Yellow-50
    selectedCard.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1)'; // shadow-lg
  }
  
  currentEarring = index;
  console.log(`Selected model: ${index}`);
  
  // Update the 3D model when changing earrings
  if (_settings.GLTFModelURL && _three) {
    HideAllModels();
    let modelURL = `assets/earringsSimple_${currentEarring}.glb`;
    load_GLTF(modelURL, true, true);
  }
}

// Initialize the first model as selected when the page loads
function initializeFirstModel() {
  if (_settings.GLTFModelURL && _three) {
    SelectModel(0); // Select the first model by default
  }
}

function start() {
  // Initialize the UI elements
  // initializeUI();
  startCamera();
}

function initializeUI() {
  // Add click handler to the start camera button
  const startButton = document.querySelector('.btn-primary');
  if (startButton) {
    startButton.addEventListener('click', startCamera);
  }
}

function startCamera() {  
  // Init WebAR.rocks.face through the earrings 3D helper:
  WebARRocksFaceEarrings3DHelper.init({
    NN: "../../neuralNets/NN_EARS_4.json",
    taaLevel: _settings.taaLevel,
    canvasFace: _canvases.face,
    canvasThree: _canvases.three,
    debugOccluder: _settings.debugOccluder,
  })
    .then(function (three) {
      _three = three;
      if (_settings.debugCube) {
        const debugCubeMesh = new THREE.Mesh(
          new THREE.BoxGeometry(2, 2, 2),
          new THREE.MeshNormalMaterial()
        );
        _three.earringRight.add(debugCubeMesh);
        _three.earringLeft.add(debugCubeMesh.clone());
      }

      // improve WebGLRenderer settings:
      _three.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      _three.renderer.outputEncoding = THREE.sRGBEncoding;

      set_postprocessing();
      set_lighting();
      set_occluders();
      
      // Initialize the first model
      initializeFirstModel();

      if (check_isAppleCrap()) {
        WebARRocksFaceEarrings3DHelper.resize(
          _canvases.three.width,
          _canvases.three.height - 0.001
        );
      }
    })
    .catch(function (err) {     
      throw new Error(err);
    });
}

// return true if IOS:
function check_isAppleCrap() {
  return (
    /iPad|iPhone|iPod/.test(navigator.platform) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function set_postprocessing() {
  // bloom:
  if (_settings.bloom) {
    // see https://threejs.org/examples/#webgl_postprocessing_unreal_bloom
    // create the bloom postprocessing pass:
    const bloom = _settings.bloom;
    const rendererSize = new THREE.Vector2();
    _three.renderer.getSize(rendererSize);
    const bloomPass = new THREE.UnrealBloomPass(
      rendererSize,
      bloom.strength,
      bloom.radius,
      bloom.threshold
    );

    _three.composer.addPass(bloomPass);
  }
}

function set_lighting() {
  if (_settings.envmapURL) {
    // image based lighting:
    const pmremGenerator = new THREE.PMREMGenerator(_three.renderer);
    pmremGenerator.compileEquirectangularShader();

    new THREE.RGBELoader()
      .setDataType(THREE.HalfFloatType)
      .load(_settings.envmapURL, function (texture) {
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        pmremGenerator.dispose();
        _three.scene.environment = envMap;
      });
  }

  // simple lighting:
  //  We add a soft light. Should not be necessary if we use an envmap:
  if (_settings.hemiLightIntensity > 0) {
    const hemiLight = new THREE.HemisphereLight(
      0xffffff,
      0x000000,
      _settings.hemiLightIntensity
    );
    _three.scene.add(hemiLight);
  }

  // add a pointLight to highlight specular lighting:
  if (_settings.pointLightIntensity > 0) {
    const pointLight = new THREE.PointLight(
      0xffffff,
      _settings.pointLightIntensity
    );
    pointLight.position.set(0, _settings.pointLightY, 0);
    _three.scene.add(pointLight);
  }
}

function load_GLTF(modelURL, isRight, isLeft) {
  new THREE.GLTFLoader().load(modelURL, function (gltf) {
    const model = gltf.scene;
    model.scale.multiplyScalar(100); // because the model is exported in meters. convert it to cm
    set_shinyMetal(model);

    const existingRightEarringModel = _three.earringRight.children.find(
      (child) => child.uuid === model.uuid
    );
    if (existingRightEarringModel) {
      SetModelVisibility(existingRightEarringModel, true);
    } else {
      _three.earringRight.add(model);
    }

    const existingLeftEarringModel = _three.earringLeft.children.find(
      (child) => child.uuid === model.uuid
    );
    if (existingLeftEarringModel) {
      SetModelVisibility(existingLeftEarringModel, true);
    } else {
      _three.earringLeft.add(model.clone());
    }

    console.log(`Count: ${_three.earringRight.children.length}`);
  });
}

function set_shinyMetal(model) {
  model.traverse(function (threeStuff) {
    if (!threeStuff.isMesh) {
      return;
    }
    const mat = threeStuff.material;
    mat.roughness = 0.0;
    mat.metalness = 1.0;
    mat.refractionRatio = 1.0;
  });
}

function set_occluders() {
  const occluderRightGeom = new THREE.CylinderGeometry(
    _settings.earsOccluderCylinderRadius,
    _settings.earsOccluderCylinderRadius,
    _settings.earsOccluderCylinderHeight
  );
  const matrix = new THREE.Matrix4().makeRotationFromEuler(
    new THREE.Euler().fromArray(_settings.earsOccluderCylinderEuler)
  );
  matrix.setPosition(
    new THREE.Vector3().fromArray(_settings.earsOccluderCylinderOffset)
  );
  occluderRightGeom.applyMatrix4(matrix);
  WebARRocksFaceEarrings3DHelper.add_threeEarsOccluders(occluderRightGeom);
}

function main() {
  // get the 2 canvas from the DOM:
  _canvases.face = document.getElementById("WebARRocksFaceCanvas");
  _canvases.three = document.getElementById("threeCanvas");

  // Initialize card click handlers
  initializeCardClickHandlers();

  // Set the canvas to fullscreen
  // and add an event handler to capture window resize:
  WebARRocksResizer.size_canvas({
    isFullScreen: true,
    canvas: _canvases.face, // WebARRocksFace main canvas
    overlayCanvas: [_canvases.three], // other canvas which should be resized at the same size of the main canvas
    callback: start,
    onResize: WebARRocksFaceEarrings3DHelper.resize,
  });
}

function initializeCardClickHandlers() {
  const cards = document.querySelectorAll(".card");
  cards.forEach((card) => {
    card.addEventListener("click", function () {
      const earringIndex = parseInt(this.getAttribute("data-earring"));
      SelectModel(earringIndex);
    });
  });
}

// Smooth scroll function
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
    // Close mobile menu if open
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu && mobileMenu.classList.contains('hidden') === false) {
      mobileMenu.classList.add('hidden');
    }
  }
}

// Check for hash in URL and scroll to section on page load
window.addEventListener('load', function() {
  const hash = window.location.hash;
  if (hash) {
    // Remove the # from the hash
    const sectionId = hash.substring(1);
    // Small delay to ensure all content is loaded
    setTimeout(() => {
      scrollToSection(sectionId);
    }, 100);
  }
});

window.addEventListener("load", main);
