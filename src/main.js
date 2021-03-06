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
    maxLevel: 10,

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
    numPredators: 3,
    numBoxes: 3,
    numPorts: 1,
    numDoors: 0,

    volCurrencyToExit: 10,
    huntDistance: 5,

    // sigils
    defaultSigil: " ",
    bossSigilLast1: "!",
    bossSigilLast2: "?",
    bossSigils: ["^","^","~",":",";","*","'","\"","`","´"],
    boxSigil: "$",
    doorSigil: "|",
    fishSigils: ["a","a","b","c"],
    landSigil1: ".",
    landSigil2: ",",
    landSigil3: "-",
    landSigil4: "_",
    playerSigil1: "@",
    playerSigil2: "+",
    predatorSigils: ["A","A","B","C"],
    portSigil: "#",
    voidSigil: "/",

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

    tt:  {
        "dex": "Dexterity : Helps you successfully bait the fish, but some fish may not go for your bait.",
        "str": "Strength: Helps you reel in the fish. But careful, a strong Fish may cost you some Energy to hold on and weaken it. If it tears up your line, it steals your bait.",
        "ene": "Energy: Needed for almost any action e.g. Angling, Fighting, or searching through reed.",
        "cur": "Ration of fish: Eat (e) to gain energy, or use as currency at the Harbor and as toll to get to the next level.",

        "lure":            "Bait: Needed to catch fish. May be lost to fish sometimes.",
        "better-lure":     "Improved Bait: If used as bait, gives +1 Dex for angling. May be lost to fish sometimes.",
        "rainbow-fly":     "Rainbow Fly: Special bait needed for the unique fish.",
        "better-line":     "Stronger Line: Gives you +1 Strength on angling for the current level",
        "harpoon-upgrade": "Harpoon Upgrade:  Gives you +1 Strength on fighting predatory fish for the current level"
    },

    parent: function() {
        var gameParent = document.getElementById('main2');
        if (!gameParent) gameParent = document.body;
        return gameParent;
    },

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
            var iw = this.tileWidth;
            var ih = this.tileHeight;
            displayOpt = {
                layout: "tile",
                bg: "transparent",
                tileWidth: iw,
                tileHeight: ih,
                tileSet: this.tileSet,
                tileMap: {
                    "(": [0, 0],
                    ")": [1*iw, 0],
                    ">": [2*iw, 0],
                    "<": [3*iw, 0],

                    "[": [4*iw, 0],
                    "]": [5*iw, 0],
                    "{": [6*iw, 0],
                    "}": [7*iw, 0],

                    "\\": [8*iw, 0],
                    "/": [9*iw, 0],
                    " ": [10*iw, 0],

                    // schiff + land
                    "@": [0*iw, 1*ih],
                    "+": [1*iw, 1*ih],
                    "$": [2*iw, 1*ih], // schilf
                    ".": [3*iw, 1*ih],
                    ",": [4*iw, 1*ih],
                    "-": [5*iw, 1*ih],
                    "_": [6*iw, 1*ih],
                    "#": [7*iw, 1*ih], // hafen

                    // minibosses
                    "^": [0, 2*ih],
                    "~": [1*iw, 2*ih],
                    ":": [2*iw, 2*ih],
                    ";": [3*iw, 2*ih],
                    "*": [4*iw, 2*ih], // schilf
                    "'": [5*iw, 2*ih], // hafen
                    "\"": [6*iw, 2*ih], // fi1
                    "`": [7*iw, 2*ih], // pr1
                    "´": [8*iw, 2*ih], // mb1

                    "!": [9*iw, 2*ih], // bossLast1
                    "?": [10*iw, 2*ih], // bossLast2

                    "a": [0*iw, 3*ih], // fi1
                    "b": [1*iw, 3*ih], // fi2
                    "c": [2*iw, 3*ih], // fi3
                    "A": [3*iw, 3*ih], // pr1
                    "B": [4*iw, 3*ih], // pr2
                    "C": [5*iw, 3*ih], // pr3

                    //,"^": [103, 103]
                },
                width: this.width,
                height: this.height+this.statusLines
            }
        }
        
        this.display = new ROT.Display(displayOpt);
        this.parent().appendChild(this.display.getContainer());
        
        if (this.gui) {
            //this.resize();
        }

        this.nextLevel();
        this._generatePlayer(this.waterCells);
        this.startLevel();

        this.update();
        this.player._showIntro(1);
    },

    tearDown: function() {
        this.engine.lock();
        window.removeEventListener("keydown", this);
        for (let fi of Object.keys(this.fish)) {
            var fish = this.fish[fi];
            if (this.fish[fi]._moving) {
                this.engine._scheduler.remove(fish);
            }
        }
        this.engine._scheduler.remove(this.player);
    },

    checkGameState: function() {
        if (this.player.getEnergy() < 1) {
            console.debug("You lost");
            this.player._showIntro(this.currentLevel, "gameover");
            this.tearDown();
        }
        if (this.gameFinished) {
            console.debug("Game finished");
            this.player._showIntro(this.currentLevel, "youwon");
            this.tearDown();
        }
        if (this.levelFinished) {
            console.debug("Level finished");
            this.currentLevel++;
            this.nextLevel();
            this.volCurrencyToExit = 8 + (this.currentLevel*2);
            this.player.levelUp();
            this.update();
            this.startLevel();
            this.update();
            this.player._showIntro(this.currentLevel);
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
        this.map = {};
        this.landCells = [];
        this.waterCells = [];
        for (let fi of Object.keys(this.fish)) {
            var fish = this.fish[fi];
            if (this.fish[fi]._moving) {
                this.engine._scheduler.remove(fish);
            }
        }
        this.fish = {};
        if (this.boss && this.boss._moving) this.engine._scheduler.remove(this.boss);
        this.boss = null;

        this.ent = {};
        this.toast = "";
        this.levelFinished = false;

        this._generateMap();
        if (this.player) this.player.randomMove();
    },

    startLevel: function() {
        var scheduler = new ROT.Scheduler.Simple();
        for (let fi of Object.keys(this.fish)) {
            if (this.fish[fi]._moving) {
                scheduler.add(this.fish[fi], true);
            }
        }
        scheduler.add(this.player, true);

        this.engine = new ROT.Engine(scheduler);
        this.engine.start();

        //console.debug("new level", this);
    },

    closePanel: function() {
        this.shopOpen = false;
        this.helpOpen = false;
        var elems = document.getElementsByClassName("panel");
        for (let el of elems) {
            el.remove();
        }
        this.update();
    },

    openShop: function() {
        this.engine.lock();
        this.shopOpen = true;
        this._drawPanel();

        if (this.gui) {
            var str = "<div class='shop-panel-text'><span><strong>Shop</strong> <br><br>";
            for (let k of Object.keys(Game.SHOP)) {
                var inv = Game.SHOP[k];
                var name = inv.item.name;
                if (inv.item.long) name = inv.item.long;
                var plural = "s";
                if (inv.price == 1) plural = "";
                str += "<span class='shop-num'>"+k+")</span> ";
                str += " Buy";
                str += " <span class='t-white'>"+inv.units+" "+name+"</span>";
                str += " for <span class='t-white'>"+inv.price+"</span>";
                str += " ration"+plural+" of fish.<br><br>";
            }
            str += "</span></div>"
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
            var str = "<div class='help-panel-text'><span>";
            str += "<strong>Help</strong> (<code>ESC</code> or <code>H</code> to leave)<br><br>";
            str += "Movement - <code>Arrow keys</code>";
            str += "<br />"
            str += "Catch or fight fish - <code>SPACE</code> or <code>F</code>";
            str += "<br />"
            str += "Eat fish for energy - <code>E</code>";
            str += "<br />"
            str += "Inspect a fish - <code>I</code>";
            str += "<br />"
            str += "Use item - <code>1-9</code>";
            str += "<br />"
            str += "Search reed - <code>SPACE</code>";
            str += "<br /><br />"

            str += "<strong>Port</strong><br /><br />"
            str += "Buy items - <code>B</code>, then <code>1-9</code>";
            str += "<br />"
            str += "Pay toll and advance - <code>ENTER</code>";
            str += "<br /><br />"
            str += "Hover mouse over inventory for tooltips."

            this._createHtmlPanel("help-panel", str);
        } else {
            var offx = 4;
            var offy = 4;
            var help = [
                "Help (ESC or H to leave)",
                "",
                "arrow keys to move",
                "<space> to catch fish ("+this.fishSigils[0]+" "+this.predatorSigils[0]+" "+this.bossSigils[0]+") or search reed "+this.boxSigil,
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

    openIntro: function(level, endMode) {
        this.engine.lock();
        this._drawPanel();
        this.introOpen = true;
        if (!level) level = 1;

        if (this.gui) {
            if (endMode == "youwon") {
                var str = "<div class='intro-panel-text'><span class='intro-text'>";
                str += "<p>&nbsp;</p><p>&nbsp;</p>&nbsp;&nbsp;&nbsp;&nbsp;You caught the fabulous jaguar shark!</span></div>";
                this._createHtmlPanel("intro-panel intro-panel-won", str);
                return;
            } else if (endMode == "gameover") {
                var str = "<div class='intro-panel-text intro-text-level-1'><span class='intro-text'>";
                str += "&nbsp;</span></div>";
                this._createHtmlPanel("intro-panel intro-panel-lost", str);
                return;
            }
            if (level == 1) {
                var str = "<div class='intro-panel-text intro-text-level-1'>";
                str += "Welcome to <span class='t-yellow'>Little Islands Angler</span>!";
                str += "<br/><br />";
                str += "This is about catching the biggest and rarest fish - the jaguar shark."
                str += "<br/>";
                str += "To get there you will need to catch a lot of small ones"
                str += "<img src='assets/t.gif' width='32' height='32' class='icon icon-fish' />";
                str += "first.<br/>";
                str += "This will allow you to pay toll to advance levels, maintain your energy"
                str += "<img src='assets/t.gif' width='32' height='32' class='icon icon-energy' />";
                str += "and get stronger.<br/>";
                str += "Never let your energy drop to 0, else you lose."
                str += "<br/><br />";

                str += "There will be predatory fish";
                str += "<img src='assets/t.gif' width='32' height='32' class='icon icon-pred' />";
                str += "on each level who will eat other fish";
                str += "<br/>";
                str += "if you dont kill them with your Harpoon.",
                str += "<br />";
                str += "There will also be a special fish",
                str += "<img src='assets/t.gif' width='32' height='32' class='icon icon-boss' />";
                str += "on every level with better rewards.",
                str += "<br />";
                str += "Search reed",
                str += "<img src='assets/t.gif' width='32' height='32' class='icon icon-reed' />";
                str += "for extra treasure.",
                str += "<br /><br />";
                str += "<strong>And enjoy your time fishing!</strong>",
                str += "<br /><br />";

                str += "Toll after the first level will be "+Game.volCurrencyToExit+" rations of fish";
                str += "<img src='assets/t.gif' width='32' height='32' class='icon icon-ration' />";
                str += ".<br /><br />";
                str += "Press <code>H</code> to see the help.";
                str += "<br />";
                str += "Press <code>ESC</code> or <code>SPACE</code> to begin.";
                str += "</div>";
            } else {
                str = "<div class='intro-panel-text-level intro-text'>";
                str += "<span class='t-yellow'>Congratulations!</span> You finished a level!";
                str += "<br /><br />";
                str += "Toll paid:"+(this.volCurrencyToExit-2)+" (Next level: "+this.volCurrencyToExit+")";
                str += "<br /><br />";
                str += "" + this.player._lastLevelUp;
                str += "<br /><br />";
                str += "To proceed to the next level press <code>SPACE</code> or <code>ESC</code>";
                str += "<br /><br />";
                str += "Good fishing!";
                str += "<br /><br />";
                str += "</div>";
                this.player._lastLevelUp = "";
            }
            this._createHtmlPanel("intro-panel intro-panel-level-"+this.currentLevel+"", str);
        } else {
            var offx = 4;
            var offy = 4;
            var help = [
                "Welcome to Little Islands Angler",
                "",
                "catch and kill fish, pay "+Game.volCurrencyToExit+" rations of fish at the port to progress",
                "",
                "press h for help",
                "",
                "ESC or SPACE to begin"
            ];
            if (level > 1) {
                help.push("LEVEL "+this.currentLevel);
            }
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
                var landPerc = ROT.RNG.getPercentage();
                landSigil = this.landSigil1;
                if (landPerc <= 25) landSigil = this.landSigil2;
                else if (landPerc <= 50) landSigil = this.landSigil3;
                else if (landPerc <= 75) landSigil = this.landSigil4;
                this.mapOff[key] = landSigil;
                this.landCells.push(key);
                return;
            }
            this.map[key] = this.defaultSigil;
            this.waterCells.push(key);
        }

        map.create();
        //console.debug("map", map);
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
        var ffs = this.rollFishStats(this.currentLevel, this.numFish, false);
        var fps = this.rollFishStats(this.currentLevel, this.numPredators, true);
        var bossStats = ffs.pop();

        var bossId = "boss";
        if (Game.currentLevel == Game.maxLevel) {
            while (true) {
                // hack: prime the possible waterCells, so it's only one possibility
                var xyk = this._getRandPos(waterCells);
                var rightOf = xyk[0]+1 + "," + xyk[1];
                console.debug("BOSS pos", xyk, rightOf, (rightOf in Game.map));
                if (rightOf in Game.map) {
                    this.boss = this._createBeing(Fish, [xyk[2]], [bossId, "shark", true, false, bossStats[0], bossStats[1], Game.currentLevel]);
                    break;
                }
            }
        } else {
            this.boss = this._createBeing(Fish, waterCells, [bossId, "shark", true, false, bossStats[0], bossStats[1], Game.currentLevel]);
        }
        this.fish[bossId] = this.boss;

        for (var i=0;i<this.numFish;i++) {
            var typeIndex = Math.floor(ROT.RNG.getUniform() * this.fishTypes.length);
            var id = "fi"+i;
            var f = this._createBeing(Fish, waterCells, [id, this.fishTypes[typeIndex], false, false, ffs[i][0], ffs[i][1], ffs[i][2]]);
            this.fish[id] = f;
        }

        for (var i=0;i<this.numPredators;i++) {
            var typeIndex = Math.floor(ROT.RNG.getUniform() * this.predTypes.length);
            var id = "pr"+i;
            var f = this._createBeing(Fish, waterCells, [id, this.fishTypes[typeIndex], false, true, fps[i][0], fps[i][1], fps[i][2]]);
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
        this.parent().appendChild(panelDiv);

        panelDiv.style.position = "absolute";
        panelDiv.style.top = Math.floor(2.7*this.tileHeight)+"px";
        panelDiv.style.left = Math.floor(8*this.tileWidth)+"px";
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
            str += "<span class='tooltip'>";
            str += "<img src='assets/t.gif' width='32' height='32' class='icon icon-energy' />";
            str += "<span class='t-green'>"+energy+"/"+this.player.getEnergyMax()+"</span> ";
            str += "<span class='tooltiptext'>"+this.tt["ene"]+"</span></span>";

            str += "<span class='tooltip'>";
            str += "<img src='assets/t.gif' width='32' height='32' class='icon icon-dex' />";
            str += "<span class='t-brown'>"+this.player.getDex()+"</span> ";
            str += "<span class='tooltiptext'>"+this.tt["dex"]+"</span></span>";

            str += "<span class='tooltip'>";
            str += "<img src='assets/t.gif' width='32' height='32' class='icon icon-str' />";
            str += "<span class='t-red'>"+this.player.getStr()+"</span> ";
            str += "<span class='tooltiptext'>"+this.tt["str"]+"</span></span>";

            str += "<span class='tooltip'>";
            str += "<img src='assets/t.gif' width='32' height='32' class='icon icon-ration' />";
            str += "<span class='t-yellow'>"+this.player.getCurrency()+"</span> ";
            str += "<span class='tooltiptext'>"+this.tt["cur"]+"</span></span>";

            str += "<img src='assets/t.gif' width='100' height='32' />";
            str += " <div class='right'><span class='t-purple'>Level "+this.currentLevel+"</span><br>";
            str += " <span class='t-dsl'>Help: <code>H</code></span> </div>";
            str += "<br />"
            str += "<img src='assets/t.gif' width='8' height='32' />";

            var inv = this.player.getInv();
            for (var i=0; i<inv.length; i++) {
                var c = inv[i].c();
                if (!c || c < 0) c = 0;
                if (i > 0) {
                    str += "<span class='t-nums'>|</span> ";
                }
                str += "<span class='tooltip'>";

                var pushBtnCls = "t-num";
                if (inv[i]._active) {
                    pushBtnCls = "t-num-active";
                } else if (Game.ITEM[inv[i]._id].group == 0) {
                    pushBtnCls = "t-num-inactive";
                }
                str += "<span class='"+pushBtnCls+"'>["+(i+1)+"]</span> ";
                str += "<span class='t-vol'>"+c+"x</span>";
                var nx = inv[i].slug();
                str += "<img src='assets/t.gif' width='32' height='32' class='icon icon-"+nx+"' />";
                str += "<span class='tooltiptext'>"+this.tt[inv[i].slug()]+"</span></span>";
                str += "</span>"

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

            let statusDiv = document.getElementById('status');
            if (!statusDiv || statusDiv.length < 1) {
                statusDiv = document.createElement('div');
                statusDiv.id = 'status';
                statusDiv.className = 'status';
            }
            statusDiv.innerHTML = str;
            this.parent().appendChild(statusDiv);

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

        this.display.draw(this.statusOffsetX, this.height+this.statusOffsetY, this.playerSigil1,
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
        var helpText = "Help: [h]";
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

        if (sigil == this.playerSigil1 || sigil == this.playerSigil2) {
            fgc = this.playerColor;
            bgc = this.waterColor;
        } else if (sigil == this.bossSigilLast1 || sigil == this.bossSigilLast2 || this.bossSigils.includes(sigil)) {
            fgc = this.bossColor;
            bgc = this.waterColor;
        } else if (this.fishSigils.includes(sigil)) {
            fgc = this.fishColor;
            bgc = this.waterColor;
        } else if (this.predatorSigils.includes(sigil)) {
            fgc = this.predatorColor;
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

    rollFishStats: function(level, numTotal, isPredator) {
        if (!level) level  = 1;
        var factor = 0;
        if (level > 6) factor = Math.floor(level / 6);
        var baseDexLow     = 6;
        var maxRollDexLow  = 6;
        var baseStrLow     = 5;
        var maxRollStrLow  = 9;
        var numLow         = numTotal;
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
            if (isPredator) {
                numLow     -= 2;
                numHigh    += 2;
            } else {
                numLow     -= 7;
                numHigh    += 7;
            }
            baseDexHigh = baseDexLow + 2;
            baseStrHigh = baseStrLow + 2;
            maxRollStrHigh = maxRollStrLow + 1;
        } else if(level % 6 == 5) {
            baseDexLow    += 1;
            maxRollStrLow += 1;
            if (isPredator) {
                numLow     -= 2;
                numHigh    += 2;
            } else {
                numLow     -= 5;
                numHigh    += 5;
            }
            baseDexHigh = baseDexLow + 2;
            baseStrHigh = baseStrLow + 2;
        } else if(level % 6 == 4) {
            baseDexLow    += 1;
            maxRollStrLow += 1;
            if (isPredator) {
                numLow     -= 1;
                numHigh    += 1;
            } else {
                numLow     -= 2;
                numHigh    += 2;
            }
            baseDexHigh = baseDexLow + 2;
            baseStrHigh = baseStrLow + 2;
        } else if(level % 6 == 3) {
            baseDexLow    += 1;
        } else if(level % 6 == 2) {
            baseDexLow    += 1;
            maxRollDexLow -= 1;
        } else if(level % 6 == 1) {

        }

        var lx = Math.ceil(level/3.0);
        if (lx <= 1) {
            levelLow = 1;
            levelHigh = 1;
        } else if (lx == 2) {
            levelLow = 1;
            levelHigh = 2;
        } else if (lx == 3) {
            levelLow = 2;
            levelHigh = 2;
        } else if (lx == 4) {
            levelLow = 2;
            levelHigh = 3;
        } else {
            levelLow = 3;
            levelHigh = 3;
        }
        var rv = [];
        for (var i=0; i<numLow; i++) {
            var dex = baseDexLow + 1 + Math.floor(ROT.RNG.getUniform() * (maxRollDexLow-1));
            var str = baseStrLow + 1 + Math.floor(ROT.RNG.getUniform() * (maxRollStrLow-1));
            var stats = [dex, str, levelLow, 'low'];
            rv.push(stats);
        }
        for (var i=0; i<numHigh; i++) {
            var dex = baseDexHigh + 1 + Math.floor(ROT.RNG.getUniform() * (maxRollDexHigh-1));
            var str = baseStrHigh + 1 + Math.floor(ROT.RNG.getUniform() * (maxRollStrHigh-1));
            var stats = [dex, str, levelHigh, 'high'];
            rv.push(stats);
        }
        if (!isPredator) {
            // boss
            if (numHigh > 0) {
                baseStrHigh += 2;
                maxRollStrHigh -= 3;
                var dex = baseDexHigh + 1 + Math.floor(ROT.RNG.getUniform() * (maxRollDexHigh-1));
                var str = baseStrHigh + 1 + Math.floor(ROT.RNG.getUniform() * (maxRollStrHigh-1));
                var stats = [dex, str, 'high'];
                rv.push(stats);
            } else {
                baseStrLow += 2;
                maxRollStrLow -= 3;
                var dex = baseDexLow + 1 + Math.floor(ROT.RNG.getUniform() * (maxRollDexLow-1));
                var str = baseStrLow + 1 + Math.floor(ROT.RNG.getUniform() * (maxRollStrLow-1));
                var stats = [dex, str, 'low'];
                rv.push(stats);
            }
        }
        return rv;
    }
};
Game.ITEM = {};
Game.ITEM[0] =  {id:0,  group:0,  name: "nothing",          long: "nothing",              resolve: function()     {} };
Game.ITEM[1] =  {id:1,  group:0,  name: "Tome of Strength", long: "Tome of Strength",     resolve: function(x)    { if (!x) x = 1; Game.player._strength += x; } };
Game.ITEM[2] =  {id:2,  group:0,  name: "Tome of Dexterity",long: "Tome of Dexterity",    resolve: function(x)    { if (!x) x = 1; Game.player._dexterity += x; } };
Game.ITEM[3] =  {id:3,  group:0,  name: "Tome of Energy",   long: "Tome of Energy",       resolve: function(x)    { if (!x) x = 3; Game.player.addEnergyMax(x); } };
Game.ITEM[11] = {id:11, group:1,  name: "Lure",            long: "Standard Fishing Lure", resolve: function(x, n) { if (!n) n = 1; Game.player.addItem(Game.ITEM.LURE_STD, n); } };
Game.ITEM[12] = {id:12, group:1,  name: "Better Lure",     long: "Better Fishing Lure",   resolve: function(x, n) { if (!n) n = 1; Game.player.addItem(Game.ITEM.LURE_ENH, n); } };
Game.ITEM[13] = {id:13, group:0,  name: "Rainbow Fly",     long: "Rainbow Fly",           resolve: function(x, n) { if (!n) n = 1; Game.player.addItem(Game.ITEM.LURE_BOSS, n); } };
Game.ITEM[18] = {id:18, group:18, name: "Harpoon Upgrade", long: "Harpoon Upgrade",       resolve: function(x, n) { if (!n) n = 1; Game.player.addItem(Game.ITEM.HARPOON_PLUS, n); } };
Game.ITEM[19] = {id:19, group:19, name: "Better Line",     long: "Stronger Fishing Line", resolve: function(x, n) { if (!n) n = 1; Game.player.addItem(Game.ITEM.LINE_STRONG, n); } };
Game.ITEM[30] = {id:30, group:30, name: "Superberry",      long: "Superberry",            resolve: function(x, n) { if (!n) n = 1; Game.player.addItem(Game.ITEM.SUPERBERRY, n); } };
Game.ITEM[31] = {id:30, group:0,  name: "InstaEnergy",     long: "a handful of eggs",     resolve: function(x)    { if (!x) x = 5; Game.player.addEnergy(x); } };
Game.ITEM[40] = {id:40, group:40, name: "Ration of Fish",  long: "Ration of Fish",        resolve: function(x)    { if (!x) x = 1; Game.player.addCurrency(x); } };

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


var Fish = function(x, y, id, type, isBoss, isPredator, dex, str, fishLevel) {
    this._x = x;
    this._y = y;
    this._id = id;
    this._type = type;
    this._isBoss = false;
    this._isPredator = false;
    this._hp = 0;
    this._moving = true;
    this._level = fishLevel;
    if (isBoss === true) {
        this._isBoss = true;
        if (Game.currentLevel == Game.maxLevel) {
            this._moving = false;
        }
    }
    if (isPredator === true) {
        this._isPredator = true;
    }
    this._dexterity = 6 + 1 + Math.floor(ROT.RNG.getUniform() * 5);
    this._strength =  5 + 1 + Math.floor(ROT.RNG.getUniform() * 8);
    if (dex) this._dexterity = dex;
    if (str) this._strength = str;

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
    var sigil = Game.fishSigils[this._level];
    var color = Game.fishColor;
    if (this._isBoss) {
        sigil = Game.bossSigils[this._level];
        if (Game.currentLevel == Game.maxLevel) {
            sigil = Game.bossSigilLast1;
            Game.draw(this._x+1, this._y, Game.bossSigilLast2, color);
        }
        color = Game.bossColor;
    } else if (this._isPredator) {
        sigil = Game.predatorSigils[this._level];
        color = Game.predatorColor;
    }
    Game.draw(this._x, this._y, sigil, color);
}
Fish.prototype.k = function() {
    return this._x+","+this._y;
}
Fish.prototype.s = function(prefix, suffix) {
    var msg = "[Fish "+this.id()+": DEX: "+this.getDex()+" STR: "+this.getStr()+" @ ("+this.k()+")";
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