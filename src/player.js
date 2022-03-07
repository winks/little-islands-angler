
var Player = function(x, y) {
    this._x = x;
    this._y = y;
    this._energy = 23;
    this._draw();
};
Player.prototype.getSpeed = function() { return 100; }
Player.prototype.getX = function() { return this._x; }
Player.prototype.getY = function() { return this._y; }
Player.prototype.getEnergy = function() { return this._energy; }

Player.prototype.act = function() {
    Game.engine.lock();
    window.addEventListener("keydown", this);
}

Player.prototype.handleEvent = function(e) {
    var code = e.keyCode;
    if (code == 13 || code == 32) {
        this._usePort();
        return;
    }

    var keyMap = {};
    keyMap[38] = 0;
    keyMap[33] = 1;
    keyMap[39] = 2;
    keyMap[34] = 3;
    keyMap[40] = 4;
    keyMap[35] = 5;
    keyMap[37] = 6;
    keyMap[36] = 7;

    /* one of numpad directions? */
    if (!(code in keyMap)) { return; }

    /* is there a free space? */
    var dir = ROT.DIRS[8][keyMap[code]];
    var newX = this._x + dir[0];
    var newY = this._y + dir[1];
    var newKey = newX + "," + newY;
    // @TODO check boxes/port
    console.debug("checkMove "+newKey+" "+Game.map[newKey]);
    if (!(newKey in Game.map)) { return; }

    Game.draw(this._x, this._y, Game.map[this._x+","+this._y]);
    this._x = newX;
    this._y = newY;
    this._draw();
    window.removeEventListener("keydown", this);
    Game.engine.unlock();
}

Player.prototype._draw = function() {
    Game.draw(this._x, this._y, Game.playerSigil, Game.playerColor);
}

Player.prototype._usePort = function() {
    var dirs = ROT.DIRS[4];

    for (var i=0; i<dirs.length; i++) {
        var dir =  dirs[i];
        var newX = this._x + dir[0];
        var newY = this._y + dir[1];
        var newKey = newX+","+newY;
        if (Game.map[newKey] == Game.portSigil) {
            console.debug("A PORT");
            window.removeEventListener("keydown", this);
            Game.engine.unlock();
            return;
        }
    }
}
