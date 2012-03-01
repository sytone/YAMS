using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Diagnostics;
using HttpServer;
using HttpServer.Authentication;
using HttpServer.Headers;
using HttpServer.Modules;
using HttpServer.Resources;
using HttpServer.Tools;
using Newtonsoft.Json;
using System.Data.SqlServerCe;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using HttpListener = HttpServer.HttpListener;
using YAMS;

namespace YAMS.Web
{
    public class PublicAPI : IModule
    {
        public ProcessingResult Process(RequestContext context)
        {

            //it's a public request, work out what they want
            // / = list servers
            // /[0-9]+/ = server home page including chat log
            // /[0-9]+/map = Google Map
            // /[0-9]+/renders = c10t renders

            Regex regRoot = new Regex(@"^/$");
            Regex regServerList = new Regex(@"^/servers/$");
            Regex regServerHome = new Regex(@"^/servers/([0-9]+)/$");
            Regex regServerGMap = new Regex(@"^/servers/([0-9]+)/map/");
            Regex regServerRenders = new Regex(@"^/servers/([0-9]+)/renders/");

            if (regServerGMap.Match(context.Request.Uri.AbsolutePath).Success || regServerRenders.Match(context.Request.Uri.AbsolutePath).Success)
            {
                return ProcessingResult.Continue;
            }
            else
            {
                string strTemplate = "No matching Template";
                Dictionary<string, string> dicTags = new Dictionary<string, string>();

                if (regRoot.Match(context.Request.Uri.AbsolutePath).Success)
                {
                    //Server Root
                    strTemplate = File.ReadAllText(Core.RootFolder + @"\web\templates\root.html");
                    dicTags.Add("PageTitle", "YAMS Hosted Server");
                    dicTags.Add("PageBody", "test");
                }
                else if (regServerList.Match(context.Request.Uri.AbsolutePath).Success)
                {
                    //List of Servers
                    strTemplate = File.ReadAllText(Core.RootFolder + @"\web\templates\server-list.html");
                    dicTags.Add("PageTitle", "Server List");
                    string strServerList;
                    strServerList = "<ul>";
                    foreach (KeyValuePair<int, MCServer> kvp in Core.Servers)
                    {
                        strServerList += "<li><a href=\"" + kvp.Value.ServerID + "/\">" + kvp.Value.ServerTitle + "</a></li>";
                    };
                    strServerList += "</ul>";
                    dicTags.Add("ServerList", strServerList);
                }
                else if (regServerHome.Match(context.Request.Uri.AbsolutePath).Success)
                {
                    //Individual Server home
                    Match matServerHome = regServerHome.Match(context.Request.Uri.AbsolutePath);
                    int intServerID = Convert.ToInt32(matServerHome.Groups[1].Value);
                    MCServer s = Core.Servers[intServerID];

                    string strOverviewer = "";
                    string strImages = "";
                    string strBackups = "";

                    if (File.Exists(s.ServerDirectory + @"\renders\overviewer\output\index.html")) {
                        strOverviewer = "<div><a href=\"renders/overviewer/output/index.html\">Click here to open map</a></div>";
                    }

                    strImages = "<ul>";
                    DirectoryInfo di = new DirectoryInfo(s.ServerDirectory + @"\renders\");
                    FileInfo[] fileEntries = di.GetFiles();
                    int intImages = 0;
                    foreach (FileInfo fi in fileEntries)
                    {
                        strImages += "<li><a href=\"renders/" + fi.Name + "\">" + fi.Name + "</a></li>";
                        intImages++;
                        if (intImages > 20) break;
                    }
                    strImages += "</ul>";

                    strBackups = "<ul>";
                    DirectoryInfo di2 = new DirectoryInfo(s.ServerDirectory + @"\backups\");
                    FileInfo[] fileEntries2 = di2.GetFiles();
                    int intBackups = 0;
                    foreach (FileInfo fi in fileEntries2)
                    {
                        strBackups += "<li><a href=\"backups/" + fi.Name + "\">" + fi.Name + "</a></li>";
                        intBackups++;
                        if (intBackups > 20) break;
                    }
                    strBackups += "</ul>";

                    //Determine if they need a special client URL
                    string strClientURL = "";
                    if (s.ServerType == "pre")
                    {
                        string json = File.ReadAllText(YAMS.Core.RootFolder + @"\lib\versions.json");
                        //Dictionary<string, string> dicVers = JsonConvert.DeserializeObject<Dictionary<string, string>>(json);
                        JObject jVers = JObject.Parse(json);
                        strClientURL = "This server is running the weekly snapshots, <a href=\"" + (string)jVers["pre-client"] + "\">download current client</a>.";
                    }

                    //List out players online
                    string strPlayers = "";
                    if (s.Players.Count > 0)
                    {
                        strPlayers = "<ul>";
                        foreach (KeyValuePair<string, Objects.Player> kvp in s.Players)
                        {
                            Vector playerPos = kvp.Value.Position;
                            strPlayers += "<li>";
                            if (kvp.Value.Level == "op") strPlayers += "<span class=\"label label-important\">op</span> ";
                            strPlayers += kvp.Value.Username + " <span class=\"label\">" +
                                              playerPos.x.ToString("0.##") + ", " +
                                              playerPos.y.ToString("0.##") + ", " +
                                              playerPos.z.ToString("0.##") + "</span>";
                            strPlayers += "</li>";
                        };
                        strPlayers += "</ul>";
                    }
                    else
                    {
                        strPlayers = "No players online right now";
                    }

                    //Connection Addresses
                    string strConnectAddress = "";
                    if (Database.GetSetting("DNSName", "YAMS") != "")
                    {
                        strConnectAddress = Database.GetSetting("DNSName", "YAMS") + ".yams.in";
                    }
                    else
                    {
                        strConnectAddress = Networking.GetExternalIP().ToString();
                    }
                    if (s.GetProperty("server-port") != "25565") strConnectAddress += ":" + s.GetProperty("server-port");

                    strConnectAddress += "<input type=\"hidden\" id=\"server-host\" value=\"" + Networking.GetExternalIP().ToString() + "\" />" +
                                         "<input type=\"hidden\" id=\"server-port\" value=\"" + s.GetProperty("server-port") + "\" />";

                    strTemplate = File.ReadAllText(Core.RootFolder + @"\web\templates\server-home.html");
                    dicTags.Add("PageTitle", s.ServerTitle);
                    dicTags.Add("RenderOverviewer", strOverviewer);
                    dicTags.Add("RenderImages", strImages);
                    dicTags.Add("BackupList", strBackups);
                    dicTags.Add("ServerConnectAddress", strConnectAddress); //TODO
                    dicTags.Add("ClientURL", strClientURL);
                    dicTags.Add("PlayersOnline", strPlayers);
                    dicTags.Add("PageBody", "Some blurb about the server, probably including some <em>HTML</em>");
                }
                else
                {
                    //Unknown
                    context.Response.Status = HttpStatusCode.NotFound;
                    strTemplate = File.ReadAllText(Core.RootFolder + @"\web\templates\server-home.html");
                    dicTags.Add("PageTitle", "404");
                    dicTags.Add("PageBody", "<h1>404 - Not Found</h1>");
                }

                //Run through our replacer
                strTemplate = WebTemplate.ReplaceTags(strTemplate, dicTags);

                //And send to the browser
                context.Response.Reason = "Completed - YAMS";
                context.Response.Connection.Type = ConnectionType.Close;
                byte[] buffer = Encoding.UTF8.GetBytes(strTemplate);
                context.Response.Body.Write(buffer, 0, buffer.Length);
                return ProcessingResult.SendResponse;
            }

        }

    }
}
