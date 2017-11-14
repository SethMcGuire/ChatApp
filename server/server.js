var express = require('express');
var app = express();
var socketIO = require('socket.io');
var http = require('http');
var server = http.createServer(app);
var io = socketIO(server);
var crypto = require('crypto');
var key = "ladkfjeoijiejoef9878euofjopduf98ufpojfoij";

var {generateMessage, generateLocationMessage} = require('./utils/message');
var {isRealString} = require('./utils/validation');
var {Users} = require('./utils/users');
var users = new Users();

var path = require('path');
var publicPath = path.join(__dirname, '../public');
var port = process.env.PORT || 3000;

app.use(express.static(publicPath));

io.on('connection', function(socket){
    console.log('New user connected');

    socket.on('join', function(params, callback){
        if(!isRealString(params.name) || !isRealString(params.room)) {
           return callback('Name and room name are required');
        }
        socket.join(params.room);
        users.removeUser(socket.id);
        users.addUser(socket.id, params.name, params.room);

        io.to(params.room).emit('updateUserList', users.getUserList(params.room));
        socket.emit('newMessage', generateMessage('Admin', 'Welcome to the chat app'));
        socket.broadcast.to(params.room).emit('newMessage', generateMessage('Admin',  `${params.name} joined`));    

        callback();
    });

    socket.on('createMessage', function(message, callback){
        var user = users.getUser(socket.id);

        var enc = crypto.createCipher("aes-256-ctr", key).update(message.text, "utf-8", "hex");
        var dec = crypto.createDecipher("aes-256-ctr", key).update(enc, "hex", "utf-8");
        if(user && isRealString(message.text)){
            io.to(user.room).emit('newMessage', generateMessage(user.name, dec));            
        }

        callback();
    });

    socket.on('createLocationMessage', function(coords){
        var user = users.getUser(socket.id);

        if(user){
            io.to(user.room).emit('newLocationMessage', generateLocationMessage(user.name, coords.latitude, coords.longitude));            
        }
    });

    socket.on('disconnect', function(){
        var user = users.removeUser(socket.id);

        if(user){
            io.to(user.room).emit('updateUserList', users.getUserList(user.room));
            io.to(user.room).emit('newMessage', generateMessage('Admin', `${user.name} has left`));
        }
    });
});


server.listen(port, function(){
    console.log(`Server running on ${port}`);
});


//make chatrooms case insensitive
//make usernames unique