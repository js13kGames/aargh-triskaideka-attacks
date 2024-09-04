const GROUND_HEIGHT = BASEHEIGHT - 50;

const GAMEOBJECT_TYPE_SNAKE = 1;
const GAMEOBJECT_TYPE_LASER = 2;
const GAMEOBJECT_TYPE_ENEMY = 3;
const GAMEOBJECT_TYPE_BUTTON = 4;
const GAMEOBJECT_TYPE_SQUID = 5;
const GAMEOBJECT_TYPE_TENTACLE = 6;
const GAMEOBJECT_TYPE_ENEMY_BULLET = 7;

const STATE_LOADING = 0;
const STATE_MENU = 1;
const STATE_ACTION = 2;

let gameObjects = [];
let gameState = STATE_MENU;


const GAMEDATA_POINTS = 0;
const GAMEDATA_XP = 1;
const GAMEDATA_SHIP_WEAPON = 2;
const GAMEDATA_SHIP_SHIELD = 3;
const gameData = {}
gameData[GAMEDATA_POINTS] = 0;
gameData[GAMEDATA_XP] = 0;
gameData[GAMEDATA_SHIP_WEAPON] = 1;
gameData[GAMEDATA_SHIP_SHIELD] = 0;

function addGameObject(gameObject) {
    gameObjects.push(gameObject);
    return gameObject;
}

function getGameObjectsByType(type) {
    return gameObjects.filter(gameObject => gameObject.ot && gameObject.ot == type);
}


function render() {
    ctx.clearRect(0,0,BASEWIDTH, BASEHEIGHT);
    gameObjects
        .filter(gameObject=>gameObject._r)
        .forEach(gameObject => gameObject._r());
    if(gameState == STATE_MENU) {

    } else if(gameState == STATE_ACTION) {
        player._r();
        renderGround();
    }
}

function renderGround() {
    saveContext();
    translateContext(camera.x-BASEWIDTH/2, GROUND_HEIGHT);
    ctx.clearRect(0,0,BASEWIDTH, BASEHEIGHT);
    fillStyle('#ccf6');
    fillRect(0,0,BASEWIDTH, BASEHEIGHT);
    let y = 0;
    [5,4,3,1].forEach(lineWidth => {
        beginPath();
        ctx.lineWidth = lineWidth;
        strokeStyle(COLOR_WHITE);
        moveTo(0, y);
        lineTo(BASEWIDTH, y);
        stroke();
        y += lineWidth * 2;
    });
    restoreContext();
}


