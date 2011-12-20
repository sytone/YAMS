// YAMS Admin Panels
// (c) 2011 Richard Benson
// Authored by Richard Benson
// Portions Copyright (c) 2008, Yahoo! Inc.
// All rights reserved.

YAMS.namespace("panel");

YAMS.panel = {

    name: "YAMS Panels",
    version: "1.0",

    dialogs: {},

    createDialog: function (strName, intWidth, strHeader, strTemplate, funcOnLoad, objButtons) {
        var dialog = $('<div id="' + strName + '"><div style="text-align: center"><img src="/assets/images/ajax-loader.gif" /></div></div>').dialog({
            modal: true,
            open: function () {
                if (typeof (strTemplate) != "undefined") $(this).load('/assets/parts/' + strTemplate + '.html', funcOnLoad);
            },
            close: function (event, ui) {
                $(this).remove();
            },
            width: intWidth,
            title: strHeader,
            resizable: false
        });
        if (typeof (objButtons) != "undefined") $(dialog).dialog("option", "buttons", objButtons);

        return dialog;
    },

    newServer: function () {
        this.dialogs.newServer = this.createDialog("newServer-panel", 400, "New Server", "add-server", null,
        {
            "Add": function () {
                $.ajax({
                    data: 'action=newserver&name=' + escape($('#newServer-name').val()),
                    dataType: 'text',
                    success: function () {
                        alert("Server Created, select it in the menu to configure");
                        window.location.reload(true);
                    }
                });
            }
        });
    },

    aboutYAMS: function () {
        this.dialogs.about = this.createDialog("about-panel", 240, "About YAMS", "about", function () {
            $.ajax({
                data: 'action=about',
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
        this.dialogs.apps = this.createDialog("apps-panel", 340, "Installed Apps", "apps", function () {
            $.ajax({
                data: 'action=installed-apps',
                success: function (data) {
                    if (data.overviewer === "true") $('#overviewer-installed').prop("checked", true);
                    if (data.c10t === "true") $('#c10t-installed').prop("checked", true);
                    if (data.biomeextractor === "true") $('#biomeextractor-installed').prop("checked", true);
                    if (data.bukkit === "true") $('#bukkit-installed').prop("checked", true);
                }
            });
        },
        {
            "Save": YAMS.panel.updateApps
        });
    },

    updateApps: function () {
        var values = "overviewer=" + $('#overviewer-installed').prop("checked") + "&" +
                     "c10t=" + $('#c10t-installed').prop("checked") + "&" +
                     "biomeextractor=" + $('#biomeextractor-installed').prop("checked") + "&" +
                     "bukkit=" + $('#bukkit-installed').prop("checked");
        $.ajax({
            data: 'action=update-apps&' + values,
            dataType: 'text',
            success: function (data) {
                alert("Selected apps will be downloaded on next update check.");
                YAMS.panel.dialogs.apps.remove();
            },
            failure: function () {
                alert("apps not set");
            }
        });
    },

    setTime: function () {
        this.dialogs.time = this.createDialog("time-panel", 400, "Set Time", "set-time", null,
        {
            "Go": YAMS.panel.completeSetTime
        });
    },

    completeSetTime: function () {
        YAMS.admin.sendCommand('time ' + $('#set-time-type').val() + ' ' + $('#set-time-value').val());
        YAMS.panel.dialogs.time.remove();
    },

    givePanel: function (strPlayer) {
        this.dialogs.give = this.createDialog("give-panel", 400, "Give player: " + strPlayer, "give-player", function () {
            $('#playername').val(strPlayer);
        },
        {
            "Give": function () {
                YAMS.admin.sendCommand('give ' + $('#playername').val() + ' ' + $('#give-item').val() + ' ' + $('#give-amount').val() + ' ' + $('#give-damage').val());
                YAMS.panel.dialogs.give.remove();
            }
        });
    },

    giveXPPanel: function (strPlayer) {
        this.dialogs.xp = this.createDialog("xp-panel", 400, "Give XP to player: " + strPlayer, "givexp-player", function () {
            $('#playername').val(strPlayer);
        },
        {
            "Give": function () {
                YAMS.admin.sendCommand('xp ' + $('#playername').val() + ' ' + $('#give-amount').val());
                YAMS.panel.dialogs.xp.remove();
            }
        });
    },

    whisperPanel: function (strPlayer) {
        this.dialogs.whisper = this.createDialog("whisper-panel", 400, "Whisper to player: " + strPlayer, "whisper-player", function () {
            $('#playername').val(strPlayer);
        },
        {
            "Say": function () {
                YAMS.admin.sendCommand('tell ' + $('#playername').val() + ' ' + $('#whisper-message').val());
                YAMS.panel.dialogs.whisper.remove();
            }
        });
    },

    teleportPanel: function (strPlayer) {
        this.dialogs.teleport = this.createDialog("teleport-panel", 400, "Teleport player: " + strPlayer, "teleport-player", function () {
            $('#playername').val(strPlayer);
            $('.player').each(function () {
                var playerSelect = document.getElementById('teleport-target');
                playerSelect.options[playerSelect.options.length] = new Option($(this).attr('player'), $(this).attr('player'), false, false);
            });
        },
        {
            "Teleport": function () {
                YAMS.admin.sendCommand('tp ' + $('#playername').val() + ' ' + $('#teleport-target').val());
                YAMS.panel.dialogs.teleport.remove();
            }
        });
    },

    networkSettings: function () {
        this.dialogs.network = this.createDialog("networking-panel", 400, "Network Settings", "network", function () {
            $.ajax({
                data: 'action=network-settings',
                success: function (data) {
                    if (data.portForwarding === "true") $('#portForwarding-enabled').prop("checked", true);
                    if (data.openFirewall === "true") $('#openFirewall-enabled').prop("checked", true);
                    $('#adminInterface-port').val(data.adminPort);
                    $('#publicInterface-port').val(data.publicPort);
                    var ipSelect = document.getElementById('listen-ip');
                    for (ip in data.IPs) {
                        ipSelect.options[ipSelect.options.length] = new Option(data.IPs[ip], data.IPs[ip], false, false);
                    }
                    for (i = 0; i < ipSelect.options.length; i++) {
                        if (ipSelect.options[i].value == data.currentIP) ipSelect.options[i].selected = true;
                    }
                }
            });
        },
        {
            "Save": YAMS.panel.updateNetwork
        });
    },

    updateNetwork: function () {
        var values = "portForwarding=" + YAMS.D.get('portForwarding-enabled').checked + "&" +
                     "openFirewall=" + YAMS.D.get('openFirewall-enabled').checked + "&" +
                     "adminPort=" + YAMS.D.get('adminInterface-port').value + "&" +
                     "publicPort=" + YAMS.D.get('publicInterface-port').value + "&" +
                     "listenIp=" + YAMS.D.get('listen-ip').value;
        $.ajax({
            data: 'action=save-network-settings&' + values,
            dataType: 'text',
            success: function () {
                YAMS.panel.dialogs.network.remove();
            }
        });
    },


    jobList: function () {
        this.dialogs.jobs = this.createDialog("job-panel", 800, "Jobs", "job-list", YAMS.panel.refreshJobs, { "Add Job": YAMS.panel.addJobWindow });
    },

    addJobWindow: function () {
        YAMS.panel.dialogs.addJob = YAMS.panel.createDialog('add-job', 400, "Add a job", "add-job", function () {
            var serverSelect = document.getElementById('server-select');
            for (var i = 0, len = YAMS.admin.servers.length; i < len; i++) {
                serverSelect.options[serverSelect.options.length] = new Option(YAMS.admin.servers[i].name, YAMS.admin.servers[i].id, false, false);
            }
        }, { "Add": YAMS.panel.addJob });
    },

    selectType: function (strType) {
        $('#job-server, #job-update, #job-backup, #job-overviewer, #job-c10t, #job-delayedrestart, #job-clearlogs').hide();
        if (strType != "update" && strType != "clearlogs") $('#job-server').show();
        if (strType != "") $('#job-' + strType).show();
    },

    refreshJobs: function () {
        $.ajax({
            data: 'action=job-list',
            success: function (data) {
                var tblJobs = $('#jobs-table');
                tblJobs.find("tr:gt(0)").remove();
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
                    c1.innerHTML = '<a href="javascript:void(0);" onclick="YAMS.panel.deleteJob(' + r.JobID + ');" class="icon delete"></a>';
                    row.appendChild(c1);
                    tblJobs.append(row);
                }
            }
        });
    },

    addJob: function () {
        var strType = $('#job-type').val();
        var strData = "action=add-job&job-hour=" + $('#job-hour').val() + "&job-minute=" + $('#job-minute').val() + "&job-type=" + strType;
        switch (strType) {
            case "":
                alert("Select job type first");
                return false;
                break;
            case "update":
                strData += "&jobs-server=0&job-params=";
                break;
            case "backup":
                strData += "&job-server=" + $('#server-select').val() + "&job-params=";
                break;
            case "overviewer":
                strData += "&job-server=" + $('#server-select').val();
                var strRenderModes = "";
                if ($('#overviewer-normal').prop("checked")) strRenderModes += "normal";
                if ($('#overviewer-lighting').prop("checked")) {
                    if (strRenderModes != "") strRenderModes += ",";
                    strRenderModes += "lighting";
                }
                if ($('#overviewer-night').prop("checked")) {
                    if (strRenderModes != "") strRenderModes += ",";
                    strRenderModes += "night";
                }
                if ($('#overviewer-spawn').prop("checked")) {
                    if (strRenderModes != "") strRenderModes += ",";
                    strRenderModes += "spawn";
                }
                if ($('#overviewer-cave').prop("checked")) {
                    if (strRenderModes != "") strRenderModes += ",";
                    strRenderModes += "cave";
                }
                strData += "&job-params=rendermodes=" + strRenderModes;
                break;
            case "c10t":
                strData += "&job-server=" + $('#server-select').val();
                strData += "&job-params=" + escape("night=" + $('#c10t-night').val() + "&mode=" + $('#c10t-mode').val());
                break;
            case "delayedrestart":
                strData += "&job-server=" + $('#server-select').val();
                strData += "&job-params=" + $('#delayedrestart-delay').val();
                break;
            case "clearlogs":
                strData += "&job-server=0";
                strData += "&job-params=" + escape("period=" + $('#clearlogs-period').val() + "&amount=" + $('#clearlogs-amount').val());
                break;
        }
        $.ajax({
            data: strData
        });
        YAMS.panel.dialogs.addJob.remove();
        YAMS.panel.refreshJobs();
    },

    deleteJob: function (jobID) {
        $.ajax({
            dataType: 'text',
            data: 'action=delete-job&jobid=' + jobID,
            success: function (data) {
                if (data == "done") alert("Job Deleted");
                else alert("Job not deleted");
                YAMS.admin.refreshJobs();
            }
        });
    },

    dnsWindow: function () {
        YAMS.panel.dialogs.dns = YAMS.panel.createDialog('dns-window', 400, "Dynamic DNS", "dns-window", function () {
            $.ajax({
                data: "action=getDNS",
                success: function (data) {
                    $('#dns-name').val(data.name);
                    $('#dns-secret').val(data.secret);
                    $('#dns-external').val(data.external);
                }
            });
        },
        {
            "Edit": YAMS.panel.editDNS
        });
    },

    editDNS: function () {
        YAMS.panel.dialogs.dnsEdit = YAMS.panel.createDialog('dns-edit', 400, "Edit DNS", "dns-edit", function () {
            if ($('#dns-name').val() == "") {
                $('#add-dns').show();
                $('#dns-check').button().click(function (event) {
                    event.preventDefault();
                    $.ajax({
                        url: "http://richardbenson.co.uk/yams/dns/",
                        dataType: "JSONP",
                        data: "action=available&domain=" + $('#dns-edit-name').val(),
                        success: function (data) {
                            if (data.result == 'true') {
                                alert($('#dns-edit-name').val() + ".yams.in is available!");
                                $('#dns-check').hide();
                                $('#dns-create').show();
                            } else {
                                alert($('#dns-edit-name').val() + ".yams.in is NOT available, please try a different name.");
                            }
                        }
                    });
                });
                $('#dns-create').button().click(function (event) {
                    event.preventDefault();
                    $.ajax({
                        url: "http://richardbenson.co.uk/yams/dns/",
                        dataType: "JSONP",
                        data: "action=add&domain=" + $('#dns-edit-name').val() + "&ip=" + $('#dns-external').val(),
                        success: function (data) {
                            if (data.result == 'ok') {
                                YAMS.panel.updateDNS($('#dns-edit-name').val(), data.secret, $('#dns-external').val());
                            } else {
                                alert("There was an error: " + data.message);
                            }
                        }
                    });
                });
                $('#dns-edit-name').on('keyup', function () {
                    $('#dns-create').hide();
                    $('#dns-check').show();
                });
            } else {
                $('#delete-dns').show();
                $('#dns-delete').button().click(function (event) {
                    event.preventDefault();
                    if (confirm("This will remove your DNS entry, are you sure?")) {
                        $.ajax({
                            url: "http://richardbenson.co.uk/yams/dns/",
                            dataType: "JSONP",
                            data: "action=delete&domain=" + $('#dns-name').val() + "&secret=" + $('#dns-secret').val(),
                            success: function (data) {
                                if (data.result == 'ok') {
                                    YAMS.panel.updateDNS("", "", "");
                                } else {
                                    alert("There was an error: " + data.message);
                                }
                            }
                        });
                    }
                });
            }
        });
    },

    updateDNS: function (strName, strSecret, strIP) {
        $.ajax({
            data: "action=updateDNS&dns-name=" + strName + "&dns-secret=" + strSecret + "&dns-external=" + strIP,
            dataType: "text",
            success: function () {
                YAMS.panel.dialogs.dnsEdit.remove();
                YAMS.panel.dialogs.dns.remove();
                YAMS.panel.dnsWindow();
            }
        });
    },

    closeDNSPanels: function () {
        YAMS.panel.dialogs.dnsEdit.remove();
        YAMS.panel.dialogs.dns.remove();
        YAMS.panel.dnsWindow();
    }

};

YAHOO.register("YAMSpanel", YAMS.panel, {version: YAMS.panel.version});