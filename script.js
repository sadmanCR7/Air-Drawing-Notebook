const videoElement = document.querySelector('.input_video');
const canvasElement = document.querySelector('.output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const drawCanvas = document.querySelector('.draw_canvas');
const drawCtx = drawCanvas.getContext('2d');
const statusText = document.getElementById('status');

// Drawing state variables
let isDrawing = false;
let isShiftPressed = false;
let lastX = 0;
let lastY = 0;
let canvasesInitialized = false;

// The glowing yellow/gold color from your screenshot
const neonGold = '#FFE87C'; 

// Keyboard Event Listeners
window.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') {
        isShiftPressed = true;
    }
    if (e.code === 'Space') {
        e.preventDefault(); 
        clearCanvas();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') {
        isShiftPressed = false;
        isDrawing = false; // Stop drawing line when shift is released
    }
});

function clearCanvas() {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
}

function onResults(results) {
    if (statusText) statusText.style.display = 'none'; // Hide text once camera works

    // Dynamically set canvas internal resolution to perfectly match the webcam on the first frame
    if (!canvasesInitialized && results.image.width > 0) {
        canvasElement.width = results.image.width;
        canvasElement.height = results.image.height;
        drawCanvas.width = results.image.width;
        drawCanvas.height = results.image.height;
        
        // Setup drawing styles for the GLOWING NEON line
        drawCtx.strokeStyle = neonGold; 
        drawCtx.lineWidth = 6;
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.shadowBlur = 15; // Adds the glow effect seen in your picture
        drawCtx.shadowColor = neonGold; // Color of the glow
        
        canvasesInitialized = true;
    }

    if (!canvasesInitialized) return; // Wait until ready

    // Draw the video frame
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // ---> HAND SKELETON DESIGN <---
        // 1. Thin, gold lines connecting the joints
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: neonGold, lineWidth: 1});
        // 2. Small, white dots on the joints
        drawLandmarks(canvasCtx, landmarks, {color: '#FFFFFF', lineWidth: 1, radius: 2});

        // Get coordinates of Index Finger Tip (Landmark 8)
        const indexTip = landmarks[8];
        const ix = indexTip.x * canvasElement.width;
        const iy = indexTip.y * canvasElement.height;

        // Drawing Logic controlled by the Shift key
        if (isShiftPressed) {
            if (!isDrawing) {
                isDrawing = true;
                lastX = ix;
                lastY = iy;
            } else {
                drawCtx.beginPath();
                drawCtx.moveTo(lastX, lastY);
                drawCtx.lineTo(ix, iy);
                drawCtx.stroke();
                lastX = ix;
                lastY = iy;
            }
        } else {
            isDrawing = false;
        }
    } else {
        isDrawing = false; 
    }
    
    canvasCtx.restore();
}

// Initialize MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults(onResults);

// Initialize WebCam
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 1280,
    height: 720
});

camera.start()
    .then(() => console.log("Camera started successfully."))
    .catch((err) => console.error("Camera Error:", err));