function update() {
    let delta = getDelta();
    getGamepadState();
    gameTime += delta;
    camera._u(delta);

    // background gradient position
    let maxBgTop = BASEHEIGHT * 9; // the world is 9 screens tall
    let camheight = camera.y - BASEHEIGHT / 2;
    let topPosition = (clamp(maxBgTop + camheight, 0, maxBgTop) / maxBgTop) * -900;
    bgGradientDiv.style.top = topPosition + "vh";
    if(gameState == STATE_MENU) {
        let buttons = getGameObjectsByType(GAMEOBJECT_TYPE_BUTTON);
        let activeButton = buttons.find(b=>b.a);
        let actionPressed = getGamepadButtonPressed(GAMEPAD_A) || keyActive(KEY_ACTION_FIRE);
        if(!menuActionWasReleased && !actionPressed) {
            menuActionWasReleased = true;
        }
        if(activeButton && menuActionWasReleased && actionPressed) {
            menuActionWasReleased = false;
            activeButton.c();
        }
        let downPressed = keyActive(KEY_ACTION_DOWN);
        let upPressed = keyActive(KEY_ACTION_UP);
        if(!menuDirectionWasReleased && !downPressed && !upPressed) {
            menuDirectionWasReleased = true;
        }
        if(activeButton && activeButton.l[DIRECTION_DOWN] && downPressed) {
            activeButton.l[DIRECTION_DOWN].a = true;
            activeButton.a =false;
        }
        if(activeButton && activeButton.l[DIRECTION_UP] && upPressed) {
            activeButton.l[DIRECTION_UP].a = true;
            activeButton.a =false;
        }
        
    } else if(gameState == STATE_ACTION) {
        player._u(delta);
        

        // collisions
        let lasers = getGameObjectsByType(GAMEOBJECT_TYPE_LASER);
        let bullets = getGameObjectsByType(GAMEOBJECT_TYPE_ENEMY_BULLET);
        let snakes = getGameObjectsByType(GAMEOBJECT_TYPE_SNAKE);
        let enemies = getGameObjectsByType(GAMEOBJECT_TYPE_ENEMY);
        let squids = getGameObjectsByType(GAMEOBJECT_TYPE_SQUID);
        if(snakes.length + enemies.length + squids.length == 0) {
            loadGameMenu();
            return;
        }
        if(player.alive) {
            enemies.forEach(enemy => {
                let hit = pointDistance(enemy, player) <= enemy.r + player.cr;
                if(hit && player.ct <= 0) {
                    player.h -= 1;
                    enemy.hp -= 1;
                    player.ct = 0.5;
                    cameraShake(0.25);
                    addGameObject(createParticleExplosion((enemy.x + player.x)/2, (enemy.y + player.y)/2, COLOR_RGB_YELLOW));
                }
            });
            bullets.forEach(bullet => {
                let hit = pointDistance(bullet, player) <= bullet.r + player.cr;
                if(hit) {
                    player.h -= 1;
                    cameraShake(0.25);
                    addGameObject(createParticleExplosion((bullet.x + player.x)/2, (bullet.y + player.y)/2, COLOR_RGB_YELLOW));
                    bullet.ttl = 0;
                }
            });
            snakes.forEach(snake => {
                let hit = pointDistance(player, snake) <= snake.r + player.cr;
                let currentSegment = snake;
                while(currentSegment.c && !hit) {
                    currentSegment = currentSegment.c;
                    hit = pointDistance(player, currentSegment) <= currentSegment.r + player.cr;
                }
                if(hit && player.ct <= 0) {
                    player.h -= 1;
                    snake.hp -= 1;
                    player.ct = 0.5;
                    cameraShake(0.25);
                    addGameObject(createParticleExplosion((currentSegment.x + player.x)/2, (currentSegment.y + player.y)/2, COLOR_RGB_YELLOW));
                }
            });
            squids.forEach(squid => {
                let { hit, currentSegment } = squidCollision(player,  player.cr, squid);
                if(hit && player.ct <= 0) {
                    player.h -= 1;
                    squid.hp -= 1;
                    player.ct = 0.5;
                    cameraShake(0.25);
                    addGameObject(createParticleExplosion((currentSegment.x + player.x)/2, (currentSegment.y + player.y)/2, COLOR_RGB_YELLOW));
                }
            })
        }
        lasers.forEach(laser => {
            snakes.forEach(snake => {
                if(laser.ttl < 0) {
                    return;
                }
                let hit = pointDistance(laser, snake) <= snake.r;
                let currentSegment = snake;
                while(currentSegment.c && !hit) {
                    currentSegment = currentSegment.c;
                    hit = pointDistance(laser, currentSegment) <= currentSegment.r;
                }
                if(hit) {
                    laser.ttl = -1
                    snake.hp -= 1;
                    for(let i = 0; i < rand(3,7); i++) {
                        addGameObject(createParticleDebris(laser.x, laser.y));
                    }
                    playAudio(AUDIO_SFX_HIT);
                    if(snake.hp == 0) {
                        snake.ttl = -1;
                        explodeSnake(snake);
                        playAudio(AUDIO_SFX_EXPLOSION);
                    }
                }
            });
            enemies.forEach(enemy => {
                if(pointDistance(laser, enemy) <= enemy.r) {
                    laser.ttl = -1
                    enemy.hp -= 1;
                    for(let i = 0; i < rand(2,4); i++) {
                        addGameObject(createParticleDebris(laser.x, laser.y));
                    }
                    playAudio(AUDIO_SFX_HIT);
                    if(enemy.hp == 0) {
                        enemy.ttl = -1;
                        explodeEnemy(enemy);
                        playAudio(AUDIO_SFX_EXPLOSION);
                    }
                }
            });
            squids.forEach(squid => {
                let { hit, currentSegment } = squidCollision(laser,  2, squid);
                if(hit) {
                    laser.ttl = -1
                    squid.hp -= 1;
                    for(let i = 0; i < rand(2,4); i++) {
                        addGameObject(createParticleDebris(laser.x, laser.y));
                    }
                    playAudio(AUDIO_SFX_HIT);
                }
            })
        });
    }

    gameObjects.forEach(gameObject => {
        if(gameObject._u) {
            gameObject._u(delta);
        }
    });
    gameObjects = gameObjects.filter(gameObject => gameObject.ttl === undefined || gameObject.ttl > 0);
}




