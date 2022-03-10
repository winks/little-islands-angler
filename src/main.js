var Game = {
    display: null,
    engine: null,
    gui: true,
    tileSet: null,
    // key = "x,y"
    map: {},
    mapOff: {},
    // entities
    player: null,
    boss: null,
    fish: {},
    ent: {},
    shopOpen: false,
    helpOpen: false,
    introOpen: false,
    // just map keys
    landCells: [],
    waterCells: [],
    fixEdge: true,
    toast: "",

    gameLost: false,
    levelFinished: false,
    gameFinished: false,
    currentLevel: 1,

    // general game params
    width: 54,
    height: 24,
    fontSize: 22,
    statusLines: 3,
    statusOffsetX: 1,
    statusOffsetY: 0,
    tileWidth: 32,
    tileHeight: 32,

    numFish: 10,
    numPredators: 5,
    numBoxes: 3,
    numPorts: 1,
    numDoors: 0,

    volCurrencyToExit: 10,
    huntDistance: 5,

    // sigils
    defaultSigil: " ",
    bossSigil: "*",
    boxSigil: "$",
    doorSigil: "^",
    fishSigil: "%",
    landSigil: ".",
    playerSigil: "@",
    predatorSigil: "!",
    portSigil: "#",
    voidSigil: ")",

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
    treeColor: "#452e0c",
    waterColor: "#06c",

    resize: function() {
        var elements = document.getElementsByTagName("canvas");
        if (elements.length < 1) return;
        var canvas = elements[0];
        var w = window.innerWidth;
        var h = window.innerHeight;
        if (canvas.width < w) {
            canvas.width = w;
        }
    },

    init: function() {
        var displayOpt = {};
        if (!this.gui) {
            this.width = 80;
            this.height = 30;
            displayOpt = {
                width: this.width,
                height: this.height+this.statusLines,
                fontSize: this.fontSize,
                bg: this.bgDefault
            };
        } else {
            this.tileSet = document.createElement("img");
            this.tileSet.src = "assets/tiles32.png";
            console.debug(this.tileSet);
            var iw = this.tileWidth;
            var ih = this.tileHeight;
            displayOpt = {
                layout: "tile",
                bg: "transparent",
                tileWidth: iw,
                tileHeight: ih,
                tileSet: this.tileSet,
                tileMap: {
                    "_": [0, 0],
                    "\"": [1*iw, 0],
                    "^": [2*iw, 0],
                    "/": [3*iw, 0],

                    "[": [4*iw, 0],
                    "]": [5*iw, 0],
                    "{": [6*iw, 0],
                    "}": [7*iw, 0],

                    "(": [8*iw, 0],
                    ")": [9*iw, 0],

                    " ": [0, 1*ih],
                    ".": [1*iw, 1*ih],
                    "$": [2*iw, 1*ih],
                    "#": [3*iw, 1*ih],

                    "%": [4*iw, 1*ih],
                    "!": [5*iw, 1*ih],
                    "*": [6*iw, 1*ih],
                    "@": [7*iw, 1*ih],

                    "A": [8*iw, 1*ih],
                    "B": [9*iw, 1*ih],
                    "C": [10*iw, 1*ih],

                    //,"^": [103, 103]
                },
                width: this.width,
                height: this.height+this.statusLines
            }
        }
        
        this.display = new ROT.Display(displayOpt);
        document.body.appendChild(this.display.getContainer());
        
        if (this.gui) {
            //this.resize();
        }

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
            this.volCurrencyToExit = 8 + (this.currentLevel*2);
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
        this.engine._scheduler.remove(fish);
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
        for (let fi of Object.keys(this.fish)) {
            var f = this.fish[fi];
            if (x == f.getX() && y == f.getY()) {
                return fi;
            }
        }
        return false;
    },

    nextLevel: function() {
        console.debug("preparing new level");
        this.map = {};
        this.landCells = [];
        this.waterCells = [];
        for (let fi of Object.keys(this.fish)) {
            var fish = this.fish[fi];
            this.engine._scheduler.remove(fish);
        }
        this.fish = {};
        if (this.boss) this.engine._scheduler.remove(this.boss);
        this.boss = null;

        this.ent = {};
        this.toast = "";
        this.levelFinished = false;

        this._generateMap();
        if (this.player) this.player.randomMove();
        this.startLevel();
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

        console.debug("new level", this);
    },

    closePanel: function() {
        this.shopOpen = false;
        this.helpOpen = false;
        var elems = document.getElementsByClassName("panel");
        for (let el of elems) {
            console.debug(el);
            el.remove();
        }
        this.update();
    },

    openShop: function() {
        this.engine.lock();
        this.shopOpen = true;
        this._drawPanel();

        if (this.gui) {
            var str = "<span>Shop <br><br>";
            for (let k of Object.keys(Game.SHOP)) {
                var inv = Game.SHOP[k];
                var name = inv.item.name;
                if (inv.item.long) name = inv.item.long;
                var plural = "s";
                if (inv.price == 1) plural = "";
                str += k+") ";
                str += " Buy "+inv.units;
                str += " <span class='t-white'>"+name+"</span>";
                str += " for <span class='t-white'>"+inv.price+"</span>";
                str += " ration"+plural+" of fish.<br><br>";
            }
            str += "</span>"
            this._createHtmlPanel("shop-panel", str)
        } else {
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
        }
    },

    openHelp: function() {
        this.engine.lock();
        this.helpOpen = true;
        this._drawPanel();

        if (this.gui) {
            var str = "<span>";
            str += "Help (ESC or H to leave)<br><br>";
            str += "arrow keys to move";
            str += "<br />"
            str += "space or f to catch fish";
            str += "<br />"
            str += "enter to finish the level at a port";
            str += "<br />"
            str += "b to buy items at a port";
            str += "<br />"
            str += "e to eat fish for energy";
            str += "<br />"
            str += "i to inspect a fish";
            str += "<br />"

            this._createHtmlPanel("help-panel", str);
        } else {
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
        }
    },

    openIntro: function() {
        this.engine.lock();
        this._drawPanel();
        this.introOpen = true;

        if (this.gui) {
            var str = "<span>Welcome to tbf<br><br>";
            str += "catch and kill fish, pay "+Game.volCurrencyToExit+" rations of fish at the port to progress";
            str += "<br><br>";
            str += "press h for help";
            str += "<br><br>";
            str += "ESC or SPACE to begin";
            str += "<br>";
            str += "</span>";
            this._createHtmlPanel("intro-panel", str);
        } else {
            var offx = 4;
            var offy = 4;
            var help = [
                "Welcome to tbf",
                "",
                "catch and kill fish, pay "+Game.volCurrencyToExit+" rations of fish at the port to progress",
                "",
                "press h for help",
                "",
                "ESC or SPACE to begin"
            ];
            for (let k of help) {
                var str = "%b{black}%c{grey}"+k;
                this.display.drawText(offx, offy, str);
                offy += 2;
            }
        }
    },

    _generateMap: function() {
        var map = new ROT.Map.Cellular(this.width, this.height, { connected: true });
        map.randomize(0.5);
        for (var i=0; i<8; i++) map.create();

        var digCallback = function(x, y, value) {
            //console.debug("cb "+x+","+y+":"+value);
            var key = x+","+y;
            if (value) {
                if (this.fixEdge && (x == 0 || y == 0 || x == this.width-1 || y == this.height-1)) {
                    this.map[key] = this.defaultSigil;
                    this.waterCells.push(key);
                    return;
                }
                this.mapOff[key] = this.landSigil;
                this.landCells.push(key);
                return;
            }
            this.map[key] = this.defaultSigil;
            this.waterCells.push(key);
        }

        map.create(digCallback.bind(this));
        console.debug("map", map);
        map.connect(digCallback.bind(this));

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

                var treasure = this._generateBoxLoot();
                var id = "bo"+i;
                this.ent[key].push(new Site(xyk[0], xyk[1], id, this.boxSigil, treasure));
                break;
            }
        }
    },

    _generateBoxLoot: function() {
        var boxPerc = ROT.RNG.getPercentage();
        var treasure = null;
        if (boxPerc <= 25) {
            treasure = Game.ITEM.LURE_STD;
        } else if (boxPerc <= 37) {
            treasure = Game.ITEM.LURE_ENH;
        } else if (boxPerc <= 45) {
            treasure = Game.ITEM.HARPOON_PLUS;
        } else if (boxPerc <= 53) {
            treasure = Game.ITEM.LINE_STRONG;
        //} else if (boxPerc <= 50) {
        //    treasure = Game.ITEM.SUPERBERRY;
        } else if (boxPerc <= 78) {
            treasure = Game.ITEM.INSTA_ENE;
        } else {
            treasure = Game.ITEM.NOTHING;
        }
        console.debug("Gen: "+treasure.name);
        return treasure;
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
            this.draw(x, y, sigil, this.treeColor, this.bgDefault);
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
        if (this.gui) {
            for(var x=1; x<this.width-1; x++) {
                for(var y=1; y<this.height-1; y++) {
                    this.draw(x, y, this.voidSigil);
                }
            }
        } else {
            for(var x=1; x<this.width-1; x++) {
                for(var y=1; y<this.height-1; y++) {
                    this.draw(x, y, " ", this.fgText, this.bgText);
                }
            }
        }
    },

    _createHtmlPanel : function(className, str) {
        let panelDiv = document.createElement('div');
        panelDiv.className = 'panel '+className;
        panelDiv.innerHTML = str;
        document.body.appendChild(panelDiv);

        panelDiv.style.position = "absolute";
        panelDiv.style.top = (2*this.tileHeight)+"px";
        panelDiv.style.left = (2*this.tileWidth)+"px";
    },

    _drawStatus: function() {
        if (this.gui) {
            var cc = document.getElementsByTagName('canvas');
            if (cc.length < 1) {
                return;
            }
            var energy = this.player.getEnergy();
            if (energy < 10) energy = " "+energy;
            var str = "<span>";
            str += "<img src='assets/t.gif' width='32' height='32' class='icon icon-energy' />";
            str += " <span class='t-green'>"+energy+"/"+this.player.getEnergyMax()+"</span> ";
            str += "<img src='assets/t.gif' width='32' height='32' class='icon icon-dex' />";
            str += " <span class='t-brown'>"+this.player.getDex()+"</span> ";
            str += "<img src='assets/t.gif' width='32' height='32' class='icon icon-str' />";
            str += " <span class='t-red'>"+this.player.getStr()+"</span> ";
            str += "<img src='assets/t.gif' width='32' height='32' class='icon icon-ration' />";
            str += " <span class='t-yellow'>"+this.player.getCurrency()+"</span> ";

            str += "<img src='assets/t.gif' width='100' height='32' />";
            str += " <span class='t-purple'>Level "+this.currentLevel+"</span> ";
            str += " <span class='t-dsl'>Help: h </span> ";
            str += "<br />"
            str += "<img src='assets/t.gif' width='8' height='32' />";

            var inv = this.player.getInv();
            for (var i=0; i<inv.length; i++) {
                var c = inv[i].c();
                if (i > 0) {
                    str += "<span class='t-nums'>|</span> ";
                }
                str += "<span class='t-num'>["+(i+1)+"]</span> ";
                str += "<span class='t-vol'>"+c+"x</span>";
                var nx = inv[i].slug();
                str += "<img src='assets/t.gif' width='32' height='32' class='icon icon-"+nx+"' />";
            }
            str += "<br />"
            str += "<img src='assets/t.gif' width='9' height='32' />";

            str += "<span class='t-white'>";
            // status messages
            if (this.toast.length > 0) {
                str += this.toast;
                this.toast = "";
            }
            str += "&nbsp;</span>";

            str += "</span>";

            let statusDiv = document.createElement('div');
            statusDiv.className = 'status';
            statusDiv.innerHTML = str;
            document.body.appendChild(statusDiv);

            var ccc = cc[0];
            statusDiv.style.position = "absolute";
            statusDiv.style.top = (ccc.height-3*32+12)+"px";
            statusDiv.style.left = "22px";

            return;
        }

        // non-gui
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
            this.display.drawText(this.statusOffsetX, this.height+this.statusOffsetY+2, s2);
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
        if (this.gui) {
            this.display.draw(x, y, sigil);
        } else {
            this.display.draw(x, y, sigil, fgc, bgc);
        }
    },

    rollFishStats: function(level) {
        if (!level) level  = 1;
        var factor = 0;
        if (level > 6) factor = Math.floor(level / 6);
        console.debug("rfs ",level, factor);
        var baseDexLow     = 6;
        var maxRollDexLow  = 6;
        var baseStrLow     = 5;
        var maxRollStrLow  = 9;
        var numLow         = 10;
        var numHigh        = 0;

        if (factor > 0) {
            baseDexLow += 2*factor;
            baseStrLow += 2*factor;
            maxRollStrLow += 1*factor;
        }
        var baseDexHigh    = baseDexLow+2;
        var maxRollDexHigh = maxRollDexLow;
        var baseStrHigh    = baseStrLow+2;
        var maxRollStrHigh = maxRollStrLow+1;

        if (level % 6 == 0) {
            baseDexLow     += 1;
            maxRollStrHigh += 1;
            numLow     = 3;
            numHigh    = 7;
            baseDexHigh = baseDexLow + 2;
            baseStrHigh = baseStrLow + 2;
            maxRollStrHigh = maxRollStrLow + 1;
        } else if(level % 6 == 5) {
            baseDexLow    += 1;
            maxRollStrLow += 1;
            numLow     = 5;
            numHigh    = 5;
            baseDexHigh = baseDexLow + 2;
            baseStrHigh = baseStrLow + 2;
        } else if(level % 6 == 4) {
            baseDexLow    += 1;
            maxRollStrLow += 1;
            numLow     = 8;
            numHigh    = 2;
            baseDexHigh = baseDexLow + 2;
            baseStrHigh = baseStrLow + 2;
        } else if(level % 6 == 3) {
            baseDexLow    += 1;
        } else if(level % 6 == 2) {
            baseDexLow    += 1;
            maxRollDexLow -= 1;
        } else if(level % 6 == 1) {

        }

        var rv = [];
        for (var i=0; i<numLow; i++) {
            var dex = baseDexLow + 1 + Math.floor(ROT.RNG.getUniform() * (maxRollDexLow-1));
            var str = baseStrLow + 1 + Math.floor(ROT.RNG.getUniform() * (maxRollStrLow-1));
            var stats = [dex, str, 'low'];
            rv.push(stats);
        }
        for (var i=0; i<numHigh; i++) {
            var dex = baseDexHigh + 1 + Math.floor(ROT.RNG.getUniform() * (maxRollDexHigh-1));
            var str = baseStrHigh + 1 + Math.floor(ROT.RNG.getUniform() * (maxRollStrHigh-1));
            var stats = [dex, str, 'high'];
            rv.push(stats);
        }
        return rv;
    }
};
Game.ITEM = {};
Game.ITEM[0] =  {id:0,  name: "nothing", long: "nothing",                    resolve: function()  {} };
Game.ITEM[1] =  {id:1,  name: "Tome of Strength", long: "Tome of Strength",  resolve: function()  { Game.player._strength += 1; } };
Game.ITEM[2] =  {id:2,  name: "Tome of Dexterity", long: "Tome of Dexterity",resolve: function()  { Game.player._dexterity += 1; } };
Game.ITEM[3] =  {id:3,  name: "Tome of Energy", long: "Tome of Energy",      resolve: function(x) { if (!x) x = 2; Game.player._energyMax += x; } };
Game.ITEM[11] = {id:11, name: "Lure", long: "Standard Fishing Lure",        resolve: function(x) { if (!x) x = 1; Game.player.addItem(Game.ITEM.LURE_STD, x); } };
Game.ITEM[12] = {id:12, name: "Better Lure", long: "Better Fishing Lure",   resolve: function(x) { if (!x) x = 1; Game.player.addItem(Game.ITEM.LURE_ENH, x); } };
Game.ITEM[13] = {id:13, name: "Rainbow Fly", long: "Rainbow Fly",           resolve: function(x) { if (!x) x = 1; Game.player.addItem(Game.ITEM.LURE_BOSS, x); } };
Game.ITEM[18] = {id:18, name: "Harpoon+", long: "Harpoon+",                 resolve: function(x) { if (!x) x = 1; Game.player.addItem(Game.ITEM.HARPOON_PLUS, x); } };
Game.ITEM[19] = {id:19, name: "Better Line", long: "Stronger Fishing Line", resolve: function(x) { if (!x) x = 1; Game.player.addItem(Game.ITEM.LINE_STRONG, x); } };
Game.ITEM[30] = {id:30, name: "Superberry",  long: "Superberry",            resolve: function(x) { if (!x) x = 1; Game.player.addItem(Game.ITEM.SUPERBERRY, x); } };
Game.ITEM[31] = {id:30, name: "InstaEnergy", long: "a handful of eggs",     resolve: function(x) { if (!x) x = 5; Game.player.addEnergy(x); } };
Game.ITEM[40] = {id:40, name: "Ration of Fish", long: "Ration of Fish",     resolve: function()  { Game.player.addCurrency(1); } };

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


