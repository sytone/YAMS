---
layout: post
---

As of version 0.6 there is an option for a free dynamic DNS name with all YAMS installs.  Simply go into the settings menu and select "Dynamic DNS".

Once in the dialog, if you haven't yet set up a yams.in address, you will need to press the "edit" button and choose a name.  Once you've selected a name you
don't need to do anything else, YAMS will keep your DNS name up to date whenever your IP changes (there may be a delay of up to 5 minutes).

Dynamic DNS means your players can always connect to the same address (e.g. example.yams.in) even if you don't have a static IP address.  YAMS will
check your current IP against your last known one every 5 minutes and if there is a change, update your custom DNS.  As well as your servers appearing under
this address, your admin panel and public website are also there.  To make it easier to find these and for links to send to your players, there is now a "Connections"
tab in the admin console.