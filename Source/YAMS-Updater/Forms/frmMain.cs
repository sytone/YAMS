﻿using System;
using System.Diagnostics;
using System.IO;
using System.ServiceProcess;
using System.Windows.Forms;
using System.Net;
using System.Net.NetworkInformation;
using NATUPNPLib;

using System.Data.SqlServerCe;

namespace YAMS_Updater
{
    public partial class frmMain : Form
    {
        public frmMain()
        {
            InitializeComponent();

            timStatus.Tick += new EventHandler(timStatus_Tick);
            timStatus.Start();

            //Get the version numbers of our compiled files
            lblDLL.Text = FileVersionInfo.GetVersionInfo(Path.Combine(Program.RootFolder, "YAMS-Library.dll")).FileVersion;
            lblSVC.Text = FileVersionInfo.GetVersionInfo(Path.Combine(Program.RootFolder, "YAMS-Service.exe")).FileVersion;
            lblGUI.Text = FileVersionInfo.GetVersionInfo(Path.Combine(Program.RootFolder, "YAMS-Updater.exe")).FileVersion;
            lblDB.Text = YAMS.Database.GetSetting("DBSchema", "YAMS");

            //Listen ports for the webservers
            lblAdminPort.Text = YAMS.Database.GetSetting("AdminListenPort", "YAMS");
            lblPublicPort.Text = YAMS.Database.GetSetting("PublicListenPort", "YAMS");

            //Storage Path
            lblStoragePath.Text = YAMS.Database.GetSetting("StoragePath", "YAMS");
            txtStoragePath.Text = YAMS.Database.GetSetting("StoragePath", "YAMS");

            //Addresses
            RefreshAddresses();

            //Set current update branch
            switch (YAMS.Database.GetSetting("UpdateBranch", "YAMS")) {
                case "live":
                    selUpdateBranch.SelectedIndex = 0;
                    break;
                case "dev":
                    selUpdateBranch.SelectedIndex = 1;
                    break;
                default:
                    selUpdateBranch.SelectedIndex = 0;
                    break;
            }
        }

        private void RefreshAddresses()
        {
            IPAddress externalIP = YAMS.Networking.GetExternalIP();
            lblExternalIP.Text = externalIP.ToString();
            lblPublicURL.Text = "http://" + externalIP.ToString();
            if (YAMS.Database.GetSetting("PublicListenPort", "YAMS") != "80") lblPublicURL.Text += ":" + YAMS.Database.GetSetting("PublicListenPort", "YAMS");
            lblPublicURL.Text += "/";
            lblAdminURL.Text = "http://" + externalIP.ToString() + ":" + YAMS.Database.GetSetting("AdminListenPort", "YAMS") + "/admin/";
            lblListenIP.Text = YAMS.Networking.GetListenIP().ToString();
            lblDNS.Text = (YAMS.Database.GetSetting("DNSName", "YAMS") != "" ? YAMS.Database.GetSetting("DNSName", "YAMS") + ".yams.in" : "");
        }

        private void frmMain_Shown(Object sender, EventArgs e)
        {
            new MethodInvoker(UpdatePortForwards).BeginInvoke(null, null);
        }

        private void UpdatePortForwards()
        {
            lblPortStatus.Text = "Checking port forwards...";
            try
            {
                tblPortForwards.Rows.Clear();
                IPAddress externalIP = YAMS.Networking.GetExternalIP();
                lblExternalIP.Text = externalIP.ToString();
                
                UPnPNATClass upnpnat = new UPnPNATClass();
                IStaticPortMappingCollection mappings = upnpnat.StaticPortMappingCollection;

                progToolStrip.Maximum = mappings.Count;
                
                foreach (IStaticPortMapping p in mappings)
                {
                    //This lists all available port mappings on the device, which could be an awful lot
                    if (p.Description.IndexOf("YAMS") > -1) {
                        //Check the port is open
                        bool portOpen = YAMS.Networking.CheckExternalPort(externalIP, p.ExternalPort);

                        //Add the port forward to the table
                        DataGridViewRow row = new DataGridViewRow();
                        row.CreateCells(tblPortForwards);
                        row.Cells[0].Value = p.Description;
                        row.Cells[1].Value = p.ExternalPort;
                        row.Cells[2].Value = portOpen;
                        tblPortForwards.Rows.Add(row);
                    }
                    progToolStrip.PerformStep();
                }
            }
            catch (Exception e)
            {
                //MessageBox.Show(e.Message);
            }
            lblPortStatus.Text = "Done";
        }

