$(() => {

});

const newRoom = () => {
    fetch('/room/create', {
        method: 'POST'
    }).then(res => res.json()).then(data => window.location.href += data.roomId);
}