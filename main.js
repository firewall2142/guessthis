var canvasDisabled = true;
const socket = io();

window.addEventListener('load', function (){
    var canvas = document.getElementById('mainCanvas');
    ctx = canvas.getContext('2d');

    var pos = {x: 0, y: 0};

    document.addEventListener('mousemove', draw);
    document.addEventListener('mousedown' , setPosition);
    document.addEventListener('mouseenter' , setPosition);
    document.addEventListener('keypress', canvasClear);

    function canvasClear(e){
        if(canvasDisabled) return;
        if(e.key=='C' || e.key=='c'){
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    function setPosition(e){
        if(canvasDisabled) return;
        let rect = canvas.getBoundingClientRect();
        pos.x = e.clientX - rect.left;
        pos.y = e.clientY - rect.top;
    }

    function draw(e){
        if(canvasDisabled) return;
        if(e.buttons != 1) return;
        ctx.beginPath();
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
        ctx.moveTo(pos.x, pos.y);
        setPosition(e);
        ctx.lineTo(pos.x, pos.y);

        ctx.stroke();
        socket.emit('update canvas', canvas.toDataURL());
    };


    function updateMessage(msg){
        document.getElementById('game-message').innerHTML = msg;
    }
    function updateTimeRemaining(time){
        document.getElementById('timeleft').innerText = `${Math.floor(time/60)}:${time%60}`;
    }
    function appendChatMessage(msg){
        document.getElementById('message-list').innerHTML += msg;
    }

    socket.on('username', (usr) => {
        console.log('username:' + usr);
        document.getElementById('username').innerText = usr;
    });

    socket.on('game start', (gameinfo) => {
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
        //console.log('game info' + JSON.stringify(gameinfo));
        updateTimeRemaining(gameinfo['timeRemaining']);
        
        if(gameinfo['drawer'] != document.getElementById('username').innerText)
            updateMessage(gameinfo['drawer'] + ' is drawing');
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
    })


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