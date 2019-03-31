$(() => {
    $('#url').val(window.location.href);

    const socket = io(document.location.pathname);
    socket.on('connect', () => {
        console.log('socket connected');
        $('#chooseNickname').submit(e => {
            e.preventDefault();
            socket.emit('join', $('#nickname').val());
            $('#chooseNickname').remove();
            return false;
        });
        let messages = $('#messages');
        socket.on('joined', room => {
            console.log(`You're in! ${room.peopleList.length} ${room.peopleList.length == 1 ? 'person' : 'people'} in the room.`);
            messages.append($('<li>').text(`You're in! ${room.peopleList.length} ${room.peopleList.length == 1 ? 'person' : 'people'} in the room.`));
        });
        socket.on('new person', person => {
            console.log(`${person.nickname} the ${person.role} with id ${person.id} has joined the game.`);
            messages.append($('<li>').text(`${person.nickname} the ${person.role} with id ${person.id} has joined the game.`));
        });
        socket.on('role change', person => {
            console.log(`${person.nickname} has been promoted to ${person.role}.`);
            messages.append($('<li>').text(`${person.nickname} has been promoted to ${person.role}.`));
        });
        socket.on('person left', person => {
            console.log(`${person.nickname} (${person.role}) has left the game.`);
            messages.append($('<li>').text(`${person.nickname} (${person.role}) has left the game.`));
        });
    });
});

const copyUrl = () => {
    $('#url').select();
    document.execCommand('copy');
}