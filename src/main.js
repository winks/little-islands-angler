var Game = {
    display: null,
    engine: null,
    map: {},
    player: null,
    fish: {},

    width: 160,
    height: 80,
    fontSize: 12,
    bgDefault: "#757358",
    numFish: 3,
    numBoxes: 3,
    fishTypes: ["salmon", "tuna", "trout"],
    fishSigil: "%",
    fishColor: "#000",
    playerSigil: "@",
    playerColor: "#ff0",
    waterColor: "#06c",
    boxSigil: "!",
    boxColor: "#fff",
    
    init: function() {
        var displayOpt = {width: this.width, height: this.height, fontSize: this.fontSize, bg: this.bgDefault};
        this.display = new ROT.Display(displayOpt);
        document.body.appendChild(this.display.getContainer());
        
        this._generateMap();

        var scheduler = new ROT.Scheduler.Simple();
        scheduler.add(this.player, true);
        //scheduler.add(this.pedro, true);

        this.engine = new ROT.Engine(scheduler);
        this.engine.start();

        console.debug("eoinit ");
        console.debug(this);
    },
    
    _generateMap: function() {
        var map = new ROT.Map.Cellular(this.width, this.height, { connected: true });
        var freeCells = [];
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
            freeCells.push(key);
        }

        map.create(digCallback.bind(this));
        //map.connect(this.display.DEBUG);
        console.debug(map);

        this._generateBoxes(landCells);
        this._drawWholeMap();

        this.player = this._createBeing(Player, freeCells);
        this._generateFish(freeCells);
    },

    _createBeing: function(what, freeCells) {
        var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
        var key = freeCells.splice(index, 1)[0];
        var parts = key.split(",");
        var x = parseInt(parts[0]);
        var y = parseInt(parts[1]);
        return new what(x, y);
    },

    _generateFish: function(freeCells) {
        for (var i=0;i<this.numFish;i++) {
            var f = this._createBeing(Fish, freeCells);
            var typeIndex = Math.floor(ROT.RNG.getUniform() * this.fishTypes.length);
            f._type = this.fishTypes[typeIndex];
            this.fish[i] = f;
            console.debug(this.fish);
        }
    },

    _generateBoxes: function(landCells) {
        for (var i=0;i<this.numBoxes;i++) {
            var index = Math.floor(ROT.RNG.getUniform() * landCells.length);
            var key = landCells.splice(index, 1)[0];
            this.map[key] = this.boxSigil;
            //console.debug(key)
        }
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
            console.debug("df",x,y, sigil, fgc, bgc);
        } else if (sigil == this.boxSigil) {
            fgc = this.boxColor;
            bgc = this.bgDefault;
        }
        this.display.draw(x, y, sigil, fgc, bgc);
    }

};

var Player = function(x, y) {
    this._x = x;
    this._y = y;
    this._draw();
};
Player.prototype.getSpeed = function() { return 100; }
Player.prototype.getX = function() { return this._x; }
Player.prototype.getY = function() { return this._y; }

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

var Fish = function(x, y, type) {
    this._x = x;
    this._y = y;
    this._type = type;
    this._draw();
}
Fish.prototype.getSpeed = function() { return 100; }
Fish.prototype.getX = function() { return this._x; }
Fish.prototype.getY = function() { return this._y; }
Fish.prototype._draw = function() {
    console.debug("draw fish ",this);
    Game.draw(this._x, this._y, Game.fishSigil, Game.fishColor);
}