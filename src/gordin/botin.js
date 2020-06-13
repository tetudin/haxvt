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
	postData('https://gfvt.herokuapp.com/stats', stats).then();
	stats = {"4XUCU5y42YIhE2Sbx536xhVgtr8s7kXSPI6UxdrbOFw":{"nick":"gordeta","gols":15,"assists":10,"vitorias":11,"derrotas":29},"fOlZXv3iOVgpX_mN_osyyE1q761Di23oPEGP78_yiTE":{"nick":"ll","gols":0,"assists":0,"vitorias":0,"derrotas":0},"-cVd6p2jMvqOxPUM414zn2daZoW5wGIE63s4cBHSaHA":{"nick":"wowo","gols":0,"assists":0,"vitorias":0,"derrotas":0},"lYOy3rYLxzqv6AcBa34S32eiRKD9MYIzCHq9SVPstKo":{"nick":"turtle","gols":69,"assists":9,"vitorias":40,"derrotas":18},"PF8zcZi_tCakTUH9BGEXsF85XeQGz7lLQB5LmcaxztA":{"nick":"sou ruim","gols":34,"assists":20,"vitorias":34,"derrotas":30},"Z3Nl99Cm5zOJTVd6zcG8YPAF62QEUFeyRP6iBdKWWeI":{"nick":"comunismo já","gols":8,"assists":4,"vitorias":4,"derrotas":6},"NdoP4pyGSEbRK1Mb_xcObjPvvzo1RYPkeJgC0BRJhyU":{"nick":"gozz","gols":7,"assists":6,"vitorias":18,"derrotas":37},"IvytYaNT8PFFwaJIq1U4FPJuB3mZOv9Kzw9R8ghL0oA":{"nick":"TENHO CINCO MINUTOS SÓ","gols":4,"assists":1,"vitorias":2,"derrotas":0},"CCxAngR3OaLl2Ut9rDWb1lf3utNf0L-neYf6B_CDoEI":{"nick":"boladneve","gols":10,"assists":3,"vitorias":14,"derrotas":8},"cOSS1K_ceCGK7FXN6HKhC8_PGOJFf-UcVbcfDTF8tN0":{"nick":"BRUNO_TATTAGLIA_9","gols":40,"assists":3,"vitorias":16,"derrotas":20},"KicwsUi9Veeuj4hxwJX4xEkWA6lzApKbizgC3PqHH7g":{"nick":"haxboleiro atuante","gols":2,"assists":1,"vitorias":5,"derrotas":11},"VJUzDYkUkjnE1vjj439vIf82wcb9VG0BW-jlMa4l6oo":{"nick":"gambler","gols":5,"assists":9,"vitorias":14,"derrotas":2},"QeTO-2Yb-VWqhq-kQ6nwtkT8O4tMoHOnl6_XT3VuWXM":{"nick":"Fernando Torres","gols":0,"assists":0,"vitorias":0,"derrotas":2},"hH-Afp0ZTOJqjNQ44ChSGwypyj2T1mDWxhQ5VWkDDcc":{"nick":"iaxxx","gols":2,"assists":0,"vitorias":5,"derrotas":1},"0Nqourfe3OgC9lmHJWsXz2kMsS4efknmuFTVHwqg1wA":{"nick":"tonysk8","gols":0,"assists":0,"vitorias":0,"derrotas":0}}
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
function onRoomLinkHandler() {
	connList = {}
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

	//se player apenas mudou nick muda também no stats
	if (stats[player.auth] != null && (stats[player.auth].nick != player.name)) {
		room.sendAnnouncement(`${player.name} seu nick antigo era ${stats[player.auth].nick} e foi atualizado.`);
		stats[player.auth].nick = player.name;
	}


	//adiciona na lista de ips
	connList[player.conn] = player.name;

	room.sendAnnouncement(`Seja bem vindo ${player.name}, digite !stats para ver suas estatísticas.`);

	//verifica se há player antigo com menos nome
	let playersArray = Object.keys(stats).map(i => stats[i])
	let playerFind = playersArray.find(p  => p.nick == player.name);


	//se há player antigo com mesmo nome então o stats antigos passam a ser do auth atual
	if (playerFind != null) {
		let authAntigo = Object.keys(stats).find(key => stats[key] === playerFind);
		delete stats[authAntigo]
		stats[player.auth] = playerFind;
	} 
	//se não há player antigo cria um novo valor em stats
	else {
		stats[player.auth] = {"nick": player.name, "gols" : 0, "assists" : 0, "vitorias": 0, "derrotas": 0};
	}

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
	room.sendAnnouncement(`${player.name} || gols: ${stats[player.auth].gols} ⚽ | assists: ${stats[player.auth].assists} 👟 | vitórias: ${stats[player.auth].vitorias} 👍 | derrotas: ${stats[player.auth].derrotas} 😥`);
}

//volta stats de outro player
room.onCommand_stats = (player, playerName) => {
	if (playerName != "") {
		playerName = String(playerName).replace(/,/g," ");

		const playersArray = Object.keys(stats).map(i => stats[i])
		playerFind = playersArray.find(p  => p.nick == playerName);

		if (playerFind == null) {
			room.sendAnnouncement(`Usuário não encontrado 😥.` );
		} else {
			room.sendAnnouncement(`${playerFind.nick} || gols: ${playerFind.gols}  ⚽ | assists: ${playerFind.assists} 👟 | vitórias: ${playerFind.vitorias} 👍 | derrotas: ${playerFind.derrotas} 😥` );
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
			room.sendAnnouncement(`||#${count}|| Nome: ${stats[topSorted[i]].nick} || Gols: ${stats[topSorted[i]].gols} ⚽`);
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
			room.sendAnnouncement(`||#${count}|| Nome: ${stats[topSorted[i]].nick} || Assists: ${stats[topSorted[i]].assists} 👟`);
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
			room.sendAnnouncement(`||#${count}|| Nome: ${stats[topSorted[i]].nick} || Vitorias: ${stats[topSorted[i]].vitorias} 👍`);
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


room.onRoomLink = onRoomLinkHandler;