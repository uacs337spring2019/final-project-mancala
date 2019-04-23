/**
Gavin Magee
4/19/19
CSc 337

This file is used for the server side javascript node
code that will be giving back board and lobby data
to whoever asks for it.  Moving a boardId at a certain
index on behalf of the user is also handled in this
file.  All board, boardId, readyPlayers, etc is stored
by this javascript code inside of the file boards.txt,
while updated versions of the gameboard are also sent
back to the request so waiting for the updated gameboard
is not as prevalent.

File Dependencies:
mancala.js
mancala.html
mancala.css
boards.txt
app.json
package.json
*/

(function(){
	"use strict";

	const express = require("express");
	const app = express();
	app.use(express.static(__dirname));
	
	const fs = require("fs");

	/**
	Parameters:
		readyPlayers = list of players currently readied up
		boardId = current board id (integer) not in use
		readyPlayersSent = number of players sent to play mode
		boards = list of all board json strings

	Returns: NA

	This function writes all of the parameters listed above to
	the file boards.txt so that, instead of having persisting
	data on the web service that would be lost if the service
	went down, we get the data from the file, modify and read
	from it, then save it each time we make a request to the
	site (much better style than the globals I had before).
	*/
	function saveData(readyPlayers, boardId, readyPlayersSent, boards){
		let readyPlayersJson = {playersReady: readyPlayers};
		let result = "";
		result += JSON.stringify(readyPlayersJson) + "\n";
		result += boardId + "\n";
		result += readyPlayersSent + "\n";
		for (let j = 0; j < boards.length; j++){
				result += boards[j] + "\n";
		}
		fs.writeFileSync("boards.txt", result);
	}

	/**
	Parameters:
		index = integer holding the index being moved
		board = the board on which we are moving the index

	Returns: an object holding an updated board as well as
	whose turn it is.

	This function moves all of the board pieces at the given
	index (incrementing 1 of the pieces into sequential pockets
	until there are no more pieces left).  After this is
	done the new board is returned.
	*/
	function moveIndex(index, board){
		let pieces = board[index];
		let currIsPlayer1;
		if (index > 0 && index < 7){
			currIsPlayer1 = true;
		}else{
			currIsPlayer1 = false;
		}
		board[index] = 0;
		while (pieces > 0) {//each iteration represents one piece placed
			index = (index + 1) % 14;
			if (pieces == 1 && board[index] == 0 && currIsPlayer1 &&
					1 <= index && index <= 6) {//piece capturing opposite
				board[index] += 1;
				board[7] += board[14 - index];
				board[14 - index] = 0;
				pieces -= 1;
			} else if (pieces == 1 && board[index] == 0 && !currIsPlayer1 && 8 <= index
					&& index <= 13) {//piece capturing opposite
				board[index] += 1;
				board[0] += board[14 - index];
				board[14 - index] = 0;
				pieces -= 1;
			}else if (currIsPlayer1 && index != 0) {//normal player 1 move
				board[index] += 1;
				pieces -= 1;
			}else if (!currIsPlayer1 && index != 7){// normal player 2 move
				board[index] += 1;
				pieces -= 1;
			}
		}
		if (index != 7 && currIsPlayer1) {//player 1 to player 2
			currIsPlayer1 = !currIsPlayer1;//switch player turns
		} else if (index != 0 && !currIsPlayer1) {// player 2 to player 1
			currIsPlayer1 = !currIsPlayer1;//switch player turns
		}
		return {board: board, currIsPlayer1: currIsPlayer1};
	}

	/**
	Parameters:
		readyPlayers = list of players currently readied up
		boardId = current board id (integer) not in use
		readyPlayersSent = number of players sent to play mode
		boards = list of all board json strings
		res = response that we are giving to the requester
		params = params passed in through the fetch request

	Returns: NA

	This function is called everytime a player presses the readyUp
	button in order to put their name into the readyUp list to keep
	track of them.  As soon as we get two players who are readied up
	then we send them both to gamemode to verse each other.
	*/
	function readyUp(readyPlayers, boardId, readyPlayersSent, boards, res, params){
		if (!readyPlayers.includes(params.username)){
			readyPlayers.push(params.username);
		}
		if (readyPlayers.length == 2){
			let otherPlayer = "";
			if (readyPlayers[0] == params.username){
				otherPlayer = readyPlayers[1];
			}else{
				otherPlayer = readyPlayers[0];
			}
			let gameData = {
				playerNo: readyPlayers.indexOf(params.username) + 1,
				other: otherPlayer,
				boardNo: boardId,
				currBoard: [0, 4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4],
				myTurn: readyPlayers.indexOf(params.username)
			};
			readyPlayersSent += 1;
			if (readyPlayersSent == 2){
				readyPlayers = [];
				readyPlayersSent = 0;
				boardId += 1;
			}
			saveData(readyPlayers, boardId, readyPlayersSent, boards);
			res.send(JSON.stringify(gameData));
		}else{
			saveData(readyPlayers, boardId, readyPlayersSent, boards);
			res.send("wait");
		}
	}

	/**
	Parameters:
		readyPlayers = list of players currently readied up
		boardId = current board id (integer) not in use
		readyPlayersSent = number of players sent to play mode
		boards = list of all board json strings
		res = response that we are giving to the requester
		params = params passed in through the fetch request

	Returns: NA

	This function is called everytime the request makes a move at a given index.
	The boardId is used to fetch the players board which is then moved at the
	given index by making a call to moveIndex.  The updated board information
	is sent back to the user AND saved in the boards.txt.
	*/
	function makeMove(readyPlayers, boardId, readyPlayersSent, boards, res, params){
		//move made
		let found = false;
		let newGameData = {};
		for (let i = 0; i < boards.length; i++){
			let currBoard = JSON.parse(boards[i]);
			if (currBoard.id == params.boardId){
				//board already made
				let moveData = moveIndex(parseInt(params.index), currBoard.board);
				currBoard.board = moveData.board;
				currBoard.currIsPlayer1 = moveData.currIsPlayer1;
				newGameData.currIsPlayer1 = moveData.currIsPlayer1;
				newGameData.board = moveData.board;
				found = true;
				boards[i] = JSON.stringify(currBoard);
			}
		}
		if (!found){
			//new board being made
			let newBoard = {
				id: params.boardId,
				board: [0, 4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4]
			};
			let moveData = moveIndex(parseInt(params.index), newBoard.board);
			newBoard.board = moveData.board;
			newBoard.currIsPlayer1 = moveData.currIsPlayer1;
			newGameData.currIsPlayer1 = moveData.currIsPlayer1;
			newGameData.board = moveData.board;
			boards.push(JSON.stringify(newBoard));
		}
		saveData(readyPlayers, boardId, readyPlayersSent, boards);
		res.send(JSON.stringify(newGameData));
	}

	/**
	Parameters:
		readyPlayers = list of players currently readied up
		boardId = current board id (integer) not in use
		readyPlayersSent = number of players sent to play mode
		boards = list of all board json strings
		res = response that we are giving to the requester
		params = params passed in through the fetch request

	Returns: NA

	This function is called every few seconds by a player who wants the updated
	board information (which is retrieved by looking through the boards stored
	in the text file until one is found with the same boardId that the user gave).
	This updated board information is then sent back to the user in JSON format.
	*/
	function requestBoard(readyPlayers, boardId, readyPlayersSent, boards, res, params){
		//requesting board information
		let found = false;
		let newGameData = {	};
		for (let i = 0; i < boards.length; i++){
			let currBoard = JSON.parse(boards[i]);
			if (currBoard.id == parseInt(params.boardId)){
				//board already made
				newGameData.currIsPlayer1 = currBoard.currIsPlayer1;
				newGameData.board = currBoard.board;
				found = true;
			}
		}
		if (!found){
			saveData(readyPlayers, boardId, readyPlayersSent, boards);
			res.send("nothing new");
		}else{
			saveData(readyPlayers, boardId, readyPlayersSent, boards);
			res.send(JSON.stringify(newGameData));
		}
	}

	/**
	Parameters:
		req = var holding data about the request
		res = var holding data about what we send back to the person who made the request.

	Returns: NA

	This function uses the parameters of the get request to see what kind of request
	it is and makes calls to the appropriate functions based on those parameters
	who send back the appropriate data (and write to the file all updated info).
	This is called everytime a get request is made to the page.
	*/
	app.get("/", function(req, res){
		res.header("Access-Control-Allow-Origin", "*");
		let fileInitial = fs.readFileSync("boards.txt", "utf8");
		let serverData = fileInitial.slice(0, fileInitial.length - 1).split("\n");

		let readyPlayers = JSON.parse(serverData[0]).playersReady;
		let boardId = parseInt(serverData[1]);
		let readyPlayersSent = parseInt(serverData[2]);
		let boards = serverData.slice(3, serverData.length);

		let params = req.query;
		if (parseInt(params.getReadyPlayers)){
			saveData(readyPlayers, boardId, readyPlayersSent, boards);
			res.send(JSON.stringify({readyPlayers: readyPlayers}));
		}else if (parseInt(params.readyUp)){
			readyUp(readyPlayers, boardId, readyPlayersSent, boards, res, params);
		}else if (params.playing == "1"){
			makeMove(readyPlayers, boardId, readyPlayersSent, boards, res, params);
		}else if (params.playing == "2"){
			requestBoard(readyPlayers, boardId, readyPlayersSent, boards, res, params);
		}else{
			let sendData = {
				readied: readyPlayers
			};
			saveData(readyPlayers, boardId, readyPlayersSent, boards);
			res.send(JSON.stringify(sendData));
		}
	});

	app.listen(process.env.PORT);
})();
