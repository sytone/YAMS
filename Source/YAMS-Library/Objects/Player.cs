using System;
using System.Collections.Generic;
using System.Text;
using YAMS;
using LibNbt;

namespace YAMS.Objects
{

    public class Player
    {
        //The minecraft login name of the player
        public string Username;

        //Their level
        public string Level = "guest";

        //Which server are they on?
        private MCServer Server;

        //Where are they at the moment?
        private Vector _position;
        public Vector Position
        {
            get
            {
                this.UpdatePosition();
                return _position;
            }
        }

        public Player(string strName, MCServer s)
        {
            this.Username = strName;
            this.Server = s;

            this.Level = Database.GetPlayerLevel(strName, s.ServerID);

            if (this.Level == null)
            {
                //We're letting anyone in these days, so add to the DB
                Database.AddUser(this.Username, this.Server.ServerID);
                this.Level = "guest";
            }

            //check the op list
            if (Util.SearchFile(s.ServerDirectory + "ops.txt", strName)) this.Level = "op";

            //Emulate MOTD
            if (Database.GetSetting("motd", "MC", this.Server.ServerID) != "") this.SendMessage(Database.GetSetting("motd", "MC", this.Server.ServerID));
        }

        public void SendMessage(string strMessage)
        {
            this.Server.Whisper(this.Username, strMessage);
        }

        private void UpdatePosition()
        {
            NbtFile PlayerDat = new NbtFile(this.Server.ServerDirectory + "\\world\\players\\" + this.Username + ".dat");
            PlayerDat.LoadFile();
            this._position.x = PlayerDat.Query<LibNbt.Tags.NbtDouble>("//Pos/0").Value;
            this._position.y = PlayerDat.Query<LibNbt.Tags.NbtDouble>("//Pos/1").Value;
            this._position.z = PlayerDat.Query<LibNbt.Tags.NbtDouble>("//Pos/2").Value;
            PlayerDat.Dispose();
        }

    }
}
