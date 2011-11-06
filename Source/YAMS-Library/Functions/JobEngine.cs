using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Data.SqlServerCe;
using YAMS;

namespace YAMS
{
    public static class JobEngine
    {

        public static Timer timJob;

        public static void Init()
        {
            //Tick every minute
            timJob = new Timer(new TimerCallback(Tick), null, 0, 1 * 60 * 1000);
        }

        public static void Tick(object t)
        {
            DateTime datNow = DateTime.Now;
            int intMinutes = datNow.Minute;
            int intHour = datNow.Hour;

            //is it time to phone home?
            if (Database.GetSetting("UsageData", "YAMS") == "true" && intMinutes == 0) Util.PhoneHome();

            //Get jobs for current minute
            SqlCeDataReader rdJobs = Database.GetJobs(intHour, intMinutes);

            MCServer s;
            
            while (rdJobs.Read())
            {
                switch (rdJobs["JobAction"].ToString()) {
                    case "overviewer":
                        s = Core.Servers[Convert.ToInt32(rdJobs["JobServer"])];
                        AddOns.Overviewer gmap = new AddOns.Overviewer(s, rdJobs["JobParams"].ToString());
                        gmap.Start();
                        break;
                    case "c10t":
                        s = Core.Servers[Convert.ToInt32(rdJobs["JobServer"])];
                        AddOns.c10t c10t = new AddOns.c10t(s, rdJobs["JobParams"].ToString());
                        c10t.Start();
                        break;
                    case "biome-extractor":
                        s = Core.Servers[Convert.ToInt32(rdJobs["JobServer"])];
                        AddOns.BiomeExtractor extractor = new AddOns.BiomeExtractor(s, rdJobs["JobParams"].ToString());
                        extractor.Start();
                        break;
                    case "backup":
                        s = Core.Servers[Convert.ToInt32(rdJobs["JobServer"])];
                        Backup.BackupIfNeeded(s);
                        break;
                    case "update":
                        AutoUpdate.CheckUpdates();
                        break;
                    default:
                        Database.AddLog("Invalid entry in Job database", "job", "warn");
                        break;
                }
            }
        }
    }
}
