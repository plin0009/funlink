const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

let rooms = {};

app.get('/:ns', (req, res) => {
    if (!rooms[req.params.ns]) {
        newRoom(req.params.ns);
    }
    res.sendFile(__dirname + '/client/index.html');
});
const newRoom = ns => {
    console.log(`new namespace ${ns}`);
    rooms[ns] = {
        peopleList: [],
        people: {}
    };
    let namespace = io.of('/' + ns);
    namespace.on('connect', socket => {
        console.log(`${socket.id} connected`);
        console.log(Object.keys(namespace.connected));
        socket.on('join', nickname => {
            console.log(`${nickname} connected to namespace ${ns}`);
            let role = 'spectator';
            if (!rooms[ns].peopleList.length)           role = 'leader';
            else if (rooms[ns].peopleList.length < 2)   role = 'player';
            let person = {
                id: socket.id,
                nickname: nickname,
                role: role
            }
            rooms[ns].people[socket.id] = person;
            rooms[ns].peopleList.push(socket.id);
            socket.emit('joined', rooms[ns]);
            socket.broadcast.emit('new person', person);
        });
        socket.on('disconnect', () => {
            console.log(`${socket.id} disconnected`);
            if (rooms[ns].people[socket.id]) {
                console.log(`${socket.id} is no longer a person`);
                let person = rooms[ns].people[socket.id];
                socket.broadcast.emit('person left', person);
                delete rooms[ns].people[socket.id];
                rooms[ns].peopleList.splice(rooms[ns].peopleList.indexOf(socket.id), 1);
                
                if (person.role === 'leader' && rooms[ns].peopleList.length) {
                    let newLeaderId = rooms[ns].peopleList[0];
                    rooms[ns].people[newLeaderId].role = 'leader';
                    socket.broadcast.emit('role change', rooms[ns].people[newLeaderId]);
                    if (rooms[ns].peopleList.length > 1) {
                        let newPlayerId = rooms[ns].peopleList[1];
                        rooms[ns].people[newPlayerId].role = 'player';
                        socket.broadcast.emit('role change', rooms[ns].people[newPlayerId]);
                    }
                }
                else if (person.role === 'player' && rooms[ns].peopleList.length > 1) {
                    let newPlayerId = rooms[ns].peopleList[1];
                    rooms[ns].people[newPlayerId].role = 'player';
                    socket.broadcast.emit('role change', rooms[ns].people[newPlayerId]);
                }
            }
            if (!Object.keys(namespace.connected).length) {
                console.log(`deleting namespace ${ns}`);
                namespace.removeAllListeners();
                delete rooms[ns];
                delete io.nsps[`/${ns}`];
            }
        });
    });
};

http.listen(port, () => console.log(`listening on port ${port}`));