var Game = {
    display: null,
    engine: null,
    // key = "x,y"
    map: {},
    mapOff: {},
    // entities
    player: null,
    boss: null,
    fish: {},
    ent: {},
    shopOpen: false,
    // just map keys
    landCells: [],
    waterCells: [],
    toast: "",

    gameLost: false,
    levelFinished: false,
    gameFinished: false,
    currentLevel: 1,

    // general game params
    width: 86,
    height: 30,
    fontSize: 22,
    statusLines: 6,
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
        
        this.nextLevel();
        this._generatePlayer(this.waterCells);
        this.startLevel();
        this.update();

        this.player._showIntro();
    },

    checkGameState: function() {
        if (this.player.getEnergy() < 1) {
            alert("GAME OVER");
            Game.engine.lock();
            window.removeEventListener("keydown", this);
        }
        if (this.gameFinished) {
            alert("YOU WON");
            Game.engine.lock();
            window.removeEventListener("keydown", this);
        }
        if (this.levelFinished) {
            console.debug("Level finished");
            this.nextLevel();
            this.currentLevel++;
            this.player.levelUp();
            this.update();
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
                    console.debug("The box at "+this.ent[k][i].s()+" is now? empty.");
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

    nextLevel: function() {
        this.map = {};
        this.landCells = [];
        this.waterCells = [];
        this.boss = null;
        this.fish = {};
        this.ent = {};
        this.toast = "";
        this.levelFinished = false;

        this._generateMap();
    },

    startLevel: function() {
        var scheduler = new ROT.Scheduler.Simple();
        scheduler.add(this.boss, true);
        for (let fi of Object.keys(this.fish)) {
            scheduler.add(this.fish[fi], true);
        }
        scheduler.add(this.player, true);

        this.engine = new ROT.Engine(scheduler);
        this.engine.start();

        console.debug("game", this);
    },

    closePanel: function() {
        this.shopOpen = false;
        this.helpOpen = false;
        this.update();
    },

    openShop: function() {
        this._drawPanel();
        this.shopOpen = true;

        var offx = 4;
        var offy = 4;
        var str = "";
        for (let k of Object.keys(Game.SHOP)) {
            var inv = Game.SHOP[k];
            var name = inv.item.name;
            if (inv.item.long) name = inv.item.long;
            var plural = "s";
            if (inv.price == 1) plural = "";
            str =  "%b{black}%c{yellow}"+k+") %c{grey}Buy "+inv.units+" %c{white}"+name;
            str += "%c{grey} for %c{chocolate}"+inv.price+"%c{grey} ration"+plural+" of fish.%c{}%b{}";
            this.display.drawText(offx, offy, str);
            offy += 2;
        }
    },

    openHelp: function() {
        this._drawPanel();
        this.helpOpen = true;

        var offx = 4;
        var offy = 4;
        var help = [
            "Help (ESC or H to leave)",
            "",
            "arrow keys to move",
            "<space> to catch fish ("+this.fishSigil+" "+this.predatorSigil+" "+this.bossSigil+") or search reed "+this.boxSigil,
            "<enter> to finish the level at a port "+this.portSigil,
            "<b> to buy items at a port",
            "<e> to eat fish for energy",
            "<i> to inspect a fish"
        ];
        for (let k of help) {
            var str = "%b{black}%c{grey}"+k;
            this.display.drawText(offx, offy, str);
            offy += 2;
        }
    },

    openIntro: function() {
        this._drawPanel();
        this.helpOpen = true;

        var offx = 4;
        var offy = 4;
        var help = [
            "Welcome to tbf",
            "",
            "catch and kill fish, pay 10 rations of fish at the port to progress",
            "",
            "press h for help",
        ];
        for (let k of help) {
            var str = "%b{black}%c{grey}"+k;
            this.display.drawText(offx, offy, str);
            offy += 2;
        }
    },

    _generateMap: function() {
        var map = new ROT.Map.Cellular(this.width, this.height, { connected: true });
        map.randomize(0.5);
        for (var i=0; i<4; i++) map.create();

        var digCallback = function(x, y, value) {
            //console.debug("cb "+x+","+y+":"+value);
            var key = x+","+y;
            if (value) {
                this.mapOff[key] = this.defaultSigil;
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
    },

    _generatePlayer: function(waterCells) {
        this.player = this._createBeing(Player, waterCells);
    },

    _generateEntities: function(waterCells, landCells) {
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

                // always one boss lure in the first box
                if (i == 0) {
                    var id = "bo"+i;
                    this.ent[key].push(new Site(xyk[0], xyk[1], id, this.boxSigil, Game.ITEM.LURE_BOSS));
                    break;
                }

                var boxPerc = ROT.RNG.getPercentage();
                var treasure = null;
                if (boxPerc <= 10) {
                    treasure = Game.ITEM.LURE_STD;
                } else if (boxPerc <= 20) {
                    treasure = Game.ITEM.LURE_ENH;
                } else if (boxPerc <= 30) {
                    treasure = Game.ITEM.HARPOON_PLUS;
                } else if (boxPerc <= 40) {
                    treasure = Game.ITEM.LINE_STRONG;
                } else if (boxPerc <= 50) {
                    treasure = Game.ITEM.SUPERBERRY;
                } else if (boxPerc <= 60) {
                    treasure = Game.ITEM.INSTA_ENE;
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
        for (var key in this.mapOff) {
            var parts = key.split(",");
            var x = parseInt(parts[0]);
            var y = parseInt(parts[1]);
            var sigil = this.mapOff[key];
            this.draw(x, y, sigil, this.bgDefault, this.bgDefault);
        }
        for (var key in this.map) {
            var parts = key.split(",");
            var x = parseInt(parts[0]);
            var y = parseInt(parts[1]);
            var sigil = this.map[key];
            this.draw(x, y, sigil);
        }
    },

    _drawEntities: function() {
        for (let i of Object.keys(this.fish)) {
            var f = this.fish[i];
            if (f) f._draw();
        }
        for (let ix of Object.keys(this.ent)) {
            for (let e of this.ent[ix]) {
                if (e) e._draw();
            }
        }
        if (this.boss) this.boss._draw();
        if (this.player) this.player._draw();
    },

    _drawPanel: function() {
        for(var x=1; x<this.width-1; x++) {
            for(var y=1; y<this.height-1; y++) {
                this.draw(x, y, " ", this.fgText, this.bgText);
            }
        }
    },

    _drawStatus: function() {
        for(var x=0;x<this.width;x++) {
            for(var y=this.height;y<this.height+this.statusLines;y++) {
                this.draw(x, y, " ", this.fgText, this.bgText);
            }
        }
        this.display.draw(this.statusOffsetX, this.height+this.statusOffsetY, this.playerSigil,
                this.playerColor, this.bgText);

        var energy = this.player.getEnergy();
        if (energy < 10) energy = " "+energy;
        var str = "%b{black}Energy: %c{green}"+energy+"%c{}/";
        str += "%c{green}"+this.player.getEnergyMax()+"%c{}";
        str += " DEX: %c{chocolate}"+this.player.getDex()+"%c{}";
        str += " STR: %c{red}"+this.player.getStr()+"%c{}";
        str += " - You have %c{yellow}"+this.player.getCurrency()+"%c{} rations of fish.";
        str += "%b{}";
        this.display.drawText(this.statusOffsetX+2, this.height+this.statusOffsetY, str);

        // Level
        var lvlText = "Level "+this.currentLevel;
        var lvlFmt = "%b{black}%c{purple}"+lvlText;
        this.display.drawText(this.width-lvlText.length-1, this.height, lvlFmt);

        // Help
        var helpText = "Help: h";
        var helpFmt = "%b{black}%c{darkslategrey}"+helpText;
        this.display.drawText(this.width-helpText.length-1, this.height+this.statusLines-1, helpFmt);

        // inventory
        var inv = this.player.getInv();
        var invText = "%b{black}";
        for (var i=0; i<inv.length; i++) {
            var c = inv[i].c();
            //if (c < 2) c = "  ";
            //else c = "%c{cadetblue}"+c+"x%c{}";
            c = "%c{cadetblue}"+c+"x%c{}";
            invText += " %c{darkorchid}"+(i+1)+":%c{}"+c+""+inv[i].pretty();
        }
        invText += "%b{}";
        this.display.drawText(this.statusOffsetX, this.height+this.statusOffsetY+1, invText);

        // status messages
        if (this.toast.length > 0) {
            var s2 = "%b{black}%c{white}"+this.toast+"%c{}%b{}";
            this.display.drawText(this.statusOffsetX, this.height+this.statusOffsetY+3, s2);
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
        } else if (sigil == this.bossSigil) {
            fgc = this.bossColor;
            bgc = this.waterColor;
        } else if (sigil == this.fishSigil) {
            fgc = this.fishColor;
            bgc = this.waterColor;
        } else if (sigil == this.boxSigil) {
            fgc = this.boxColor;
            bgc = this.bgDefault;
        } else if (sigil == this.portSigil) {
            fgc = this.portColor;
            bgc = this.portBgColor;
        } else if (sigil == this.doorSigil) {
            fgc = this.doorColor;
            bgc = this.doorBgColor;
        }
        this.display.draw(x, y, sigil, fgc, bgc);
    }
};
Game.ITEM = {};
Game.ITEM[0] =  {id:0,  name: "nothing",                                    resolve: function()  {} };
Game.ITEM[1] =  {id:1,  name: "Tome of Strength",                           resolve: function()  { Game.player._strength += 1; } };
Game.ITEM[2] =  {id:2,  name: "Tome of Dexterity",                          resolve: function()  { Game.player._dexterity += 1; } };
Game.ITEM[3] =  {id:3,  name: "Tome of Energy",                             resolve: function(x) { if (!x) x = 2; Game.player._energyMax += x; } };
Game.ITEM[11] = {id:11, name: "Lure", long: "Standard Fishing Lure",        resolve: function(x) { Game.player.addItem(Game.ITEM.LURE_STD, x); } };
Game.ITEM[12] = {id:12, name: "Better Lure", long: "Better Fishing Lure",   resolve: function(x) { Game.player.addItem(Game.ITEM.LURE_ENH, x); } };
Game.ITEM[13] = {id:13, name: "Rainbow Fly",                                resolve: function(x) { Game.player.addItem(Game.ITEM.LURE_BOSS, x); } };
Game.ITEM[18] = {id:18, name: "Harpoon+", long: "",                         resolve: function(x) { Game.player.addItem(Game.ITEM.HARPOON_PLUS, x); } };
Game.ITEM[19] = {id:19, name: "Better Line", long: "Stronger Fishing Line", resolve: function(x) { Game.player.addItem(Game.ITEM.LINE_STRONG, x); } };
Game.ITEM[30] = {id:30, name: "Superberry",                                 resolve: function(x) { Game.player.addItem(Game.ITEM.SUPERBERRY, x); } };
Game.ITEM[31] = {id:30, name: "InstaEnergy", long: "a handful of eggs",     resolve: function(x) { if (!x) x = 5; Game.player.addEnergy(x); } };
Game.ITEM[40] = {id:40, name: "Ration of Fish",                             resolve: function()  { Game.player.addCurrency(1); } };

Game.ITEM.NOTHING      = Game.ITEM[0];
Game.ITEM.TOME_STR     = Game.ITEM[1];
Game.ITEM.TOME_DEX     = Game.ITEM[2];
Game.ITEM.TOME_ENE     = Game.ITEM[3];
Game.ITEM.LURE_STD     = Game.ITEM[11];
Game.ITEM.LURE_ENH     = Game.ITEM[12];
Game.ITEM.LURE_BOSS    = Game.ITEM[13];
Game.ITEM.HARPOON_PLUS = Game.ITEM[18];
Game.ITEM.LINE_STRONG  = Game.ITEM[19];
Game.ITEM.SUPERBERRY   = Game.ITEM[30];
Game.ITEM.INSTA_ENE    = Game.ITEM[31];
Game.ITEM.RATION       = Game.ITEM[40];

Game.SHOP = {};
Game.SHOP[1] = {item: Game.ITEM.TOME_DEX, price: 10, units: 1};
Game.SHOP[2] = {item: Game.ITEM.TOME_STR, price: 10, units: 1};
Game.SHOP[3] = {item: Game.ITEM.TOME_ENE, price: 5,  units: 1};
Game.SHOP[4] = {item: Game.ITEM.LURE_STD, price: 1,  units: 3};
Game.SHOP[5] = {item: Game.ITEM.LURE_BOSS, price: 3, units: 1};


var Fish = function(x, y, id, type, isBoss, isPredator) {
    this._x = x;
    this._y = y;
    this._id = id;
    this._type = type;
    this._isBoss = false;
    this._isPredator = false;
    this._hp = 0;
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
    }
    if (isPredator) {
        this._hp = Math.floor((this._strength + this._dexterity)/2) - 3;
    }
    this._draw();
}
Fish.prototype.act = function() {
    if (this._x == Game.player.getX() && this._y == Game.player.getY()) {
        console.debug("nope");
        return;
    }
    var getNextCandidate = function() {
        var dirIdx = Math.floor(ROT.RNG.getUniform() * 8);
            var dir = ROT.DIRS[8][dirIdx];
            var x = this._x + dir[0];
            var y = this._y + dir[1];
            // bounding
            if (x < 0) x = 1;
            if (x > Game.width-1) x = Game.width - 2;
            if (y < 0) y = 1;
            if (y > Game.height-1) y = Game.height - 2;
            return [x, y];
    };
    var move = function() {
        var valid = false;
        while (!valid) {
            var dest = getNextCandidate.bind(this)();
            //console.debug("move f from "+this.k()+" to ",dest);
            // land
            var newKey = dest[0]+","+dest[1];
            if (newKey in Game.map) {
                valid = true;
                // do not swim into other fish
                var fi = Game.hasFishAt(dest[0], dest[1]);
                if (fi !== false && Game.fish[fi].id() != this.id()) {
                    console.debug("avoided fish collision")
                    valid = false;
                }
                // do not swim into the player
                if (dest[0] == Game.player.getX() && dest[0] == Game.player.getY()) {
                    valid = false;
                }
            } else {
                console.debug("move f to land avoided")
            }
        }
        Game.draw(this._x, this._y, Game.defaultSigil);
        this._x = dest[0];
        this._y = dest[1];
        this._draw();
        Game.player._draw();
    };
    var movePerc = ROT.RNG.getPercentage();
    if (this._isBoss) {
        if (movePerc <= 25) {
            move.bind(this)();
        }
    } else if (this._isPredator) {

    } else {
        if (movePerc <= 50) {
            move.bind(this)();
        }
    }
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
    var msg = "[Fish "+this._id+": DEX: "+this._dexterity+" STR: "+this._strength+" @ ("+this.k()+")";
    if (this._isPredator) msg += " HP:"+this._hp+"";
    if (this._isBoss) msg += " BOSS";
    msg += "]";
    if (prefix) msg = prefix + msg;
    if (suffix) msg = msg + suffix;
    return msg;
}
Fish.prototype.id = function() { return this._id; }

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
    Game.draw(this._x, this._y, sigil);
}
Site.prototype.k = function() {
    return this._x+","+this._y;
}
Site.prototype.s = function() {
    return "[Site: "+this._type+ " @ ("+this.k()+")";
}