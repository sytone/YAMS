// YAMS Admin Menus
// (c) 2011 Richard Benson
// Authored by Richard Benson
// Portions Copyright (c) 2008, Yahoo! Inc.
// All rights reserved.

YAMS.namespace("menu");

YAMS.menu = {

    name: "YAMS Menus",
    version: "1.0",

    build: function() {
        YAMS.menu.menuBar = new YAHOO.widget.MenuBar("top-menu", {
            lazyload: false,
            autosubmenudisplay: true,
            hidedelay: 750,
            itemdata: YAMS.menu.menuData
        });

        YAMS.menu.menuBar.render('header');
        YAMS.menu.menuBar.subscribe("show", YAMS.menu.onSubmenuShow);
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
                    { text: "New Server", onclick: { fn: addServer} }
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
    ]

}

YAHOO.register("YAMSmenu", YAMS.menu, {version: YAMS.menu.version});

function onMenuItemClick() {
    alert("Callback for MenuItem: " + this.cfg.getProperty("text"));
};

//YUI menu not liking the namespace for some reason
function aboutYAMS() { YAMS.panel.aboutYAMS() };
function installedApps() { YAMS.panel.installedApps() };
function forceUpdate() { YAMS.admin.forceUpdate() };
function networkSettings() { YAMS.panel.networkSettings() };
function jobList() { YAMS.panel.jobList() };
function logOut() { YAMS.admin.logOut() };
function addServer() { YAMS.panel.newServer() };