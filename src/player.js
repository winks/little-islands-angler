var Player = function(x, y) {
    this._x = x;
    this._y = y;
    this._energy = 30;
    this._energyMax = 30;
    this._strength = 10;
    this._dexterity = 10;
    this._currency = 20;
    this._inventory = [];
    this._activeAction = {};
    this._tempActiveItems = [];
    this._lastLevelUp = "";

    this.addItem(Game.ITEM.LURE_STD, 5);
    this.newAction();
    this._draw();
};
Player.prototype.getSpeed = function() { return 100; }
Player.prototype.getX = function() { return this._x; }
Player.prototype.getY = function() { return this._y; }
Player.prototype.getEnergy = function() { return this._energy; }
Player.prototype.getEnergyMax = function() { return this._energyMax; }
Player.prototype.getCurrency = function() { return this._currency; }
Player.prototype.getStr = function() { return this._strength; }
Player.prototype.getDex = function() { return this._dexterity; }
Player.prototype.getInv = function() { return this._inventory; }
Player.prototype.randomMove = function() {
    var xyk = Game._getRandPos(Game.waterCells);
    this._x = xyk[0];
    this._y = xyk[1];
    this._draw();
    console.debug("LUP move player to",xyk);
}
Player.prototype.levelUp = function(e) {
    var perc = ROT.RNG.getPercentage();
    var str = "";
    if (perc <= 33) {
        Game.ITEM.TOME_DEX.resolve();
        str += "Your dexterity has increased";
    } else if (perc <= 66) {
        Game.ITEM.TOME_STR.resolve();
        str += "Your strength has increased";
    } else {
        Game.ITEM.TOME_ENE.resolve(3);
        Game.ITEM.INSTA_ENE.resolve(3);
        str += "Your maximum energy has increased";
    }
    var num = 3;
    this.addItem(Game.ITEM.LURE_STD, num);
    str += " and you got "+num+" "+Game.ITEM.LURE_STD.long+"s as a level up bonus.";
    //Game.toast = str;
    this._lastLevelUp = str;

    // remove items that are active for one level
    console.debug("item cleanup start:",this._tempActiveItems, this._inventory);
    for (var i=0; i<this._tempActiveItems.length; i++) {
        var curIdx = this._tempActiveItems[i];

        this.removeItem(Game.ITEM[curIdx]);
        for (var ii=0; ii<this._inventory.length; ii++) {
            if (this._inventory[ii]._id == curIdx) {
                this._inventory[ii].deactivate();
            }
        }
        console.debug("post",this._inventory);
    }
    this._tempActiveItems = [];
    console.debug("item cleanup end:",this._tempActiveItems, this._inventory);
}
Player.prototype.newAction = function(e) {
    this._activeAction = {
        hooked: false,
        enemy: null,
        finished: false
    };
}
Player.prototype.addEnergyMax = function(e) {
    this._energyMax += e;
}
Player.prototype.addEnergy = function(e) {
    this._energy += e;
    if (this._energy > this._energyMax) {
        this._energy = this._energyMax;
    }
}
Player.prototype.loseEnergy = function(e) {
    this._energy -= e;
}
Player.prototype.addCurrency = function(e) {
    this._currency += e;
}
Player.prototype.loseCurrency = function(e) {
    this._currency -= e;
}
Player.prototype.addItem = function(item, count) {
    for (var i=0; i<this._inventory.length; i++) {
        if (this._inventory[i].id() == item.id) {
            this._inventory[i]._count += count;
            console.debug("II you gain +"+count+" of "+this._inventory[i].s());
            return;
        }
    }
    var it = new InventoryItem(item.id, count, false);
    this._inventory.push(it);
    console.debug("II you gain "+count+" of "+it.s());
}
Player.prototype.removeItem = function(item, count) {
    if (!count || count < 1) count = 1;
    for (var i=0; i<this._inventory.length; i++) {
        if (this._inventory[i].id() == item.id) {
            this._inventory[i]._count -= count;
            console.debug("II you lose -"+count+" of "+this._inventory[i].s());
            return
        }
    }
}

