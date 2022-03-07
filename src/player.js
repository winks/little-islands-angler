
var Player = function(x, y) {
    this._x = x;
    this._y = y;
    this._energy = 30;
    this._strength = 10;
    this._dexterity = 10;
    this._currency = 0;
    this._draw();
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

Player.prototype.handleEvent = function(ev) {
    var code = ev.code;

    // enter to finish level, keyCode 13
    if (code == "Enter" || code == "NumpadEnter") {
        var rv = this._usePort();
        if (rv) {
            Game.updS();
            window.removeEventListener("keydown", this);
            Game.engine.unlock();
        }
        return;
    }
    // space for fishing and boxes, keyCode 32
    if (code == "Space") {
        var rv = this._startEncounter();
        if (rv) {
            Game.updS();
            window.removeEventListener("keydown", this);
            Game.engine.unlock();
            return;
        }
        rv = this._openBox();
        if (rv) {
            Game.updS();
            window.removeEventListener("keydown", this);
            Game.engine.unlock();
        }
        return;
    }
    // e to eat, keyCode 69
    if (code == "KeyE") {
        var rv = this._fillEnergy();
        if (rv) {
            Game.updS();
            window.removeEventListener("keydown", this);
            Game.engine.unlock();
        }
        return;
    }

    // arrow keys and NUMPAD
    var keyMap = {};
    keyMap["ArrowUp"]   = 0; // 38
    keyMap["Numpad8"]   = 0;
    keyMap["PageUp"]    = 1; // 33
    keyMap["Numpad9"]   = 1;
    keyMap["ArrowRight"]= 2; // 39
    keyMap["Numpad6"]   = 2;
    keyMap["PageDown"]  = 3; // 34
    keyMap["Numpad3"]   = 3;
    keyMap["ArrowDown"] = 4; // 40
    keyMap["Numpad2"]   = 4;
    keyMap["End"]       = 5; // 35
    keyMap["Numpad1"]   = 5;
    keyMap["ArrowLeft"] = 6; // 37
    keyMap["Numpad4"]   = 6;
    keyMap["Home"]      = 7; // 36
    keyMap["Numpad7"]   = 7;

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

    this._x = newX;
    this._y = newY;
    Game.update();
    window.removeEventListener("keydown", this);
    Game.engine.unlock();
}

Player.prototype._draw = function() {
    Game.draw(this._x, this._y, Game.playerSigil, Game.playerColor);
}

Player.prototype._usePort = function() {
    var cb = function(what) {
        console.debug("A PORT");
        var str = "You try to dock at the port.";
        if (this._currency >= Game.volCurrencyToExit) {
            str += " You pay "+Game.volCurrencyToExit+" in fees."
            this._currency -= Game.volCurrencyToExit;
            Game.levelFinished = true;
        } else {
            str += " You don't have the "+Game.volCurrencyToExit+" rations to pay the fees."
        }
        Game.toast = str;
        return true;
    };
    return this._interact(Game.portSigil, cb.bind(this));
}

Player.prototype._openBox = function() {
    var cb = function(what) {
        console.debug("A BOX ("+what.s()+") "+this.s());
        var str = "You try to open the box.";
        this._energy -= 1;
        if (!what._contents || what._contents == "nothing") {
            str += " You find nothing in it.";
        } else if (what._contents == "tome_str") {
            str += " You find a tome of strength!";
            this._strength += 1;
        } else if (what._contents == "tome_dex") {
            str += " You find a tome of dexterity!";
            this._dexterity += 1;
        } else if (what._contents == "ration") {
            str += " You find a ration of fish.";
            this._currency += 1;
        }
        console.debug("A BOX END"+this.s());
        Game.emptyBox(what._id);
        Game.toast = str;
        return true;
    };
    return this._interact(Game.boxSigil, cb.bind(this));
}

Player.prototype._interact = function(checkType, callbackFn) {
    var dirs = ROT.DIRS[4];

    for (var i=0; i<dirs.length; i++) {
        var dir =  dirs[i];
        var newX = this._x + dir[0];
        var newY = this._y + dir[1];
        var newKey = newX+","+newY;
        var where = Game.ent[newKey];
        if (where == undefined) continue;
        for (let w of where) {
            if (w._type == checkType) {
                return callbackFn(w);
            }
        }
    }
    return false;
}

Player.prototype._startEncounter = function() {
    var fi = Game.hasFishAt(this.getX(), this.getY());
    if (fi !== false) {
        var f = Game.fish[fi];
        console.debug("! "+f.s());
        return this._encounter(f);
    }
    return false;
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
        Game.updS();
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
                        return true;
                    }
                } else {
                    console.debug("!! WTF");
                    return true;
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
                Game.toast = "The fish got away.";
                return true;
            }
        } else if (dexDiff == -1 || dexDiff == -2) {
            var hookPerc = ROT.RNG.getPercentage();
            if (hookPerc <= 20) {
                hooked = true;
                continue;
            } else {
                console.debug("!! Fish got away "+hookPerc+"/20");
                Game.toast = "The fish got away.";
                return true;
            }
        } else {
            console.debug("!! Fish too strong");
            Game.toast = "The fish is too strong.";
            return true;
        }
    }
    console.debug("!! post. success:"+success);
    Game.toast = "You caught the fish!";
    var rewardPerc = ROT.RNG.getPercentage();
    if (rewardPerc <= 50) {
        this._currency += 1;
    } else {
        this._currency += 2;
    }
    Game.removeEnemy(enemy);
    return true;
}

Player.prototype._fillEnergy = function() {
    if (this._currency < 1) {
        // @TODO beep
        return false;
    }
    this._currency -= 1;
    this._energy += 5;
    return true;
}