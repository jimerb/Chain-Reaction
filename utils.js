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
 * Determines the facing value of a die based on its rotation quaternion.
 *
 * The BoxGeometry material order is [+X, -X, +Y, -Y, +Z, -Z]. Our materials
 * array is built so that face N of the standard die (opposite faces summing
 * to 7) lives on the matching axis direction:
 *   +X -> 1    -X -> 6
 *   +Y -> 2    -Y -> 5
 *   +Z -> 3    -Z -> 4
 * So whichever face vector points most "up" after rotation is the face showing.
 *
 * @param {THREE.Quaternion} quaternion - The die's rotation quaternion
 * @returns {number} - The value of the face pointing up (1-6)
 */
function getDiceValueFromRotation(quaternion) {
    // Face vector -> value mapping (must match diceController.createDiceMaterials)
    const faces = [
        { vec: new THREE.Vector3(1, 0, 0),  value: 1 },
        { vec: new THREE.Vector3(-1, 0, 0), value: 6 },
        { vec: new THREE.Vector3(0, 1, 0),  value: 2 },
        { vec: new THREE.Vector3(0, -1, 0), value: 5 },
        { vec: new THREE.Vector3(0, 0, 1),  value: 3 },
        { vec: new THREE.Vector3(0, 0, -1), value: 4 }
    ];

    const upVector = new THREE.Vector3(0, 1, 0);
    const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);

    let best = { value: 1, dot: -Infinity };
    faces.forEach(face => {
        const worldVec = face.vec.clone().applyMatrix4(rotationMatrix);
        const dot = worldVec.dot(upVector);
        if (dot > best.dot) {
            best = { value: face.value, dot };
        }
    });
    return best.value;
}

/**
 * Given a desired top-face value (1-6), returns an Euler rotation
 * {x,y,z} that places that face pointing up.
 *
 * These values are intended to be applied with Euler order 'YXZ' (yaw
 * first, then the face rotation). Under default 'XYZ' order the yaw
 * would be applied around the already-tilted local Y and corrupt the
 * face-up orientation for values 3 and 4. diceController sets
 * die.rotation.order = 'YXZ' on each die so the default rotation.set()
 * path lands the right face up.
 */
function getRotationForValue(value) {
    const yaw = Math.floor(Math.random() * 4) * Math.PI / 2;
    let euler;
    switch (value) {
        case 1: euler = { x: 0,           z:  Math.PI / 2 }; break; // +X up
        case 6: euler = { x: 0,           z: -Math.PI / 2 }; break; // -X up
        case 2: euler = { x: 0,           z: 0 };            break; // +Y up (default)
        case 5: euler = { x: Math.PI,     z: 0 };            break; // -Y up
        case 3: euler = { x: -Math.PI / 2, z: 0 };           break; // +Z up
        case 4: euler = { x:  Math.PI / 2, z: 0 };           break; // -Z up
        default: euler = { x: 0, z: 0 };
    }
    return { x: euler.x, y: yaw, z: euler.z };
}

// If we're in a browser environment, make the functions globally available
if (typeof window !== 'undefined') {
    window.createDiceTexture = createDiceTexture;
    window.createTokenTexture = createTokenTexture;
    window.getDiceValueFromRotation = getDiceValueFromRotation;
    window.getRotationForValue = getRotationForValue;
}

// Export functions for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createDiceTexture,
        createTokenTexture,
        getDiceValueFromRotation,
        getRotationForValue
    };
}
