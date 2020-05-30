var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var rug = require('random-username-generator');

var PORT = 3000;

var users = [];
var DRAW_ITEMS = ["Icecream", "Sandwich", "House", "Cage", "Necklace", "Piano", "Mobile", "Headphones"];
var drawer_index = 0;
const GAME_DURATION = 120;
const POINT_DIST = [5, 3, 2, 1];


//for testing only!!
app.use(express.static(__dirname + '/public'));


app.get('/', (req, res, next) => {
    res.sendFile(__dirname + '/index.html')
});

server.listen(PORT, () => {console.log(`listening on ${PORT}`)});

var sock2user = new Map();
var sock2points = new Map();
var gameTimeout;
var gameInterval; //gameinfo interval
var drawItem;
var drawer;
var timeleft;
var gameActive = false;
var correctGuess = [];


function startGame(){
    correctGuess = [];
    gameActive = true;

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
    gameTimeout = setTimeout(endGameScreen, GAME_DURATION*1000);
    timeleft = GAME_DURATION;
    gameInterval = setInterval(updateInfo, 1000);
}

function updateInfo(){
    io.emit('game info', {'drawer': sock2user.get(drawer), 'timeRemaining': timeleft});
    timeleft -= 1;
}

function endGameScreen(){
    gameActive = false;
    clearTimeout(gameTimeout);
    clearInterval(gameInterval);

    for (var i = correctGuess.length - 1; i >= 0; i--) {
        sock2points.set(correctGuess[i], sock2points.get(correctGuess[i]) + POINT_DIST[Math.min(i, POINT_DIST.length-1)]);
    }

    var roundcmp = (a, b) => {
        let ind1 = correctGuess.indexOf(a);
        let ind2 = correctGuess.indexOf(b);
        if(ind1 == ind2){
            if(a < b) return 1;
            else if(a > b) return -1;
            else return 0;
        } else {
            return ind1 - ind2;
        }
    };

    var pointcmp = (a, b) => {
        return sock2points.get(b) - sock2points.get(a);
    }
    var roundrank = [...users];
    var overallrank = [...users];
    roundrank.sort(roundcmp);
    overallrank.sort(pointcmp);

    var scoreTable = '<li><table class="chat-table">';
    scoreTable += '<colgroup><col class="outlined" span="2"><col class="outlined" span="2"></colgroup>';
    for (var i = users.length - 1; i >= 0; i--) {
        scoreTable += `<tr><td><span class="user">${sock2user.get(roundrank[i])}</span></td><td>+${(i>correctGuess.length-1)?0:POINT_DIST[Math.min(i, POINT_DIST.length-1)]}</td>`;
        scoreTable += `<td><span class="user">${sock2user.get(overallrank[i])}</span></td><td>${sock2points.get(overallrank[i])}</td></tr>`;
    }
    scoreTable += '<tr><th>user</th><th>Points</th><th>user</th><th>Points</th></tr>';
    scoreTable += '<tr><th colspan="2">This Round</th><th colspan="2">Overall</th></tr>';
    scoreTable += '</table></li>';

    //display points earned
    io.emit('message', scoreTable);
    for (var i = users.length - 1; i >= 0; i--) {
        var x = correctGuess.indexOf(users[i]);
        io.to(users[i]).emit('points', {game: sock2points.get(users[i]), 
                                round: (x<0)?0:POINT_DIST[Math.min(x, POINT_DIST.length-1)]})
    }

    timeleft = 10; //end game screen time
    gameInterval = setInterval(()=> {
            io.emit('game info', {'drawer': '', 'timeRemaining': timeleft});
            timeleft -= 1;
        }, 1000);
    gameTimeout = setTimeout(endGame, timeleft*1000);
}

function endGame(){
    gameActive = false;
    console.log("=====\nGAME ENDED")

    //show end game page
    clearInterval(gameInterval);
    clearTimeout(gameTimeout);
    if(users.length > 0) startGame();
}


io.on('connection', (socket) => {

    sock2points.set(socket.id, 0);
    users.push(socket.id);

    var username = rug.generate();

    socket.on('username', (newusrname) => {
        console.log(`${newusrname}.match(/^[a-z0-9_\-]/i) = ${newusrname.match(/^[a-z0-9_\-]/i)}`);
        if(newusrname.length <= 2 || newusrname.match(/[^a-z0-9_\-]/i) != null) {
            socket.emit('message', '<li><span class="special">Invalid username</span></li>')
            return;
        }
        if(users.includes(newusrname)) return;
        let oldusrname = sock2user.get(socket.id);
        console.log(`oldusrname = ${oldusrname} and !oldusrname = ${!oldusrname}`);
        if(!oldusrname){
            io.emit('message', `<li><span class="user">${newusrname}</span> has joined!</li>`)
        } else {
            io.emit('message', `<li><span class="user">${oldusrname}</span> changed username to <span class="user">${newusrname}</span></li>`)
        }
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
        sock2points.delete(socket.id);
        console.log('disconnected:\t' + socket.id + '\t' + sock2user.get(socket.id));
        users = users.filter((x) => { console.log('x = ' + x + ` x!=${socket.id} : ` + x != socket.id); return x != socket.id;});
        console.log(JSON.stringify(users));
        sock2user.delete(socket.id);

        if(users.length == 0 || drawer == socket.id){
            endGame();
        }
    });

    socket.on('message', (msg) => {
        console.log("Message:\t" + socket.id + "\t" + sock2user.get(socket.id) + `\t${msg}`);
        msg = escapeHtml(msg);
        msg = msg.replace(/^\s+|\s+$/g, ''); //remove leading and trailing whitespace
        msg = msg.replace(/\n+/g, '');
        msg = `<span class="user">${sock2user.get(socket.id) || 'Unknown user'}</span>: ${msg}`;


        console.log(`gameActive = ${gameActive}`);
        console.log(`msg.match(RegExp(drawItem, 'i')) != null = ${msg.match(RegExp(drawItem, 'i')) != null}`);
        console.log(`msg.toLowerCase() == drawItem.toLowerCase() = ${msg.toLowerCase() == drawItem.toLowerCase()}`);

        let ismatch = msg.match(RegExp(drawItem, 'i')) != null;
        
        if(gameActive && ismatch){
            if(drawer == socket.id) {
                socket.emit('message' , '<li><span class="special">You have to draw the figure!</span></li>');
                return;
            } else if(correctGuess.includes(socket.id)){
                socket.emit('message', '<li><span class="special">Shh! You have already guessed the correct answer...</span></li>');
                return;
            } else {
                correctGuess.push(socket.id);
            }
            socket.broadcast.emit('message', 
            `<li><span class="correct"><span class="user">${sock2user.get(socket.id)}</span> is right!</span></li>`);
            socket.emit('message', 
            '<li><span class="correct"><span class="user yourself">YOU</span> are right!</span></li>');
            if(correctGuess.length == users.length - 1){
                endGameScreen();
            }
            return;
        }
        io.emit('message', `<li>${msg}</li>`);
        
    });

    socket.on('get-username', () => {
        socket.emit('username', sock2user.get(socket.id));
    });

    console.log('num of users  :\t', users.length);
    console.log('user connected:\t' + socket.id + '\t' + username);
    socket.emit('username', username);
    sock2user.set(socket.id, username);
    setTimeout(() => {}, 1000);
    if(users.length==1){
        startGame();
    }

});

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }