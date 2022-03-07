var Game = {
    display: null,
    map: {},
    width: 160,
    height: 80,
    fontSize: 12,
    bgDefault: "#757358",
    numFish: 10,
    fishSigil: "%",
    fishColor: "#000",
    
    init: function() {
        var displayOpt = {width: this.width, height: this.height, fontSize: this.fontSize, bg: this.bgDefault};
        this.display = new ROT.Display(displayOpt);
        //this.display = new ROT.Display();
        //console.debug(this.display.getContainer());
        document.body.appendChild(this.display.getContainer());
        
        this._generateMap();
    },
    
    _generateMap: function() {
        var map = new ROT.Map.Cellular(this.width, this.height, { connected: true });
        var freeCells = [];
        map.randomize(0.5);
        for (var i=0; i<4; i++) map.create();

        var digCallback = function(x, y, value) {
            if (value) { return; }
            //console.debug("cb "+x+","+y+":"+value);

            var key = x+","+y;
            this.map[key] = " ";
            freeCells.push(key);
        }

        map.create(digCallback.bind(this));
        //map.connect(this.display.DEBUG);
        console.debug(map);

        this._generateFish(freeCells);
        this._drawWholeMap();

    },
    
    _generateFish: function(freeCells) {
        for (var i=0;i<this.numFish;i++) {
            var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
            var key = freeCells.splice(index, 1)[0];
            this.map[key] = this.fishSigil;
            console.debug(key)
        }
    },
    
    _drawWholeMap: function() {
        for (var key in this.map) {
            var parts = key.split(",");
            var x = parseInt(parts[0]);
            var y = parseInt(parts[1]);
            var sigil = this.map[key];
            // default: water
            var fgc = "#fff";
            var bgc = "#06c";
            if (sigil == this.fishSigil) {
                fgc = this.fishColor;
            }
            this.display.draw(x, y, sigil, fgc, bgc);
        }
    }

};

//Game.init();
