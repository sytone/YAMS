using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net.Sockets;
using System.Threading;
using System.Net;
using System.IO;

namespace YAMS
{
    static class TelnetServer
    {

        private static TcpListener tcpListener;
        private static Thread listenThread;

        public static List<TelnetClient> lstClients = new List<TelnetClient>();

        private static bool stoppingServer = false;

        public static void Init()
        {
            tcpListener = new TcpListener(IPAddress.Any, Convert.ToInt32(Database.GetSetting("TelnetPort", "YAMS")));
            listenThread = new Thread(new ThreadStart(ListenForClients));
            listenThread.Start();
        }
        
        private static void ListenForClients()
        {
            tcpListener.Start();

            if (Database.GetSetting("EnableOpenFirewall", "YAMS") == "true")
            {
                Networking.OpenFirewallPort(Convert.ToInt32(YAMS.Database.GetSetting("TelnetPort", "YAMS")), "Telnet");
            }

            if (Database.GetSetting("EnablePortForwarding", "YAMS") == "true")
            {
                Networking.OpenUPnP(Convert.ToInt32(YAMS.Database.GetSetting("TelnetPort", "YAMS")), "Telnet", YAMS.Database.GetSetting("YAMSListenIP", "YAMS"));
            } 
            
            while (true && stoppingServer == false)
            {
                //blocks until a client has connected to the server
                TcpClient client = tcpListener.AcceptTcpClient();

                //create a thread to handle communication 
                //with connected client
                TelnetClient myClient = new TelnetClient(client);
            }

        }

        public static void Stop()
        {
            stoppingServer = true;
            listenThread.Abort();
            tcpListener.Stop();

            //Close firewall ports and forward via UPnP
            if (Database.GetSetting("EnableOpenFirewall", "YAMS") == "true")
            {
                Networking.CloseFirewallPort(Convert.ToInt32(YAMS.Database.GetSetting("TelnetPort", "YAMS")));
            }
            if (Database.GetSetting("EnablePortForwarding", "YAMS") == "true")
            {
                Networking.CloseUPnP(Convert.ToInt32(YAMS.Database.GetSetting("TelnetPort", "YAMS")));
            }


        }

        public static void SendMessage(string strMessage, int intServerID = 0)
        {
            foreach (TelnetClient client in lstClients)
            {
                try
                {
                    if (client.currentServer == intServerID || intServerID == 0)
                    {
                        client.SendLine(strMessage);
                    }
                }
                catch { };
            }
        }

    }

    class TelnetClient
    {
        private TcpClient tcpClient;
        private NetworkStream clientStream;
        private StreamReader Reader;

        public int currentServer = 0;

        private bool Authenticated = false;

        public TelnetClient(object client)
        {
            this.tcpClient = (TcpClient)client;
            this.clientStream = tcpClient.GetStream();
            this.Reader = new StreamReader(this.clientStream);

            Thread clientThread = new Thread(this.Start);
            clientThread.Start();
            TelnetServer.lstClients.Add(this);
        }

        public void Start()
        {
            this.SendLine("Welcome to YAMS Telnet server.  Enter your password:");
            this.ReadMessage();
        }

        public void Stop()
        {
            this.clientStream.Close();
            this.tcpClient.Close();
            TelnetServer.lstClients.Remove(this);
        }

        public void ReadMessage()
        {
            byte[] message = new byte[1024];
            string myCompleteMessage = null;

            while (true)
            {
                try
                {
                    //blocks until a client sends a message
                    //bytesRead = this.clientStream.Read(message, 0, 1024);
                    //do
                    //{
                    //    bytesRead = this.clientStream.Read(message, 0, 1024);
                    //    myCompleteMessage =
                    //        String.Concat(myCompleteMessage, Encoding.ASCII.GetString(message, 0, bytesRead));
                    //}
                    //while (this.clientStream.DataAvailable || Encoding.ASCII.GetString(message, 0, bytesRead) != );
                    myCompleteMessage = this.Reader.ReadLine();

                }
                catch
                {
                    //a socket error has occured
                    this.Stop();
                    break;
                }

                if (myCompleteMessage == null)
                {
                    //the client has disconnected from the server
                    this.Stop();
                    break;
                }

                //message has successfully been received
                ASCIIEncoding encoder = new ASCIIEncoding();
                string strMessage = myCompleteMessage;
                string[] messages = strMessage.Split(' ');

                if (!this.Authenticated)
                {
                    if (strMessage != Database.GetSetting("AdminPassword", "YAMS"))
                    {
                        this.SendLine("Try again");
                    }
                    else
                    {
                        this.Authenticated = true;
                        this.SendLine((char)27 + "[2J", false);
                        this.SendLine("Welcome.");
                        this.SendLine("---------------------");
                        this.SendLine("Commands:");
                        this.SendLine("");
                        this.SendLine("server <n> : Set the active server based on ID");
                        this.SendLine("");
                        this.SendLine("** Any command not recognised by YAMS is passed directly to the active server **");
                        this.SendLine("---------------------");
                        this.SendLine("Servers:");
                        foreach (KeyValuePair<int, MCServer> kvp in Core.Servers)
                        {
                            this.SendLine("\t" + kvp.Key + ": " + kvp.Value.ServerTitle);
                        }
                        this.SendLine("");
                        this.SendLine("---------------------");
                    }
                }
                else
                {

                    switch (messages[0])
                    {
                        case "quit":
                            this.SendLine("Goodbye");
                            this.Stop();
                            break;
                        case "server":
                            this.currentServer = Convert.ToInt32(messages[1]);
                            this.SendLine("Server changed to " + messages[1]);
                            break;
                        case "":
                            break;
                        case "stop":
                            if (this.currentServer != 0) Core.Servers[this.currentServer].Stop();
                            break;
                        case "start":
                            if (this.currentServer != 0) Core.Servers[this.currentServer].Start();
                            break;
                        default:
                            if (this.currentServer != 0) Core.Servers[this.currentServer].Send(strMessage);
                            break;
                    }
                }
            }
        }

        public void SendLine(string strLine, bool bolNewLine = true)
        {
            ASCIIEncoding encoder = new ASCIIEncoding();
            if (bolNewLine) strLine += "\r\n";
            byte[] buffer = encoder.GetBytes(strLine);

            this.clientStream.Write(buffer, 0, buffer.Length);
            this.clientStream.Flush();
        }
    }
}
