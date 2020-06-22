var room = HBInit();

room.pluginSpec = {
  name: `gordin/botin`,
  author: `gordin`,
  version: `1.0.0`,
  config: {
  },
  dependencies: [`sav/commands`, `sav/roles` , `hhm/persistence`],
};

let getPlayerGoalInfo;
let getPlayerAssistInfo;
var last_toucher;
var second_toucher;
let stats;
let connList;
let linkUrl;
/*
O stats guarda os dados do player usando auth como chave para garantir que só vai ter um player com esse nome e dados.
stats é um objeto definido:
		{"gordin": {"gols": 0, "assists":1, "vitorias": 1, "derrotas": 2},
		 "turtle": {"gols": 5, "assists":2, "vitorias": 5, "derrotas": 0},			
		}
docs uteis: 
https://hhm.surge.sh/api/index.html
https://github.com/saviola777/hhm-plugins/
*/

//prepara dados para página
function prepData () {
	playerList = [];
	room.getPlayerList().map(x => playerList.push(x.name));
	dados = {"stats": stats, "playersOnline": playerList, "link": linkUrl}

	return dados;
}

//posta stats no server
async function postData(url = '', data = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
     'Content-Type': 'application/json'
    },
    body: JSON.stringify(data) 
  });
}

//carrega admins "oficiais" que usam !auth
function getRoles() {
	return room.getPlugin(`sav/roles`);
}

//carrega dados persistentes
function onRestoreHandler(data, pluginSpec) {

	//se não existir nada cria 
	if (data == null) {
		data = {'stats': {} }
	}
	stats = data["stats"];
}


//salva  stats de 5 em 5 minutos e manda para db
function onPersistHandler() {
	postData('https://gfvt.herokuapp.com/stats', prepData()).then();

	let cDate = new Date(); 
	let data = `${cDate.getDate()}_${cDate.getMonth()}_${cDate.getFullYear()}` 

	const saveStats = new Blob([JSON.stringify(stats, null, 2)], {type : 'application/json'});
	haxroomie.download({ fileName: 'stats.json', file: saveStats});

	const saveChat = new Blob([JSON.stringify(chat, null, 2)], {type : 'application/json'});
	haxroomie.download({ fileName: `chat_${data}.txt`, file: saveChat});

	return {
		stats,
	}
}

//função para juntar stats de 2 players diferentes


//vê se um dos dois times está vazio
function checkTimeVazio() {
	if (getRedPlayers().length == 0 || getBluePlayers().length == 0) {
    	room.sendAnnouncement(`Um dos times está vazio, stats não serão contados.`)
    	return true
    }
}

//retorna players do time vermelho
function getRedPlayers() {
	return room.getPlayerList().filter(p  => p.team == 1);
}

//retorna players do time azul
function getBluePlayers() {
	return room.getPlayerList().filter(p  => p.team == 2);
}


//ao criar sala inicializa lista de ips vazia
function onRoomLinkHandler(link) {
	linkUrl = link;
	connList = {};
	chat = [];
}

//quando player entra 
room.onPlayerJoin = (player) => {
	//checa se ip já está na lista e kika se estiver
	if (connList[player.conn] != null) {
		room.kickPlayer(player.id, "IP já conectado!", false);
	}

	//checa se há player com mesmo nome na sala e não permite entrada se tiver
	let playerMesmoNome = room.getPlayerList().find(p  => (p.name == player.name && p.auth != player.auth));
	if (playerMesmoNome != null) {
		room.kickPlayer(player.id, "Usuário com mesmo nome já está na sala.", false);
	}

	//adiciona na lista 
	connList[player.conn] = player.name;

	//se o player nunca entrou na lista cria objeto em stats
	if (stats[player.name] == null) {
		stats[player.name] = {"gols" : 0, "assists" : 0, "vitorias": 0, "derrotas": 0};
	}
	room.sendAnnouncement(`Seja bem vindo ${player.name}, digite !stats para ver suas estatísticas.`);
}

