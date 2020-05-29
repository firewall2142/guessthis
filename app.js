var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var rug = require('random-username-generator');

var PORT = 3000;

//for testing only!!
app.use(express.static(__dirname));


app.get('/', (req, res, next) => {
    res.sendFile(__dirname + '/index.html')
});

server.listen(PORT, () => {console.log(`listening on ${PORT}`)});

var sock2user = new Map();


io.on('connection', (socket) => {
    var username = rug.generate();
    console.log('new user connected : socket = ' + socket.id + ' username ' + username);
    socket.emit('username', username);
    sock2user.set(socket.id, username);
           
    socket.on('disconnect', () =>{
        sock2user.delete(socket.id);
    });
    socket.on('username', (newusrname) => {
        console.log(socket.id + ': username : ' + newusrname);
        sock2user.set(socket.id, newusrname);
        socket.emit('username', newusrname);
    });
});
