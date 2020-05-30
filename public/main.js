var canvasDisabled = true;
const socket = io();

window.addEventListener('load', function (){
    var canvas = document.getElementById('mainCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = 640;
    canvas.height = 480;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    var pos = {x: 0, y: 0};

    document.addEventListener('mousemove', draw);
    document.addEventListener('mousedown' , setPosition);
    document.addEventListener('mouseenter' , setPosition);
    document.getElementById('canvas-clear').addEventListener('click', canvasClear);

    function canvasClear(e){
        canvas = document.getElementById('mainCanvas');
        if(canvasDisabled) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
    }

    function setPosition(e){
        pos.x = e.offsetX * canvas.width / canvas.clientWidth | 0;
        pos.y = e.offsetY * canvas.height / canvas.clientHeight | 0
    }

    function draw(e){
        if(canvasDisabled) return;
        if(e.buttons != 1) return;
        ctx.beginPath();
        let parent = document.getElementById('canvasdiv');
        var radius = (parent.clientWidth + parent.clientHeight) / 150;
        ctx.lineWidth = radius;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
        ctx.moveTo(pos.x, pos.y);
        setPosition(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

/*
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
        ctx.moveTo(pos.x, pos.y);
        setPosition(e);
        ctx.lineTo(pos.x, pos.y);

        ctx.stroke();
*/  
        socket.emit('update canvas', canvas.toDataURL());
    };


    function updateMessage(msg){
        document.getElementById('game-message').innerHTML = msg;
    }
    function updateTimeRemaining(time){
	let mins = ('000' + Math.floor(time/60)).slice(-2);
	let secs = ('000' + time%60).slice(-2);
        document.getElementById('timeleft').innerText = `Time left: ${mins}:${secs}`;
    }
    function appendChatMessage(msg){
        let chatmessagebox = document.getElementsByClassName('messages')[0];
        let shouldscroll = chatmessagebox.scrollTop + chatmessagebox.clientHeight === chatmessagebox.scrollHeight
        document.getElementById('message-list').innerHTML += msg;
        if(!shouldscroll){
            chatmessagebox.scrollTop = chatmessagebox.scrollHeight;
        }
    }

    socket.on('username', (usr) => {
        console.log('username:' + usr);
        document.getElementById('username').innerText = usr;
    });

    socket.on('game start', (gameinfo) => {
        canvasDisabled = true;
        console.log('game start');
        /*
        1. clear canvas
        2. update game message
        4. set time remaining
        */
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateMessage(gameinfo['drawer'] + ' is drawing');
        updateTimeRemaining(gameinfo['timeRemaining']);

    });


    socket.on('game info', (gameinfo) => {
        console.log('game info' + JSON.stringify(gameinfo));
        updateTimeRemaining(gameinfo['timeRemaining']);
        
        if(gameinfo.drawer == "") {
            updateMessage('<span class="special">Game finished...</span>');
            canvasDisabled = true;
        } else if(gameinfo.drawer != document.getElementById('username').innerText ) {
            updateMessage(gameinfo['drawer'] + ' is drawing');
            canvasDisabled = true;
        } else {
            canvasDisabled = false;
        }
        

    });

    socket.on('drawer', (item) => {
        console.log('I need to draw : ' + item);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateMessage("YOU need to draw : " + item);
        canvasDisabled = false;
    });

    socket.on('update canvas', (canvasDataURL) => {
        console.log('update canvas');
        let img = new Image;
        img.onload = () => ctx.drawImage(img,0,0);
        img.src = canvasDataURL;
    });

    socket.on('message', (msg) => {
        console.log("Recieved msg : " + msg);
        appendChatMessage(msg);
    });

    socket.on('points', (ptsdat) => {
        console.log("Received points: " + JSON.stringify(ptsdat));
        document.getElementById('points').innerText = `Points: ${ptsdat.game}`;
        appendChatMessage(`<li><span="${(ptsdat.round > 0)?'correct':'special'}"/>You've earned ${ptsdat.round} points this round</span></li>`);
    });

    var testUser = setInterval(() => {
        if(document.getElementById('username').innerText == 'new User'){
            socket.emit('get-username', '');
        } else {
            this.clearInterval(testUser);
        }
    }, 500)

    $('#chatbox-form').submit((e) => {
        e.preventDefault();
        let msg = document.getElementById('chat-message-input').value;
        msg = msg.trim();
        if(! msg) return false;
        socket.emit('message', msg);
        document.getElementById('chat-message-input').value = "";
        return false;
    });
    $('#username-form').submit((e) => {
        e.preventDefault();
        socket.emit('username', $('#username-input').val());
        $('#username-input').val('');
        return false;
    });

});