var Fish = function(x, y, id, type, isBoss, isPredator, dex, str) {
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
    this._dexterity = 6 + 1 + Math.floor(ROT.RNG.getUniform() * 5);
    this._strength =  5 + 1 + Math.floor(ROT.RNG.getUniform() * 8);
    if (dex) this._dexterity = dex;
    if (str) this._strength = dex;
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
    if (!Game.player || this._x == Game.player.getX() && this._y == Game.player.getY()) {
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
    var doMove = function(x, y) {
        Game.draw(this._x, this._y, Game.defaultSigil);
        this._x = x;
        this._y = y;
        this._draw();
        Game.player._draw();
    };
    var moveRandom = function() {
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
                    //console.debug("avoided fish collision")
                    valid = false;
                }
                // do not swim into the player
                if (dest[0] == Game.player.getX() && dest[0] == Game.player.getY()) {
                    valid = false;
                }
            } else {
                //console.debug("move f to land avoided")
            }
        }
        doMove.bind(this)(dest[0], dest[1]);
    };
    var hunt = function() {
        var passableCallback = function(x, y) {
            return (x+","+y in Game.map);
        }
        for (let fi of Object.keys(Game.fish)) {
            var f = Game.fish[fi];
            if (f._isPredator || f._isBoss) continue;
            var x = f.getX();
            var y = f.getY();
            var astar = new ROT.Path.AStar(x, y, passableCallback, {topology:4});
            var path = [];
            var pathCallback = function(x, y) {
                path.push([x, y]);
            }
            astar.compute(this._x, this._y, pathCallback);
            path.shift();
            if (path.length == 1) {
                // catch the prey
                console.debug(">> ",this.id()," hunted down ",f.id(),"=",path.length,path,this.k(),f.k());
                if (Game.toast.length == 0) {
                    Game.toast = "A predatory fish got to its prey."
                    Game.updS();
                }
                x = path[0][0];
                y = path[0][1];
                Game.removeEnemy(f)
                doMove.bind(this)(x, y);
                return true;
            } else if (path.length > 0 && path.length <= Game.huntDistance) {
                // move towards prey
                x = path[0][0];
                y = path[0][1];
                doMove.bind(this)(x, y);
                return true;
            }
        }
        return false;
    };

    var movePerc = ROT.RNG.getPercentage();
    if (this._isBoss) {
        if (movePerc <= 25) {
            moveRandom.bind(this)();
        }
    } else if (this._isPredator) {
        if (movePerc <= 50) {
            var rv = hunt.bind(this)();
            if (!rv) {
                moveRandom.bind(this)();
            }
        }
    } else {
        if (movePerc <= 50) {
            moveRandom.bind(this)();
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