room.onPlayerChat = (player, message) => {
	let cDate = new Date(); 
	let hora = `${cDate.getHours()}:${cDate.getMinutes()}` 
	chat.push({"nome": player.name, "msg": message, "hora": hora});
}



//quando player sai o ip dele é apagado da lista de ips
room.onPlayerLeave = (player) => {
	delete connList[player.conn]
}

//seta o último e penúltimo a tocar na bola
room.onPlayerBallKick = (player) => {
	second_toucher = last_toucher;
	last_toucher = player;
}


//quando ocorre um gol
room.onTeamGoal = (team) => {
	//se um dos dois times estiver vazios não conta
    if (checkTimeVazio()) {
    	return
    }

    //se o gol for do time do último que tocou na bola marca o gol pra ele
	if (team == last_toucher.team){
		room.sendAnnouncement(`GoOoOL!! ${last_toucher.name} é dele!!`);

		stats[last_toucher.name].gols += 1;

		//se houver um penúltimo toque o ele for de um jogador do time do marcador conta assistência
		if (second_toucher && team == second_toucher.team && second_toucher.id != last_toucher.id ){
			room.sendAnnouncement(`E o passe foi do ${second_toucher.name}!!`);
			stats[second_toucher.name].assists += 1;
		}
	}
}


//quando há uma vitória
room.onTeamVictory = (score) => {
	//se um dos dois times estiver vazios não conta	
	if (checkTimeVazio()) {
		return
	}

	let time_ganhador;
	let time_perdedor;

	let red = getRedPlayers();
	let blue = getBluePlayers();

	if (score.red > score.blue) {
		time_ganhador = red;
		time_perdedor = blue;
	}
	if (score.red < score.blue) {
		time_ganhador = blue;
		time_perdedor = red;
	}

	//salva nos stats do time perdedor
	for (var i = time_perdedor.length - 1; i >= 0; i--) {
		stats[time_perdedor[i].name].derrotas += 1;
	};

	//salva nos stats do time ganhador
	for (var i = time_ganhador.length - 1; i >= 0; i--) {
		stats[time_ganhador[i].name].vitorias += 1;
	};
}

//volta !stats
room.onCommand0_stats = (player) => {
	room.sendAnnouncement(`${player.name} || gols: ${stats[player.name].gols} ⚽ | assists: ${stats[player.name].assists} 👟 | vitórias: ${stats[player.name].vitorias} 👍 | derrotas: ${stats[player.name].derrotas} 😥`);
}

//volta stats de outro player
room.onCommand_stats = (player, playerName) => {
	if (playerName != "") {
		playerName = String(playerName).replace(/,/g," ");

		playerFind = stats[playerName]

		if (playerFind == null) {
			room.sendAnnouncement(`Usuário não encontrado 😥.` );
		} else {
			room.sendAnnouncement(`${playerName} || gols: ${playerFind.gols}  ⚽ | assists: ${playerFind.assists} 👟 | vitórias: ${playerFind.vitorias} 👍 | derrotas: ${playerFind.derrotas} 😥` );
		}
	}
}


//reseta status geral, só para admins
room.onCommand0_resetstatsall = (player) => {

	roles = getRoles()
	//checa se player é admin "oficial"
	if (roles.hasPlayerRole(player.id, "admin") == true) {
		stats = {}
		for (let i in room.getPlayerList()) {
			stats[room.getPlayerList()[i].name] = {}
			stats[room.getPlayerList()[i].name].nick = room.getPlayerList()[i].name;
			stats[room.getPlayerList()[i].name].gols = 0;
			stats[room.getPlayerList()[i].name].assists = 0;
			stats[room.getPlayerList()[i].name].vitorias = 0;
			stats[room.getPlayerList()[i].name].derrotas = 0;
		}
		room.sendAnnouncement(`Stats globais resetados com sucesso.`);
	} 
}

//reseta próprio status
//room.onCommand0_resetstats = (player) => {
//	stats[player.name].gols = 0;
//	stats[player.name].assists = 0;
//	stats[player.name].vitorias = 0;
//	stats[player.name].derrotas = 0;
//	room.sendAnnouncement(`Seus stats foram resetados com sucesso.`);
//}


