var room = HBInit();

room.pluginSpec = {
  name: `testes/botintestes`,
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

/*
O stats guarda os dados do player usando auth como chave para garantir que só vai ter um player com esse nome e dados.
stats é um objeto definido:
		{"dd9sa8d98213j": {"nick": "gordin", "gols": 0, "assists":1, "vitorias": 1, "derrotas": 2},
		 "dja2j3i1n231n": {"nick": "turtle", "gols": 5, "assists":2, "vitorias": 5, "derrotas": 0},			
		}
docs uteis: 
https://hhm.surge.sh/api/index.html
https://github.com/saviola777/hhm-plugins/
*/

//carrega admins "oficiais" que usam !auth
function getRoles() {
	return room.getPlugin(`sav/roles`);
}

//dsadacarrega dados persistentes
function onRestoreHandler(data, pluginSpec) {
	//se não existir nada cria 
	if (data == null) {
		data = {'stats': {} }
	}

	stats = data["stats"];
}


//salva  stats de 5 em 5 minutos
function onPersistHandler() {
  return {
    stats,
  }
}


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
room.onRoomLink = (link) => {
	if (stats == null) {
		stats = {};
	}
	connList = {};
}

//quando player entra 
room.onPlayerJoin = (player) => {
	//checa se ip já está na lista e kika se estiver
	if (connList[player.conn] != null) {
		room.kickPlayer(player.id, "IP já conectado!", false);
	}

	//adiciona na lista 
	connList[player.conn] = player.name;

	//se o player nunca entrou na lista cria objeto em stats
	if (stats[player.auth] == null) {
		stats[player.auth] = {"nick": player.name, "gols" : 0, "assists" : 0, "vitorias": 0, "derrotas": 0};
	}
	room.sendAnnouncement(`Seja bem vindo ${player.name}, digite !stats para ver suas estatísticas.`);
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

		stats[last_toucher.auth].gols += 1;

		//se houver um penúltimo toque o ele for de um jogador do time do marcador conta assistência
		if (second_toucher && team == second_toucher.team && second_toucher.id != last_toucher.id ){
			room.sendAnnouncement(`E o passe foi do ${second_toucher.name}!!`);
			stats[second_toucher.auth].assists += 1;
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
		stats[time_perdedor[i].auth].derrotas += 1;
	};

	//salva nos stats do time ganhador
	for (var i = time_ganhador.length - 1; i >= 0; i--) {
		stats[time_ganhador[i].auth].vitorias += 1;
	};
}

//volta !stats
room.onCommand0_stats = (player) => {
	room.sendAnnouncement(`${player.name} || gols: ${stats[player.auth].gols} | assists: ${stats[player.auth].assists} | vitórias: ${stats[player.auth].vitorias} | derrotas: ${stats[player.auth].derrotas}`);
}

//volta stats de outro player
room.onCommand1_stats = (player, [playerName]) => {
	const playersArray = Object.keys(stats).map(i => stats[i])
	playerFind = playersArray.find(p  => p.nick == [playerName]);
	room.sendAnnouncement(`${playerFind.nick} || gols: ${playerFind.gols} | assists: ${playerFind.assists} | vitórias: ${playerFind.vitorias} | derrotas: ${playerFind.derrotas}`);
}


//reseta status geral, só para admins
room.onCommand0_resetstatsall = (player) => {

	roles = getRoles()
	//checa se player é admin "oficial"
	if (roles.hasPlayerRole(player.id, "admin") == true) {
		stats = {}
		for (let i in room.getPlayerList()) {
			stats[room.getPlayerList()[i].auth] = {}
			stats[room.getPlayerList()[i].auth].nick = room.getPlayerList()[i].name;
			stats[room.getPlayerList()[i].auth].gols = 0;
			stats[room.getPlayerList()[i].auth].assists = 0;
			stats[room.getPlayerList()[i].auth].vitorias = 0;
			stats[room.getPlayerList()[i].auth].derrotas = 0;
		}
		room.sendAnnouncement(`Stats globais resetados com sucesso.`);
	} 
}

//reseta próprio status
room.onCommand0_resetstats = (player) => {
	stats[player.auth].gols = 0;
	stats[player.auth].assists = 0;
	stats[player.auth].vitorias = 0;
	stats[player.auth].derrotas = 0;
	room.sendAnnouncement(`Seus stats foram resetados com sucesso.`);
}


//retorna top5gols
room.onCommand0_top5gols = () => {
	let count = 1;
	topSorted = Object.keys(stats).sort(function(a,b){return stats[a].gols-stats[b].gols})
	for (let i in topSorted.reverse()) {
		if (count < 6) {
			let authId = topSorted[i]
			room.sendAnnouncement(`||#${count}|| Nome: ${stats[topSorted[i]].nick} || Gols: ${stats[topSorted[i]].gols}`);
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
			room.sendAnnouncement(`||#${count}|| Nome: ${stats[topSorted[i]].nick} || Assists: ${stats[topSorted[i]].assists}`);
		}
		count += 1;
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