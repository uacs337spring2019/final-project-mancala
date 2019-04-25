/**
Gavin Magee
4/19/19
CSc 337

This file is used for the client side javascript
code for the mancala page final project.  All of the
button clicking and mouse hovering over a moveable
mancala pocket is handled in this file, while requests
are made from this file to the mancala_service.js file
which stores all board data corresponding to a given boardId
stored by the user.  This boardId is initially given to a pair
of users who join the game and iwll be used by those users to
request their most up to date version of their board throughout
the match.  The server must dish out these board ids so that we guarantee
that every pair of players has a distinct boardId.  All scene changes
from playing to homescreen to lobby screen are handled inside of this file and changed by user.

File Dependencies:
mancala_service.js
mancala.html
mancala.css
boards.txt
app.json
package.json 
*/

(function(){
	"use strict";

	let bestMove = -1;
	let currCircle = -1;
	let username;
	let gameData;
	let readyInterval = null;
	let playInterval;
	let lobbyInterval;
	
	/**
	Parameters: 
		event = holds the mouse x and y location so we can check if it
		is over a circle.

	Returns: NA

	This function is called everytime we move to get the current circle that
	we are hovering over if any.  We then redraw the board with the updated
	currCircle.
	*/
	function checkMouse(event){
		let canvas = document.getElementById("gameboard");
		let rect = canvas.getBoundingClientRect();

		let found = false;
		let mouseX = event.x - rect.left;
		let mouseY = event.y - rect.top;
		let y = 250;
		let i = 0;
		while (i < 12 && !found){
			let x = 100 * (i % 6) + 150;
			//pythagorean theorem to determine if mouse in circle
			let mouseFromCenter = Math.pow(Math.pow(mouseX - x,2) + Math.pow(mouseY - y,2), .5);
			if (mouseFromCenter <= 40){
				//curr xy circle being hovered over!
				//record the index
				if (i > 5){
					currCircle = 13 - (i - 6);
				}else{
					currCircle = i % 6 + 1;
				}
				found = true;
			}
			//change to drawing top pockets
			if (i == 5){
				y = 150;
			}
			i++;
		}
		if (!found){
			currCircle = -1;
		}
		drawBoard();
	}

	/**
	Parameters: 
		i = integer holding which circle we are drawing.
		y = y level that we are drawing circle at (changes twice).
		ctx = graphics context to draw on

	Returns: y so that if it is updated we know it and can store it.

	This function draws a circle on the game board (as well as the pieces
	on that circle).  The circle is red if it is being selected and is
	a viable move option at that point in time, otherwise it is a
	gray(ish) color.
	*/
	function drawCircle(i, y, ctx){
		let x = 100 * (i % 6) + 150;
		if ((i >  5 && ((bestMove == 13 - (i - 6)) || (currCircle == 13 - (i - 6) &&
				gameData.playerNo == 2 && gameData.myTurn && 
				gameData.currBoard[currCircle] != 0))) ||
				(i <= 5 && currCircle == i % 6 + 1    && gameData.playerNo == 1
				&& gameData.myTurn && gameData.currBoard[currCircle] != 0)){
			ctx.fillStyle = "red";
		}else{
			ctx.fillStyle = "#799496";
		}
		ctx.beginPath();
		ctx.arc(x, y, 40, 0, 2 * Math.PI);
		ctx.fill();
		//put in pieces
		let circ;
		if (i > 5){
			circ = 13 - (i - 6);
		}else{
			circ = i % 6 + 1;
		}
		ctx.fillStyle = "black";
		ctx.font = "20px Arial";
		let pocketPieces = "0" + gameData.currBoard[circ];
		ctx.fillText(pocketPieces.slice(pocketPieces.length - 2,
			pocketPieces.length) + "", x-10, y + 10);
		//change to drawing top pockets
		if (i == 5){
			y = 150;
		}
		return y;
	}

	/**
	Parameters / Returns: NA

	This function is called everytime something could have
	changed to the boards appearance to redraw literally
	everything on the board.
	*/
	function drawBoard(){
		let canvas = document.getElementById("gameboard");
		let ctx = canvas.getContext("2d");
		ctx.clearRect(0,0,800,400);
		let y = 250;
		//draw all 6 pockets with the power of mod
		for (let i = 0; i < 12; i++){
			y = drawCircle(i, y, ctx);
		}
		//draw the mancalas for both players
		ctx.fillStyle = "#799496";
		ctx.fillRect(10, 10, 80, 380);
		ctx.fillRect(710, 10, 80, 380);
		ctx.fillStyle = "black";

		let p2Score = "0" + gameData.currBoard[0];
		let p1Score = "0" + gameData.currBoard[7];
		ctx.fillText(p2Score.slice(p2Score.length - 2, p2Score.length), 40, 200);
		ctx.fillText(p1Score.slice(p1Score.length - 2, p1Score.length), 740, 200);
	}

	/**
	Parameters / Returns: NA

	This function is called on an interval once a player is playing
	in human mode and hits the ready up button in the lobby.  Once
	this occurs, a timer is set to check if there are two players who
	are ready and if there are then those players are matched against
	one another.  If two players are not in the queue then the player
	inside of the queue must wait.
	*/
	function readyUp(){
		//add user to readied players table
		let url = "https://gavin-test-m.herokuapp.com?readyUp=1&username=" + username + "&playing=0";
		fetch(url)
			.then(checkStatus)
			.then(function(responseText){
				console.log(responseText);
				if (responseText != "wait"){
					//start game
					gameData = JSON.parse(responseText);
					drawBoard();
					document.getElementById("vs").innerHTML = username + " Vs. " + gameData.other;
					document.getElementById("lobbyscreen").className = "hidden";
					document.getElementById("playscreen").className = "shown";
					document.getElementById("winscreen").className = "hidden";
					clearInterval(readyInterval);
					clearInterval(lobbyInterval);
					readyInterval = null;
					playInterval = setInterval(getGameData, 1000);
				}
			})
			.catch(function(error){
				console.log(error);
			});
		if (readyInterval == null){
			readyInterval = setInterval(readyUp, 1000);
		}
	}


	/**
	Parameters:
		board = list whose side is being summed up
		side = boolean whose value tells which side to sum

	Returns: The sum of all of the integers on the specified list side.

	This function iterates over board and, based on what side is
	specified as the desired side to sum up, sums up that side.
	What I have written above sums it up.
	*/
	function sumSide(board, side){
		let i;
		if (side){
			i = 1;
		}else{
			i = 8;
		}
		let sum = 0;
		for (let j = 0; j < 6; j++){
			sum += board[j + i];
		}
		return sum;
	}

	/**
	Parameters / Returns: NA

	This function is called everytime a human player makes a move
	so that we can update the board at the given move index and
	return the new board to be stored in gameData.
	*/
	function movePiece(){
		if (currCircle > 0 && currCircle < 7 && gameData.playerNo == 1 &&
				gameData.myTurn && gameData.currBoard[currCircle] != 0||
				currCircle > 7 && currCircle <= 13 && gameData.playerNo == 2
				&& gameData.myTurn && gameData.currBoard[currCircle] != 0){
			let url = "https://gavin-test-m.herokuapp.com?readyUp=0&playing=1&boardId=" +
					gameData.boardNo + "&index=" + currCircle;
			fetch(url)
				.then(checkStatus)
				.then(function(responseText){
					console.log(responseText);
					let newData = JSON.parse(responseText);
					gameData.currBoard = newData.board;
					if (newData.currIsPlayer1){
						if (gameData.playerNo == 1){
							gameData.myTurn = 1;
						}else{
							gameData.myTurn = 0;
						}
					}else{
						if (gameData.playerNo == 1){
							gameData.myTurn = 0;
						}else{
							gameData.myTurn = 1;
						}
					}
				})
				.catch(function(error){
					console.log(error);
				});
		}
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
			if (pieces == 1 && board[index] == 0 &&
					currIsPlayer1 && 1 <= index && index <= 6) {//piece capturing opposite
				board[index] += 1;
				board[7] += board[14 - index];
				board[14 - index] = 0;
				pieces -= 1;
			} else if (pieces == 1 && board[index] == 0 && 
					!currIsPlayer1 && 8 <= index && index <= 13) {//piece capturing opposite
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
	Parameters: board is the board being duped

	Returns: the new object of the duped board

	This function is called by minimax to
	dupe the boards in order to get a new board
	to simulate what if scenarios for move placement. 
	*/
	function clone(board) {
		let newBoard = [];
		for (let i = 0; i < 14; i++) {
			newBoard[i] = board[i];
		}
		return newBoard;
	}

	/**
	Parameters: 
		maxDepth = how many moves we want to look ahead
		board = starting board where all possible moves are spawned from
		updateBestMove = boolean on whether or not we update bestMove

	Returns: Recursively passes up the score received by subtracting
	the player2 mancala from the player 1 mancala

	This function recursively finds the best move to make given
	a certain board setup using the minimax algorithm.  bestMove
	holds the updated integer representing the index to move at
	in order to receive the most likely outcome for winning.
	*/
	function miniMax(maxDepth, board, updateBestMove) {
		if (sumSide(board.board, true) == 0 || 
				sumSide(board.board, false) == 0 || maxDepth == 0) {
			return board.board[7] - board.board[0];
		}
		else if (board.currIsPlayer1) {
			let max = -1000000;
			for (let i = 1; i <= 6; i++) {
				if (board.board[i] != 0) {
					let child = moveIndex(i, clone(board.board));
					let val = miniMax(maxDepth - 1, child,false);
					if (val > max) {
						max = val;
					}
				}
			}
			return max;
		}else {
			let min = 1000000;
			for (let i = 8; i <= 13; i++) {
				if (board.board[i] != 0) {
					let child = moveIndex(i, clone(board.board));
					let val = miniMax(maxDepth - 1, child,false);
					if (val < min) {
						min = val;
						if (updateBestMove) {
							bestMove = i;
						}
					}
				}
			}
			return min;
		}
	}

	/**
	Parameters:
		p1Sum/p2Sum = the sums of both player sides

	Returns: NA

	This function figures out the win message to display
	after the game has ended for two PEOPLE playing each other.
	The lobby screen is displayed after the game ends and all other screens
	are hidden.
	*/
	function humanEndGame(p1Sum, p2Sum){
		gameData.currBoard[7] += p1Sum;
		gameData.currBoard[0] += p2Sum;
		if (gameData.currBoard[0] > gameData.currBoard[7] && gameData.playerNo == 2){
			//player 2 has won
			document.getElementById("winner").innerHTML = username + " Has Won!";
			document.getElementById("score").innerHTML = gameData.currBoard[0]
					+ " : " + gameData.currBoard[7];
		}else if (gameData.currBoard[0] > gameData.currBoard[7] && gameData.playerNo == 1){
			//player 2 has won
			document.getElementById("winner").innerHTML = gameData.other + " Has Won!";
			document.getElementById("score").innerHTML = gameData.currBoard[0]
					+ " : " + gameData.currBoard[7];
		}else if (gameData.currBoard[0] < gameData.currBoard[7] && gameData.playerNo == 2){
			//player 1 has won
			document.getElementById("winner").innerHTML = gameData.other + " Has Won!";
			document.getElementById("score").innerHTML = gameData.currBoard[7]
					+ " : " + gameData.currBoard[0];
		}else if (gameData.currBoard[0] < gameData.currBoard[7] && gameData.playerNo == 1){
			document.getElementById("winner").innerHTML = username + " Has Won!";
			document.getElementById("score").innerHTML = gameData.currBoard[7]
					+ " : " + gameData.currBoard[0];
		}else{
			document.getElementById("winner").innerHTML = "TIE";
			document.getElementById("score").innerHTML = "24 : 24";
		}
		document.getElementById("winscreen").className = "shown";
		document.getElementById("playscreen").className = "hidden";
		document.getElementById("lobbyscreen").className = "shown";
		clearInterval(playInterval);
		setInterval(getReadiedPlayers, 1000);
	}

	/**
	Parameters / Returns: NA

	This function makes a request to the server in order to get the game
	board data so that the most recent data can be displayed on the screen
	of the player who requested it (which will be done every second).
	The graphical board is then updated ie a call through the board 
	drawing method, after which the player smiles with joy at the
	gloriously updated board.
	*/
	function getGameData(){
		let url = "https://gavin-test-m.herokuapp.com?readyUp=0&playing=2&boardId=" + gameData.boardNo;
		fetch(url)
			.then(checkStatus)
			.then(function(responseText){
				console.log(responseText);
				if (responseText != "nothing new"){
					let newData = JSON.parse(responseText);
					gameData.currBoard = newData.board;
					let p1Sum = sumSide(gameData.currBoard, 1);
					let p2Sum = sumSide(gameData.currBoard, 0);
					if (p1Sum == 0 || p2Sum == 0){
						humanEndGame(p1Sum, p2Sum);
					}
					if (newData.currIsPlayer1){
						if (gameData.playerNo == 1){
							gameData.myTurn = 1;
						}else{
							gameData.myTurn = 0;
						}
					}else{
						if (gameData.playerNo == 1){
							gameData.myTurn = 0;
						}else{
							gameData.myTurn = 1;
						}
					}
					drawBoard();
				}
			})
			.catch(function(error){
				console.log(error);
			});
	}

	/**
	Parameters:
		p1Sum/p2Sum = the sums of both player sides

	Returns: NA

	This function figures out the win message to display
	after the game has ended for one AI and one person playing each other.
	The lobby screen is displayed after the game ends and all other screens
	are hidden.
	*/
	function endGame(p1Sum, p2Sum){
		gameData.currBoard[7] += p1Sum;
		gameData.currBoard[0] += p2Sum;
		bestMove = -1;
		if (gameData.currBoard[0] > gameData.currBoard[7]){
			document.getElementById("winner").innerHTML = "AI Has Won! (duh)";
			document.getElementById("score").innerHTML =
					gameData.currBoard[0] + " : " + gameData.currBoard[7];
			document.getElementById("winscreen").className = "shown";
			document.getElementById("entryscreen").className = "shown";
			document.getElementById("playscreen").className = "hidden";
		}else if (gameData.currBoard[0] < gameData.currBoard[7]){
			document.getElementById("winner").innerHTML = "How did you win???";
			document.getElementById("score").innerHTML =
					gameData.currBoard[7] + " : " + gameData.currBoard[0];
			document.getElementById("winscreen").className = "shown";
			document.getElementById("entryscreen").className = "shown";
			document.getElementById("playscreen").className = "hidden";
		}else{
			document.getElementById("winner").innerHTML = "TIE";
			document.getElementById("score").innerHTML =
					gameData.currBoard[7] + " : " + gameData.currBoard[0];
			document.getElementById("winscreen").className = "shown";
			document.getElementById("entryscreen").className = "shown";
			document.getElementById("playscreen").className = "hidden";
		}
	}

	/**
	Parameters / Returns: NA

	This function makes the move for the AI by calling the miniMax
	algorithm to get the bestMove.  Multiple moves can be made in a
	row by the AI if such an opportunity presents itself.
	*/
	function AIMove(){
		let gameEnd = false;
		miniMax(5, {board: gameData.currBoard, currIsPlayer1: 0}, true);
		let moveData = moveIndex(bestMove, gameData.currBoard);
		gameData.currBoard = moveData.board;
		gameData.myTurn = moveData.currIsPlayer1;
		let p1Sum = sumSide(gameData.currBoard, 1);
		let p2Sum = sumSide(gameData.currBoard, 0);
		if (p1Sum == 0 || p2Sum == 0){
			endGame(p1Sum, p2Sum);
			gameEnd = true;
		}
		drawBoard();
		if (!gameData.myTurn && !gameEnd){
			setTimeout(AIMove, 3000);
		}
	}

	/**
	Parameters / Returns: NA

	This function is called everytime the player clicks on a valid
	move piece and makes a move both for the player as well as the
	AI (AI moves are made every 3 seconds so the S T U P I D humans
	can keep up with what the AI is actually doing).
	*/
	function movePieceAI(){
		if (currCircle > 0 && currCircle < 7 &&
				gameData.currBoard[currCircle] != 0 && gameData.myTurn){
			let moveData = moveIndex(currCircle, gameData.currBoard);
			gameData.currBoard = moveData.board;
			gameData.myTurn = moveData.currIsPlayer1;
			let p1Sum = sumSide(gameData.currBoard, 1);
			let p2Sum = sumSide(gameData.currBoard, 0);
			if (p1Sum == 0 || p2Sum == 0){
				endGame(p1Sum, p2Sum);
			}else{
				if (!gameData.myTurn){
					setTimeout(AIMove,3000);
				}
			}
			drawBoard();
		}
	}

	/**
	Parameters / Returns: NA

	This function is called everytime a player enters the lobbyscreen
	(human mode enabled) in order to get updated information on the
	player(s) ready so that you know who you will be going against
	if you ready up second.
	*/
	function getReadiedPlayers(){
		let url = "https://gavin-test-m.herokuapp.com?getReadyPlayers=1";
		fetch(url)
			.then(checkStatus)
			.then(function(responseText){
				console.log(responseText);
				let readyData = JSON.parse(responseText);
				if (readyData.readyPlayers.length == 1){
					document.getElementById("p1").innerHTML = readyData.readyPlayers[0];
					document.getElementById("p2").innerHTML = "";
				}else if(readyData.readyPlayers.length == 2){
					document.getElementById("p1").innerHTML = readyData.readyPlayers[0];
					document.getElementById("p2").innerHTML = readyData.readyPlayers[1];
				}else{
					document.getElementById("p1").innerHTML = "";
					document.getElementById("p2").innerHTML = "";
				}
			})
			.catch(function(error){
				console.log(error);
			});
	}

	/**
	Parameters: response is the server respone to the request containing
	information such as an error code and status used here

	Returns: either an error if there is one or the response text gotten
	from the server.

	This function checks the error code on the response from the server.
	If an error is present we return that error and log it in console,
	otherwise we return the normal expected response from the server.
	*/
	function checkStatus(response){
		if (response.status >= 200 && response.status < 300){
			return response.text();
		}else{
			return Promise.reject(new Error(response.status + ":" + response.statusText));
		}
	}

	/**
	Parameters / Returns: NA

	This function is called everytime the user clicks on the Go
	button on the homepage, checks the user input for the username
	to make sure it is not empty, then takes you to the respective
	page based on the mode you have selected (if you selected AI
	you are taken into the game immediately, otherwise you are taken
	to a lobby screen).
	*/
	function setupGame(){
		if (document.getElementById("usernameinput").value == ""){
			alert("Please Enter a Name");
		}else if (document.getElementById("human").checked){
			//human mode so enter lobby screen
			username = document.getElementById("usernameinput").value;
			document.getElementById("entryscreen").className = "hidden";
			document.getElementById("lobbyscreen").className = "shown";
			document.getElementById("userwelcome").innerHTML += username;
			document.getElementById("ready").onclick = readyUp;
			document.getElementById("gameboard").onclick = function(){
				movePiece(0);
			};
			lobbyInterval = setInterval(getReadiedPlayers, 1000);
		}else{
			//ai mode
			
			username = document.getElementById("usernameinput").value;
			document.getElementById("entryscreen").className = "hidden";
			document.getElementById("playscreen").className = "shown";
			document.getElementById("winscreen").className = "hidden";
			document.getElementById("vs").innerHTML = username + " Vs. AI";
			gameData = {
				playerNo: 1,
				currBoard: [0, 4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4],
				other: "AI",
				myTurn: 1
			};
			drawBoard();
			document.getElementById("gameboard").onclick = movePieceAI;
		}
	}

	/**
	Parameters / Returns: NA

	This function is called everytime the page loads.  It sets up
	the Go button so that when it is clicked we are taken to the
	proper page while it also sets up what function to call whenever
	the mouse moves on the gameboard so we can always keep track of
	what circle we are hovering over.
	*/
	window.onload = function(){
		document.getElementById("entrysubmit").onclick = setupGame;
		document.getElementById("gameboard").onmousemove = checkMouse;
	};
})();
