'use strict';
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const rfid = require('random-friendly-id');
const settings = require('./settings');
const port = process.env.PORT || 3000;

let rooms = {};
app.use('/client', express.static(__dirname + '/client'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/client/');
});
app.post('/room/create', (req, res) => {
    let id = rfid();
    newRoom(id);
    res.send({roomId: id});
});
app.get('/:ns', (req, res) => {
    if (!rooms[req.params.ns]) {
        console.log(`no ${req.params.ns} room`);
        return res.sendFile(__dirname + '/client/404.html');
    }
    res.sendFile(__dirname + '/client/room.html');
});
const newRoom = ns => {
    console.log(`new namespace ${ns}`);
    rooms[ns] = {
        peopleList: [],
        people: {},
        inactivity: setTimeout(() => deleteRoom(namespace, ns), settings.inactivityTimeout)
    };
    let namespace = io.of('/' + ns);
    namespace.on('connect', socket => {
        console.log(`${socket.id} connected`);
        if (rooms[ns].inactivity) {
            console.log(`${ns} is active`);
            clearTimeout(rooms[ns].inactivity);
            delete rooms[ns].inactivity;
        }
        socket.on('join', nickname => {
            console.log(`${nickname} connected to namespace ${ns}`);
            let person = {
                id: socket.id,
                nickname: nickname
            };
            if (!rooms[ns].peopleList.length) {
                rooms[ns].leader = socket.id;
                person.role = 'leader';
            }
            rooms[ns].people[socket.id] = person;
            rooms[ns].peopleList.push(socket.id);
            socket.emit('joined', rooms[ns]);
            socket.broadcast.emit('new person', person);
        });
        socket.on('sent message', message => {
            namespace.emit('new message', {
                sender: rooms[ns].people[socket.id].nickname,
                content: message
            });
        });
        socket.on('chose game', game => {
            // game
        });
        socket.on('disconnect', () => {
            if (rooms[ns].people[socket.id]) {
                let person = rooms[ns].people[socket.id];
                console.log(`${person.nickname} disconnected from namespace ${ns}`);
                socket.broadcast.emit('person left', socket.id);
                delete rooms[ns].people[socket.id];
                rooms[ns].peopleList.splice(rooms[ns].peopleList.indexOf(socket.id), 1);
                
                if (person.role === 'leader' && rooms[ns].peopleList.length) {
                    let newLeaderId = rooms[ns].peopleList[0];
                    socket.broadcast.emit('new leader', {
                        //old: socket.id,
                        new: newLeaderId
                    });
                    rooms[ns].leader = newLeaderId;
                    rooms[ns].people[newLeaderId].role = 'leader';
                }
            }
            if (!Object.keys(namespace.connected).length) {
                console.log(`no one is in namespace ${ns}`);
                rooms[ns].inactivity = setTimeout(() => deleteRoom(namespace, ns), settings.inactivityTimeout);
            }
            console.log(`${socket.id} disconnected`);
        });
    });
};

const deleteRoom = (namespace, ns) => {
    console.log(`deleting namespace ${ns} due to inactivity`);
    namespace.removeAllListeners();
    delete rooms[ns];
    delete io.nsps[`/${ns}`];
}

http.listen(port, () => console.log(`listening on port ${port}`));