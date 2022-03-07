var Game = {
    display: null,
    engine: null,
    // key = "x,y"
    map: {},
    // entities
    player: null,
    boss: null,
    fish: {},
    ent: {},
    // just map keys
    landCells: [],
    waterCells: [],
    toast: "",
    treasures: {
        "tome_str": [],
        "tome_dex": [],
        "ration": [],
        "nothing": []
    },

    gameLost: false,
    levelFinished: false,

    // general game params
    width: 86,
    height: 30,
    fontSize: 22,
    statusLines: 4,
    statusOffsetX: 3,
    statusOffsetY: 1,

    numFish: 10,
    numPredators: 5,
    numBoxes: 3,
    numPorts: 1,
    numDoors: 0,

    volCurrencyToExit: 10,

    // sigils
    defaultSigil: " ",
    bossSigil: "*",
    boxSigil: "$",
    doorSigil: "^",
    fishSigil: "%",
    playerSigil: "@",
    predatorSigil: "!",
    portSigil: "#",

    fishTypes: ["salmon", "tuna", "trout"],
    predTypes: ["pred1", "pred2"],

    bgDefault: "#757358",
    bgText: "#000",
    bossColor: "#f0f",
    boxColor: "#fff",
    doorColor: "#fff",
    doorBgColor: "#00f",
    fishColor: "#000",
    fgText: "#eee",
    playerColor: "#ff0",
    predatorColor: "#ccc",
    portColor: "#f00",
    portBgColor: "#4d2600",
    waterColor: "#06c",

    init: function() {
        var displayOpt = {
            width: this.width,
            height: this.height+this.statusLines,
            fontSize: this.fontSize,
            bg: this.bgDefault
        };
        this.display = new ROT.Display(displayOpt);
        document.body.appendChild(this.display.getContainer());
        
        this._generateMap();

        var scheduler = new ROT.Scheduler.Simple();
        scheduler.add(this.player, true);
        //scheduler.add(this.boss, true);

        this.engine = new ROT.Engine(scheduler);
        this.engine.start();

        console.debug("game", this);
        this._drawStatus();
    },

    checkGameState: function() {
        if (this.player.getEnergy() < 1) {
            alert("GAME OVER");
            Game.engine.lock();
            window.removeEventListener("keydown", this);
        }
        if (this.levelFinished) {
            alert("YOU WON");
            Game.engine.lock();
            window.removeEventListener("keydown", this);
        }
    },

    update: function() {
        this._drawMapTiles();
        this._drawEntities();
        this._drawStatus();
        this.checkGameState();
    },
    updE: function() {
        this._drawEntities();
        this.checkGameState();
    },
    updS: function() {
        this._drawStatus();
        this.checkGameState();
    },

    removeEnemy: function(fish) {
        delete this.fish[fish._id];
    },

    emptyBox: function(id) {
        for (let k of Object.keys(this.ent)) {
            console.debug(k);
            for (let i in this.ent[k]) {
                if (this.ent[k][i]._id == id) {
                    this.ent[k][i]._contents = null;
                    console.debug("The box at "+this.ent[k][i].s()+" is now empty.");
                }
            }
        }
    },

    hasFishAt: function(x, y) {
        for (let i of Object.keys(this.fish)) {
            var f = this.fish[i];
            if (x == f.getX() && y == f.getY()) {
                return i;
            }
        }
        return false;
    },

    _generateMap: function() {
        var map = new ROT.Map.Cellular(this.width, this.height, { connected: true });
        map.randomize(0.5);
        for (var i=0; i<4; i++) map.create();

        var digCallback = function(x, y, value) {
            //console.debug("cb "+x+","+y+":"+value);
            var key = x+","+y;
            if (value) {
                this.landCells.push(key);
                return;
            }
            this.map[key] = this.defaultSigil;
            this.waterCells.push(key);
        }

        map.create(digCallback.bind(this));
        console.debug("map", map);

        this._generateBoxes(this.landCells, this.waterCells);
        this._generatePorts(this.landCells, this.waterCells);
        this._generateDoors(this.waterCells);
        this._generateEntities(this.waterCells, this.landCells);

        this.update();
    },

    _generateEntities: function(waterCells, landCells) {
        this.player = this._createBeing(Player, waterCells);
        var bossId = "boss";
        this.boss = this._createBeing(Fish, waterCells, [bossId, "shark", true]);
        this.fish[bossId] = this.boss;
        this._generateFish(waterCells);
    },

    _createBeing: function(what, waterCells, args) {
        var xyk = this._getRandPos(waterCells);
        if (args && args.length > 0) {
            return new what(xyk[0], xyk[1], ...args);
        } else {
            return new what(xyk[0], xyk[1]);
        }
    },

    _generateFish: function(waterCells) {
        for (var i=0;i<this.numFish;i++) {
            var typeIndex = Math.floor(ROT.RNG.getUniform() * this.fishTypes.length);
            var id = "fi"+i;
            var f = this._createBeing(Fish, waterCells, [id, this.fishTypes[typeIndex], false, false]);
            this.fish[id] = f;
        }
        for (var i=0;i<this.numPredators;i++) {
            var typeIndex = Math.floor(ROT.RNG.getUniform() * this.predTypes.length);
            var id = "pr"+i;
            var f = this._createBeing(Fish, waterCells, [id, this.fishTypes[typeIndex], false, true]);
            this.fish[id] = f;
        }
    },

    _generateBoxes: function(landCells, waterCells) {
        for (var i=0; i<this.numBoxes; i++) {
            while (true) {
                var xyk = this._getRandPos(landCells);
                var key = xyk[2];
                if (!this._isFreeTile(key)) {
                    console.debug("WARN box-on-box collision at "+key+" :: "+this.map[key]);
                    continue;
                }
                var res = this._isCoastline(xyk[0], xyk[1], waterCells);
                if (res === false) {
                    continue;
                }

                if (!(key in this.ent)) {
                    this.ent[key] = [];
                }
                var boxPerc = ROT.RNG.getPercentage();
                var treasure = null;
                if (boxPerc <= 5) {
                    treasure = "tome_str";
                } else if (boxPerc <= 10) {
                    treasure = "tome_dex";
                } else if (boxPerc <= 50) {
                    treasure = "ration";
                } else {
                    treasure = null;
                }
                var id = "bo"+i;
                this.ent[key].push(new Site(xyk[0], xyk[1], id, this.boxSigil, treasure));
                break;
            }
        }
    },

    _generatePorts: function(landCells, waterCells) {
        for (var i=0; i<this.numPorts; i++) {
            while (true) {
                var xyk = this._getRandPos(landCells);
                var key = xyk[2];
                if (!this._isFreeTile(key)) {
                    console.debug("WARN port-on-box collision at "+key);
                    continue;
                }
                var res = this._isCoastline(xyk[0], xyk[1], waterCells);
                if (res === false) {
                    continue;
                }

                if (!(key in this.ent)) {
                    this.ent[key] = [];
                }
                var id = "po"+i;
                this.ent[key].push(new Site(xyk[0], xyk[1], id, this.portSigil));
                break;
            }
        }
    },

    _generateDoors: function(waterCells) {
        for (var i=0; i<this.numDoors; i++) {
            while (true) {
                var xyk = this._getRandPos(waterCells);
                var key = xyk[2];
                if (this._isMapBorder(xyk[0],xyk[1])) {
                    if (!(key in this.ent)) {
                        this.ent[key] = [];
                    }
                    var id = "do"+i;
                    this.ent[key].push(new Site(xyk[0], xyk[1], id, this.doorSigil));
                    break;
                }
            }
        }
    },

    _getRandKey: function(cells) {
        var index = Math.floor(ROT.RNG.getUniform() * cells.length);
        var key = cells.splice(index, 1)[0];
        return key;
    },

    _getRandPos: function(cells) {
        var key = this._getRandKey(cells);
        var parts = key.split(",");
        var x = parseInt(parts[0]);
        var y = parseInt(parts[1]);
        return [x, y, key];
    },

    _isFreeTile: function(key) {
        return this.ent[key] == undefined;
    },

    _isCoastline: function(x, y, waterCells) {
        var cardinal = ROT.DIRS[4];
        for (var i=0; i<cardinal.length; i++) {
            var dir = cardinal[i];
            var newX = x + dir[0];
            var newY = y + dir[1];
            var newKey = newX+","+newY;
            if (waterCells.includes(newKey)) {
                return [newX, newY, newKey];
            }
        }
        return false;
    },

    _isMapBorder: function(x, y) {
        return ((x == 0 || x == this.width-1) || (y == 0 || y == this.height-1));
    },


    _drawMapTiles: function() {
        for (var key in this.map) {
            var parts = key.split(",");
            var x = parseInt(parts[0]);
            var y = parseInt(parts[1]);
            var sigil = this.map[key];
            this.draw(x, y, sigil)
        }
    },

    _drawEntities: function() {
        //console.debug("DRW",this.fish);
        for (let i of Object.keys(this.fish)) {
            var f = this.fish[i];
            if (f) f._draw();
        }
        //console.debug(this.ent);
        for (let ix of Object.keys(this.ent)) {
            for (let i of this.ent[ix]) {
                var e = this.ent[i];
                if (e) e._draw();
            }
        }
        this.boss._draw();
        this.player._draw();
    },

    _drawStatus: function() {
        for(var x=0;x<this.width;x++) {
            for(var y=this.height;y<this.height+this.statusLines;y++) {
                this.draw(x, y, " ", this.fgText, this.bgText);
            }
        }
        this.display.draw(this.statusOffsetX, this.height+this.statusOffsetY, this.playerSigil,
                this.playerColor, this.bgText);

        var str = "%b{black}Energy: %c{green}"+this.player.getEnergy()+"%c{}";
        str += " DEX: %c{purple}"+this.player.getDex()+"%c{}";
        str += " STR: %c{red}"+this.player.getStr()+"%c{}";
        str += " - You have %c{yellow}"+this.player.getCurrency()+"%c{} rations of fish.";
        str += "%b{}";
        this.display.drawText(this.statusOffsetX+2, this.height+this.statusOffsetY, str);
        if (this.toast.length > 0) {
            var s2 = "%b{black}"+this.toast+"%b{}";
            this.display.drawText(this.statusOffsetX+2, this.height+this.statusOffsetY+1, s2);
            this.toast = "";
        }
    },

    draw: function(x, y, sigil, fgc_, bgc_) {
        var fgc = "#fff";
        var bgc = this.waterColor;
        if (fgc_ != null) fgc = fgc_;
        if (bgc_ != null) bgc = bgc_;

        if (sigil == this.playerSigil) {
            fgc = this.playerColor;
            bgc = this.waterColor;
        } else if (sigil == this.fishSigil) {
            fgc = this.fishColor;
            bgc = this.waterColor;
            //console.debug("df",x,y, sigil, fgc, bgc);
        } else if (sigil == this.boxSigil) {
            fgc = this.boxColor;
            bgc = this.bgDefault;
        } else if (sigil == this.portSigil) {
            fgc = this.portColor;
            bgc = this.portBgColor;
        } else if (sigil == this.bossSigil) {
            fgc = this.bossColor;
            bgc = this.waterColor;
        } else if (sigil == this.doorSigil) {
            fgc = this.doorColor;
            bgc = this.doorBgColor;
        }
        this.display.draw(x, y, sigil, fgc, bgc);
    }

};