        void timStatus_Tick(object sender, EventArgs e)
        {
            ServiceController svcYAMS = new ServiceController("YAMS_Service");

            switch (svcYAMS.Status) {
                case ServiceControllerStatus.Stopped:
                    lblStatus.Text = "Stopped";
                    btnStop.Enabled = false;
                    btnStart.Enabled = true;
                    break;
                case ServiceControllerStatus.Running:
                    lblStatus.Text = "Running";
                    btnStart.Enabled = false;
                    btnStop.Enabled = true;
                    break;
                case ServiceControllerStatus.Paused:
                    lblStatus.Text = "Paused";
                    btnStop.Enabled = true;
                    btnStart.Enabled = true;
                    break;
                case ServiceControllerStatus.StartPending:
                    lblStatus.Text = "Starting";
                    btnStart.Enabled = false;
                    btnStop.Enabled = false;
                    break;
                case ServiceControllerStatus.StopPending:
                    lblStatus.Text = "Stopping";
                    btnStart.Enabled = false;
                    btnStop.Enabled = false;
                    break;
                case ServiceControllerStatus.PausePending:
                    lblStatus.Text = "Pausing";
                    btnStart.Enabled = false;
                    btnStop.Enabled = false;
                    break;
                case ServiceControllerStatus.ContinuePending:
                    lblStatus.Text = "Continuing";
                    btnStart.Enabled = false;
                    btnStop.Enabled = false;
                    break;
                default:
                    lblStatus.Text = "Unknown";
                    btnStart.Enabled = false;
                    btnStop.Enabled = false;
                    break;
            }
            lblStatus.Refresh();
        }

        private void btnStart_Click(object sender, EventArgs e)
        {
            Program.StartService();
        }

        private void btnStop_Click(object sender, EventArgs e)
        {
            Program.StopService();
        }

        private void btnConsoleStart_Click(object sender, EventArgs e)
        {
            System.Diagnostics.Process.Start("http://localhost:" + YAMS.Database.GetSetting("AdminListenPort", "YAMS") + "/admin");
        }

        private void btnResetPassword_Click(object sender, EventArgs e)
        {
            YAMS.Database.SaveSetting("AdminPassword", txtPassword.Text);
        }

        private void btnSwitchBranch_Click(object sender, EventArgs e)
        {
            switch (selUpdateBranch.SelectedIndex)
            {
                case 0:
                    YAMS.Database.SaveSetting("UpdateBranch", "live");
                    break;
                case 1:
                    YAMS.Database.SaveSetting("UpdateBranch", "dev");
                    break;
                default:
                    YAMS.Database.SaveSetting("UpdateBranch", "live");
                    break;
            }
        }

        private void btnUpdateClient_Click(object sender, EventArgs e)
        {
            MessageBox.Show("Please be aware if you have large worlds or mods, this can take a long time\n\nThe app may report \"Not Responding\" but it is still copying.");
            YAMS.Util.CopyMCClient();
        }

        private void btnChangePath_Click(object sender, EventArgs e)
        {
            if (MessageBox.Show("This will stop all servers and move their files to the new location", "Confirm move", MessageBoxButtons.YesNo) == DialogResult.Yes)
            {
                //Stop the service, which in turn stops all the servers
                Program.StopService();
                bool bolStopped = false;
                while (!bolStopped)
                {
                    ServiceController svcYAMS = new ServiceController("YAMS_Service");
                    if (svcYAMS.Status.Equals(ServiceControllerStatus.Stopped))
                    {
                        bolStopped = true;
                    }
                    else { System.Threading.Thread.Sleep(1000); }
                }

                //Copy all files to the new location
                YAMS.Util.Copy(YAMS.Database.GetSetting("StoragePath", "YAMS"), txtStoragePath.Text);

                //Set the DB path
                YAMS.Database.SaveSetting("StoragePath", txtStoragePath.Text);

                //Start the service back up
                Program.StartService();
            }
        }

        private void btnResetPorts_Click(object sender, EventArgs e)
        {
            if (MessageBox.Show("This will reset your admin and web ports back to defaults (56552, 80), are you sure?", "Confirm port reset", MessageBoxButtons.YesNo) == DialogResult.Yes)
            {
                YAMS.Database.SaveSetting("AdminListenPort", "56552");
                YAMS.Database.SaveSetting("TelnetPort", "56553");
                YAMS.Database.SaveSetting("PublicListenPort", "80");
                RefreshAddresses();
            }
        }

        private void btnTruncate_Click(object sender, EventArgs e)
        {
            if (MessageBox.Show("This will clear ALL logs from the database, they will not be recoverable.\n\nAre you sure?", "Confirm truncate logs", MessageBoxButtons.YesNo) == DialogResult.Yes)
            {
                YAMS.Database.ExecuteSQL("DELETE FROM Log");
                MessageBox.Show("Logs cleared");
            }
        }

    }
}
