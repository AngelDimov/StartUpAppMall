import System; 
import System.IO; 

var logFile = "ChatLog.txt";
var blockedFile = "BlockedPlayers.txt";

private var myName = "Enter Your Name";
private var nameEntered = false;
private var allchat = ArrayList();
private var playerList = ArrayList();
private var playerNames = ArrayList();
private var groupNames = ArrayList();
private var blockedPlayers = ArrayList();
private var serverSelectedChar : NetworkPlayer;
private var serverModChar = false;
private var addToGroup = "";
private var textstring = "";
private var scrollPosition = Vector2.zero;
private var playerScrollPosition = Vector2.zero;
private var serverChatScroll = Vector2.zero;
private var serverPlayerScroll = Vector2.zero;
private var maxScroll = 0.0;
private var selectedPlayer = "";
private var talkTo = 0;
private var inviter = "";
private var serverMessage = "";

private var scrollingNotices = new Array();
private var noticeFrequency = 60;
private var noticeFrequencyString = "60";
private var lastNotice = 0.0;
private var nextNoticeNumber = 0;
private var totalEntries = -1;

var privateChat : GUIStyle;
var groupChat : GUIStyle;
var noticeChat : GUIStyle;

class serverPlayerEntry {
	var playname = "";
	var playerid : NetworkPlayer;
}

class EntryMsg {
	var message = "";
	var dispcolor = 0;
}

function Update () {
	//sends messages automatically from server
	if (Initializing.Initialized) {
		if (Time.time - lastNotice > noticeFrequency && totalEntries != -1) {
			networkView.RPC("SendEntry", RPCMode.Others, scrollingNotices[nextNoticeNumber], 3);
			if (nextNoticeNumber < totalEntries) nextNoticeNumber++;
			else nextNoticeNumber = 0;
			lastNotice = Time.time;
		}
	}
}

function OnGUI () {
	if (Initializing.Connected && nameEntered) {
		//if we are connected to a server show the chat window
		GUI.Window(0, Rect(10,10,460,300), chat, "Chat");
		if (inviter != "") {
			//we have a group invite
			GUI.Window (1,Rect(480, 40, 230, 90), inviteWindow, "Group Invitation");
		}
	}
	else if (Initializing.Connected) {
		myName = GUI.TextField (Rect (10, 10, 200, 20), myName);
		if (GUI.Button(Rect(220,10,100,20), "Enter Chat")) {
			//if character already exists return
			for (var entry : String in playerNames) {
				if (myName == entry || myName == "Enter Your Name") {
					myName = "Name In Use";
					return;
				}
			}
			networkView.RPC ("SubmitPlayerInfo", RPCMode.Server, Network.player, myName);
			nameEntered = true;
		}
	}
	else if (Initializing.Initialized) {
		//server side windows
		GUI.Window(0, Rect(250,10,350,250), serverMessagesWindow, "Messages");
		GUI.Window(1, Rect(10,10,230,250), serverWindow, "General");
		GUI.Window(2, Rect(10,270,200,250), serverPlayerList, "Players");
	}
}

function serverPlayerList () {
	GUILayout.BeginArea(Rect(10,30,180,210));
	serverPlayerScroll = GUILayout.BeginScrollView (serverPlayerScroll, GUILayout.Width(180), GUILayout.Height(210));
	//the code in this if will never be used since the line saying "serverModChar = true" is set as a note since Network.CloseConnection isn't working
	if (serverModChar) {
		if (GUILayout.Button("Kick From Server")) {
			serverModChar = false;
			Network.CloseConnection (serverSelectedChar, false);
		}
		if (GUILayout.Button("Block From Server")) {
			serverModChar = false;
			blockedPlayers.Add(serverSelectedChar.ipAddress);
			Network.CloseConnection (serverSelectedChar, false);
		}
	}
	else {
		for (var entry in playerList) {
			if (GUILayout.Button(entry.playname)) {
				serverSelectedChar = entry.playerid;
				//Network.CloseConnection doesn't seem to work
				//serverModChar = true;
			}
		}
	}
	GUILayout.EndScrollView ();
	GUILayout.EndArea();
}

function serverWindow () {
	GUILayout.BeginArea (Rect (10,30,210,210));
	if (GUILayout.Button("Re-Register With Master Server")) {
		MasterServer.RegisterHost("ChatTest", Initializing.gameName);
	}
	GUILayout.EndArea ();
}

