// utils.js
// Utility functions for the Chain Reaction game

/**
 * Creates a texture for a die face with the specified value
 * @param {number} value - The die face value (1-6)
 * @returns {THREE.Texture} - The texture for the die face
 */
function createDiceTexture(value) {
    // Create a canvas for the die face
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 128; // Size of the texture
    canvas.width = size;
    canvas.height = size;
    
    // Set background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    // Set dot color
    ctx.fillStyle = '#000000';
    
    // Define dot size and positions based on die value
    const dotSize = size / 10;
    const positions = [];
    
    // Map positions for dots based on die value
    switch(value) {
        case 1:
            positions.push([size/2, size/2]); // Center
            break;
        case 2:
            positions.push([size/4, size/4]); // Top left
            positions.push([3*size/4, 3*size/4]); // Bottom right
            break;
        case 3:
            positions.push([size/4, size/4]); // Top left
            positions.push([size/2, size/2]); // Center
            positions.push([3*size/4, 3*size/4]); // Bottom right
            break;
        case 4:
            positions.push([size/4, size/4]); // Top left
            positions.push([3*size/4, size/4]); // Top right
            positions.push([size/4, 3*size/4]); // Bottom left
            positions.push([3*size/4, 3*size/4]); // Bottom right
            break;
        case 5:
            positions.push([size/4, size/4]); // Top left
            positions.push([3*size/4, size/4]); // Top right
            positions.push([size/2, size/2]); // Center
            positions.push([size/4, 3*size/4]); // Bottom left
            positions.push([3*size/4, 3*size/4]); // Bottom right
            break;
        case 6:
            positions.push([size/4, size/4]); // Top left
            positions.push([3*size/4, size/4]); // Top right
            positions.push([size/4, size/2]); // Middle left
            positions.push([3*size/4, size/2]); // Middle right
            positions.push([size/4, 3*size/4]); // Bottom left
            positions.push([3*size/4, 3*size/4]); // Bottom right
            break;
    }
    
    // Draw dots
    positions.forEach(pos => {
        ctx.beginPath();
        ctx.arc(pos[0], pos[1], dotSize, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Add a subtle border
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, size - 4, size - 4);
    
    // Convert to texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

/**
 * Creates a texture for an enhancement token
 * @param {string} type - The type of enhancement ('enrichment', 'controlRod', or 'fusion')
 * @param {string} state - The state of the token ('available' or 'used')
 * @returns {THREE.Texture} - The texture for the token
 */
function createTokenTexture(type, state = 'available') {
    // Create a canvas for the token
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 128; // Size of the texture
    canvas.width = size;
    canvas.height = size;
    
    // Define colors based on token type and state
    let colors = {
        background: '#cccccc',
        border: '#555555',
        icon: '#000000',
        text: '#000000'
    };
    
    switch(type) {
        case 'enrichment':
            colors.background = state === 'available' ? '#22dd22' : '#88aa88'; // Green
            colors.text = '#ffffff';
            break;
        case 'controlRod':
            colors.background = state === 'available' ? '#dd2222' : '#aa8888'; // Red
            colors.text = '#ffffff';
            break;
        case 'fusion':
            colors.background = state === 'available' ? '#2222dd' : '#8888aa'; // Blue
            colors.text = '#ffffff';
            break;
    }
    
    // Set background (circular token)
    ctx.fillStyle = colors.background;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Add border
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Add token-specific icon/symbol
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let text = '';
    switch(type) {
        case 'enrichment':
            text = 'ENRICH';
            break;
        case 'controlRod':
            text = 'CONTROL';
            break;
        case 'fusion':
            text = 'FUSION';
            break;
    }
    
    ctx.fillText(text, size/2, size/2);
    
    // Add "used" overlay if token is used
    if (state === 'used') {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(size/4, size/4);
        ctx.lineTo(3*size/4, 3*size/4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(3*size/4, size/4);
        ctx.lineTo(size/4, 3*size/4);
        ctx.stroke();
    }
    
    // Convert to texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    return texture;
}

/**
 * Determines the facing value of a die based on its rotation quaternion
 * @param {THREE.Quaternion} quaternion - The die's rotation quaternion
 * @returns {number} - The value of the face pointing up (1-6)
 */
function getDiceValueFromRotation(quaternion) {
    // Define unit vectors for the six faces of a die
    const faceVectors = [
        new THREE.Vector3(0, 1, 0),   // Face 1 (top)
        new THREE.Vector3(1, 0, 0),   // Face 2 (right)
        new THREE.Vector3(0, 0, 1),   // Face 3 (front)
        new THREE.Vector3(0, 0, -1),  // Face 4 (back)
        new THREE.Vector3(-1, 0, 0),  // Face 5 (left)
        new THREE.Vector3(0, -1, 0)   // Face 6 (bottom)
    ];
    
    // Define which value is on which face
    // In a standard die, opposite faces add up to 7
    const faceValues = [1, 2, 3, 4, 5, 6];
    
    // Define the "up" direction in world space
    const upVector = new THREE.Vector3(0, 1, 0);
    
    // Create a rotation matrix from the quaternion
    const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);
    
    // Apply the die's rotation to each face vector to get their world orientation
    const worldFaceVectors = faceVectors.map(vector => {
        const worldVector = vector.clone();
        worldVector.applyMatrix4(rotationMatrix);
        return worldVector;
    });
    
    // Find which face is pointing most upward (highest dot product with up vector)
    let maxDotProduct = -Infinity;
    let upFaceIndex = -1;
    
    worldFaceVectors.forEach((worldVector, index) => {
        const dotProduct = worldVector.dot(upVector);
        if (dotProduct > maxDotProduct) {
            maxDotProduct = dotProduct;
            upFaceIndex = index;
        }
    });
    
    // Return the value of the face pointing up
    return faceValues[upFaceIndex];
}

// If we're in a browser environment, make the functions globally available
if (typeof window !== 'undefined') {
    window.createDiceTexture = createDiceTexture;
    window.createTokenTexture = createTokenTexture;
    window.getDiceValueFromRotation = getDiceValueFromRotation;
}

// Export functions for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createDiceTexture,
        createTokenTexture,
        getDiceValueFromRotation
    };
}
