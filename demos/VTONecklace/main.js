let isInitialized = false;
let currentNecklace = 0; // Track current necklace index

function SelectNecklace(index) {
  // Remove selected class from all product cards
  document.querySelectorAll('.product-card').forEach(card => {
    card.style.border = '2px solid #e5e7eb';
    card.style.backgroundColor = 'transparent';
    card.style.boxShadow = 'none';
  });
  
  // Add selected class to the clicked card
  const selectedCard = document.querySelector(`.product-card[data-necklace="${index}"]`);
  if (selectedCard) {
    selectedCard.style.border = '2px solid #ca8a04'; // Yellow-600
    selectedCard.style.backgroundColor = '#fefce8'; // Yellow-50
    selectedCard.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1)'; // shadow-lg
  }
  
  currentNecklace = index;
  console.log(`Selected necklace: ${index}`);
  
  // Update the 3D model when changing necklaces
  if (isInitialized) {
    const modelURL = `assets/models3D/necklace_${String(index).padStart(2, '0')}.glb`;
    WebARRocksMirror.load(modelURL);
  }
}

async function reinitializeWebARRocksMirror() {
  try {
    // First destroy the existing instance if it's initialized
    if (isInitialized) {
      await WebARRocksMirror.destroy();
      isInitialized = false;
    }

    // Now initialize again
    await initializeWebARRocksMirror();
  } catch (error) {
    console.error("Error during reinitialization:", error);
  }
}

async function initializeWebARRocksMirror() {
  // get the 2 canvas from the DOM:
  const canvasFace = document.getElementById("WebARRocksFaceCanvas");
  const canvasThree = document.getElementById("threeCanvas");

  try {
    await WebARRocksMirror.init({
      isGlasses: false,

      //videoURL: '../../../../testVideos/1056010826-hd.mp4', // use a video from a file instead of camera video

      specWebARRocksFace: {
        NNCPath: "../../neuralNets/NN_NECKLACE_9.json",
        scanSettings: {
          threshold: 0.7,
        },
      },

      // increase stabilization:
      landmarksStabilizerSpec: {
        beta: 5,
        forceFilterNNInputPxRange: [8, 16], // for NN_NECKLACE_9
        //forceFilterNNInputPxRange: [4, 12] // for NN_NECKLACE_8
      },

      solvePnPObjPointsPositions: {
        // indices of the points are given as comments.
        // Open dev/torso.blend to get point positions

        torsoNeckCenterUp: [0.000006, -78.16777, 33.542694], // ind: 4,
        torsoNeckCenterDown: [0.000004, -112.370636, 44.173981], // ind: 5,

        torsoNeckLeftUp: [77.729225, -1.220459, -42.653336], // ind: 41,
        torsoNeckLeftDown: [130.661072, -11.937241, -44.70636], // ind: 117,
        torsoNeckRightUp: [-77.898209, -1.191437, -42.648613], // ind: 14,
        torsoNeckRightDown: [-130.661041, -11.937241, -44.70636], // ind: 112,

        torsoNeckBackUp: [-0.040026, -11.528961, -99.635696], // ind: 218,
        torsoNeckBackDown: [0.000007, -47.934677, -127.748184], // ind: 2
      },
      solvePnPImgPointsLabels: [
        "torsoNeckCenterUp",
        "torsoNeckLeftUp",
        "torsoNeckRightUp",
        "torsoNeckBackUp",
        "torsoNeckCenterDown",
        //"torsoNeckLeftDown",
        //"torsoNeckRightDown",
        "torsoNeckBackDown",
      ],

      canvasFace: canvasFace,
      canvasThree: canvasThree,

      // initial canvas dimensions:
      width: window.innerWidth,
      height: window.innerHeight,

      // The occluder is a placeholder for the head. It is rendered with a transparent color
      // (only the depth buffer is updated).
      occluderURL: "assets/models3D/occluder.glb",
      modelURL: `assets/models3D/necklace_${String(currentNecklace).padStart(2, '0')}.glb`, // Use currentNecklace index
      // envmapURL: "assets/envmaps/venice_sunset_1k.hdr",
      envmapURL: "assets/envmaps/blue_photo_studio_2k.hdr",

      // lighting:
      pointLightIntensity: 0.73, //intensity of the point light. Set to 0 to disable
      pointLightY: 30, // larger -> move the pointLight to the top
      hemiLightIntensity: 0, // intensity of the hemispheric light. Set to 0 to disable (not really useful if we use an envmap)    
      // bloom (set to null to disable):
      bloom: {
        threshold: 0.85, //0.99,
        strength: 0.3,
        radius: 0.5,
      },
      // temporal anti aliasing - Number of samples. 0 -> disabled:
      taaLevel: 3,

      rotationContraints: {
        order: "YXZ",
        rotXFactor: 1,
        rotYFactor: 0.3,
        rotZFactor: 0.5,
      },

      // debug flags - all should be false for production:
      debugLandmarks: false,
      debugOccluder: false,
    });

    isInitialized = true;
    console.log("WebARRocksMirror initialized successfully");

    // display controls:
    document.getElementById("controls").style.display = "flex";

    // handle orientation change or window resizing:
    const resizeCallback = function () {
      WebARRocksMirror.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("orientationchange", resizeCallback);
    window.addEventListener("resize", resizeCallback);
    SelectNecklace(0);
  } catch (error) {
    isInitialized = false;
    console.error("Initialization error:", error);
  }
}

// Modified main function
async function main() {
  await reinitializeWebARRocksMirror();
}

// You can call this function whenever you need to reinitialize
function handleReinitialize() {
  reinitializeWebARRocksMirror();
}

// this function is executed when the user clicks on CAPTURE IMAGE button
// it opens the captured image in a new tab:
function capture_image() {
  WebARRocksMirror.capture_image(function (cv) {
    const dataURL = cv.toDataURL("image/png");
    const img = new Image();
    img.src = dataURL;
    img.onload = function () {
      const win = window.open("");
      win.document.write(img.outerHTML);
    };
  });
}

window.addEventListener("load", main);