Player.prototype.act = function() {
    Game.engine.lock();
    window.addEventListener("keydown", this);
}

Player.prototype.handleEvent = function(ev) {
    var code = ev.code;

    var unlock = function(rv) {
        if (rv) {
            Game.updS();
        }
        window.removeEventListener("keydown", this);
        Game.engine.unlock();
    }

    // a modal dialog for a shop
    if (Game.shopOpen) {
        if (code == "Escape" || code == "KeyB") {
            Game.shopOpen = false;
            Game.closePanel();
            return unlock(true);
        }
        var lookup = {};
        for (var i=1; i<=9; i++) {
            lookup["Digit"+i] = i;
        }
        lookup["Digit0"] = 0;
        if (lookup[code]) {
            var idx = lookup[code];
            var inv = Game.SHOP[idx];
            var name = inv.item.name;
            if (inv.item.long) name = inv.item.long;
            console.debug("BUY",code,idx,inv);
            if (this._currency >= inv.price) {
                if (Game.gui) {
                    Game.toast = "You buy "+inv.units+" "+name+".";
                } else {
                    Game.toast = "You buy "+inv.units+" %c{white}"+name+".";
                }
                inv.item.resolve(inv.units);
                this._currency -= inv.price;
                Game.updS();
            } else {
                Game.toast = "Insufficient funds.";
                Game.updS();
            }
        }
        return;
    } else if (Game.helpOpen) {
        if (code == "Escape" || code == "KeyH") {
            Game.closePanel();
            Game.helpOpen = false;
            return unlock(true);
        }
        return;
    } else if (Game.introOpen) {
        if (code == "Escape" || code == "Space" || code == "Enter") {
            Game.closePanel();
            Game.introOpen = false;
            return unlock(true);
        }
        return;
    }

    var lookupDigit = {};
    for (var i=0; i<=9; i++) {
        lookupDigit["Digit"+i] = i;
    }
    if (lookupDigit[code]) {
        var idx = lookupDigit[code];
        if (code == "Digit0") idx = 10;
        console.debug("USE ",idx);
        if (this._inventory.length < idx) {
            console.debug("USE too short");
            return unlock(false);
        }
        var item = this._inventory[idx-1];
        if (item._active) {
            console.debug("USE already active");
            return unlock(false);
        }
        if (Game.ITEM[item._id].group == 0) {
            console.debug("USE passive item");
            return unlock(false);
        }
        console.debug("USEx",item);
        if (Game.ITEM[item._id].group > 0) {
            for (var i=0; i<this._inventory.length; i++) {
                //console.debug("USE group",item.group,"idx",i)
                if (i == idx-1) continue;
                var oId = this._inventory[i]._id;
                if (Game.ITEM[oId].group == Game.ITEM[item._id].group && this._inventory[i]._active) {
                    console.debug("USE group A");
                    this._inventory[i].deactivate();
                    item.activate();
                    return unlock(true);
                }
            }
            this._tempActiveItems.push(item._id);
            item.activate();
        } else {
            item.activate();
        }
        return unlock(true);
    }

    // enter to finish level, keyCode 13
    if (code == "Enter" || code == "NumpadEnter") {
        var rv = this._usePort();
        return unlock(rv);
    }
    // b to buy, keyCode 66
    if (code == "KeyB") {
        var rv = this._useShop();
        return unlock(rv);
    }
    // h for help, keyCode 72
    if (code == "KeyH") {
        var rv = this._showHelp();
        return unlock(rv);
    }
    // space for fishing and boxes, keyCode 32
    if (code == "Space" || code == "KeyF") {
        var rv = this._startEncounter();
        if (rv) {
            unlock(rv);
            return;
        }
        rv = this._openBox();
        return unlock(rv);
    }
    // e to eat, keyCode 69
    if (code == "KeyE") {
        var rv = this._fillEnergy();
        return unlock(rv);
    }
    // i to inspect, keyCode 73
    if (code == "KeyI") {
        var rv = this._inspect();
        return unlock(rv);
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
    var fi = Game.hasFishAt(this.getX(), this.getY());
    if (fi !== false) {
        var f = Game.fish[fi];
        if (f._isBoss) {
            Game.toast = "You spot a special fish.";
        } else if (f._isPredator) {
            Game.toast = "You spot a predatory fish.";
        } else {
            Game.toast = "You spot a fish.";
        }
    }
    Game.update();
    return unlock(false);
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

Player.prototype._useShop = function() {
    var cb = function(what) {
        console.debug("A shop");
        var str = "You shop at the port.";
        Game.openShop();
        Game.toast = str;
        Game.updS();
        return true;
    };
    return this._interact(Game.portSigil, cb.bind(this));
}

Player.prototype._showHelp = function() {
    Game.openHelp();
    Game.toast = "";
    Game.updS();
    return true;
}

Player.prototype._showIntro = function(level) {
    Game.openIntro(level);
    Game.toast = "";
    Game.updS();
    return true;
}

Player.prototype._openBox = function() {
    var cb = function(what) {
        console.debug("A BOX ("+what.s()+") "+this.s());
        var str = "You rummage through the reed.";
        this.loseEnergy(1);
        if (!what._contents || what._contents == Game.ITEM.NOTHING) {
            str += " You find nothing.";
        } else if (what._contents == Game.ITEM.INSTA_ENE) {
            var d = what._contents.long;
            if (!d) d = what._contents.name;
            str += " You find a "+d+".";
            Game.ITEM.INSTA_ENE.resolve();
        } else {
            var d = what._contents.long;
            if (!d) d = what._contents.name;
            str += " You find a "+d+".";
            this.addItem(what._contents, 1);
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

Player.prototype._hasCorrectLure = function(fish) {
    var lures = [Game.ITEM.LURE_STD, Game.ITEM.LURE_ENH];
    if (fish._isBoss) {
        lures = [Game.ITEM.LURE_BOSS];
    }
    for (var i=0; i<this._inventory.length; i++) {
        for (let lu of lures) {
            if (this._inventory[i].id() == lu.id && this._inventory[i].c() > 0) {
                return true;
            }
        }
    }
    return false;
}

Player.prototype._startEncounter = function() {
    var fi = Game.hasFishAt(this.getX(), this.getY());
    if (fi !== false) {
        var f = Game.fish[fi];
        //console.debug("! "+f.s());
        if (this._hasCorrectLure(f)) {
            return this._encounterStepDex(f);
        } else {
            Game.toast = "You don't have the correct lure.";
            return true;
        }
    }
    return false;
}

Player.prototype._encounterStepDex = function(enemy) {
    //this.newAction();
    this._activeAction.enemy = enemy;

    var doneFn = function() {
        var rewardPerc = ROT.RNG.getPercentage();
        if (rewardPerc <= 50) {
            this.addCurrency(1);
        } else {
            this.addCurrency(2);
        }

        var str2 = "";
        if (this._activeAction.enemy._isBoss) {
            this.addCurrency(1);
            var drop = Game._generateBoxLoot();
            console.debug("bossloot",drop)
            if (drop != Game.ITEM.NOTHING) {
                drop.resolve();
                str2 += " You find a "+drop.long+".";
            }
            this.removeItem(Game.ITEM.LURE_BOSS, 1);
            Game.removeEnemy(this._activeAction.enemy);
            Game.boss = null;
        } else {
            Game.removeEnemy(this._activeAction.enemy);
        }
        if (this._activeAction.enemy._isPredator) {
            var str = "You killed the fish!";
            var rewardPerc2 = ROT.RNG.getPercentage();
            if (rewardPerc2 <= 10) {
                Game.ITEM.HARPOON_PLUS.resolve();
                str += " You found a "+Game.ITEM.HARPOON_PLUS.long+".";
            } else if (rewardPerc2 <= 30) {
                Game.ITEM.LURE_ENH.resolve();
                str += " You found a "+Game.ITEM.LURE_ENH.long+".";
            } else if (rewardPerc2 <= 50) {
                Game.ITEM.TOME_ENE.resolve(3);
                Game.ITEM.INSTA_ENE.resolve(3);
                str += " You got Energy.";
            }
            Game.toast = str+str2;
        } else {
            var str = "You caught the fish!";
            Game.toast = str+str2;
        }
        this.newAction();
        return true;
    };

    this.loseEnergy(1);
    Game.updS();
    console.debug("!! "+this.s()+" vs "+this._activeAction.enemy.s());

    var dexDiff = this.getDex() - this._activeAction.enemy.getDex();
    console.debug("!! dexDiff "+dexDiff,this._activeAction);
    var rv = false;

    if (this._activeAction.enemy._isPredator) {

        if (dexDiff >= 2) {
            rv = this._encounterStepStrPred(80);
        } else if (dexDiff == 1 || dexDiff == 0 || dexDiff == -1) {
            rv = this._encounterStepStrPred(50);
        } else if (dexDiff == -2 || dexDiff == -3) {
            rv = this._encounterStepStrPred(20);
        } else {
            console.debug("!! Fish too fast");
            Game.toast = "The fish is too fast.";
            return true;
        }
        if (rv && this._activeAction.finished) {
            return doneFn.bind(this)();
        }

    } else {

        if (this._activeAction.hooked) {
            rv = this._encounterStepStr(100);
        } else if (dexDiff >= 2) {
            rv = this._encounterStepStr(90);
        } else if (dexDiff == 1 || dexDiff == 0) {
            rv = this._encounterStepStr(50);
        } else if (dexDiff == -1 || dexDiff == -2) {
            rv = this._encounterStepStr(20);
        } else {
            console.debug("!! Fish too strong");
            Game.toast = "The fish is too strong.";
            return true;
        }
        if (rv && this._activeAction.finished) {
            return doneFn.bind(this)();
        }

    }

    return true;
}

Player.prototype._encounterStepStr = function(perc) {
    var hookedPerc = null;
    if (!this._activeAction.hooked) {
        hookedPerc = ROT.RNG.getPercentage();
        console.debug("!! Hook% "+hookedPerc+"/"+perc);
    }
    if (hookedPerc <= perc) {
        this._activeAction.hooked = true;
        var strDiff = this.getStr() - this._activeAction.enemy.getStr();
        console.debug("!! strDiff "+strDiff);
        if (strDiff >= 2) {
            console.debug("!! Success");
            this._activeAction.finished = true;
            return true;
        } else if (strDiff >= -1 && strDiff < 2) {
            this._activeAction.hooked = true;
            this._activeAction.enemy._strength -= 1;
            console.debug("!! Weakened "+this._activeAction.enemy.s());
            Game.toast = "The fish is hooked but you could not reel it in.";
            return true;
        } else {
            // strDiff <= -2
            var catchPerc = ROT.RNG.getPercentage();
            if (catchPerc <= 50) {
                this._activeAction.hooked = true;
                this._activeAction.enemy._strength -= 1;
                console.debug("!! Weakened "+this._activeAction.enemy.s());
                Game.toast = "The fish is hooked but you could not reel it in.";
                return true;
            } else {
                this._activeAction.hooked = false;
                this._activeAction.finished = false;
                console.debug("!! Fatal: bait gone");
                Game.toast = "The fish got away with the bait.";
                if (this._activeAction.enemy._isBoss) {
                    this.removeItem(Game.ITEM.LURE_BOSS, 1);
                } else {
                    this.removeItem(Game.ITEM.LURE_STD, 1);
                }
                return true;
            }
        }
    } else {
        Game.toast = "The fish did not bite.";
        return true;
    }
}

Player.prototype._encounterStepStrPred = function(perc) {
    var hitPerc = ROT.RNG.getPercentage();
    console.debug("!!p Hit% "+hitPerc+"/"+perc);
    if (hitPerc <= perc) {
        var strDiff = this.getStr() - this._activeAction.enemy.getStr();
        console.debug("!!p strDiff "+strDiff);

        var rv = false;
        var damagePerc = ROT.RNG.getPercentage();
        if (strDiff > 2) {
            if (damagePerc <= 50) {
                this._activeAction.enemy._hp -= 3;
            } else {
                this._activeAction.enemy._hp -= 4;
            }
            Game.toast = "The fish took a massive hit.";
            rv = true;
        } else if (strDiff == 2 && strDiff == 1) {
            if (damagePerc <= 50) {
                this._activeAction.enemy._hp -= 2;
            } else {
                this._activeAction.enemy._hp -= 3;
            }
            Game.toast = "The fish took a hit.";
            rv = true;
        } else {
            // strDiff <= 0
            if (damagePerc <= 50) {
                this._activeAction.enemy._hp -= 1;
            } else {
                this._activeAction.enemy._hp -= 2;
            }
            Game.toast = "The fish took a weak hit.";
            rv = true;
        }
        if (this._activeAction.enemy._hp <= 0) {
            this._activeAction.finished = true;
        }
        return rv;
    } else {
        Game.toast = "You miss.";
        return true;
    }
}

Player.prototype._fillEnergy = function() {
    if (this._currency < 1) {
        // @TODO beep
        return false;
    }
    this.loseCurrency(1);
    this.addEnergy(5);
    return true;
}

Player.prototype._inspect = function() {
    var fi = Game.hasFishAt(this.getX(), this.getY());
    if (fi !== false) {
        var f = Game.fish[fi];
        //var str = "This fish D "+f.getDex()+" S "+f.getStr();

        var dexDiff = this.getDex() - f.getDex();
        var strDiff = this.getStr() - f.getStr();
        var str = "";
        if (dexDiff < -2) {
            str = "This one will not bite.";
        } else if (strDiff < -3) {
            str = "This fish seems very strong.";
        } else if (dexDiff == -2 || dexDiff == -1) {
            if (strDiff > 1) {
                str = "This fish seems agile and weak.";
            } else if (strDiff == 1 || strDiff == 0 || strDiff == -1) {
                str = "This fish seems agile.";
            } else if (strDiff == -2 || strDiff == -3) {
                str = "This fish seems agile and strong.";
            }
        } else if (dexDiff == 0 || dexDiff == 1) {
            if (strDiff > 1) {
                str = "This fish seems weak.";
            } else if (strDiff == 1 || strDiff == 0 || strDiff == -1) {
                str = "This fish seems compareable.";
            } else if (strDiff == -2 || strDiff == -3) {
                str = "This fish seems strong.";
            }
        } else if (dexDiff > 1) {
            if (strDiff > 1) {
                str = "This fish seems tractable and weak.";
            } else if (strDiff == 1 || strDiff == 0 || strDiff == -1) {
                str = "This fish seems tractable.";
            } else if (strDiff == -2 || strDiff == -3) {
                str = "This fish seems tractable and strong.";
            }
        }
        Game.toast = str;
        return true;
    }
    return false;
}

Player.prototype.s = function(prefix, suffix) {
    var msg = "[Player: DEX: "+this.getDex()+" STR: "+this.getStr()+"  @ ("+this.k()+")]";
    if (prefix) msg = prefix + msg;
    if (suffix) msg = msg + suffix;
    return msg;
}

Player.prototype.k = function() {
    return this._x+","+this._y;
}

var InventoryItem = function(id, count, active) {
    this._id = id;
    this._count = count;
    this._active = false;
    if (active) this._active = true;
}
InventoryItem.prototype.id = function() { return this._id; }
InventoryItem.prototype.c = function() { return this._count; }
InventoryItem.prototype.s = function() {
    return "[InvItem id:"+this._id+" c:"+this._count+" x:"+Game.ITEM[this._id].name+"]";
}
InventoryItem.prototype.pretty = function() {
    return Game.ITEM[this._id].name;
}
InventoryItem.prototype.slug = function() {
    return Game.ITEM[this._id].name.toLowerCase().replace(" ", "-");
}
InventoryItem.prototype.activate = function() { this._active = true; }
InventoryItem.prototype.deactivate = function() { this._active = false; }