function serverMessagesWindow () {
	GUILayout.BeginArea (Rect (10,30,330,210));
	serverChatScroll = GUILayout.BeginScrollView (serverChatScroll, GUILayout.Width(330), GUILayout.Height(160));		
	var currentCount = 0;
	//display textfield for each scrolling message added
	for (var entry : String in scrollingNotices) {
		GUILayout.BeginHorizontal();
		entry = GUILayout.TextField(entry);
		if (GUILayout.Button("Remove",  GUILayout.Width(70))) {
			scrollingNotices.RemoveAt(currentCount);
			return;
		}
		GUILayout.EndHorizontal();
		currentCount++;
	}
	GUILayout.EndScrollView ();
	GUILayout.BeginHorizontal();
	if (GUILayout.Button("Add Scrolling Notice")) {
		scrollingNotices.Push("");
		totalEntries++;
	}
	GUILayout.Label("Notice Frequency");
	noticeFrequencyString = GUILayout.TextField (noticeFrequencyString,  GUILayout.Width(50));
	if(GUILayout.Button("Set")) noticeFrequency = int.Parse(noticeFrequencyString);
	GUILayout.EndHorizontal();
	GUILayout.BeginHorizontal();
	//send a one time message from the server
	serverMessage = GUILayout.TextField (serverMessage,  GUILayout.Width(250));
	if (GUILayout.Button("Send")) {
		networkView.RPC("SendEntry", RPCMode.Others, serverMessage, 3);
		serverMessage = "Sent";
	}
	GUILayout.EndHorizontal();
	GUILayout.EndArea ();
}

//shows up if a player is invited to join a group
function inviteWindow () {
	GUI.Label(Rect(10,30,210,20), "Group Invitation From " + inviter);
	if (GUI.Button(Rect(45,60,55,20), "Accept")) {
		for (var entry : String in groupNames) {
			playerNames.Add(entry);
			playerNames.Sort();
			networkView.RPC("SubmitLeaveGroup", RPCMode.Server, entry, myName);
		}
		groupNames.Clear();
		networkView.RPC("SubmitAcceptInvite", RPCMode.Server, inviter, myName);
		groupNames.Add(inviter);
		groupNames.Sort();
		var currentCount = 0;
		for (var entry in playerNames) {
			if (entry == inviter) {
				playerNames.RemoveAt(currentCount);
				inviter = "";
				return;
			}
			currentCount++;
		}
	}
	if (GUI.Button(Rect(130,60,55,20), "Decline")) {
		inviter = "";
	}
}

