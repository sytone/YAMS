// YAMS Admin Layout
// (c) 2011 Richard Benson
// Authored by Richard Benson
// Portions Copyright (c) 2008, Yahoo! Inc.
// All rights reserved.

YAMS.namespace("layout");

YAMS.layout = {

    name: "YAMS Layout",
    version: "1.0",

    newBuild: function () {
        this.top = $('#header');
        this.right = $('#server-status');
        this.bottom = $('#yams-log');
        this.center = $('#main');

        this.layout = $('body').layout({
            useStateCookie: true,

            defaults: { closable: true, resizable: true, slidable: true, onresize: function () { YAMS.layout.resizeConsoles(); } },

            north: { slideable: false, closable: false, resizable: false, size: 30, showOverflowOnHover: true },
            south: { size: 200 },
            east: { size: 300, onresize: $.layout.callbacks.resizePaneAccordions }
        });
        YAMS.menu.build();

        this.buildServerButtons();
    },

    buildServerButtons: function () {
        $('#server-accordion')
			.append('<h3><a href="#">Control</a></h3><div id="server-control"></div>')
			.append('<h3><a href="#">Players</a></h3><div id="players"></div>')
			.append('<h3><a href="#">Monitoring</a></h3><div id="server-monitoring"></div>');

        $('#server-control')
			.append($('<button id="start-server">Start</button>').button().click(function () { YAMS.admin.startServer(); return false; }))
			.append($('<button id="stop-server">Stop</button>').button().click(function () { YAMS.admin.stopServer(); return false; }))
			.append($('<button id="restart-server">Restart</button>').button().click(function () { YAMS.admin.restartServer(); return false; }))
			.append($('<button id="restart-server-when-free">Restart When Free</button>').button().click(function () { YAMS.admin.restartServerWhenFree(); return false; }))
			.append('<br />')
			.append($('<button id="delayed-restart-server">Restart After</button>').button().click(function () { YAMS.admin.delayedRestartServer(); return false; }))
			.append($('<input type="text" id="delay-time" size="3" />'))
            .append('<br />')
            .append($('<button id="toggle-downfall">Toggle Rain/Snow</button>').button().click(function () { YAMS.admin.sendCommand('toggledownfall'); return false; }))
            .append('<br />')
            .append($('<button id="set-time">Set Time</button>').button().click(function () { YAMS.panel.setTime(); return false; }))
            .append('<br />')
            .append($('<button id="backup-now">Backup Now</button>').button().click(function () { YAMS.panel.backupNow(); return false; }));

        $('#server-accordion').accordion({
            fillSpace: true,
            active: 1
        });
    },

    resizeConsoles: function () {
        var centerHeight = this.center.height();
        var centerWidth = this.center.width();
        $('#console').height(centerHeight - 100);
        $('#chat').height(centerHeight - 100);

        $('#console-input').width(centerWidth - 100);
        $('#chat-input').width(centerWidth - 100);

        $('.ui-tabs .ui-tabs-panel').height(centerHeight - 74);
    }

}

YAHOO.register("YAMSlayout", YAMS.layout, {version: YAMS.layout.version});