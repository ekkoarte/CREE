/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Draws the high-res CREE Cerro Navia logo onto an offscreen canvas and returns its data URL.
 * Works perfectly client-side for rendering inside jsPDF documents.
 */
export function getLogoDataUrl(width = 400, height = 400): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Clear background (white/transparent)
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  // Set scaling factor based on base layout size (e.g. 500x500)
  const scale = width / 500;
  ctx.save();
  ctx.scale(scale, scale);

  // Colors
  const colors = {
    teal: "#00a18e",   // Teal
    green: "#7cac54",  // Grass Green
    orange: "#f3903f", // Orange
    pink: "#ce3450",   // Red/Pink
    black: "#111111"
  };

  // Helper to draw a kid
  // cx, cy: center coordinates of head, rotation: in radians, color: fill color
  const drawKid = (cx: number, cy: number, rot: number, color: string) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);

    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = colors.black;

    // Body (Trapezoid/Triangle)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-15, 60);  // Bottom-Left
    ctx.lineTo(-10, 25);  // Top-Left
    ctx.lineTo(10, 25);   // Top-Right
    ctx.lineTo(15, 60);   // Bottom-Right
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Head (Circle with outline, filled white)
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Neck line
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(0, 26);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    // Left Leg
    ctx.moveTo(-8, 60);
    ctx.lineTo(-12, 115);
    // Right Leg
    ctx.moveTo(8, 60);
    ctx.lineTo(12, 115);
    ctx.stroke();

    // Feet
    ctx.beginPath();
    // Left Foot
    ctx.moveTo(-12, 115);
    ctx.lineTo(-18, 120);
    // Right Foot
    ctx.moveTo(12, 115);
    ctx.lineTo(18, 120);
    ctx.stroke();

    ctx.restore();
  };

  // Draw holding hands lines connecting kids
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.strokeStyle = colors.black;

  // Let's sketch hands connection coordinates:
  // Kid 1 is rotated left, Kid 2 standing, Kid 3 standing, Kid 4 rotated right
  // We draw connection curves
  ctx.beginPath();
  // Connection Kid 1 to Kid 2
  ctx.moveTo(60, 160);
  ctx.bezierCurveTo(90, 165, 115, 155, 125, 135);
  // Connection Kid 2 to Kid 3
  ctx.moveTo(175, 130);
  ctx.bezierCurveTo(195, 120, 215, 120, 235, 130);
  // Connection Kid 3 to Kid 4
  ctx.moveTo(275, 135);
  ctx.bezierCurveTo(285, 155, 310, 165, 340, 160);
  ctx.stroke();

  // Draw arm of first kid going left
  ctx.beginPath();
  ctx.moveTo(40, 175);
  ctx.bezierCurveTo(25, 185, 15, 205, 10, 230);
  // Draw arm of last kid going right
  ctx.moveTo(360, 175);
  ctx.bezierCurveTo(375, 185, 385, 205, 390, 230);
  ctx.stroke();

  // Draw the kids
  // Kid 1 (Teal, tilted left)
  drawKid(50, 150, -0.22, colors.teal);

  // Kid 2 (Grass Green, straight)
  drawKid(150, 120, -0.05, colors.green);

  // Kid 3 (Orange, straight)
  drawKid(255, 120, 0.05, colors.orange);

  // Kid 4 (Pink, tilted right)
  drawKid(350, 150, 0.22, colors.pink);

  // Recover setup
  ctx.restore();

  // DRAW TEXT "CREE" (Big capital, bold)
  ctx.fillStyle = colors.black;
  ctx.textAlign = "center";
  
  // Font config
  ctx.font = `950 ${125 * scale}px "Inter", "Arial Black", sans-serif`;
  ctx.fillText("CREE", width / 2, 335 * scale);

  // DRAW TEXT "CERRO NAVIA" (With letter-spacing/tracking spacing)
  ctx.font = `600 ${28 * scale}px "Inter", "Arial", sans-serif`;
  
  const label = "CERRO NAVIA";
  const charSpacing = 16 * scale;
  
  // Measure total width to center it manually
  let totalWidth = 0;
  for (let i = 0; i < label.length; i++) {
    totalWidth += ctx.measureText(label[i]).width + (i < label.length - 1 ? charSpacing : 0);
  }
  
  let startX = (width - totalWidth) / 2;
  for (let i = 0; i < label.length; i++) {
    const char = label[i];
    ctx.fillText(char, startX + ctx.measureText(char).width / 2, 385 * scale);
    startX += ctx.measureText(char).width + charSpacing;
  }

  return canvas.toDataURL("image/jpeg", 1.0);
}