//main client side chat window
function chat () {
	//this is where you write your message
	textstring = GUI.TextArea (Rect (10, 240, 180, 50), textstring);
	
	//sends the message you wrote
	if (GUI.Button(Rect (200, 240, 40, 50), "Send")) {
		textstring = myName + ": " + textstring;
		if (talkTo == 0) {
			networkView.RPC("SubmitEntry", RPCMode.Server, textstring, "All", 0);
		}
		else {
			if (talkTo == 1) {
				for (var entry : String in groupNames) {
				networkView.RPC("SubmitEntry", RPCMode.Server, textstring, entry, 1);
				}
			}
			else networkView.RPC("SubmitEntry", RPCMode.Server, textstring, selectedPlayer, 2);
			
			var myEntry = new EntryMsg ();
			myEntry.message = textstring;
			myEntry.dispcolor = talkTo;
			allchat.Add (myEntry);
			if (allchat.Count > 50) allchat.RemoveAt(0);
			//only pulls your view of the conversation to the new bottom if you were already looking at the bottom
			//this is so if you scroll up to read a previous post it doesn't pull you to the bottom as soon as someone else posts
			if (scrollPosition.y == maxScroll) scrollPosition.y = 1000000;
			//this will keep you at a previous post
			else if (allchat.Count == 50) scrollPosition.y -= 23;
		}
		textstring = "";
	}
	
	//displays everyones messages
	GUILayout.BeginArea (Rect (10,30,230,200));
	scrollPosition = GUILayout.BeginScrollView (scrollPosition, GUILayout.Width(230), GUILayout.Height(200));
	for (var entry in allchat) {
		if (entry.dispcolor == 0) GUILayout.Label (entry.message);
		else if (entry.dispcolor == 1) GUILayout.Label (entry.message, groupChat);
		else if (entry.dispcolor == 2) GUILayout.Label (entry.message, privateChat);
		else GUILayout.Label (entry.message, noticeChat);
	}
	GUILayout.EndScrollView();
	GUILayout.EndArea();	
	
	GUILayout.BeginArea (Rect(250,30,200,260));
	playerScrollPosition = GUILayout.BeginScrollView (playerScrollPosition, GUILayout.Width(200), GUILayout.Height(260));
	if (GUILayout.Button ("Everyone")) talkTo = 0;
	if (GUILayout.Button ("Group")) talkTo = 1;
	GUILayout.Label("Group Members:");
	for (var entry in groupNames) {
		if (GUILayout.Button(entry)) {
			selectedPlayer = entry;
			talkTo = 2;
		}
	}
	
	GUILayout.BeginHorizontal();
	addToGroup = GUILayout.TextField(addToGroup);
	if (GUILayout.Button("Invite")) {
		for (var entry : String in groupNames) {
			if (entry == addToGroup) {
				addToGroup = "Player Already In Group";
				return;
			}
		}
		for (var entry : String in playerNames) {
			if (entry == addToGroup) {
				networkView.RPC("SubmitInvite", RPCMode.Server, myName, addToGroup);
				addToGroup = "Invite Sent";
				return;
			}
		}
		addToGroup = "Name Not In Use";
	}
	GUILayout.EndHorizontal();
	
	
	if (GUILayout.Button("Leave Group")) {
			for (var entry : String in groupNames) {
				networkView.RPC("SubmitLeaveGroup", RPCMode.Server, entry, myName);
				playerNames.Add(entry);
				playerNames.Sort();
			}
			groupNames.Clear();
	}
	GUILayout.Label("Other Players:");
	for (var entry in playerNames) {
		if (GUILayout.Button(entry)) {
			selectedPlayer = entry;
			talkTo = 2;
		}
	}
	
	GUILayout.EndScrollView();
	GUILayout.EndArea ();
	
	
	
	//finds the maximum scroll position for use in the add entry rpc
	//can be issues if there are multiple lines in a single post... needs fix
	if (scrollPosition.y > maxScroll && scrollPosition.y != 1000000) maxScroll = scrollPosition.y;
}

function OnPlayerDisconnected (disconnectedPlayer : NetworkPlayer) {
	var currentCount = 0;
	for (var entry in playerList) {
		if (entry.playerid == disconnectedPlayer) {
			playerList.RemoveAt(currentCount);
			networkView.RPC("SendRemovePlayerName", RPCMode.Others, entry.playname);
			return;
		}
		currentCount++;
	}
}

function OnPlayerConnected (newConnectedPlayer : NetworkPlayer) {
	for (var entry in blockedPlayers) {
		if (entry == newConnectedPlayer.ipAddress) {
			Network.CloseConnection (newConnectedPlayer, false);
			return;
		}
	}
	
	for (var entry in playerList) {
		networkView.RPC("SendPlayerName", RPCMode.Others, entry.playname);
	}
}

function OnDisconnectedFromServer () {
	nameEntered = false;
	Initializing.Connected = false;
	allchat.Clear();
	playerNames.Clear();
	groupNames.Clear();
}





//RPC's starting with "Submit" are sent from a client to the server and RPC's starting with "Send" are sent from the server to a client
//since most messages/changes need to be sent from one client to another client most RPC's are in pairs, one Submit, one Send
@RPC
function SubmitEntry (tstring : String, whoTo : String, textType : int) {	
	if (whoTo == "All") {
		networkView.RPC("SendEntry", RPCMode.Others, tstring, textType);
		if (File.Exists(logFile)) {
			var writeFeed = File.AppendText(logFile);
			writeFeed.WriteLine(tstring); 
			writeFeed.Close();
		}
		else {
			var createFeed = File.CreateText(logFile);
			createFeed.WriteLine(tstring); 
			createFeed.Close();
		}
	}
	else {
		for (var entry : serverPlayerEntry in playerList) {
			if (entry.playname == whoTo) {
				networkView.RPC("SendEntry", entry.playerid, tstring, textType);
				tstring = tstring + " - " + whoTo;
				if (File.Exists(logFile)) {
					var writepFeed = File.AppendText(logFile);
					writepFeed.WriteLine(tstring); 
					writepFeed.Close();
				}
				else {
					var createpFeed = File.CreateText(logFile);
					createpFeed.WriteLine(tstring); 
					createpFeed.Close();
				}
				return;
			} 
		}
	}
}