var Fish = function(x, y, id, type, isBoss, isPredator) {
    this._x = x;
    this._y = y;
    this._id = id;
    this._type = type;
    this._isBoss = false;
    this._isPredator = false;
    if (isBoss === true) {
        this._isBoss = true;
    }
    if (isPredator === true) {
        this._isPredator = true;
    }
    this._strength =  5 + 1 + Math.floor(ROT.RNG.getUniform() * 8);
    this._dexterity = 6 + 1 + Math.floor(ROT.RNG.getUniform() * 5);
    if (this._isBoss) {
        this._strength += 2;
        this._dexterity += 2;
    } else if (this._isPredator) {
        this._strength += 1;
        this._dexterity += 1;
    }
    this._draw();
}
Fish.prototype.getSpeed = function() { return 100; }
Fish.prototype.getStr = function() { return this._strength; }
Fish.prototype.getDex = function() { return this._dexterity; }
Fish.prototype.getX = function() { return this._x; }
Fish.prototype.getY = function() { return this._y; }
Fish.prototype._draw = function() {
    var sigil = Game.fishSigil;
    var color = Game.fishColor;
    if (this._isBoss) {
        sigil = Game.bossSigil;
        color = Game.bossColor;
    } else if (this._isPredator) {
        sigil = Game.predatorSigil;
        color = Game.predatorColor;
    }
    Game.draw(this._x, this._y, sigil, color);
}
Fish.prototype.k = function() {
    return this._x+","+this._y;
}
Fish.prototype.s = function(prefix, suffix) {
    var msg = "[Fish  : DEX: "+this._dexterity+" STR: "+this._strength+" @ ("+this.k()+")]";
    if (this._isBoss) msg += " BOSS";
    if (prefix) msg = prefix + msg;
    if (suffix) msg = msg + suffix;
    return msg;
}

var Site = function(x, y, id, type, contents) {
    this._x = x;
    this._y = y;
    this._id = id;
    this._type = type;
    this._contents = contents;
    this._draw();
}
Site.prototype.getX = function() { return this._x; }
Site.prototype.getY = function() { return this._y; }
Site.prototype._draw = function() {
    var sigil = this._type;
    var color = Game.fishColor;
    Game.draw(this._x, this._y, sigil, color);
}
Site.prototype.k = function() {
    return this._x+","+this._y;
}
Site.prototype.s = function() {
    return "[Site: "+this._type+ " @ ("+this.k()+")";
}