//retorna top5gols
room.onCommand0_top5gols = () => {
	let count = 1;
	topSorted = Object.keys(stats).sort(function(a,b){return stats[a].gols-stats[b].gols})
	for (let i in topSorted.reverse()) {
		if (count < 6) {
			let authId = topSorted[i]
			room.sendAnnouncement(`||#${count}|| Nome: ${topSorted[i]} || Gols: ${stats[topSorted[i]].gols} ⚽`);
		}
	count += 1;
	}
}

//retorna top5 assists
room.onCommand0_top5assists = () => {
	let count = 1;
	topSorted = Object.keys(stats).sort(function(a,b){return stats[a].assists-stats[b].assists})
	for (let i in topSorted.reverse()) {
		if (count < 6) {
			let authId = topSorted[i]
			room.sendAnnouncement(`||#${count}|| Nome: ${topSorted[i]} || Assists: ${stats[topSorted[i]].assists} 👟`);
		}
		count += 1;
	}
}

//retorna top5 ganhadores
room.onCommand0_top5ganhadores = () => {
	let count = 1;
	topSorted = Object.keys(stats).sort(function(a,b){return stats[a].vitorias-stats[b].vitorias})
	for (let i in topSorted.reverse()) {
		if (count < 6) {
			let authId = topSorted[i]
			room.sendAnnouncement(`||#${count}|| Nome: ${topSorted[i]} || Vitorias: ${stats[topSorted[i]].vitorias} 👍`);
		}
		count += 1;
	}
}

//apagastats
room.onCommand_apagarstats = (player, playerName) => {
	roles = getRoles()
	if (roles.hasPlayerRole(player.id, "admin") == true) {
		if (playerName != "") {
			playerN = String(playerName).replace(/,/g," ");
			delete stats[playerN]
		}
	}
}

//transfere stats de um player para outro (para admins)
room.onCommand_transferirstats = (player, playerName) => {
	roles = getRoles()
	if (roles.hasPlayerRole(player.id, "admin") == true) {
		if (playerName != "") {
			indiceMetade = playerName.indexOf("?");
			
			if (indiceMetade != -1) {
				firstPlayerName = String(playerName.slice(0,indiceMetade)).replace(/,/g," ")
				secondPlayerName = String(playerName.slice(indiceMetade+1,playerName.length)).replace(/,/g," ")


				if (stats[firstPlayerName] == null || stats[secondPlayerName] == null) {
					room.sendAnnouncement(`Um dos users não foi encontrado.`);
				} else {
					stats[secondPlayerName].gols += stats[firstPlayerName].gols;
					stats[secondPlayerName].assists += stats[firstPlayerName].assists;
					stats[secondPlayerName].vitorias += stats[firstPlayerName].vitorias;
					stats[secondPlayerName].derrotas += stats[firstPlayerName].derrotas;
					delete stats[firstPlayerName]
					room.sendAnnouncement(`${secondPlayerName} || gols: ${stats[secondPlayerName].gols}  ⚽ | assists: ${stats[secondPlayerName].assists} 👟 | vitórias: ${stats[secondPlayerName].vitorias} 👍 | derrotas: ${stats[secondPlayerName].derrotas} 😥` );		
				}
			}
		} else {
			room.sendAnnouncement(`Um dos users não foi encontrado. Comando: !transferirstats <user1> ? <user2>`);
		} 
	}
}

//salva DB imediatamente, só para admins
room.onCommand0_savedb = (player) => {
	roles = getRoles()
	if (roles.hasPlayerRole(player.id, "admin") == true) {
			room.getPlugin("hhm/persistence").persistPluginData(room);
			room.sendAnnouncement(`DB salvo com sucesso.`);
	}
}

//configura funcoes de persistencia
room.onPersist = onPersistHandler;
room.onRestore = onRestoreHandler;


room.onRoomLink = onRoomLinkHandler;