const videoElement = document.querySelector('.input_video');
const canvasElement = document.querySelector('.output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const drawCanvas = document.querySelector('.draw_canvas');
const drawCtx = drawCanvas.getContext('2d');
const statusText = document.getElementById('status');

// Mobile Buttons
const drawToggleBtn = document.getElementById('drawToggleBtn');
const clearBtn = document.getElementById('clearBtn');

// Drawing state variables
let isDrawing = false;
let isDrawingMode = false; // This replaces `isShiftPressed` to work for BOTH keyboard and touch
let lastX = 0;
let lastY = 0;
let canvasesInitialized = false;

const neonGold = '#FFE87C'; 

// --- CONTROLS LOGIC (Keyboard & Touch) ---

function toggleDrawMode(forceState = null) {
    if (forceState !== null) {
        isDrawingMode = forceState;
    } else {
        isDrawingMode = !isDrawingMode; // Toggle on mobile tap
    }

    if (isDrawingMode) {
        drawToggleBtn.innerText = "Draw: ON";
        drawToggleBtn.classList.add('active-btn');
    } else {
        drawToggleBtn.innerText = "Draw: OFF";
        drawToggleBtn.classList.remove('active-btn');
        isDrawing = false; // Break the current line
    }
}

// Mobile Button Listeners
const saveBtn = document.getElementById('saveBtn'); // <--- ADD THIS

drawToggleBtn.addEventListener('click', () => toggleDrawMode());
clearBtn.addEventListener('click', () => drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height));

// --- NEW: SAVE PICTURE LOGIC ---
saveBtn.addEventListener('click', () => {
    // 1. Create a temporary hidden canvas
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // 2. Set it to the exact size of our video feed
    tempCanvas.width = canvasElement.width;
    tempCanvas.height = canvasElement.height;
    
    // 3. Flip it horizontally! (Because our CSS mirrors the screen, we must mirror the saved file so text isn't backwards)
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);
    
    // 4. Draw the camera & skeleton layer first
    tempCtx.drawImage(canvasElement, 0, 0);
    
    // 5. Draw the neon drawing layer on top
    tempCtx.drawImage(drawCanvas, 0, 0);
    
    // 6. Convert the merged canvas to an image file
    const dataURL = tempCanvas.toDataURL('image/png');
    
    // 7. Create a fake link to trigger the download
    const link = document.createElement('a');
    link.download = 'Air-Drawing-' + Math.floor(Date.now() / 1000) + '.png'; // Gives a unique file name
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Desktop Keyboard Listeners
window.addEventListener('keydown', (e) => {
    if (e.key === 'Shift' && !isDrawingMode) toggleDrawMode(true);
    if (e.code === 'Space') {
        e.preventDefault(); 
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') toggleDrawMode(false);
});

// --- COMPUTER VISION LOGIC ---

function onResults(results) {
    if (statusText) statusText.style.display = 'none';

    // Dynamically set canvas internal resolution
    if (!canvasesInitialized && results.image.width > 0) {
        canvasElement.width = results.image.width;
        canvasElement.height = results.image.height;
        drawCanvas.width = results.image.width;
        drawCanvas.height = results.image.height;
        
        drawCtx.strokeStyle = neonGold; 
        drawCtx.lineWidth = 6;
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.shadowBlur = 15; 
        drawCtx.shadowColor = neonGold; 
        
        canvasesInitialized = true;
    }

    if (!canvasesInitialized) return; 

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Hand Skeleton Design
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: neonGold, lineWidth: 1});
        drawLandmarks(canvasCtx, landmarks, {color: '#FFFFFF', lineWidth: 1, radius: 2});

        const indexTip = landmarks[8];
        const ix = indexTip.x * canvasElement.width;
        const iy = indexTip.y * canvasElement.height;

        // Drawing Logic
        if (isDrawingMode) {
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

// Initialize WebCam (Added facingMode for mobile selfie camera)
const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({image: videoElement});
    },
    width: 1280,
    height: 720,
    facingMode: 'user' 
});

camera.start()
    .then(() => console.log("Camera started successfully."))
    .catch((err) => console.error("Camera Error:", err));