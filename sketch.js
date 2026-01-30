// Pi Pendulum Port to p5.js
// Based on the simplified Python version

let trailLayer;

// Pendulum Parameters
let theta = 0.0;
let dtheta = 0.0037;
let iterPerFrame = 45;
let scaleFactor; // Will be calculated based on screen size

// Visuals
let tailBrightness = 1.6;
let timeSpeed = 1.0;
let globalFadeAlpha = 10;
let disableHue = false;
let invertColors = false;
let permanentTrail = false;
let paused = false;
let showControls = true;
let useGlow = true;

function setup() {
    createCanvas(windowWidth, windowHeight);

    // Create an off-screen graphics buffer for the trail (so we can clear the main screen for arms)
    trailLayer = createGraphics(windowWidth, windowHeight);
    trailLayer.colorMode(RGB);
    trailLayer.clear(); // Transparent start

    // Calculate scale to fit the pattern on screen
    // The pattern range is roughly -2 to +2. So total width is 4 units.
    // We want some padding, so let's say minimal dimension / 5
    scaleFactor = min(width, height) / 5;

    textFont('Arial');
}


function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    // Re-create trail layer on resize to match new dims (clears trail, unavoidable without complex logic)
    trailLayer = createGraphics(windowWidth, windowHeight);
    scaleFactor = min(width, height) / 5;
}

function draw() {
    background(0); // Clear main screen every frame

    let cx = width / 2;
    let cy = height / 2;
    let nowTime = millis();

    // 1. Update Physics & Draw to Trail Layer
    if (!paused) {
        if (!permanentTrail) {
            // Fade out the trail layer
            trailLayer.noStroke();
            trailLayer.fill(0, globalFadeAlpha);
            trailLayer.rect(0, 0, width, height);
        }

        // Initialize previous position before loop
        let startA1 = theta;
        let startA2 = PI * theta;
        let pTipX = cos(startA1) + cos(startA2);
        let pTipY = sin(startA1) + sin(startA2);
        let prevSx = cx + pTipX * scaleFactor;
        let prevSy = cy + pTipY * scaleFactor;

        // Run multiple iterations based on speed to ensure smooth curves
        // We keep the step size (dtheta) constant so the resolution doesn't drop at high speeds
        let totalSteps = ceil(iterPerFrame * timeSpeed);

        for (let i = 0; i < totalSteps; i++) {
            theta += dtheta; // Constant step size physics

            // Calculate Tip Position (Normalized)
            let a1 = theta;
            let a2 = PI * theta;
            let tipX_norm = cos(a1) + cos(a2);
            let tipY_norm = sin(a1) + sin(a2);

            // Scale to Screen
            let sx = cx + tipX_norm * scaleFactor;
            let sy = cy + tipY_norm * scaleFactor;

            // Calculate Color
            let col = getRainbowColor(nowTime, i);
            if (disableHue) col = color(255);
            if (invertColors) {
                col = color(255 - red(col), 255 - green(col), 255 - blue(col));
            }

            // Draw Line Segment on Trail Layer
            drawLineAdditive(trailLayer, prevSx, prevSy, sx, sy, col);

            // Update previous for next step
            prevSx = sx;
            prevSy = sy;
        }
    }

    // 2. Draw Trail Layer to Main Screen
    // Blend mode ADD makes the colors glow when they stack
    blendMode(ADD);
    image(trailLayer, 0, 0);
    blendMode(BLEND); // Reset for arms/text

    // 3. Draw Pendulum Arms (Geometry)
    // Recalculate positions for the current instant (end of loop) to draw the arms
    // Since we looped 'iterPerFrame' times, theta is now at the latest position.

    let a1 = theta;
    // Arm 1 Tip / Joint Position
    // Arm 1 is vector (cos(a1), sin(a1))
    let jointX = cx + cos(a1) * scaleFactor;
    let jointY = cy + sin(a1) * scaleFactor;

    let a2 = PI * theta;
    // Arm 2 is relative to Arm 1, vector (cos(a2), sin(a2))
    // Tip = Joint + Arm2
    let tipX = jointX + cos(a2) * scaleFactor;
    let tipY = jointY + sin(a2) * scaleFactor;

    stroke(255);
    strokeWeight(2);

    // Line Center -> Joint
    line(cx, cy, jointX, jointY);
    // Line Joint -> Tip
    line(jointX, jointY, tipX, tipY);

    // Draw Joints (Bigger visualization)
    noStroke();
    fill(255);

    // Center Anchor
    circle(cx, cy, 12);

    // Elbow Joint
    fill(200); // Slightly grey to distinguish
    circle(jointX, jointY, 10);

    // Tip
    fill(255);
    circle(tipX, tipY, 8);


    // 4. UI / Text
    // Text drawing removed in favor of HTML overlay

}

// ---- Helpers ----

function getRainbowColor(t_ms, offsetIdx) {
    // Port of the Python rainbow logic, tailored for p5
    // We can use HSBA mode for smoother rainbows if we wanted, 
    // but preserving the specific list logic from Python for fidelity.

    let colors = [
        [255, 0, 0], [255, 127, 0], [255, 255, 0], [0, 255, 0],
        [0, 0, 255], [75, 0, 130], [148, 0, 211], [255, 192, 203]
    ];
    let speed = 0.0002; // Very slow smooth phasing
    let t = (t_ms * speed) % colors.length;
    let i0 = floor(t);
    let i1 = (i0 + 1) % colors.length;
    let f = t - i0;

    let c0 = colors[i0];
    let c1 = colors[i1];

    let r = c0[0] * (1 - f) + c1[0] * f;
    let g = c0[1] * (1 - f) + c1[1] * f;
    let b = c0[2] * (1 - f) + c1[2] * f;

    return color(r, g, b);
}

function drawLineAdditive(surf, x1, y1, x2, y2, col) {
    let r = red(col);
    let g = green(col);
    let b = blue(col);

    // Use stroke for lines
    surf.noFill();

    // Glow halo (Thicker, faint line)
    if (useGlow && tailBrightness > 1) {
        surf.strokeWeight(4);
        surf.stroke(r, g, b, 40);
        surf.line(x1, y1, x2, y2);
    }

    // Core line (Thin, bright)
    surf.strokeWeight(1.5);
    surf.stroke(r, g, b, 200);
    surf.line(x1, y1, x2, y2);
}

function keyPressed() {
    if (key === ' ') paused = !paused;
    if (keyCode === UP_ARROW) iterPerFrame = min(iterPerFrame + 10, 500);
    if (keyCode === DOWN_ARROW) iterPerFrame = max(iterPerFrame - 10, 1);
    if (keyCode === RIGHT_ARROW) timeSpeed *= 1.2;
    if (keyCode === LEFT_ARROW) timeSpeed /= 1.2;

    if (key === 't' || key === 'T') permanentTrail = !permanentTrail;
    if (key === 'g' || key === 'G') useGlow = !useGlow;
    if (key === 'h' || key === 'H') showControls = !showControls;
    if (key === 'p' || key === 'P') disableHue = !disableHue;
    if (key === 'i' || key === 'I') invertColors = !invertColors;

    if (key === 's' || key === 'S') saveCanvas('pi_pattern', 'png');
}
