var game = new Phaser.Game(800, 600, Phaser.AUTO, 'content');
var map = null;
var init = false;
var plnum = 0;

var PhaserGame = function () {

    this.client = null;
    this.cursor = null;
    this.bg = null;
    this.bmd = null;
    this.pl = [];

    this.points = {
        'x': [   0, 100, 200, 300, 400, 500, 600, 700, 800 ],
        'y': [ 240, 240, 240, 240, 240, 240, 240, 240, 240 ]
    };

    this.px = [];
    this.py = [];

};

PhaserGame.prototype = {
    preload: function() {
        game.load.image('pl', 'asset/Ball_Red.png');
    },

    update: function() {
        if (this.cursor.down.isDown) {
            this.pl[plnum].img.scale.x = 2;
            this.pl[plnum].img.scale.y = 2;
            for (var i in this.pl) {
                if (i != plnum
                    && this.pl[i].dead == false
                    && this.pl[i].x > this.pl[plnum].x - 32
                    && this.pl[i].x < this.pl[plnum].x + 32
                    && this.pl[i].y > this.pl[plnum].y - 32
                    && this.pl[i].y < this.pl[plnum].y + 32) {
                    this.client.ws.send(JSON.stringify({action: 'kill', pl: i}));
                }
            }
        }
        else {
            this.pl[plnum].img.scale.x = 1;
            this.pl[plnum].img.scale.y = 1;
            if (this.cursor.right.isDown) {
                this.pl[plnum].move(this.pl[plnum].x+1, this.py[this.pl[plnum].x+1]);
                this.client.ws.send(JSON.stringify({pl: plnum, pos:this.pl[plnum].x}));
            }
            if (this.cursor.left.isDown) {
                this.pl[plnum].move(this.pl[plnum].x-1, this.py[this.pl[plnum].x-1]);
                this.client.ws.send(JSON.stringify({pl: plnum, pos:this.pl[plnum].x}));
            }
        }
        //if (this.cursor.up.isDown) {
        //    this.pl[0].img.scale.x += 0.1;
        //    this.pl[0].img.scale.y += 0.1;
        //}
    },

    create: function ()
    {
        // Controls
        this.cursor = game.input.keyboard.createCursorKeys();

        // Create gratient background
        this.bg = this.game.add.bitmapData(this.game.width, this.game.height);
        var grd = this.bg.context.createLinearGradient(0,0,0,500);
        grd.addColorStop(0,"#0A5BC4");
        grd.addColorStop(1,"#E9E9FF");
        this.bg.context.fillStyle = grd;
        this.bg.context.fillRect(0,0,this.game.width, this.game.height);
        this.bg.addToWorld();

        // Connect to server
        this.client = new Client();
        this.client.openConnection();

        // Create land
        this.bmd = this.add.bitmapData(this.game.width, this.game.height);
        this.bmd.addToWorld();

        //var py = this.points.y;

        while (!init) {alert("Connecting to server...");};
        this.points.y = map;
        //for (var i = 0; i < py.length; i++)
        //{
        //    py[i] = this.rnd.between(400, 512);
        //}

        this.plot();

        // Draw player
        for (var i = 0; i <= plnum; i++)
            this.pl.push(new Player(0, 0));
        var x = this.rnd.between(0,768);
        this.pl[plnum].move(x, this.py[x]);
        this.client.ws.send(JSON.stringify({pl: plnum, pos:this.pl[plnum].x}));
    },

    plot: function () {

        this.bmd.clear();

        var x = 1 / game.width;

        for (var i = 0; i <= 1; i += x)
        {
            var px = this.math.catmullRomInterpolation(this.points.x, i);
            var py = this.math.catmullRomInterpolation(this.points.y, i);

            this.bmd.rect(px, py, 3, 300, '#D24726');
            // this.px.push(px);
            this.py.push(py);
        }

        // for (var p = 0; p < this.points.x.length; p++)
        // {
        //     this.bmd.rect(this.points.x[p]-3, this.points.y[p]-3, 6, 6, 'rgba(255, 0, 0, 1)');
        // }

    }

};

var Player = function (x, y) {
    this.img = game.add.image(x, y, 'pl');
    this.img.anchor.setTo(0.5, 0.95);
    this.x = x;
    this.y = y;
    this.dead = false;
};

Player.prototype = {

    move: function (x, y) {
        this.img.x = x;
        this.img.y = y;
        this.x = x;
        this.y = y;
    },

    destroy: function () {
        destroy(this.img);
    }
}

function Client() {
}

Client.prototype.openConnection = function() {
    this.ws = new WebSocket("ws://192.168.56.1:4000");
    this.connected = false;
    this.ws.onmessage = this.onMessage.bind(this);
    this.ws.onerror = this.displayError.bind(this);
    this.ws.onopen = this.connectionOpen.bind(this);
};

Client.prototype.connectionOpen = function() {
    this.connected = true;
};

Client.prototype.onMessage = function(message) {
    var msg = JSON.parse(message.data);
    console.log(msg);
    switch (msg.type) {
    case 'init':
        map = msg.map;
        plnum = msg.plnum;
        init = true;
        break;
    case 'update':
        var g = game.state.states.Game;
        g.pl[msg.pl].move(msg.pos, g.py[msg.pos]);
        break;
    case 'adduser':
        var g = game.state.states.Game;
        g.pl.push(new Player(0, 0));
        break;
    case 'close':
        var g = game.state.states.Game;
        g.pl[msg.pl].move(-100, -100);
        g.pl[msg.pl].dead = true;
        break;
    case 'kill':
        var g = game.state.states.Game;
        g.pl[msg.pl].move(-100, -100);
        g.pl[msg.pl].dead = true;
        if (g.pl[plnum].dead)
            alert('You are dead.');
        break;
    }
};

Client.prototype.displayError = function(err) {
    console.log('Websocketerror: ' + err);
};

game.state.add('Game', PhaserGame, true);
