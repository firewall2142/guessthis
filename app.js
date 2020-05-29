var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var rug = require('random-username-generator');

var PORT = 3000;

var users = [];
var DRAW_ITEMS = ["Ice Cream", "Sandwich", "House", "Cage", "Necklace", "Piano", "Mobile", "Headphones"];
var drawer_index = 0;
var GAME_DURATION = 10;

//for testing only!!
app.use(express.static(__dirname));


app.get('/', (req, res, next) => {
    res.sendFile(__dirname + '/index.html')
});

server.listen(PORT, () => {console.log(`listening on ${PORT}`)});

var sock2user = new Map();


var gameTimeout;
var gameInterval; //gameinfo interval
var drawItem;
var drawer;
var timeleft;
function startGame(){
    if(users.length == 0) return;
    drawer_index += 1;
    drawer_index %= users.length;
    drawItem = DRAW_ITEMS[Math.floor(Math.random()*2.1*DRAW_ITEMS.length)%DRAW_ITEMS.length];

    drawer = users[drawer_index];
    io.emit('game start', {'drawer': sock2user.get(drawer), 'timeRemaining':GAME_DURATION});
    io.to(drawer).emit('drawer', drawItem);
    console.log('GAME START\n=====');
    console.log(`ITEM: ${drawItem}`);
    console.log('DRAWER:\t' + drawer + '\t' + sock2user.get(drawer));
    gameTimeout = setTimeout(endGame, GAME_DURATION*1000);
    timeleft = GAME_DURATION;
    gameInterval = setInterval(updateInfo, 1000);
}

function updateInfo(){
    io.emit('game info', {'drawer': sock2user.get(drawer), 'timeRemaining': timeleft});
    timeleft -= 1;
}

function endGame(){
    console.log("=====\nGAME ENDED")

    //show end game page
    clearInterval(gameInterval);
    clearTimeout(gameTimeout);
    if(users.length > 0) startGame();
}

io.on('connection', (socket) => {
    users.push(socket.id);

    var username = rug.generate();

    socket.on('username', (newusrname) => {
        if(users.includes(newusrname)) return;
        sock2user.set(socket.id, newusrname);
        socket.emit('username', newusrname);
        console.log('user name chng:\t' + socket.id + '\t' + newusrname);
    });

    socket.on('update canvas', (newcanvas) => {
        if(socket.id != drawer) return;
        socket.broadcast.emit('update canvas', newcanvas);
    });


    socket.on('disconnect', () =>{
        // TODO:  if drawer disconnected then restart game

        console.log('disconnected:\t' + socket.id + '\t' + sock2user.get(socket.id));
        users = users.filter((x) => { console.log('x = ' + x + ` x!=${socket.id} : ` + x != socket.id); return x != socket.id;});
        console.log(JSON.stringify(users));
        sock2user.delete(socket.id);

        if(users.length == 0 || drawer == socket.id){
            endGame();
        }
    });

    console.log('num of users  :\t', users.length);
    console.log('user connected:\t' + socket.id + '\t' + username);
    socket.emit('username', username);
    sock2user.set(socket.id, username);

    if(users.length==1){
        startGame();
    }

});

