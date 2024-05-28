import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Scene
const scene = new THREE.Scene();
const axesHelper = new THREE.AxesHelper(50);
scene.add(axesHelper);

// Camera
const camera = new THREE.PerspectiveCamera(
    75, // FOV
    window.innerWidth / window.innerHeight, // Aspect
    0.1, // Near
    1000 // Far
);
camera.position.set(0, 10, 5);

// Floor
const floorGeometry = new THREE.PlaneGeometry(60, 60);
const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotateX(-0.5 * Math.PI);
scene.add(floor);

// Character
const characterGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const characterMaterial = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
const character = new THREE.Mesh(characterGeometry, characterMaterial);
character.position.set(0, 0.25, 0);
scene.add(character);

// Maze
let maze;
const loader = new OBJLoader();
loader.load(
    './images/laberinto.obj',
    (object) => {
        maze = object;
        
        // Ajustar la posición del laberinto al mismo punto que el personaje
        maze.position.set(character.position.x, 0, character.position.z);
        
        // Asegurarse de que el laberinto tenga contacto con el suelo
        maze.position.y = 0;
        maze.position.x = -20;
        maze.position.z = 22;
        
        // Rotar el laberinto 90 grados en el eje Y
        maze.rotation.x = Math.PI / 2;
        
        scene.add(maze);
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
        console.error('Error loading maze:', error);
    }
);

// Movement variables
const moveSpeed = 0.1;
const keysPressed = {};

// Available colors
const colors = [0x00FF00, 0xFF0000, 0x0000FF];
let currentColorIndex = 0;

// Event listeners for keyboard input
document.addEventListener('keydown', (event) => {
    keysPressed[event.key] = true;
});
document.addEventListener('keyup', (event) => {
    keysPressed[event.key] = false;
});

// Title screen
const titleScreen = document.getElementById('titleScreen');
let gameStarted = false;

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !gameStarted) {
        titleScreen.style.display = 'none';
        gameStarted = true;
    }
});

// Color select
const colorSelect = document.getElementById('colorSelect');
colorSelect.addEventListener('change', (event) => {
    const selectedColor = parseInt(event.target.value);
    characterMaterial.color.setHex(selectedColor);
});

// Rotate color
document.addEventListener('keydown', (event) => {
    if (event.key === 'c' && gameStarted) {
        currentColorIndex = (currentColorIndex + 1) % colors.length;
        characterMaterial.color.setHex(colors[currentColorIndex]);
    }
});

// Game loop
function game() {
    // Character movement
    if (keysPressed['w']) {
        character.position.z -= moveSpeed;
    }
    if (keysPressed['s']) {
        character.position.z += moveSpeed;
    }
    if (keysPressed['a']) {
        character.position.x -= moveSpeed;
    }
    if (keysPressed['d']) {
        character.position.x += moveSpeed;
    }

    // Update camera position to follow the character
    camera.position.x = character.position.x;
    camera.position.z = character.position.z + 5;
    camera.lookAt(character.position);

    renderer.render(scene, camera);
}
renderer.setAnimationLoop(game);

// Display character's origin
const originText = document.createElement('div');
originText.style.position = 'absolute';
originText.style.top = '10px';
originText.style.left = '10px';
originText.style.color = 'white';
originText.innerHTML = `Character Origin: (${character.position.x.toFixed(2)}, ${character.position.z.toFixed(2)})`;
document.body.appendChild(originText);
