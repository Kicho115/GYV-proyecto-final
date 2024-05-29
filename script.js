import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as dat from 'dat.gui';

// TODO: borrar hitboxes
let playerHelper;

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Adjust to full screen
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

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

const orbitControls = new OrbitControls(camera, renderer.domElement);

// Floor
const floorGeometry = new THREE.PlaneGeometry(90, 82);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotateX(-0.5 * Math.PI);
scene.add(floor);

// Spotlight
const spotLight = new THREE.SpotLight(0xFFFFFF, 100);
spotLight.position.set(-3, 5, 0);
spotLight.castShadow = true;
scene.add(spotLight);

const spotLightHelper = new THREE.SpotLightHelper(spotLight);
scene.add(spotLightHelper);

// Spotlight controls
const gui = new dat.GUI();

const options = {
    ModoExplorar: true,
    targetX: 0,
    targetZ: 0,
    angle: 0.2,
    penumbra: 0,
    intensity: 1,
};

gui.add(options, 'ModoExplorar').onChange(function(e) {
    options.ModoExplorar = e;
})

gui.add(options, 'angle', 0, Math.PI / 2).onChange(function (e) {
    spotLight.angle = e;
    spotLightHelper.update();
});

gui.add(options, 'penumbra', 0, 1).onChange(function (e) {
    spotLight.penumbra = e;
    spotLightHelper.update();
});

gui.add(options, 'intensity', 0, 100).onChange(function (e) {
    spotLight.intensity = e;
});

gui.add(options, 'targetX', -50, 50).onChange(function (e) {
    spotLight.target.position.x = e;
    spotLightHelper.update();
});

gui.add(options, 'targetZ', -50, 50).onChange(function (e) {
    spotLight.target.position.z = e;
    spotLightHelper.update();
})

// Player
let player;
const playerUrl = './assets/player.obj';
const loader = new OBJLoader();
loader.load(
    playerUrl,
    (object) => {
        player = object;
        player.position.set(0, 0.75, 0);
        player.scale.set(0.125, 0.125, 0.125);
        const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        player.traverse((child) => {
            if (child.isMesh) {
                child.material = blackMaterial;
            }
        });
        playerHelper = new THREE.BoxHelper(player, 0xff0000); // Color rojo para la hitbox
        scene.add(playerHelper);
        scene.add(player);
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
        console.error('Error loading player:', error);
    }
);

// Enemy
const enemyGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const enemyMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
const enemy = new THREE.Mesh(enemyGeometry, enemyMaterial);
enemy.position.set(5, 0.25, 5);
scene.add(enemy);

// Maze
let maze;
const mazeUrl = './images/dedalo.obj';
loader.load(
    mazeUrl,
    (object) => {
        maze = object;
        maze.position.set(-10, 0, -13);
        maze.scale.set(3, 3, 3);
        const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        maze.traverse((child) => {
            if (child.isMesh) {
                child.material = blackMaterial;
            }
        });
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
const enemySpeed = 0.05;
const keysPressed = {};

// Available colors
const colors = [0x00FF00, 0xFF0000, 0x0000FF];
let currentColorIndex = 0;

// Scoring variables
let score = 0;
let highScores = JSON.parse(localStorage.getItem('highScores')) || [];
const scoreText = document.createElement('div');
scoreText.style.position = 'absolute';
scoreText.style.top = '10px';
scoreText.style.right = '10px';
scoreText.style.color = 'white';
document.body.appendChild(scoreText);

// Event listeners for keyboard input
document.addEventListener('keydown', (event) => {
    keysPressed[event.key] = true;
});
document.addEventListener('keyup', (event) => {
    keysPressed[event.key] = false;
});

// Title screen
const titleScreen = document.getElementById('titleScreen');
const highScoresList = document.getElementById('highScoresList');
let gameStarted = false;

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !gameStarted) {
        titleScreen.style.display = 'none';
        gameStarted = true;
        score = 0;
    }
});

// Rotate color
document.addEventListener('keydown', (event) => {
    if (event.key === 'c' && gameStarted) {
        currentColorIndex = (currentColorIndex + 1) % colors.length;
        player.material.color.setHex(colors[currentColorIndex]);
    }
});

// Function to check collision
function checkCollision(obj1, obj2) {
    const obj1Box = new THREE.Box3().setFromObject(obj1);
    const obj2Box = new THREE.Box3().setFromObject(obj2);
    return obj1Box.intersectsBox(obj2Box);
}

// Function to check collision with maze walls
function checkMazeCollision(player, maze) {
    const playerBox = new THREE.Box3().setFromObject(player);
    let collision = false;

    maze.traverse((child) => {
        if (child.isMesh) {
            const wallBox = new THREE.Box3().setFromObject(child);
            if (playerBox.intersectsBox(wallBox)) {
                collision = true;
            }
        }
    });

    return collision;
}

// Function to calculate score
function calculateScore() {
    const distance = Math.sqrt(
        Math.pow(player.position.x, 2) + Math.pow(player.position.z, 2)
    );
    score = Math.floor(distance);
    scoreText.innerHTML = `Score: ${score}`;
}

// Reset game function
function resetGame() {
    player.position.set(0, 0.25, 0);
    enemy.position.set(5, 0.25, 5);
    gameStarted = false;
    titleScreen.style.display = 'block';
    updateHighScores(score);
    displayHighScores();
}

// Update high scores
function updateHighScores(newScore) {
    highScores.push(newScore);
    highScores.sort((a, b) => b - a);
    highScores = highScores.slice(0, 5);
    localStorage.setItem('highScores', JSON.stringify(highScores));
}

// Display high scores
function displayHighScores() {
    highScoresList.innerHTML = '';
    highScores.forEach((score, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${score}`;
        highScoresList.appendChild(li);
    });
}

// Initialize high scores on load
displayHighScores();

// Game loop
function game() {
    if (!gameStarted) {
        renderer.render(scene, camera);
        return;
    } 

    playerMovement();

    // Enemy movement
    const direction = new THREE.Vector3();
    direction.subVectors(player.position, enemy.position).normalize();
    enemy.position.add(direction.multiplyScalar(enemySpeed));

    // Check collision with enemy
    /*if (checkCollision(player, enemy)) {
        resetGame();
    }*/

    // Spotlight following the player
    spotLight.position.set(player.position.x, player.position.y + 2, player.position.z);
    if (options.ModoExplorar) {
        spotLight.target.position.set(player.position.x, player.position.y, player.position.z);
    }
    spotLightHelper.update();

    // Calculate score
    calculateScore();

    // Update camera position to follow the player
    camera.position.x = player.position.x;
    camera.position.z = player.position.z + 5;
    camera.lookAt(player.position);

    if(playerHelper) {  
        playerHelper.update();
    }

    renderer.render(scene, camera);
}

// Player movement function
function playerMovement() {
    const oldPosition = player.position.clone();

    if (keysPressed['w']) {
        player.position.z -= moveSpeed;
        player.rotation.y = Math.PI;
    }
    if (keysPressed['s']) {
        player.position.z += moveSpeed;
        player.rotation.y = 0;
    }
    if (keysPressed['a']) {
        player.position.x -= moveSpeed;
        player.rotation.y = -Math.PI / 2;
    }
    if (keysPressed['d']) {
        player.position.x += moveSpeed;
        player.rotation.y = Math.PI / 2;
    }

    if (checkMazeCollision(player, maze)) {
        player.position.copy(oldPosition);
    }
}

renderer.setAnimationLoop(game);
