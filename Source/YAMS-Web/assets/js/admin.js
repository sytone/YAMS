// DTS Control JS Function
// (c) 2010 Dixcart Technical Solutions Ltd..
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
        var panelLoader = new YAMS.L({
            require: ["container"],
            loadOptional: true,
            combine: true,
            onSuccess: function () {
                YAMS.admin.loading = new YAHOO.widget.Panel("wait", {
                    width: "240px",
                    fixedcenter: true,
                    close: false,
                    draggable: false,
                    zindex: 4,
                    modal: true,
                    visible: true,
                    filterWord: true
                });
                YAMS.admin.loading.setHeader("Loading, please wait...");
                YAMS.admin.loading.setBody('<img src="http://l.yimg.com/a/i/us/per/gr/gp/rel_interstitial_loading.gif" />');
                YAMS.admin.loading.render(document.body);
            }
        });
        panelLoader.insert();

        var loader = new YAMS.L({
            require: ["layout", "connection", "json", "tabview", "menu"],
            loadOptional: true,
            combine: true,
            filter: 'debug',
            onSuccess: function () {
                YAMS.admin.layout = new YAHOO.widget.Layout({
                    units: [
                        { position: 'top', height: 30, body: 'header', collapse: false, resize: false, scroll: null, zIndex: 2 },
                        { position: 'right', header: 'Server Status', width: 300, resize: false, gutter: '0px 5px', collapse: true, scroll: false, body: 'server-status', animate: true },
                        { position: 'bottom', header: 'Global Log', height: 200, resize: true, body: 'yams-log', gutter: '5px', collapse: true, scroll: true },
                        { position: 'center', body: 'main', gutter: '0px 0px 0px 5px', scroll: true }
                    ]
                });
                YAMS.admin.layout.on('render', function () {
                    //Build Menu
                    YAMS.admin.menuBar = new YAHOO.widget.MenuBar("top-menu", {
                        lazyload: true,
                        autosubmenudisplay: true,
                        hidedelay: 750,
                        itemdata: YAMS.admin.menuData
                    });

                    YAMS.admin.menuBar.render(YAMS.admin.layout.getUnitByPosition('top').body);
                    YAMS.admin.menuBar.subscribe("show", YAMS.admin.onSubmenuShow);

                    //Build server controls
                    var r = YAMS.admin.layout.getUnitByPosition('right').body;
                    var s = document.createElement('div');
                    s.id = 'status';
                    r.appendChild(s);

                    //Start Server
                    var b1 = document.createElement('button');
                    b1.id = 'start-server';
                    b1.innerHTML = 'Start';
                    b1.disabled = true;
                    YAMS.E.on(b1, 'click', function (e) {
                        YAMS.admin.startServer();
                    });
                    r.appendChild(b1);

                    //Stop Server
                    var b2 = document.createElement('button');
                    b2.id = 'stop-server';
                    b2.innerHTML = 'Stop';
                    b2.disabled = true;
                    YAMS.E.on(b2, 'click', function (e) {
                        YAMS.admin.stopServer();
                    });
                    r.appendChild(b2);

                    //Restart Server
                    var b3 = document.createElement('button');
                    b3.id = 'restart-server';
                    b3.innerHTML = 'Restart';
                    b3.disabled = true;
                    YAMS.E.on(b3, 'click', function (e) {
                        YAMS.admin.restartServer();
                    });
                    r.appendChild(b3);

                    //Break
                    var brk = document.createElement('br');
                    r.appendChild(brk);

                    //Restart When Free
                    var b5 = document.createElement('button');
                    b5.id = 'restart-server-when-free';
                    b5.innerHTML = 'Restart When Free';
                    b5.disabled = true;
                    YAMS.E.on(b5, 'click', function (e) {
                        YAMS.admin.restartServerWhenFree();
                    });
                    r.appendChild(b5);

                    //Delayed Restart
                    var b4 = document.createElement('button');
                    b4.id = 'delayed-restart-server';
                    b4.innerHTML = 'Restart After:';
                    b4.disabled = true;
                    YAMS.E.on(b4, 'click', function (e) {
                        YAMS.admin.delayedRestartServer();
                    });
                    r.appendChild(b4);
                    var b4i = document.createElement('input');
                    b4i.id = 'delay-time';
                    b4i.setAttribute('size', '3');
                    r.appendChild(b4i);
                    var p = document.createElement('div');
                    p.id = "players";
                    r.appendChild(p);


                    YAMS.admin.getServers();
                    YAMS.admin.updateGlobalLog();
                    YAMS.admin.timer = setInterval("YAMS.admin.updateGlobalLog();", 10000);
                });
                YAMS.admin.layout.render();
            }
        });
        loader.insert();

    },

    getServers: function () { var transaction = YAHOO.util.Connect.asyncRequest('POST', '/api/', YAMS.admin.getServers_callback, 'action=list'); },

    getServers_callback: {
        success: function (o) {
            var results = [];
            try { results = YAHOO.lang.JSON.parse(o.responseText); }
            catch (x) { YAMS.admin.log('JSON parse failed'); return; }

            var ul = document.createElement('ul');
            for (var i = 0, len = results.servers.length; i < len; ++i) {
                var s = new YAMS.admin.server(results.servers[i].id, results.servers[i].title, results.servers[i].ver);
                YAMS.admin.servers.push(s);
            }
            YAMS.admin.menuBar.subscribe("render", function () {
                for (var i = 0, len = YAMS.admin.servers.length; i < len; i++) {
                    var subMenu = YAMS.admin.menuBar.getItem(1).cfg.getProperty("submenu");
                    subMenu.addItems([{ text: YAMS.admin.servers[i].name, onclick: { fn: YAMS.admin.setServer, obj: i}}]);
                }
            });
            //Build Tab view
            YAMS.admin.serverTabs = new YAHOO.widget.TabView('server-console');
            YAMS.admin.serverTabs.addTab(new YAHOO.widget.Tab({
                label: "Console",
                content: '<div id="console" class="log"></div><div class="command console"><input type="text" class="console-input" id="console-input" /><button id="console-send" class="send">Send</button></div>',
                active: true
            }));
            YAMS.admin.serverTabs.addTab(new YAHOO.widget.Tab({
                label: "Chat",
                content: '<div id="chat" class="log"></div><div class="command chat"><input type="text" class="chat-input" id="chat-input" /><button id="chat-send" class="send">Say</button></div>'
            }));
            YAMS.admin.serverTabs.addTab(new YAHOO.widget.Tab({
                label: "Settings",
                content: '<img src="http://l.yimg.com/a/i/us/per/gr/gp/rel_interstitial_loading.gif" />'
            }));
            var settingsTab = YAMS.admin.serverTabs.getTab(2);
            settingsTab.addListener('click', YAMS.admin.getServerSettings);
            YAMS.D.setStyle(settingsTab.get('contentEl'), 'overflow', 'auto');
            YAMS.admin.serverTabs.addTab(new YAHOO.widget.Tab({
                label: "Apps",
                content: '<img src="http://l.yimg.com/a/i/us/per/gr/gp/rel_interstitial_loading.gif" />'
            }));
            var appsTab = YAMS.admin.serverTabs.getTab(3);
            appsTab.addListener('click', YAMS.admin.getApps);

            //Configure buttons
            YAMS.E.on('console-send', 'click', YAMS.admin.consoleSend);
            YAMS.E.on('chat-send', 'click', YAMS.admin.chatSend);
            YAMS.E.on('console-input', 'keydown', function (e) {
                if (e && (e.keyCode == 13)) { YAMS.admin.consoleSend(); }
            });
            YAMS.E.on('chat-input', 'keydown', function (e) {
                if (e && (e.keyCode == 13)) { YAMS.admin.chatSend(); }
            });

            YAMS.admin.layout.on('resize', function () {
                //Main body elements
                var height = YAMS.admin.layout.getUnitByPosition('center').getSizes().body.h;
                var width = YAMS.admin.layout.getUnitByPosition('center').getSizes().body.w;
                YAMS.D.setStyle(['console', 'chat'], 'height', (height - 97) + 'px');
                YAMS.D.setStyle(['console-input', 'chat-input'], 'width', (width - 82) + 'px');

                //right side elements
                var height = YAMS.admin.layout.getUnitByPosition('right').getSizes().body.h;
                YAMS.D.setStyle('players', 'height', (height - 82) + 'px');
            });
            YAMS.admin.layout.resize();

            //Set initial server
            YAMS.admin.setServer(0, 0, 0);

        },
        failure: function () { YAMS.admin.log('Failed to list servers'); }
    },

    setServer: function (e, b, serverid) {
        YAHOO.util.Event.preventDefault(e);
        //Clear out any previous contents
        YAMS.D.get('console').innerHTML = '';
        YAMS.D.get('chat').innerHTML = '';
        YAMS.admin.lastServerLogId = 0;
        clearInterval(YAMS.admin.serverTimer);
        //Fix the server
        YAMS.admin.selectedServer = YAMS.admin.servers[serverid].id;
        //Set the title
        YAMS.S('#main h1')[0].innerHTML = YAMS.admin.servers[serverid].name + ' (' + YAMS.admin.servers[serverid].ver + ')';
        //Load console
        YAMS.admin.updateServerConsole();
        YAMS.admin.checkServerStatus();
        //Set the timer
        YAMS.admin.serverTimer = setInterval("YAMS.admin.updateServerConsole();YAMS.admin.checkServerStatus();", 5000);
    },

    getApps: function (e) {
        var transaction = YAHOO.util.Connect.asyncRequest('GET', '/assets/parts/apps-page.html', {
            success: function (o) {
                YAMS.admin.serverTabs.getTab(3).set('content', o.responseText);
            },
            failure: function (o) { YAMS.admin.log("Couldn't get apps part") }
        });
    },

    getServerSettings: function (e) {
        var transaction = YAHOO.util.Connect.asyncRequest('GET', '/assets/parts/server-settings.html', {
            success: function (o) {
                YAMS.admin.serverTabs.getTab(2).set('content', o.responseText);
                var transaction = YAHOO.util.Connect.asyncRequest('POST', '/api/', {
                    success: function (o) {
                        var results = [];
                        try { results = YAHOO.lang.JSON.parse(o.responseText); }
                        catch (x) { YAMS.admin.log('JSON Parse Failed'); return; }

                        YAMS.D.get('cfg_title').value = results.title;
                        if (results.optimisations === "True") YAMS.D.get('cfg_optimisations').checked = true;
                        YAMS.D.get('cfg_memory').value = results.memory;
                        if (results.autostart === "True") YAMS.D.get('cfg_autostart').checked = true;
                        var typeSelect = YAMS.D.get('cfg_type');
                        for (var i = 0, len = typeSelect.options.length; i < len; i++) {
                            if (typeSelect.options[i].value === results.type) typeSelect.options[i].selected = true;
                        }
                        YAMS.D.get('cfg_motd').value = results.motd;
                        YAMS.D.get('cfg_port').value = results.port;

                        var ipSelect = YAMS.D.get('cfg_listen-ip');
                        for (ip in results.IPs) {
                            ipSelect.options[ipSelect.options.length] = new Option(results.IPs[ip], results.IPs[ip], false, false);
                        }
                        for (i = 0; i < ipSelect.options.length; i++) {
                            if (ipSelect.options[i].value == results.listen) ipSelect.options[i].selected = true;
                        }
                    },
                    failure: function (o) {
                        YAMS.admin.log('getServerSettings failed');
                    }
                }, 'action=get-server-settings&serverid=' + YAMS.admin.selectedServer);
                var transaction2 = YAHOO.util.Connect.asyncRequest('POST', '/api/', {
                    success: function (o) {
                        YAMS.D.get('server-properties-div').innerHTML = o.responseText;
                    },
                    failure: function (o) {
                        YAMS.admin.log('getMCSettings failed');
                    }
                }, 'action=get-mc-settings&serverid=' + YAMS.admin.selectedServer);
            },
            failure: function (o) { YAMS.admin.log("Couldn't get settings part") }
        });
    },

    saveServerSettings: function () {
        var strVars = "serverid=" + YAMS.admin.selectedServer + "&action=save-server-settings";
        YAHOO.util.Connect.setForm('settings-form');
        var trans = YAHOO.util.Connect.asyncRequest('POST', '/api/', {
            success: function (o) { },
            failure: function (o) { }
        }, strVars);
    },

    checkServerStatus: function () { var transaction = YAHOO.util.Connect.asyncRequest('POST', '/api/', YAMS.admin.checkServerStatus_callback, 'action=status&serverid=' + YAMS.admin.selectedServer); },

    checkServerStatus_callback: {
        success: function (o) {
            var results = [];
            try { results = YAHOO.lang.JSON.parse(o.responseText); }
            catch (x) { YAMS.admin.log('JSON Parse Failed'); return; }

            var s = document.getElementById('status');
            s.innerHTML = '<p>Running: ' + results.status + '</p>' +
                    '<p>Restart Needed: ' + results.restartneeded + '</p>' +
                    '<p>Restarting When Free: ' + results.restartwhenfree + '</p>' +
                    '<p>RAM: ' + results.ram + '</p>' +
                    '<p>VM: ' + results.vm + '</p>'
            if (results.status == "True") {
                document.getElementById('start-server').disabled = true;
                document.getElementById('stop-server').disabled = false;
                document.getElementById('restart-server').disabled = false;
                document.getElementById('delayed-restart-server').disabled = false;
                document.getElementById('restart-server-when-free').disabled = false;
            } else {
                document.getElementById('start-server').disabled = false;
                document.getElementById('stop-server').disabled = true;
                document.getElementById('restart-server').disabled = true;
                document.getElementById('delayed-restart-server').disabled = true;
                document.getElementById('restart-server-when-free').disabled = true;
            }

            //Update the player info
            var l = YAMS.D.get('players');
            l.innerHTML = '';
            for (var i = 0, len = results.players.length; i < len; ++i) {
                var r = results.players[i].name + " (" + results.players[i].level + ")";
                var s = document.createElement('div');
                s.innerHTML = r;
                l.appendChild(s);
            }

        },
        failure: function (o) {
            YAMS.admin.log('checkServerStatus failed');
        },
        timeout: 4500
    },

    mapServer: function () { var transaction = YAHOO.util.Connect.asyncRequest('POST', '/api/', YAMS.admin.statusCommand_callback, 'action=overviewer&serverid=' + YAMS.admin.selectedServer + "&lighting=" + YAMS.D.get('overviewer-lighting').checked + "&night=" + YAMS.D.get('overviewer-night').checked + "&normal=" + YAMS.D.get('overviewer-normal').checked + "&spawn=" + YAMS.D.get('overviewer-spawn').checked + "&cave=" + YAMS.D.get('overviewer-cave').checked); },
    imgServer: function () { var transaction = YAHOO.util.Connect.asyncRequest('POST', '/api/', YAMS.admin.statusCommand_callback, 'action=c10t&serverid=' + YAMS.admin.selectedServer + "&mode=" + YAMS.D.get('c10t-mode').value + "&night=" + YAMS.D.get('c10t-night').value); },
    tectonicusServer: function () { var transaction = YAHOO.util.Connect.asyncRequest('POST', '/api/', YAMS.admin.statusCommand_callback, 'action=tectonicus&serverid=' + YAMS.admin.selectedServer); },
    startServer: function () { var transaction = YAHOO.util.Connect.asyncRequest('POST', '/api/', YAMS.admin.statusCommand_callback, 'action=start&serverid=' + YAMS.admin.selectedServer); },
    stopServer: function () { var transaction = YAHOO.util.Connect.asyncRequest('POST', '/api/', YAMS.admin.statusCommand_callback, 'action=stop&serverid=' + YAMS.admin.selectedServer); },
    restartServer: function () { var transaction = YAHOO.util.Connect.asyncRequest('POST', '/api/', YAMS.admin.statusCommand_callback, 'action=restart&serverid=' + YAMS.admin.selectedServer); },
    delayedRestartServer: function () { var transaction = YAHOO.util.Connect.asyncRequest('POST', '/api/', YAMS.admin.statusCommand_callback, 'action=delayed-restart&delay=' + YAMS.D.get('delay-time').value + '&serverid=' + YAMS.admin.selectedServer); },
    restartServerWhenFree: function () { var transaction = YAHOO.util.Connect.asyncRequest('POST', '/api/', YAMS.admin.statusCommand_callback, 'action=restart-when-free&serverid=' + YAMS.admin.selectedServer); },
    deleteWorld: function () { var transaction = YAHOO.util.Connect.asyncRequest('POST', '/api/', YAMS.admin.statusCommand_callback, 'action=delete-world&serverid=' + YAMS.admin.selectedServer); },
    statusCommand_callback: { success: function (o) { }, failure: function (o) { YAMS.admin.log('Status Command Failed'); } },

    consoleSend: function () { var transaction = YAHOO.util.Connect.asyncRequest('POST', '/api/', YAMS.admin.consoleSend_callback, 'action=command&serverid=' + YAMS.admin.selectedServer + '&message=' + escape(YAMS.D.get('console-input').value)); },
    chatSend: function () { var transaction = YAHOO.util.Connect.asyncRequest('POST', '/api/', YAMS.admin.chatSend_callback, 'action=command&serverid=' + YAMS.admin.selectedServer + '&message=' + escape('say ' + YAMS.D.get('chat-input').value)); },
    consoleSend_callback: { success: function (o) { YAMS.D.get('console-input').value = ''; }, failure: function (o) { YAMS.admin.log('ConsoleSend Failed'); } },
    chatSend_callback: { success: function (o) { YAMS.D.get('chat-input').value = ''; }, failure: function (o) { YAMS.admin.log('ChatSend Failed'); } },

    updateServerConsole: function () {
        if (!YAMS.admin.serverUpdateInProgress) {
            YAMS.admin.serverUpdateInProgress = true;
            var transaction = YAHOO.util.Connect.asyncRequest('POST', '/api/', YAMS.admin.updateServerConsole_callback, 'action=log&start=' + YAMS.admin.lastServerLogId + '&rows=0&serverid=' + YAMS.admin.selectedServer + '&level=all');
        }
    },

    updateServerConsole_callback: {
        success: function (o) {
            var results = [];
            try { results = YAHOO.lang.JSON.parse(o.responseText); }
            catch (x) { YAMS.admin.log('JSON Parse Failed'); return; }

            var l = YAMS.D.get('console');
            var c = YAMS.D.get('chat');
            if (l.scrollTop + parseInt(YAMS.D.getStyle(l, 'height').replace("px", "")) == l.scrollHeight || l.scrollTop == 0) var bolScrollL = true;
            if (c.scrollTop + parseInt(YAMS.D.getStyle(c, 'height').replace("px", "")) == c.scrollHeight || c.scrollTop == 0) var bolScrollC = true;
            for (var i = 0, len = results.Table.length - 1; len >= i; --len) {
                var r = results.Table[len];
                var s = document.createElement('div');
                YAMS.D.addClass(s, 'message');
                YAMS.D.addClass(s, r.LogLevel);
                var d = eval('new ' + r.LogDateTime.replace(/\//g, '').replace('+0000', '').replace('+0100', ''));
                var m = document.createTextNode('[' + d.getFullYear() + '-' + YAMS.admin.leadingZero(d.getMonth() + 1) + '-' + YAMS.admin.leadingZero(d.getDate()) + ' ' + YAMS.admin.leadingZero(d.getHours()) + ':' + YAMS.admin.leadingZero(d.getMinutes()) + '] ' + r.LogMessage);
                s.appendChild(m);
                if (r.LogLevel == 'chat') {
                    c.appendChild(s);
                } else {
                    l.appendChild(s);
                }

                YAMS.admin.lastServerLogId = r.LogID;
            }
            if (bolScrollL) l.scrollTop = l.scrollHeight;
            if (bolScrollC) c.scrollTop = c.scrollHeight;
            YAMS.admin.loading.cfg.setProperty('visible', false);
            YAMS.admin.serverUpdateInProgress = false;
        },
        failure: function (o) {
            YAMS.admin.log('updateServerConsole failed');
            YAMS.admin.serverUpdateInProgress = false;
        }
    },

    updateGlobalLog: function () { var transaction = YAHOO.util.Connect.asyncRequest('POST', '/api/', YAMS.admin.updateGlobalLog_callback, 'action=log&start=' + YAMS.admin.lastLogId + '&rows=200&serverid=0&level=all'); },

    updateGlobalLog_callback: {
        success: function (o) {
            var results = [];
            try { results = YAHOO.lang.JSON.parse(o.responseText); }
            catch (x) { YAMS.admin.log('JSON Parse Failed'); return; }

            var l = YAMS.admin.layout.getUnitByPosition('bottom').body;
            if (l.scrollTop + parseInt(YAMS.D.getStyle(l, 'height').replace("px", "")) == l.scrollHeight) var bolScroll = true;
            for (var i = 0, len = results.Table.length - 1; len >= i; --len) {
                var r = results.Table[len];
                var s = document.createElement('div');
                YAMS.D.addClass(s, 'message');
                YAMS.D.addClass(s, r.LogLevel);
                var d = eval('new ' + r.LogDateTime.replace(/\//g, '').replace('+0000', ''));
                s.innerHTML = '[' + YAMS.admin.leadingZero(d.getFullYear()) + '-' + YAMS.admin.leadingZero(d.getMonth() + 1) + '-' + YAMS.admin.leadingZero(d.getDate()) + ' ' + YAMS.admin.leadingZero(d.getHours()) + ':' + YAMS.admin.leadingZero(d.getMinutes()) + '] (' + r.LogSource + ') ' + r.LogMessage;
                l.appendChild(s);
                YAMS.admin.lastLogId = r.LogID;
            }
            if (bolScroll) l.scrollTop = l.scrollHeight;
        },
        failure: function (o) {
            YAMS.admin.log('updateGlobalLog failed');
        }
    },

    createPanel: function (strName, intWidth, strHeader, strTemplate, funcOnLoad) {
        var panel = new YAHOO.widget.Panel(strName, {
            width: intWidth + "px",
            fixedcenter: true,
            close: true,
            draggable: false,
            zindex: 4,
            modal: true,
            visible: true,
            filterWord: true
        });
        panel.setHeader(strHeader);
        panel.setBody('<img src="http://l.yimg.com/a/i/us/per/gr/gp/rel_interstitial_loading.gif" />');
        panel.render(document.body);
        panel.show();

        panel.subscribe("close", panel.destroy);

        $.ajax({
            url: '/assets/parts/' + strTemplate + '.html',
            type: 'GET',
            success: function (data) {
                panel.setBody(data);
                if (typeof (funcOnLoad) == "function") funcOnLoad();
            },
            failure: function () {
                panel.setBody("Unable to load " + strTemplate + " template");
            }
        })

        return panel;
    },

    aboutYAMS: function () {
        YAMS.admin.panels.about = YAMS.admin.createPanel("about-panel", 240, "About YAMS", "about", function () {
            $.ajax({
                url: '/api/',
                type: 'POST',
                data: 'action=about',
                dataType: 'json',
                success: function (data) {
                    $('#dll-ver .version-number').html(data.dll);
                    $('#svc-ver .version-number').html(data.svc);
                    $('#gui-ver .version-number').html(data.gui);
                    $('#db-ver .version-number').html(data.db);
                }
            })
        });
    },

    installedApps: function () {
        YAMS.admin.panels.apps = YAMS.admin.createPanel("apps-panel", 340, "Installed Apps", "apps", function () {
            $.ajax({
                url: '/api/',
                type: 'POST',
                data: 'action=installed-apps',
                dataType: 'json',
                success: function (data) {
                    if (data.overviewer === "true") $('#overviewer-installed').prop("checked", true);
                    if (data.c10t === "true") $('#c10t-installed').prop("checked", true);
                    if (data.biomeextractor === "true") $('#biomeextractor-installed').prop("checked", true);
                    if (data.tectonicus === "true") $('#tectonicus-installed').prop("checked", true);
                    if (data.nbtoolkit === "true") $('#nbtoolkit-installed').prop("checked", true);
                    if (data.bukkit === "true") $('#bukkit-installed').prop("checked", true);
                }
            });
        });
    },

    updateApps: function () {
        var values = "overviewer=" + $('#overviewer-installed').prop("checked") + "&" +
                     "c10t=" + $('#c10t-installed').prop("checked") + "&" +
                     "biomeextractor=" + $('#biomeextractor-installed').prop("checked") + "&" +
                     "tectonicus=" + $('#tectonicus-installed').prop("checked") + "&" +
                     "nbtoolkit=" + $('#nbtoolkit-installed').prop("checked") + "&" +
                     "bukkit=" + $('#bukkit-installed').prop("checked");
        var trans = YAHOO.util.Connect.asyncRequest('POST', '/api/', {
            success: function (o) {
                alert("Selected apps will be downloaded on next update check.");
                YAMS.admin.panels.apps.destroy();
            },
            failure: function (o) { alert("apps not set") }
        }, 'action=update-apps&' + values);
    },

    networkSettings: function () {
        YAMS.admin.panels.network = YAMS.admin.createPanel("networking-panel", 340, "Network Settings", "network", function () {
            $.ajax({
                url: '/api/',
                type: 'POST',
                data: 'action=network-settings',
                dataType: 'json',
                success: function (data) {
                    if (data.portForwarding === "true") $('#portForwarding-enabled').prop("checked", true);
                    if (data.openFirewall === "true") $('#openFirewall-enabled').prop("checked", true);
                    $('#adminInterface-port').val(data.adminPort);
                    $('#publicInterface-port').val(data.publicPort);
                    var ipSelect = YAMS.D.get('listen-ip');
                    for (ip in data.IPs) {
                        ipSelect.options[ipSelect.options.length] = new Option(data.IPs[ip], data.IPs[ip], false, false);
                    }
                    for (i = 0; i < ipSelect.options.length; i++) {
                        if (ipSelect.options[i].value == data.currentIP) ipSelect.options[i].selected = true;
                    }
                }
            });
        });
    },


    jobList: function () {
        YAMS.admin.panels.jobs = YAMS.admin.createPanel("job-panel", 600, "Jobs", "job-list", YAMS.admin.refreshJobs);
    },


    refreshJobs: function () {
        $.ajax({
            url: '/api/',
            type: 'POST',
            data: 'action=job-list',
            dataType: 'json',
            success: function (data) {
                var tblJobs = YAMS.D.get('jobs-table');

                for (var i = 0; i < data.Table.length; i++) {
                    var r = data.Table[i];
                    var row = document.createElement('tr');
                    var c2 = document.createElement('td');
                    c2.innerHTML = r.JobAction;
                    row.appendChild(c2);
                    var c3 = document.createElement('td');
                    if (r.JobHour == -1) r.JobHour = "*";
                    c3.innerHTML = r.JobHour;
                    row.appendChild(c3);
                    var c4 = document.createElement('td');
                    if (r.JobMinute == -1) r.JobMinute = "*";
                    c4.innerHTML = r.JobMinute;
                    row.appendChild(c4);
                    var c5 = document.createElement('td');
                    c5.innerHTML = r.JobParams;
                    row.appendChild(c5);
                    var c6 = document.createElement('td');
                    c6.innerHTML = r.ServerTitle;
                    row.appendChild(c6);
                    var c1 = document.createElement('td');
                    c1.innerHTML = '<a href="javascript:void(0);" onclick="YAMS.admin.deleteJob(' + r.JobID + ');" class="icon delete"></a>';
                    row.appendChild(c1);
                    tblJobs.appendChild(row);
                }
            },
            failure: function () {
                YAMS.admin.panels.jobs.setBody("Error getting job data;");
            }
        });
    },

    deleteJob: function (jobID) {
        $.ajax({
            url: '/api/',
            type: 'POST',
            data: 'action=delete-job&jobid=' + jobID,
            success: function (data) {
                if (data == "done") alert("Job Deleted");
                else alert("Job not deleted");
                YAMS.admin.refreshJobs();
            }
        });
    },

    updateNetwork: function () {
        var values = "portForwarding=" + YAMS.D.get('portForwarding-enabled').checked + "&" +
                     "openFirewall=" + YAMS.D.get('openFirewall-enabled').checked + "&" +
                     "adminPort=" + YAMS.D.get('adminInterface-port').value + "&" +
                     "publicPort=" + YAMS.D.get('publicInterface-port').value + "&" +
                     "listenIp=" + YAMS.D.get('listen-ip').value;
        var trans = YAHOO.util.Connect.asyncRequest('POST', '/api/', {
            success: function (o) {
                YAMS.admin.panels.network.destroy();
            },
            failure: function (o) { alert("Network settings not set") }
        }, 'action=save-network-settings&' + values);
    },

    logOut: function() {
        $.ajax({
            url: '/api/',
            type: 'POST',
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
        var trans = YAHOO.util.Connect.asyncRequest('POST', '/api/', {
            success: function (o) {
            },
            failure: function (o) {
            }
        }, 'action=force-autoupdate');
    },

    onSubmenuShow: function () {

        var oIFrame,
			oElement,
			nOffsetWidth;
        /*
        Need to set the width for submenus of submenus in IE to prevent the mouseout 
        event from firing prematurely when the user mouses off of a MenuItem's 
        text node.
        */
        if ((this.id == "serversmenu" || this.id == "editmenu") && YAHOO.env.ua.ie) {
            oElement = this.element;
            nOffsetWidth = oElement.offsetWidth;
            /*
            Measuring the difference of the offsetWidth before and after
            setting the "width" style attribute allows us to compute the 
            about of padding and borders applied to the element, which in 
            turn allows us to set the "width" property correctly.
            */
            oElement.style.width = nOffsetWidth + "px";
            oElement.style.width = (nOffsetWidth - (oElement.offsetWidth - nOffsetWidth)) + "px";
        }
    },

    menuData: [
        {
            text: "<em id=\"yamslabel\">YAMS</em>",
            onclick: { fn: aboutYAMS }
        },
        {
            text: "Servers",
            submenu: {
                id: "serversmenu",
                itemdata: [
                    { text: "New Server", onclick: { fn: onMenuItemClick} }
                ]
            }
        },
        {
            text: "Settings",
            submenu: {
                id: "settingsmenu",
                itemdata: [
                    [
                        { text: "Network Settings", onclick: { fn: networkSettings} },
                        { text: "Installed Apps", onclick: { fn: installedApps} },
                        { text: "Scheduled Jobs", onclick: { fn: jobList} }
                    ],
                    [
                        { text: "Run Updates Now", onclick: { fn: forceUpdate} }
                    ]
            ]
            }
        },
        {
            text: "Log Out",
            onclick: { fn: logOut }
        }
    ],

    server: function (id, name, ver) {
        this.id = id;
        this.name = name;
        this.ver = ver;
    }
}

function onMenuItemClick() {
    alert("Callback for MenuItem: " + this.cfg.getProperty("text"));
};

//YUI menu not liking the namespace for some reason
function aboutYAMS() { YAMS.admin.aboutYAMS() };
function installedApps() { YAMS.admin.installedApps() };
function forceUpdate() { YAMS.admin.forceUpdate() };
function networkSettings() { YAMS.admin.networkSettings() };
function jobList() { YAMS.admin.jobList() };
function logOut() { YAMS.admin.logOut() };

YAMS.E.onDOMReady(YAMS.admin.init);

// Register with YAHOO
YAHOO.register("admin", YAMS.admin, {version: YAMS.admin.version});