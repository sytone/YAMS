$(document).ready(function () {
    window.setInterval("getStats()", 10000);
    getStats();
});

function getStats() {
    $.ajax({
        url: "http://richardbenson.co.uk/yams/ping-server.php",
        data: "host=" + $('#server-host').val() + "&port=" + $('#server-port').val(),
        dataType: "JSONP",
        success: function (data) {
            if (data) {
                $('#server-status').html('<div class="alert alert-info">' + data.motd + '</div>' +
                                         '<span class="label label-success">Online</span> ' + data.players + '/' + data.max_players + ' players online.');
            } else {
                $('#server-status').html('<span class="label label-important">OFFLINE</span>');
            }
        }
    });
}