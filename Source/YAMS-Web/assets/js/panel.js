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
        var dialog = $('<div id="' + strName + '"><img src="/assets/images/ajax-loader.gif" /></div>').dialog({
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
                    if (data.tectonicus === "true") $('#tectonicus-installed').prop("checked", true);
                    if (data.nbtoolkit === "true") $('#nbtoolkit-installed').prop("checked", true);
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
                     "tectonicus=" + $('#tectonicus-installed').prop("checked") + "&" +
                     "nbtoolkit=" + $('#nbtoolkit-installed').prop("checked") + "&" +
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
        this.dialogs.jobs = this.createDialog("job-panel", 600, "Jobs", "job-list", YAMS.panel.refreshJobs, { "Add Job": YAMS.panel.addJobWindow });
    },

    addJobWindow: function () {
        YAMS.panel.dialogs.addJob = YAMS.panel.createDialog('add-job', 400, "Add a job", "add-job");
    },

    refreshJobs: function () {
        $.ajax({
            data: 'action=job-list',
            success: function (data) {
                var tblJobs = $('#jobs-table');

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
    }

};

YAHOO.register("YAMSpanel", YAMS.panel, {version: YAMS.panel.version});