import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as dat from 'dat.gui';

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
    // targetY: 0,
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

// gui.add(options, 'targetY', -50, 50).onChange(function (e) {
//     spotLight.target.position.y = e;
//     spotLightHelper.update();
// });

gui.add(options, 'targetZ', -50, 50).onChange(function (e) {
    spotLight.target.position.z = e;
    spotLightHelper.update();
})

// player
let player;
const playerUrl = './assets/player.obj';
const loader = new OBJLoader();
loader.load(
    playerUrl,
    (object) => {
        player = object;
        
        // Ajustar la posición del personaje encima del suelo
        player.position.set(0, 0.75, 0);
        
        player.scale.set(0.125, 0.125, 0.125);
        const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        player.traverse((child) => {
            if (child.isMesh) {
                child.material = blackMaterial;
            }
        });
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

// TODO: cambiar el modelo del laberinto
// Maze
let maze;
const mazeUrl = './assets/maze.obj';
loader.load(
    mazeUrl,
    (object) => {
        maze = object;
        
        // Ajustar la posición del laberinto al mismo punto que el personaje
        maze.position.set(player.position.x, 0, player.position.z);
        
        // Asegurarse de que el laberinto tenga contacto con el suelo
        maze.position.y = 0;
        maze.position.x = -10;
        maze.position.z = -13;
        
        // Rotar el laberinto 90 grados en el eje Y
        //maze.rotation.x = Math.PI / 2;
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
let maxScore = 0;
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
const maxScoreElement = document.getElementById('maxScore');
let gameStarted = false;

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !gameStarted) {
        titleScreen.style.display = 'none';
        gameStarted = true;
        score = 0;
    }
});

// TODO: checar esto
// Rotate color
document.addEventListener('keydown', (event) => {
    if (event.key === 'c' && gameStarted) {
        currentColorIndex = (currentColorIndex + 1) % colors.length;
        playerMaterial.color.setHex(colors[currentColorIndex]);
    }
});

// Function to check collision
function checkCollision(obj1, obj2) {
    const obj1Box = new THREE.Box3().setFromObject(obj1);
    const obj2Box = new THREE.Box3().setFromObject(obj2);
    return obj1Box.intersectsBox(obj2Box);
}

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

// Movimiento de Jugador
function playerMovement() {
    //const previousPosition = player.position.clone();

    if (keysPressed['w']) {
        player.position.z -= moveSpeed;
        player.rotation.y  = Math.PI;
    }
    if (keysPressed['s']) {
        player.position.z += moveSpeed;
        player.rotation.y  = 0;
    }
    if (keysPressed['a']) {
        player.position.x -= moveSpeed;
        player.rotation.y  = -Math.PI / 2;
    }
    if (keysPressed['d']) {
        player.position.x += moveSpeed;
        player.rotation.y  = Math.PI / 2;
    }
    

    // Check collision with maze walls
    // if (checkMazeCollision(player, maze)) {
    //     player.position.copy(previousPosition); // Revert to previous position if there's a collision
    // }
}

// Function to calculate score
function calculateScore() {
    const distance = Math.sqrt(
        Math.pow(player.position.x, 2) + Math.pow(player.position.z, 2)
    );
    score = Math.floor(distance);
    if (score > maxScore) {
        maxScore = score;
    }
    scoreText.innerHTML = `Score: ${score}`;
}

// Reset game function
function resetGame() {
    player.position.set(0, 0.25, 0);
    enemy.position.set(5, 0.25, 5);
    gameStarted = false;
    titleScreen.style.display = 'block';
    maxScoreElement.innerHTML = `Puntuación máxima: ${maxScore}`;
}

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

    // Check collision
    if (checkCollision(player, enemy)) {
        //resetGame();
    }


    // Spotlight following the player
    spotLight.position.set(...player.position);
    spotLight.position.y += 2;

    if (options.ModoExplorar) {
        spotLight.target.position.set(...player.position);
    }

    spotLightHelper.update();

    // Calculate score
    calculateScore();

    // Update camera position to follow the player
    camera.position.x = player.position.x;
    camera.position.z = player.position.z + 5;
    camera.lookAt(player.position);

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(game);



