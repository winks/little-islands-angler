var Game = {
    display: null,
    engine: null,
    map: {},
    player: null,
    boss: null,
    fish: {},
    boxes: [],
    ports: [],

    width: 120,
    height: 40,
    fontSize: 16,
    statusLines: 3,
    statusOffsetX: 3,
    statusOffsetY: 1,

    numFish: 3,
    numBoxes: 3,
    numPorts: 1,

    defaultSigil: " ",
    bossSigil: "$",
    boxSigil: "!",
    fishSigil: "%",
    playerSigil: "@",
    portSigil: "#",

    fishTypes: ["salmon", "tuna", "trout"],

    bgDefault: "#757358",
    bgText: "#000",
    bossColor: "#f0f",
    boxColor: "#fff",
    fishColor: "#000",
    fgText: "#eee",
    playerColor: "#ff0",
    portColor: "#f00",
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
        var waterCells = [];
        var landCells = [];
        map.randomize(0.5);
        for (var i=0; i<4; i++) map.create();

        var digCallback = function(x, y, value) {
            //console.debug("cb "+x+","+y+":"+value);
            var key = x+","+y;
            if (value) {
                landCells.push(key);
                return;
            }
            this.map[key] = " ";
            waterCells.push(key);
        }

        map.create(digCallback.bind(this));
        //map.connect(this.display.DEBUG);
        console.debug(map);

        this._generateBoxes(landCells);
        this._generatePorts(landCells);
        this._drawWholeMap();

        this._generateEntities(waterCells, landCells);
    },

    _generateEntities: function(waterCells, landCells) {
        this.player = this._createBeing(Player, waterCells);
        this.boss = this._createBeing(Fish, waterCells, ["shark", true]);
        console.debug("boss", this.boss);
        this._generateFish(waterCells);
    },

    _createBeing: function(what, waterCells, args) {
        var index = Math.floor(ROT.RNG.getUniform() * waterCells.length);
        var key = waterCells.splice(index, 1)[0];
        var parts = key.split(",");
        var x = parseInt(parts[0]);
        var y = parseInt(parts[1]);
        if (args && args.length > 0) {
            return new what(x, y, ...args);
        } else {
            return new what(x, y);
        }
    },

    _generateFish: function(waterCells) {
        for (var i=0;i<this.numFish;i++) {
            var f = this._createBeing(Fish, waterCells);
            var typeIndex = Math.floor(ROT.RNG.getUniform() * this.fishTypes.length);
            f._type = this.fishTypes[typeIndex];
            this.fish[i] = f;
        }
    },

    _generateBoxes: function(landCells) {
        for (var i=0;i<this.numBoxes;i++) {
            var index = Math.floor(ROT.RNG.getUniform() * landCells.length);
            var key = landCells.splice(index, 1)[0];
            this.map[key] = this.boxSigil;
            this.boxes.push(key);
        }
    },

    _generatePorts: function(landCells) {
        // @TODO check for boxes first
        for (var i=0;i<this.numPorts;i++) {
            var index = Math.floor(ROT.RNG.getUniform() * landCells.length);
            var key = landCells.splice(index, 1)[0];
            this.map[key] = this.portSigil;
            this.ports.push(key);
        }
    },

    _isCoastline: function() {

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
            bgc = this.bgDefault;
        } else if (sigil == this.bossSigil) {
            fgc = this.bossColor;
            bgc = this.waterColor;
        }
        this.display.draw(x, y, sigil, fgc, bgc);
    }

};

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
        this._checkBox();
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