let gameTime = 0;
function squidCollision(gameObject, collisionRadius, squid) {
    let currentSegment = squid;
    let hit = pointDistance(gameObject, squid) <= squid.s + collisionRadius;
    if (!hit) {
        for (let tentacle of squid.t) {
            hit = pointDistance(gameObject, tentacle) <= tentacle.r + collisionRadius;
            currentSegment = tentacle;
            while (currentSegment.c && !hit) {
                currentSegment = currentSegment.c;
                hit = pointDistance(gameObject, currentSegment) <= currentSegment.r + collisionRadius;
            }
            if (hit) {
                break;
            }
        }
    }
    return { hit, currentSegment };
}

function gameLoop() {
    update()
    render();
    requestAnimationFrame(gameLoop);
}

function clearObjects() {
    gameObjects = [];
}

let menuActionWasReleased = false;
let menuDirectionWasReleased = false;
function loadGameMenu() {
    menuActionWasReleased = false;
    menuDirectionWasReleased = false;
    clearObjects();
    camera.x = BASEWIDTH/2;
    camera.y = BASEHEIGHT/2;
    camera.t = null;
    gameState = STATE_MENU;
    addGameObject(createTriskaideka(BASEWIDTH/2,70, 0.8));
    let btnStartMission = addGameObject(createButton(BASEWIDTH/2,500,300,40,"START MISSION", true, loadGameAction));
    let btnUpgradeLaser = addGameObject(createButton(BASEWIDTH/2,570,300,40,"UPGRADE LASER", false, upgradeLaser));
    linkButtons(btnStartMission, btnUpgradeLaser, DIRECTION_DOWN);
}

function upgradeLaser() {
    gameData[GAMEDATA_SHIP_WEAPON] += 1;
}
let player = null;

function loadGameAction() {
    clearObjects();
    gameState = STATE_ACTION;
    player = createPlayer(BASEWIDTH/2,GROUND_HEIGHT-3, -90);


    
    for(let i = 0; i < 50; i++) {
        addGameObject(createParticleDust(rand(0, BASEWIDTH),rand(0, BASEHEIGHT)));
    }
    
    [ENEMY_WING_A, ENEMY_WING_B, ENEMY_WING_C, ENEMY_WING_D, ENEMY_WING_E].forEach((wing,i) => {
        let x = 100 + i*50;
        [ENEMY_HULL_A, ENEMY_HULL_B, ENEMY_HULL_C].forEach((hull,j) => {
            let y = 200 + j*150;
            [ENEMY_COCKPIT_A, ENEMY_COCKPIT_B, ENEMY_COCKPIT_C].forEach((cockpit, k) => {
                let y1 = y + k*50;
                //addGameObject(createEnemy(x,y1,[wing, hull, cockpit]));
                addGameObject(createEnemy(rand(-BASEWIDTH, BASEWIDTH*2), rand(-BASEHEIGHT*2,0),[wing, hull, cockpit]));
            });
        });
    });
    
    addGameObject(createSquid(900,200, 80));


    addGameObject(createSnake(400,200, 20, 13, 20));
    addGameObject(createSnake(600,600, 15, 26, 30));
    addGameObject(createSnake(1900,400, 30, 20, 25));

    playAudio(AUDIO_SONG_AIRWOLF);
}