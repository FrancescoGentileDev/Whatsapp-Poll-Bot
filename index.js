const qrcode = require("qrcode-terminal");
const express = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js")
const { parse } = require("dotenv");
const client = new Client({
	authStrategy: new LocalAuth(),
	puppeteer: {
	//ABILITARE IN CASO SI USI UNA MACCHINA CON LINUX O IL PERCORSO DI CHROME E' NOTO
	 	//executablePath: "/usr/bin/google-chrome-stable",
		 args: ['--no-sandbox','--disable-setuid-sandbox'] 
	},
});
//#region CONNESSIONE MONGO
const mongoClient = new MongoClient(process.env.DATABASE, { useNewUrlParser: true, useUnifiedTopology: true });
async function connect() {
	await mongoClient
		.connect()
		.then(() => {
			console.log("connessione permanente avvenuta");
		})
		.catch((err) => console.log(err));
}
connect();
const databot = mongoClient.db("Bot").collection("Poll");
//#endregion

//Viene avviato un server per consentire al bot di funzionare su servizi come heroku
//#region AVVIO SERVER

const app = express();

app.get("/", (req, res) => {
	res.send("right");
});
//#endregion


client.on("qr", (qr) => {
	qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
	console.log("Client is ready!");
});

client.on("message", async (message) => { //POLL
	var chat = await message.getChat();
	var contact = await message.getContact();
	let par = message.body.split(" ");
	if(chat.isGroup)
	{
	if (message.body.startsWith("!poll")) {

		databot.findOne({ sended: chat.id._serialized}, (err, result) => {  

			if (!result) {
				var domanda = message.body
					.split(/(?:.*-d|-r.*)/gm)
					.filter((value, index) => {
						return value != "";
					})
					.toString();
					/**Contiene le risposte del poll */
				var risposta = message.body
					.split(/(?:.*-r|-d.*)/gm)
					.filter((value, index) => {
						return value != "";
					})
					.toString()
					.split(",");
				if (domanda === message.body || message.body === "!poll")
				chat.sendMessage(`Per poter avviare un sondaggio usa !poll.

La domanda deve essere preceduta da "-d". 

Le risposte devono essere precedute da "-r" e separate da una virgola.

*esempio: !poll -d Domani Usciamo? -r Si, No, Non ci sono*`)
				else {
					console.log(domanda, risposta[0])
					if(domanda.trim()==="!poll"||risposta[0].trim()==="!poll")
					chat.sendMessage(`Per poter avviare un sondaggio usa !poll.

La domanda deve essere preceduta da "-d". 
          
Le risposte devono essere precedute da "-r" e separate da una virgola.
          
*esempio: !poll -d Domani Usciamo? -r Si, No, Non ci sono*`)

					else
					newpoll(domanda, risposta, contact.id._serialized, chat);
				}

			}
		else chat.sendMessage("Può esserci solo un sondaggio nel gruppo")

		});
	}
//-----------------VOTE----------------------------------//
	else if(message.body.startsWith("!vote ")){
	var vote = message.body.substring(5, message.body.length).trim().toLowerCase()

/**Serve per trovare un match con il voto inviato */
  var right = false;
	await databot.findOne({sended: chat.id._serialized},(err,poll) => {
    if(poll) {
		/**Trasforma il voto sempre nella sua variabile numerica */
		var formatVote;
		poll.risposte.forEach((value, index)=>{
    
		if(vote===index.toString()){
			formatVote= index
			right = true
		}
		else if(vote===value.name){
			formatVote= index
			right = true
		}
		})
		
	 var stringVoter = `voter.${contact.id.user}`
	 var stringVote = `risposte.${formatVote}.vote`
  
	if(!poll.voter[contact.id.user].isVote&&vote!==""&&right===true)
	{
		
		databot.updateOne({sended: chat.id._serialized},{$set: {[stringVoter]: {isVote: true, whoVote: formatVote} }, $inc: {[stringVote]: 1}})
		.then(()=> {
		riepilogo(chat,false,false)
		})
		
	}
  else if(poll.voter[contact.id.user].isVote&&right===true) {
		var oldvote = poll.voter[contact.id.user].whoVote
		var oldstringVote = `risposte.${oldvote}.vote`
		if(oldvote!==formatVote)
		databot.updateOne({sended: chat.id._serialized},{$set: {[stringVoter]: {isVote: true, whoVote: formatVote} }, $inc: {[stringVote]: 1,[oldstringVote]: -1}})
			.then(()=> {
					riepilogo(chat,true,false)
			})
		else {	
			chat.sendMessage(`@${contact.id.user} Hai già votato questa opzione`, { mentions: [contact] })
		}
	}
  else if(!right){
  chat.sendMessage(`*Opzione non valida*`)
	riepilogo(chat,false,false)
}
	else  chat.sendMessage(`*Per votare usa !vote.*
*esempio: !vote ${poll.risposte[0].name} | oppure !vote 0*`)

  }
	else chat.sendMessage("Nessun Sondaggio attivo")
	})
	}

	else if(message.body.startsWith("!riepilogo")&&chat.isGroup){
		
		var list={}
		var totalvoter=0;
		var voterJust=0;
		var notVoterCount=0;
		databot.findOne({sended: chat.id._serialized},async (err,result) => {

		if(result) {
				
	  
		  for(var i = 0; i< result.risposte.length;i++){
			list= {...list, [i]: []}
			}
			list= {...list, "notVote": []}
		  for(const elem in result.voter) {
			totalvoter++
			if(result.voter[elem].whoVote!== -1){
			  voterJust++
			  var listcpy = list[result.voter[elem].whoVote]
			  listcpy.push(elem)
			  list= {...list, [result.voter[elem].whoVote]: listcpy}
			}
			else {
			 notVoterCount++
			  var notcpy= list.notVote;
			  notcpy.push(elem)
			  list= {...list, notVote: notcpy}
			  }
		  }
		  var string= `
_*${result.domanda}*_
👥 Hanno votato: ${voterJust}

`
		  for(var i = 0; i< result.risposte.length;i++){
			string+= `
➡${result.risposte[i].name} voti ${list[i].length}: 
`
			for(var j= 0; j< list[i].length; j++) {
			 string+=`@${list[i][j]}
`
			}
			
		  }
		  string+=`
❌Non hanno ancora votato: ${notVoterCount}
`
		  for(var i= 0; i<list.notVote.length;i++) {
			string+=`@${list.notVote[i]}
`
		  }

		  var mentions=[];
		  for(let participant of chat.participants) {
            const contact = await client.getContactById(participant.id._serialized);
            mentions.push(contact);
		  }
		  console.log(contact)
		  chat.sendMessage(string,{
			mentions
		})
		
		}
		else
		 chat.sendMessage("Nessun sondaggio a cui fare riepilogo")
		})
	  





	}
	else if(message.body.startsWith("!endpoll")&&chat.isGroup){
		var admin = chat.groupMetadata.participants.find(element=> element.id.user===contact.id.user)
		databot.findOne({sended: chat.id._serialized}, (err, result) => {
			if(result)
			{
				if(admin.isAdmin||result.creator===contact.id._serialized)
				{
				chat.sendMessage("*RISULTATI:*")
				riepilogo(chat,false,true)
				databot.deleteOne(result)
			}
			}
			else
			chat.sendMessage("Non puoi terminare nessun sondaggio")
		})
}
else if(message.body.startsWith("!ridomanda")&&chat.isGroup){
	databot.findOne({sended: chat.id._serialized}, (err, result) => {

	if(result)
	chat.sendMessage(
`
_*${result.domanda}*_${result.risposte.map((value, index) => {
return `

➡ *${index}: ${value.name}* `
})}

*Per votare usa !vote.*
*esempio: !vote ${result.risposte[0].name} | oppure !vote 0*`
		)
	else
		chat.sendMessage("Nessun sondaggio in corso")	
	})
}

}
});

