var Game = {
    display: null,
    engine: null,
    // key = "x,y" | value = sigil
    map: {},
    // entities
    player: null,
    boss: null,
    fish: {},
    // just map keys
    boxes: [],
    ports: [],
    doors: [],
    landCells: [],
    waterCells: [],

    // general game params
    width: 120,
    height: 40,
    fontSize: 16,
    statusLines: 3,
    statusOffsetX: 3,
    statusOffsetY: 1,

    numFish: 3,
    numBoxes: 3,
    numPorts: 1,
    numDoors: 0,

    // sigils
    defaultSigil: " ",
    bossSigil: "$",
    boxSigil: "!",
    doorSigil: "^",
    fishSigil: "%",
    playerSigil: "@",
    portSigil: "#",

    fishTypes: ["salmon", "tuna", "trout"],

    bgDefault: "#757358",
    bgText: "#000",
    bossColor: "#f0f",
    boxColor: "#fff",
    doorColor: "#fff",
    doorBgColor: "#00f",
    fishColor: "#000",
    fgText: "#eee",
    playerColor: "#ff0",
    portColor: "#f00",
    portBgColor: "#4d2600",
    waterColor: "#06c",

    init: function() {
        var displayOpt = {width: this.width, height: this.height+this.statusLines, fontSize: this.fontSize, bg: this.bgDefault};
        this.display = new ROT.Display(displayOpt);
        document.body.appendChild(this.display.getContainer());
        
        this._generateMap();

        var scheduler = new ROT.Scheduler.Simple();
        scheduler.add(this.player, true);
        //scheduler.add(this.boss, true);

        this.engine = new ROT.Engine(scheduler);
        this.engine.start();

        console.debug("eoinit ");
        console.debug(this);
        this._drawStatus();
    },

    _drawStatus: function() {
        for(var x=0;x<this.width;x++) {
            for(var y=this.height;y<this.height+this.statusLines;y++) {
                this.draw(x, y, " ", this.fgText, this.bgText);
            }
        }
        this.display.draw(this.statusOffsetX, this.height+this.statusOffsetY, this.playerSigil, this.playerColor, this.bgText);
        var str = "%b{black}You have %c{green}"+this.player.getEnergy()+"%c{} energy.%b{}";
        this.display.drawText(this.statusOffsetX+2, this.height+this.statusOffsetY, str);
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
        //map.connect(this.display.DEBUG);
        console.debug("map", map);

        this._generateBoxes(this.landCells, this.waterCells);
        this._generatePorts(this.landCells, this.waterCells);
        this._generateDoors(this.waterCells);
        this._drawWholeMap();

        this._generateEntities(this.waterCells, this.landCells);
    },

    _generateEntities: function(waterCells, landCells) {
        this.player = this._createBeing(Player, waterCells);
        this.boss = this._createBeing(Fish, waterCells, ["shark", true]);
        console.debug("boss", this.boss);
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
            var f = this._createBeing(Fish, waterCells);
            // randomize fish type
            var typeIndex = Math.floor(ROT.RNG.getUniform() * this.fishTypes.length);
            f._type = this.fishTypes[typeIndex];
            this.fish[i] = f;
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

                this.map[key] = this.boxSigil;
                this.boxes.push(key);
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

                this.map[key] = this.portSigil;
                this.ports.push(key);
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
                    this.map[key] = this.doorSigil;
                    this.doors.push(key);
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
        return !(this.map[key] != this.defaultSigil && this.map[key] != undefined);
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

    _drawWholeMap: function() {
        for (var key in this.map) {
            var parts = key.split(",");
            var x = parseInt(parts[0]);
            var y = parseInt(parts[1]);
            var sigil = this.map[key];
            this.draw(x, y, sigil)
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


var Fish = function(x, y, type, isBoss) {
    this._x = x;
    this._y = y;
    this._type = type;
    this._isBoss = false;
    if (isBoss === true) {
        this._isBoss = true;
    }
    this._draw();
}
Fish.prototype.getSpeed = function() { return 100; }
Fish.prototype.getX = function() { return this._x; }
Fish.prototype.getY = function() { return this._y; }
Fish.prototype._draw = function() {
    var sigil = Game.fishSigil;
    var color = Game.fishColor;
    if (this._isBoss) {
        sigil = Game.bossSigil;
        color = Game.bossColor
    }
    Game.draw(this._x, this._y, sigil, color);
}