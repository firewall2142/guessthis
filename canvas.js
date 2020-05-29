window.addEventListener('load', function (){
    var canvas = document.getElementById('mainCanvas');
    ctx = canvas.getContext('2d');

    var pos = {x: 0, y: 0};

    document.addEventListener('mousemove', draw);
    document.addEventListener('mousedown' , setPosition);
    document.addEventListener('mouseenter' , setPosition);
    document.addEventListener('keypress', canvasClear);

    function canvasClear(e){
        if(e.key=='C' || e.key=='c'){
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    function setPosition(e){
        let rect = canvas.getBoundingClientRect();
        pos.x = e.clientX - rect.left;
        pos.y = e.clientY - rect.top;
    }

    function draw(e){
        if(e.buttons != 1) return;
        ctx.beginPath();
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
        ctx.moveTo(pos.x, pos.y);
        setPosition(e);
        ctx.lineTo(pos.x, pos.y);

        ctx.stroke();
    }
});