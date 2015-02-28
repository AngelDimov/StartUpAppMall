static var Connected = false;
static var Initialized = false;
static var gameName = "Game Name";

function OnGUI () {
	if (Connected == false && Initialized == false) {
		gameName = GUI.TextField(Rect(10,10,200,20), gameName);
		
		if (GUI.Button(Rect(220,10,100,20), "Initialize Server")) {
			Network.useNat = !Network.HavePublicAddress();
			Network.InitializeServer(32, 25000);
			MasterServer.RegisterHost("ChatTest", gameName);
			Initialized = true;
		}
	
		var data : HostData[] = MasterServer.PollHostList();
	
		var pos = 40;
		for (var element in data)
		{
			var name = element.gameName;
			GUI.Label(Rect(10,pos,200,20), name);	
			if (GUI.Button(Rect(220,pos,100,20),"Connect"))
			{
				Network.useNat = element.useNat;
				Network.Connect(element.ip, element.port);
				Connected = true;
			}
			pos += 30;
		}
	}
}

function Update () {
	MasterServer.RequestHostList("ChatTest");
}