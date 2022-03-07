
var Player = function(x, y) {
    this._x = x;
    this._y = y;
    this._energy = 30;
    this._strength = 10;
    this._dexterity = 10;
    this._currency = 0;
    this._draw();

    this.s("  ");
};
Player.prototype.getSpeed = function() { return 100; }
Player.prototype.getX = function() { return this._x; }
Player.prototype.getY = function() { return this._y; }
Player.prototype.getEnergy = function() { return this._energy; }
Player.prototype.getCurrency = function() { return this._currency; }
Player.prototype.getStr = function() { return this._strength; }
Player.prototype.getDex = function() { return this._dexterity; }

Player.prototype.act = function() {
    Game.engine.lock();
    window.addEventListener("keydown", this);
}

Player.prototype.handleEvent = function(e) {
    var code = e.keyCode;
    if (code == 13 || code == 32) {
        //this._usePort();
        this._startEncounter();
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
    if (!(newKey in Game.map)) { return; }
    if (Game.map[newKey] != " " && Game.map[newKey] != undefined) {
        //console.debug("checkMove "+newKey+" "+Game.map[newKey]);
    }

    Game.draw(this._x, this._y, Game.map[this._x+","+this._y]);
    //Game.ue();
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

Player.prototype._startEncounter = function() {
    var fi = Game.hasFishAt(this.getX(), this.getY());
    if (fi !== false) {
        var f = Game.fish[fi];
        console.debug("! "+f.s());
        this._encounter(f);
        window.removeEventListener("keydown", this);
        Game.engine.unlock();
        return;
    }
}

Player.prototype.s = function(prefix, suffix) {
    var msg = "[Player: DEX: "+this._dexterity+" STR: "+this._strength+"  @ ("+this.k()+")]";
    if (prefix) msg = prefix + msg;
    if (suffix) msg = msg + suffix;
    return msg;
}

Player.prototype.k = function() {
    return this._x+","+this._y;
}

Player.prototype._encounter = function(enemy) {
    var hooked = false;
    var success = false;
    var hookedPerc = null;
    while (!success) {
        this._energy -= 1;
        Game.update();
        console.debug("!! "+this.s()+" vs "+enemy.s());

        var dexDiff = this.getDex() - enemy.getDex();
        if (dexDiff >= 2 || hooked) {
            if (!hooked) {
                hookedPerc = ROT.RNG.getPercentage();
                console.debug("!! Hook% "+hookedPerc);
            }
            if (hookedPerc <= 90 || hooked) {
                hooked = true;
                var strDiff = this.getStr() - enemy.getStr();
                console.debug("!! strDiff "+strDiff);
                if (strDiff >= 2) {
                    success = true;
                    console.debug("!! Success");
                    continue;
                } else if (strDiff >= -1 && strDiff < 2) {
                    enemy._strength -= 1;
                    console.debug("!! Weakened "+enemy.s());
                    continue;
                } else if (strDiff <= -2) {
                    var catchPerc = ROT.RNG.getPercentage();
                    if (catchPerc <= 50) {
                        this._energy -= 1;
                        Game.update();
                        continue;
                    } else {
                        console.debug("!! Fatal TODO");
                        return;
                    }
                } else {
                    console.debug("!! WTF");
                    return;
                }
            } else {
                continue;
            }
        } else if (dexDiff == 1 || dexDiff == 0) {
            var hookPerc = ROT.RNG.getPercentage();
            if (hookPerc <= 50) {
                hooked = true;
                continue;
            } else {
                console.debug("!! Fish got away "+hookPerc+"/50");
                return;
            }
        } else if (dexDiff == -1 || dexDiff == -2) {
            var hookPerc = ROT.RNG.getPercentage();
            if (hookPerc <= 20) {
                hooked = true;
                continue;
            } else {
                console.debug("!! Fish got away "+hookPerc+"/20");
                return;
            }
        } else {
            console.debug("!! Fish too strong");
            return;
        }
    }
    console.debug("!! post. success:"+success);
    var rewardPerc = ROT.RNG.getPercentage();
    if (rewardPerc <= 50) {
        this._currency += 1;
    } else {
        this._currency += 2;
    }
    Game.remove(enemy);
    Game.update();
    return;
}