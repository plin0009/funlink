const copyUrl = () => {
    $('#url').select();
    document.execCommand('copy');
}

const app = new Vue({
    el: '#app',
    data: {
        room: {
        },
        messages: [],
        socket: io(document.location.pathname)
    },
    methods: {
        addMessage: function(message) {
            this.messages.push(message);
            if (!message.sender) {
                $('#messages').append($($('<li class="log"/>').text(message)));
            } else {
                let $sender = $('<span class="nickname"/>').text(message.sender).css('color', '#012');
                let $message = $('<span class="msg"/>').text(message.content);
                $('#messages').append($($('<li class="left"/>').append($sender, $message)));
            }
            $('#messages')[0].scrollTop = $('#messages')[0].scrollHeight;
        }
    },
    mounted: function() {
        $('#url').val(window.location.href);
        this.socket.on('connect', () => {
            console.log('socket connected');
            $('#chooseNickname').submit(e => {
                e.preventDefault();
                this.socket.emit('join', $('#nickname').val());
                $('#chooseNickname').remove();
                return false;
            });
            this.socket.on('joined', r => {
                this.room = r;

                this.socket
                .on('new person', person => {
                    this.room.people[person.id] = person;
                    this.room.peopleList.push(person.id);
                    this.addMessage(`${person.nickname} has entered the room.`);
                })
                .on('new leader', data => {
                    if (data.old) {
                        this.addMessage(`${this.room.people[data.old].nickname} has chosen ${this.room.people[data.new].nickname} to be the leader.`);
                        delete this.room.people[data.old].role;
                        if (data.old === this.socket.id) {
                            $('#gameChoices').prop('disabled', true);
                        }
                    } else {
                        this.addMessage(`${this.room.people[data.new].nickname} is now the leader.`);
                    }
                    this.room.leader = data.new;
                    this.room.people[data.new].role = 'leader';
                    if (this.room.leader === this.socket.id) {
                        $('#gameChoices').prop('disabled', false);
                    }
                })
                .on('new message', message => {
                    this.addMessage(message);
                    $('#messages')[0].scrollTop = $('#messages')[0].scrollHeight;
                })
                .on('person left', personId => {
                    let person = this.room.people[personId];
                    this.room.peopleList.splice(this.room.peopleList.indexOf(personId), 1);
                    this.addMessage(`${person.nickname} has left the room.`);
                    delete this.room.people[personId];
                });

                this.addMessage(`You're in!`);
                if (this.room.leader === this.socket.id) {
                    $('#gameChoices').prop('disabled', false);
                }
                $('#sendMessage').submit(e => {
                    e.preventDefault();
                    this.socket.emit('sent message', $('#message').val());
                    $('#message').val('');
                    return false;
                });
                $('#chooseGame').submit(e => {
                    e.preventDefault();
                    // choose game
                    this.socket.emit('chose game', $('input[name=gameChoice]:checked').val());
                    return false;
                });
                $('#interact').show();
            });
        });
    }
});