@RPC
function SendEntry (tstring : String, tColor : int) {
	var processEntry = new EntryMsg ();
	processEntry.message = tstring;
	processEntry.dispcolor = tColor;
	allchat.Add (processEntry);	
	if (allchat.Count > 50) allchat.RemoveAt(0);
	
	//issue if there are multiple lines in a single post... needs fix
	//only pulls your view of the conversation to the new bottom if you were already looking at the bottom
	//this is so if you scroll up to read a previous post it doesn't pull you to the bottom as soon as someone else posts
	if (scrollPosition.y == maxScroll) scrollPosition.y = 1000000;
	//this will keep you at a previous post
	else if (allchat.Count == 50) scrollPosition.y -= 23;
}

@RPC
function SubmitPlayerInfo (newPlayerID : NetworkPlayer, newPlayerName : String) {
	var fullplayer = new serverPlayerEntry ();
	fullplayer.playname = newPlayerName;
	fullplayer.playerid = newPlayerID;
	playerList.Add(fullplayer);
	networkView.RPC("SendPlayerName", RPCMode.Others, newPlayerName);
}

@RPC
function SendPlayerName (newPlayerName : String) {
	if (newPlayerName != myName) {
		playerNames.Add(newPlayerName);
		playerNames.Sort();
	}
}

@RPC
function SendRemovePlayerName (disconnectedPlayerName : String) {
	var currentCount = 0;
	for (var entry in groupNames) {
		if (entry == disconnectedPlayerName) {
			groupNames.RemoveAt(currentCount);
		}
		currentCount++;
	}
	currentCount = 0;
	for (var entry in playerNames) {
		if (entry == disconnectedPlayerName) {
			playerNames.RemoveAt(currentCount);
			return;
		}
		currentCount++;
	}
}


//all rpcs below are for making/managing groups
@RPC
function SubmitInvite (senderName : String, invitedName : String) {
	for (var entry : serverPlayerEntry in playerList) {
		if (entry.playname == invitedName) {
			networkView.RPC("SendInvite", entry.playerid, senderName);
			return;
		}
	}
}

@RPC
function SendInvite (senderName : String) {
	inviter = senderName;
}

@RPC
function SubmitAcceptInvite (senderName : String, accepterName : String) {
	for (var entry : serverPlayerEntry in playerList) {
		if (entry.playname == senderName) {
			networkView.RPC("SendAcceptInvite", entry.playerid, accepterName);
			return;
		}
	}
}

@RPC
function SendAcceptInvite (accepterName : String) {
	for (var entry : String in groupNames) {
		networkView.RPC("SubmitNameInGroup", RPCMode.Server, entry, accepterName, 1);
	}
	groupNames.Add(accepterName);
	groupNames.Sort();
	var currentCount = 0;
	for (var entry in playerNames) {
		if (entry == accepterName) {
			playerNames.RemoveAt(currentCount);
			return;
		}
		currentCount++;
	}
}

@RPC
function SubmitNameInGroup (groupMemberName : String, whoNameTo : String, sendingall : int) {
	for (var entry : serverPlayerEntry in playerList) {
		if (entry.playname == whoNameTo) {
			networkView.RPC("SendNameInGroup", entry.playerid, groupMemberName, sendingall);
			return;
		}
	}
}

@RPC
function SendNameInGroup (groupMemberName : String, sendingall : int) {
	groupNames.Add(groupMemberName);
	groupNames.Sort();
	if (sendingall == 1) networkView.RPC("SubmitNameInGroup", RPCMode.Server, myName, groupMemberName, 0);
	var currentCount = 0;
	for (var entry in playerNames) {
		if (entry == groupMemberName) {
			playerNames.RemoveAt(currentCount);
			return;
		}
		currentCount++;
	}
}

@RPC
function SubmitLeaveGroup (whoNameTo : String, leaverName : String) {
	for (var entry in playerList) {
		if (entry.playname == whoNameTo) {
			networkView.RPC("SendLeaveGroup", entry.playerid, leaverName);
			return;
		}
	}
}

@RPC
function SendLeaveGroup (leaverName : String) {
	var currentCount = 0;
	playerNames.Add(leaverName);
	playerNames.Sort();
	for (var entry in groupNames) {
		if (entry == leaverName) {
			groupNames.RemoveAt(currentCount);
			return;
		}
		currentCount++;
	}
}