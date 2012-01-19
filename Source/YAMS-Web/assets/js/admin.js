// YAMS Admin JS Function
// (c) 2011 Richard Benson.
// Authored by Richard Benson
// Portions Copyright (c) 2008, Yahoo! Inc.
// All rights reserved.

YAMS.namespace("admin");

YAMS.admin = {
    name: "YAMS Admin",
    version: "1.0",

    servers: [],

    timer: 0,
    lastLogId: 0,

    selectedServer: 0,
    lastServerLogId: 0,
    serverTimer: 0,
    serverUpdateInProgress: false,

    panels: {},

    log: function (strMessage) {
        if (typeof (console) != "undefined") console.log(strMessage);
    },

    init: function () {
        YAMS.panel.dialogs.loading = YAMS.panel.createDialog("wait", 250, "Loading, please wait..");

        $.ajaxSetup({
            url: '/api/',
            type: 'POST',
            dataType: 'json'
        });

        YAMS.layout.newBuild();
        this.getServers();
        this.updateGlobalLog();
        this.timer = setInterval("YAMS.admin.updateGlobalLog();", 10000);

        window.alert = YAMS.panel.alert;

    },

    getServers: function () {
        $.ajax({
            data: 'action=list',
            success: function (results) {
                for (var i = 0, len = results.servers.length; i < len; ++i) {
                    var s = new YAMS.admin.server(results.servers[i].id, results.servers[i].title, results.servers[i].ver);
                    YAMS.admin.servers.push(s);
                }
                for (var i = 0, len = YAMS.admin.servers.length; i < len; i++) {
                    var subMenu = YAMS.menu.menuBar.getItem(1).cfg.getProperty("submenu");
                    subMenu.addItems([{ text: YAMS.admin.servers[i].name, onclick: { fn: YAMS.admin.setServer, obj: i}}]);
                }

                $('#server-console').tabs({
                    select: function (event, ui) {
                        if (ui.panel.id == "settings-tab") {
                            YAMS.admin.getServerSettings();
                        } else if (ui.panel.id == "apps-tab") {
                            YAMS.admin.getApps();
                        } else if (ui.panel.id == "connections-tab") {
                            YAMS.admin.getConnections();
                        } else if (ui.panel.id == "whitelist-tab") {
                            YAMS.admin.getWhitelist();
                        }
                    }
                }).show();

                $('#console-send').button().click(YAMS.admin.consoleSend);
                $('#chat-send').button().click(YAMS.admin.chatSend);
                $('#console-input').on('keydown', function (e) {
                    if (e && (e.keyCode == 13)) { e.preventDefault(); YAMS.admin.consoleSend(); }
                });
                $('#chat-input').on('keydown', function (e) {
                    if (e && (e.keyCode == 13)) { e.preventDefault(); YAMS.admin.chatSend(); }
                });

                YAMS.layout.resizeConsoles();

                //Set initial server
                YAMS.admin.setServer(0, 0, 0);
            }
        })
    },

    setServer: function (a, b, serverid) {
        //Clear out any previous contents
        $('#console').html('');
        $('#chat').html('');
        YAMS.admin.lastServerLogId = 0;
        clearInterval(YAMS.admin.serverTimer);
        //Fix the server
        YAMS.admin.selectedServer = YAMS.admin.servers[serverid].id;
        //Set the title
        $('#main h3').html(YAMS.admin.servers[serverid].name + ' (' + YAMS.admin.servers[serverid].ver + ')');
        //Load console
        YAMS.admin.updateServerConsole();
        YAMS.admin.checkServerStatus();
        //Set the timer
        YAMS.admin.serverTimer = setInterval("YAMS.admin.updateServerConsole();YAMS.admin.checkServerStatus();", 5000);
    },

    getApps: function (e) {
        $.ajax({
            url: '/assets/parts/apps-page.html',
            type: 'GET',
            dataType: 'text',
            success: function (data) {
                $('#apps-tab').html(data);
            }
        });
    },

    getWhitelist: function (e) {
        $.ajax({
            url: '/assets/parts/whitelist-page.html',
            type: 'GET',
            dataType: 'text',
            success: function (data) {
                $('#whitelist-tab').html(data);
                $.ajax({
                    data: 'action=get-server-whitelist&serverid=' + YAMS.admin.selectedServer,
                    success: function (results) {
                        if (results.enabled) {
                            $('#whitelist-enabled').html('Enabled');
                            YAMS.admin.refreshWhitelist();
                        } else {
                            $('#whitelist-enabled').html('Disabled');
                        }
                    }
                });
                YAMS.admin.refreshBanlist();
            }
        });
    },

    refreshWhitelist: function () {
        $.ajax({
            data: 'action=get-config-file&file=white-list.txt&serverid=' + YAMS.admin.selectedServer,
            success: function (results) {
                $('#whitelist-list').html('');
                for (var i = 0, len = results.length; i < len; ++i) {
                    $('#whitelist-list').append('<div>' + results[i] + '<a class="icon delete" href="javascript:void(0)" onclick="YAMS.admin.removeWhitelist(\'' + results[i] + '\')"></a></div>');
                }
            }
        });
    },

    removeWhitelist: function (player) {
        if (confirm('Are you sure you want to remove "' + player + '" from the whitelist?')) {
            YAMS.admin.sendCommand('whitelist remove ' + player);
            alert('"' + player + '" removed');
            YAMS.admin.refreshWhitelist();
        }
    },

    refreshBanlist: function () {
        $.ajax({
            data: 'action=get-config-file&file=banned-players.txt&serverid=' + YAMS.admin.selectedServer,
            success: function (results) {
                $('#banlist-list').html('');
                for (var i = 0, len = results.length; i < len; ++i) {
                    $('#banlist-list').append('<div>' + results[i] + '<a class="icon delete" href="javascript:void(0)" onclick="YAMS.admin.removeBanlist(\'' + results[i] + '\')"></a></div>');
                }
            }
        });
    },

    removeBanlist: function (player) {
        if (confirm('Are you sure you want to pardon "' + player + '"?')) {
            YAMS.admin.sendCommand('pardon ' + player);
            alert('"' + player + '" pardonned');
            YAMS.admin.refreshBanlist();
        }
    },

    getConnections: function (e) {
        $.ajax({
            url: '/assets/parts/connections-page.html',
            type: 'GET',
            dataType: 'text',
            success: function (data) {
                $('#connections-tab').html(data);
                $.ajax({
                    data: 'action=get-server-connections&serverid=' + YAMS.admin.selectedServer,
                    success: function (results) {
                        var strPrefix = results.externalip;
                        if (results.dnsname != "") strPrefix = results.dnsname + ".yams.in";
                        var strMCConnection = strPrefix;
                        if (results.mcport != 25565) strMCConnection += ":" + results.mcport;
                        $('#minecraft-name').val(strMCConnection);
                        var strPublic = "http://" + strPrefix;
                        if (results.publicport != 80) strPublic += ":" + results.publicport;
                        strPublic += "/servers/" + YAMS.admin.selectedServer + "/";
                        $('#public-website').html('<a href="' + strPublic + '" target="_blank">' + strPublic + '</a>');
                    }
                });
            }
        });
    },

    getServerSettings: function (e) {
        $.ajax({
            url: '/assets/parts/server-settings.html',
            type: 'GET',
            dataType: 'text',
            success: function (data) {
                $('#settings-tab').html(data);
                $.ajax({
                    data: 'action=get-server-settings&serverid=' + YAMS.admin.selectedServer,
                    success: function (results) {
                        $('#cfg_title').val(results.title);
                        if (results.optimisations === "True") $('#cfg_optimisations').prop("checked", true);
                        $('#cfg_memory').val(results.memory);
                        if (results.autostart === "True") $('#cfg_autostart').prop("checked", true);
                        var typeSelect = document.getElementById('cfg_type');
                        for (var i = 0, len = typeSelect.options.length; i < len; i++) {
                            if (typeSelect.options[i].value === results.type) typeSelect.options[i].selected = true;
                        }
                        $('#cfg_motd').val(results.motd);
                        $('#cfg_port').val(results.port);

                        var ipSelect = document.getElementById('cfg_listen-ip');
                        for (ip in results.IPs) {
                            ipSelect.options[ipSelect.options.length] = new Option(results.IPs[ip], results.IPs[ip], false, false);
                        }
                        for (i = 0; i < ipSelect.options.length; i++) {
                            if (ipSelect.options[i].value == results.listen) ipSelect.options[i].selected = true;
                        }
                    }
                });
                $.ajax({
                    data: 'action=get-mc-settings&serverid=' + YAMS.admin.selectedServer,
                    dataType: 'text',
                    success: function (data) {
                        $('#server-properties-div').html(data);
                    }
                });
            }
        });
    },

    saveServerSettings: function () {
        $.ajax({
            data: 'serverid=' + YAMS.admin.selectedServer + '&action=save-server-settings&' + $('#settings-form').serialize()
        });
    },

    checkServerStatus: function () {
        $.ajax({
            data: 'action=status&serverid=' + YAMS.admin.selectedServer,
            success: function (results) {
                $('#server-monitoring').html('<p>Running: ' + results.status + '</p>' +
                    '<p>Restart Needed: ' + results.restartneeded + '</p>' +
                    '<p>Restarting When Free: ' + results.restartwhenfree + '</p>' +
                    '<p>RAM: ' + results.ram + '</p>' +
                    '<p>VM: ' + results.vm + '</p>');
                if (results.status == "True") {
                    $('#start-server').button("disable");
                    $('#stop-server').button("enable");
                    $('#restart-server').button("enable");
                    $('#delayed-restart-server').button("enable");
                    $('#restart-server-when-free').button("enable");
                    $('#toggle-downfall').button("enable");
                    $('#set-time').button("enable");
                } else {
                    $('#start-server').button("enable");
                    $('#stop-server').button("disable");
                    $('#restart-server').button("disable");
                    $('#delayed-restart-server').button("disable");
                    $('#restart-server-when-free').button("disable");
                    $('#toggle-downfall').button("disable");
                    $('#set-time').button("disable");
                }

                //Update the player info
                var l = $('#players');
                l.html('');
                for (var i = 0, len = results.players.length; i < len; ++i) {
                    var r = results.players[i].name + " (" + results.players[i].x + "," + results.players[i].y + "," + results.players[i].z + ")";
                    $('<div>').attr('player', results.players[i].name).html(r).addClass('player').addClass(results.players[i].level).appendTo(l);
                }
                $('.player').contextMenu({
                    menu: "player-menu"
                },
                function (action, el, pos) {
                    switch (action) {
                        case "give":
                            YAMS.panel.givePanel($(el).attr('player'));
                            break;
                        case "xp":
                            YAMS.panel.giveXPPanel($(el).attr('player'));
                            break;
                        case "op":
                            YAMS.admin.sendCommand('op ' + $(el).attr('player'));
                            break;
                        case "deop":
                            YAMS.admin.sendCommand('deop ' + $(el).attr('player'));
                            break;
                        case "kick":
                            YAMS.admin.sendCommand('kick ' + $(el).attr('player'));
                            break;
                        case "ban":
                            YAMS.admin.sendCommand('ban ' + $(el).attr('player'));
                            break;
                        case "banip":
                            YAMS.admin.sendCommand('ban-ip ' + $(el).attr('player'));
                            break;
                        case "survival":
                            YAMS.admin.sendCommand('gamemode ' + $(el).attr('player') + ' 0');
                            break;
                        case "creative":
                            YAMS.admin.sendCommand('gamemode ' + $(el).attr('player') + ' 1');
                            break;
                        case "whisper":
                            YAMS.panel.whisperPanel($(el).attr('player'));
                            break;
                        case "tp":
                            YAMS.panel.teleportPanel($(el).attr('player'));
                            break;
                    };
                });
            },
            timeout: 4500
        });
    },

    mapServer: function () {
        $.ajax({
            data: 'action=overviewer&serverid=' + YAMS.admin.selectedServer +
                  "&lighting=" + $('#overviewer-lighting').prop("checked") +
                  "&night=" + $('#overviewer-night').prop("checked") +
                  "&normal=" + $('#overviewer-normal').prop("checked") +
                  "&spawn=" + $('#overviewer-spawn').prop("checked") +
                  "&cave=" + $('#overviewer-cave').prop("checked")
        });
    },
    imgServer: function () {
        $.ajax({
            data: 'action=c10t&serverid=' + YAMS.admin.selectedServer +
                  "&mode=" + $('#c10t-mode').val() +
                  "&night=" + $('#c10t-night').val()
        });
    },
    tectonicusServer: function () {
        $.ajax({
            data: 'action=tectonicus&serverid=' + YAMS.admin.selectedServer
        });
    },
    startServer: function () {
        $.ajax({
            data: 'action=start&serverid=' + YAMS.admin.selectedServer
        });
    },
    stopServer: function () {
        $.ajax({
            data: 'action=stop&serverid=' + YAMS.admin.selectedServer
        });
    },
    restartServer: function () {
        $.ajax({
            data: 'action=restart&serverid=' + YAMS.admin.selectedServer
        });
    },
    delayedRestartServer: function () {
        $.ajax({
            data: 'action=delayed-restart&delay=' + $('#delay-time').val() + '&serverid=' + YAMS.admin.selectedServer
        });
    },
    restartServerWhenFree: function () {
        $.ajax({
            data: 'action=restart-when-free&serverid=' + YAMS.admin.selectedServer
        });
    },
    deleteWorld: function () {
        $.ajax({
            data: 'action=delete-world&serverid=' + YAMS.admin.selectedServer
        });
    },

    sendCommand: function (strCommand) {
        $.ajax({
            data: 'action=command&serverid=' + YAMS.admin.selectedServer + '&message=' + escape(strCommand)
        });
    },

    consoleSend: function () {
        $.ajax({
            data: 'action=command&serverid=' + YAMS.admin.selectedServer + '&message=' + escape($('#console-input').val()),
            success: function () {
                $('#console-input').val('');
            }
        });
    },
    chatSend: function () {
        $.ajax({
            data: 'action=command&serverid=' + YAMS.admin.selectedServer + '&message=' + escape('say ' + $('#chat-input').val()),
            success: function () {
                $('#chat-input').val('');
            }
        });
    },

    updateServerConsole: function () {
        if (!YAMS.admin.serverUpdateInProgress) {
            YAMS.admin.serverUpdateInProgress = true;
            $.ajax({
                data: 'action=log&start=' + YAMS.admin.lastServerLogId + '&rows=0&serverid=' + YAMS.admin.selectedServer + '&level=all',
                success: function (results) {
                    var l = $('#console');
                    var c = $('#chat');
                    if (l.prop("scrollTop") + l.height() == l.prop("scrollHeight") || l.prop("scrollTop") == 0) var bolScrollL = true;
                    if (c.prop("scrollTop") + c.height() == c.prop("scrollHeight") || c.prop("scrollTop") == 0) var bolScrollC = true;
                    for (var i = 0, len = results.Table.length - 1; len >= i; --len) {
                        var r = results.Table[len];
                        var s = document.createElement('div');
                        $(s).addClass('message ' + r.LogLevel);
                        var d = eval('new ' + r.LogDateTime.replace(/\//g, '').replace('+0000', '').replace('+0100', ''));
                        var m = document.createTextNode('[' + d.getFullYear() + '-' + YAMS.admin.leadingZero(d.getMonth() + 1) + '-' + YAMS.admin.leadingZero(d.getDate()) + ' ' + YAMS.admin.leadingZero(d.getHours()) + ':' + YAMS.admin.leadingZero(d.getMinutes()) + '] ' + r.LogMessage);
                        s.appendChild(m);
                        if (r.LogLevel == 'chat') {
                            c.append(s);
                        } else {
                            l.append(s);
                        }

                        YAMS.admin.lastServerLogId = r.LogID;
                    }
                    if (bolScrollL) l.prop("scrollTop", l.prop("scrollHeight"));
                    if (bolScrollC) c.prop("scrollTop", c.prop("scrollHeight"));
                    $(YAMS.panel.dialogs.loading).dialog("close");
                    YAMS.admin.serverUpdateInProgress = false;
                }
            });
        }
    },

    updateGlobalLog: function () {
        $.ajax({
            data: 'action=log&start=' + YAMS.admin.lastLogId + '&rows=200&serverid=0&level=all',
            success: function (results) {
                var l = $('#yams-log');
                if (l.prop("scrollTop") + l.height() == l.prop("scrollHeight")) var bolScroll = true;
                for (var i = 0, len = results.Table.length - 1; len >= i; --len) {
                    var r = results.Table[len];
                    var s = document.createElement('div');
                    $(s).addClass('message ' + r.LogLevel);
                    var d = eval('new ' + r.LogDateTime.replace(/\//g, '').replace('+0000', ''));
                    s.innerHTML = '[' + YAMS.admin.leadingZero(d.getFullYear()) + '-' + YAMS.admin.leadingZero(d.getMonth() + 1) + '-' + YAMS.admin.leadingZero(d.getDate()) + ' ' + YAMS.admin.leadingZero(d.getHours()) + ':' + YAMS.admin.leadingZero(d.getMinutes()) + '] (' + r.LogSource + ') ' + r.LogMessage;
                    l.append(s);
                    YAMS.admin.lastLogId = r.LogID;
                }
                if (bolScroll) l.prop("scrollTop", l.prop("scrollHeight"));
            }
        });
    },

    logOut: function () {
        $.ajax({
            dataType: 'text',
            data: 'action=logout',
            success: function (data) {
                document.location.reload(true);
            }
        });
    },

    leadingZero: function (intInput) {
        if (intInput < 10) {
            return "0" + intInput;
        } else {
            return intInput;
        }
    },

    forceUpdate: function () {
        $.ajax({
            dataType: 'text',
            data: 'action=force-autoupdate'
        });
    },

    server: function (id, name, ver) {
        this.id = id;
        this.name = name;
        this.ver = ver;
    }
}

// Register with YAHOO
YAHOO.register("admin", YAMS.admin, {version: YAMS.admin.version});