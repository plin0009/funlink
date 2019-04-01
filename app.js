const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
const rfid = require('random-friendly-id');

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
        inactivity: setTimeout(() => {
            console.log(`deleting namespace ${ns} due to inactivity`);
            namespace.removeAllListeners();
            delete rooms[ns];
            delete io.nsps[`/${ns}`];
        }, 30000)
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
                let person = rooms[ns].people[socket.id];
                console.log(`${person.nickname} (${socket.id}) left`);
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
                console.log(`no one is in namespace ${ns}`);
                rooms[ns].inactivity = setTimeout(() => {
                    console.log(`deleting namespace ${ns} due to inactivity`);
                    namespace.removeAllListeners();
                    delete rooms[ns];
                    delete io.nsps[`/${ns}`];
                }, 30000);
            }
        });
    });
};

http.listen(port, () => console.log(`listening on port ${port}`));