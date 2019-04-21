/**
Gavin Magee
4/19/19
CSc 337
*/
(function(){
	"use strict";

	let readyPlayers = [];
	let boardId = 0;
	let readyPlayersSent = 0

	const express = require("express");
	const app = express();
	app.use(express.static("public"));

	const fs = require("fs");


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
			if (pieces == 1 && board[index] == 0 && currIsPlayer1 && 1 <= index && index <= 6) {//piece capturing opposite
				board[index] += 1;
				board[7] += board[14 - index];
				board[14 - index] = 0;
				pieces -= 1;
			} else if (pieces == 1 && board[index] == 0 && !currIsPlayer1 && 8 <= index && index <= 13) {//piece capturing opposite
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

	app.get("/", function(req, res){
		res.header("Access-Control-Allow-Origin", "*");
		let params = req.query;
		if (parseInt(params.readyUp)){
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
				res.send(JSON.stringify(gameData));
			}else{	
				res.send("wait");
			}
		}else if (params.playing == "1"){
			//move made
			let found = false;
			let newGameData = {	};
			let file = fs.readFileSync("boards.txt", "utf8")
			console.log(file);
			let boards = file.slice(0, file.length - 1).split("\n");
			if (boards[0] == ""){
				boards = [];
			}
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
			let result = ""
			for (let j = 0; j < boards.length; j++){
				result += boards[j] + "\n"
			}
			fs.writeFileSync("boards.txt", result);
			res.send(JSON.stringify(newGameData));
		}else if (params.playing == "2"){
			//requesting board information
			let found = false;
			let newGameData = {	};
			let file = fs.readFileSync("boards.txt", "utf8")
			let boards = file.slice(0, file.length - 1).split("\n");
			if (boards[0] == ""){
				boards = [];
			}
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
				res.send("nothing new");
			}else{
				res.send(JSON.stringify(newGameData));
			}
		}else{
			let sendData = {
				readied: readyPlayers
			};
			res.send(JSON.stringify(sendData));
		}
	});

	app.listen(3000);
})();




































































