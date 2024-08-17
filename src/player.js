function createPlayer(x,y,rotationAngle) {
    let player = {
        // position
        x,
        y,
        // rotation in degrees
        a:rotationAngle,
        // current speed
        dx:0,
        dy:0,
        _r:()=>{}
    };
    player._r = ()=>renderPlayer(player);
    player._u = (delta)=>updatePlayer(player, STICK_LEFT_HORIZONTAL, STICK_LEFT_VERTICAL, delta);
    return player;
}

function renderPlayer(player) {
    saveContext(ctx);
    translateContext(ctx, player.x, player.y);
    rotateContext(ctx, player.a);

    beginPath(ctx);
    strokeStyle(ctx, COLOR_WHITE);
    moveTo(ctx, 0, -10);
    lineTo(ctx, 20, 0);
    lineTo(ctx, 0, 10);
    stroke(ctx);


    restoreContext(ctx);

}

function updatePlayer(player, stick_horizontal, stick_vertical, delta) {
    let gamepadVector = getGamepadStickVector(stick_horizontal, stick_vertical);
    if(gamepadVector && vectorLength(gamepadVector) > 0.2) {
        player.a = getVectorAngleDegrees(gamepadVector);
        player.dx += gamepadVector.x * 5 * delta;
        player.dy += gamepadVector.y * 5 * delta;
        gameObjects.push(createParticleExhaust(player.x, player.y, -gamepadVector.x * 400, -gamepadVector.y * 400, 1));
    } else {
        player.dx *= 0.99;
        player.dy *= 0.99;
    }
    player.x += player.dx;
    player.y += player.dy;
    if(getGamepadButtonPressed(GAMEPAD_A)) {
        let v = createStandardVector(player.a);
        gameObjects.push(createParticleLaser(player.x, player.y, v.x * 1200, v.y * 1200, 2));
    }
}