function newpoll(domanda, risposta, message, chat) { //NEWPOLL

	/**Persone nel gruppo che votano il poll */
	var voter;
	chat.groupMetadata.participants.forEach((value, index) => {
		if(value.id.user!=="xxxxxxxxxx")// <= inserisci il numero da utilizzare sul bot
		voter = { ...voter, [value.id.user]: {isVote: false, whoVote: -1} };
	});

	
	var obj = {
		creator: message,
		sended: chat.id._serialized,
		domanda: domanda.trim(),
		risposte: [],
		voter: voter,
	};

  
	risposta.forEach((value, index) => {
    if(value.trim()!=="")
		obj.risposte.push({name: value.trim().toLowerCase(), vote:0});
	});
	databot.insertOne(obj);
	chat.sendMessage(
`NUOVO SONDAGGIO!

_*${obj.domanda}*_${obj.risposte.map((value, index) => {
return `

➡ *${index}: ${value.name}* `
})}
		
*Per votare usa !vote.*
*esempio: !vote ${obj.risposte[0].name} | oppure !vote 0*`)
}

function riepilogo(chat, check, end) { //RIEPILOGO
	databot.findOne({sended: chat.id._serialized}, (err ,res )=> {
		if(res) {
		var sum=0;
		res.risposte.forEach((value, index)=> {
			sum+=value.vote
		})
		var per=[]

		var temp=0
		if(sum!==0) 
		temp = 100/sum;

		res.risposte.forEach((value, index)=> {
			per.push({media: parseInt(temp*value.vote), name: value.name})
		})
		var string="";
		
		if(check) {
			string+=`Hai cambiato voto!
`
}
string+=`_*${res.domanda}*_
👥 Hanno votato: ${sum}.

`; 
		per.forEach((value, index)=> {
string+=`${index}: ${value.name} - ${res.risposte[index].vote}
`
			for (let i = 0; i < value.media/10; i++) {
		if(parseInt(value.media/10)>0)
				string +=`👍`
		else
		string+= "▫"
			}
			string += ` ${value.media}%

`
		})
		if(end)
			string+= "*SONDAGGIO TERMINATO*"
		else
		string+= `*Per votare usa !vote.*
*esempio: !vote ${per[0].name} | oppure !vote 0*`

		chat.sendMessage(string)
	}
	else chat.sendMessage("Nessun sondaggio, nessun riepilogo")
	})
}




/*
client.on("message",async message => {
	var chat= await message.getChat();
	if(message.body.startsWith("!")){
	chat.sendMessage("")
}})
 */
client.initialize();
app.listen(8080, () => {
	console.log("app listening on port" + process.env.PORT);
});
