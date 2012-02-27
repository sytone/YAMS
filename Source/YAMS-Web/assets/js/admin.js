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
            setTimeout("YAMS.admin.refreshWhitelist()", 1000);
        }
    },

    addWhitelist: function () {
        YAMS.admin.sendCommand('whitelist add ' + $('#whitelist-name').val());
        setTimeout("YAMS.admin.refreshWhitelist()", 1000);
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
            setTimeout("YAMS.admin.refreshBanlist()", 1000);
        }
    },

    addBanlist: function () {
        YAMS.admin.sendCommand('ban ' + $('#banlist-name').val());
        setTimeout("YAMS.admin.refreshBanlist()", 1000);
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

    deleteServer: function () {
        if (confirm('This will remove your server from YAMS but not delete your world, backups or renders.\n\n' +
                   'To complete the removal you will have to manually remove the "' + YAMS.admin.selectedServer + '" folder from your storage path.\n\n' +
                   'Are you sure you want to do this?')) {
            $.ajax({
                data: 'serverid=' + YAMS.admin.selectedServer + '&action=remove-server',
                success: function (data) {
                    alert("Server deleted.");
                    window.location.reload(true);
                }
            });
        }
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
    deleteWorld: function (bolRandomSeed) {
        if (confirm('This will backup your world then delete it, allowing a map reset.' +
                   'Are you sure you want to do this?')) {
            $.ajax({
                data: 'action=delete-world&serverid=' + YAMS.admin.selectedServer + '&randomseed=' + bolRandomSeed
            });
        }
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

    dirify: function (s, d) {
        if (!d)
            d = "-";
        s = s.replace(/<[^>]+>/g, '');
        for (var p in YAMS.admin.dirify_table)
            if (s.indexOf(p) != -1)
                s = s.replace(new RegExp(p, "g"), YAMS.admin.dirify_table[p]);
        s = s.toLowerCase();
        s = s.replace(/&[^;\s]+;/g, '');
        s = s.replace(/[^-a-z0-9_ ]/g, '');
        s = s.replace(/\s+/g, '-');
        s = s.replace(/_+$/, '');
        s = s.replace(/_+/g, d);
        return s;
    },

    dirify_table: {
        "\u0026": 'and',  // ampersand
        "\u00C0": 'A',    // A`
        "\u00E0": 'a',    // a`
        "\u00C1": 'A',    // A'
        "\u00E1": 'a',    // a'
        "\u00C2": 'A',    // A^
        "\u00E2": 'a',    // a^
        "\u0102": 'A',    // latin capital letter a with breve
        "\u0103": 'a',    // latin small letter a with breve
        "\u00C6": 'AE',   // latin capital letter AE
        "\u00E6": 'ae',   // latin small letter ae
        "\u00C5": 'A',    // latin capital letter a with ring above
        "\u00E5": 'a',    // latin small letter a with ring above
        "\u0100": 'A',    // latin capital letter a with macron
        "\u0101": 'a',    // latin small letter a with macron
        "\u0104": 'A',    // latin capital letter a with ogonek
        "\u0105": 'a',    // latin small letter a with ogonek
        "\u00C4": 'A',    // A:
        "\u00E4": 'a',    // a:
        "\u00C3": 'A',    // A~
        "\u00E3": 'a',    // a~
        "\u00C8": 'E',    // E`
        "\u00E8": 'e',    // e`
        "\u00C9": 'E',    // E'
        "\u00E9": 'e',    // e'
        "\u00CA": 'E',    // E^
        "\u00EA": 'e',    // e^
        "\u00CB": 'E',    // E:
        "\u00EB": 'e',    // e:
        "\u0112": 'E',    // latin capital letter e with macron
        "\u0113": 'e',    // latin small letter e with macron
        "\u0118": 'E',    // latin capital letter e with ogonek
        "\u0119": 'e',    // latin small letter e with ogonek
        "\u011A": 'E',    // latin capital letter e with caron
        "\u011B": 'e',    // latin small letter e with caron
        "\u0114": 'E',    // latin capital letter e with breve
        "\u0115": 'e',    // latin small letter e with breve
        "\u0116": 'E',    // latin capital letter e with dot above
        "\u0117": 'e',    // latin small letter e with dot above
        "\u00CC": 'I',    // I`
        "\u00EC": 'i',    // i`
        "\u00CD": 'I',    // I'
        "\u00ED": 'i',    // i'
        "\u00CE": 'I',    // I^
        "\u00EE": 'i',    // i^
        "\u00CF": 'I',    // I:
        "\u00EF": 'i',    // i:
        "\u012A": 'I',    // latin capital letter i with macron
        "\u012B": 'i',    // latin small letter i with macron
        "\u0128": 'I',    // latin capital letter i with tilde
        "\u0129": 'i',    // latin small letter i with tilde
        "\u012C": 'I',    // latin capital letter i with breve
        "\u012D": 'i',    // latin small letter i with breve
        "\u012E": 'I',    // latin capital letter i with ogonek
        "\u012F": 'i',    // latin small letter i with ogonek
        "\u0130": 'I',    // latin capital letter with dot above
        "\u0131": 'i',    // latin small letter dotless i
        "\u0132": 'IJ',   // latin capital ligature ij
        "\u0133": 'ij',   // latin small ligature ij
        "\u0134": 'J',    // latin capital letter j with circumflex
        "\u0135": 'j',    // latin small letter j with circumflex
        "\u0136": 'K',    // latin capital letter k with cedilla
        "\u0137": 'k',    // latin small letter k with cedilla
        "\u0138": 'k',    // latin small letter kra
        "\u0141": 'L',    // latin capital letter l with stroke
        "\u0142": 'l',    // latin small letter l with stroke
        "\u013D": 'L',    // latin capital letter l with caron
        "\u013E": 'l',    // latin small letter l with caron
        "\u0139": 'L',    // latin capital letter l with acute
        "\u013A": 'l',    // latin small letter l with acute
        "\u013B": 'L',    // latin capital letter l with cedilla
        "\u013C": 'l',    // latin small letter l with cedilla
        "\u013F": 'l',    // latin capital letter l with middle dot
        "\u0140": 'l',    // latin small letter l with middle dot
        "\u00D2": 'O',    // O`
        "\u00F2": 'o',    // o`
        "\u00D3": 'O',    // O'
        "\u00F3": 'o',    // o'
        "\u00D4": 'O',    // O^
        "\u00F4": 'o',    // o^
        "\u00D6": 'O',    // O:
        "\u00F6": 'o',    // o:
        "\u00D5": 'O',    // O~
        "\u00F5": 'o',    // o~
        "\u00D8": 'O',    // O/
        "\u00F8": 'o',    // o/
        "\u014C": 'O',    // latin capital letter o with macron
        "\u014D": 'o',    // latin small letter o with macron
        "\u0150": 'O',    // latin capital letter o with double acute
        "\u0151": 'o',    // latin small letter o with double acute
        "\u014E": 'O',    // latin capital letter o with breve
        "\u014F": 'o',    // latin small letter o with breve
        "\u0152": 'OE',   // latin capital ligature oe
        "\u0153": 'oe',   // latin small ligature oe
        "\u0154": 'R',    // latin capital letter r with acute
        "\u0155": 'r',    // latin small letter r with acute
        "\u0158": 'R',    // latin capital letter r with caron
        "\u0159": 'r',    // latin small letter r with caron
        "\u0156": 'R',    // latin capital letter r with cedilla
        "\u0157": 'r',    // latin small letter r with cedilla
        "\u00D9": 'U',    // U`
        "\u00F9": 'u',    // u`
        "\u00DA": 'U',    // U'
        "\u00FA": 'u',    // u'
        "\u00DB": 'U',    // U^
        "\u00FB": 'u',    // u^
        "\u00DC": 'U',    // U:
        "\u00FC": 'u',    // u:
        "\u016A": 'U',    // latin capital letter u with macron
        "\u016B": 'u',    // latin small letter u with macron
        "\u016E": 'U',    // latin capital letter u with ring above
        "\u016F": 'u',    // latin small letter u with ring above
        "\u0170": 'U',    // latin capital letter u with double acute
        "\u0171": 'u',    // latin small letter u with double acute
        "\u016C": 'U',    // latin capital letter u with breve
        "\u016D": 'u',    // latin small letter u with breve
        "\u0168": 'U',    // latin capital letter u with tilde
        "\u0169": 'u',    // latin small letter u with tilde
        "\u0172": 'U',    // latin capital letter u with ogonek
        "\u0173": 'u',    // latin small letter u with ogonek
        "\u00C7": 'C',    // ,C
        "\u00E7": 'c',    // ,c
        "\u0106": 'C',    // latin capital letter c with acute
        "\u0107": 'c',    // latin small letter c with acute
        "\u010C": 'C',    // latin capital letter c with caron
        "\u010D": 'c',    // latin small letter c with caron
        "\u0108": 'C',    // latin capital letter c with circumflex
        "\u0109": 'c',    // latin small letter c with circumflex
        "\u010A": 'C',    // latin capital letter c with dot above
        "\u010B": 'c',    // latin small letter c with dot above
        "\u010E": 'D',    // latin capital letter d with caron
        "\u010F": 'd',    // latin small letter d with caron
        "\u0110": 'D',    // latin capital letter d with stroke
        "\u0111": 'd',    // latin small letter d with stroke
        "\u00D1": 'N',    // N~
        "\u00F1": 'n',    // n~
        "\u0143": 'N',    // latin capital letter n with acute
        "\u0144": 'n',    // latin small letter n with acute
        "\u0147": 'N',    // latin capital letter n with caron
        "\u0148": 'n',    // latin small letter n with caron
        "\u0145": 'N',    // latin capital letter n with cedilla
        "\u0146": 'n',    // latin small letter n with cedilla
        "\u0149": 'n',    // latin small letter n preceded by apostrophe
        "\u014A": 'N',    // latin capital letter eng
        "\u014B": 'n',    // latin small letter eng
        "\u00DF": 'ss',   // double-s
        "\u015A": 'S',    // latin capital letter s with acute
        "\u015B": 's',    // latin small letter s with acute
        "\u0160": 'S',    // latin capital letter s with caron
        "\u0161": 's',    // latin small letter s with caron
        "\u015E": 'S',    // latin capital letter s with cedilla
        "\u015F": 's',    // latin small letter s with cedilla
        "\u015C": 'S',    // latin capital letter s with circumflex
        "\u015D": 's',    // latin small letter s with circumflex
        "\u0218": 'S',    // latin capital letter s with comma below
        "\u0219": 's',    // latin small letter s with comma below
        "\u0164": 'T',    // latin capital letter t with caron
        "\u0165": 't',    // latin small letter t with caron
        "\u0162": 'T',    // latin capital letter t with cedilla
        "\u0163": 't',    // latin small letter t with cedilla
        "\u0166": 'T',    // latin capital letter t with stroke
        "\u0167": 't',    // latin small letter t with stroke
        "\u021A": 'T',    // latin capital letter t with comma below
        "\u021B": 't',    // latin small letter t with comma below
        "\u0192": 'f',    // latin small letter f with hook
        "\u011C": 'G',    // latin capital letter g with circumflex
        "\u011D": 'g',    // latin small letter g with circumflex
        "\u011E": 'G',    // latin capital letter g with breve
        "\u011F": 'g',    // latin small letter g with breve
        "\u0120": 'G',    // latin capital letter g with dot above
        "\u0121": 'g',    // latin small letter g with dot above
        "\u0122": 'G',    // latin capital letter g with cedilla
        "\u0123": 'g',    // latin small letter g with cedilla
        "\u0124": 'H',    // latin capital letter h with circumflex
        "\u0125": 'h',    // latin small letter h with circumflex
        "\u0126": 'H',    // latin capital letter h with stroke
        "\u0127": 'h',    // latin small letter h with stroke
        "\u0174": 'W',    // latin capital letter w with circumflex
        "\u0175": 'w',    // latin small letter w with circumflex
        "\u00DD": 'Y',    // latin capital letter y with acute
        "\u00FD": 'y',    // latin small letter y with acute
        "\u0178": 'Y',    // latin capital letter y with diaeresis
        "\u00FF": 'y',    // latin small letter y with diaeresis
        "\u0176": 'Y',    // latin capital letter y with circumflex
        "\u0177": 'y',    // latin small letter y with circumflex
        "\u017D": 'Z',    // latin capital letter z with caron
        "\u017E": 'z',    // latin small letter z with caron
        "\u017B": 'Z',    // latin capital letter z with dot above
        "\u017C": 'z',    // latin small letter z with dot above
        "\u0179": 'Z',    // latin capital letter z with acute
        "\u017A": 'z'     // latin small letter z with acute
    },

    server: function (id, name, ver) {
        this.id = id;
        this.name = name;
        this.ver = ver;
    }
}

// Register with YAHOO
YAHOO.register("admin", YAMS.admin, {version: YAMS.admin.version});