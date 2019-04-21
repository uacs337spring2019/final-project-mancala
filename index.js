(function(){
	"use strict";

	let currCircle = -1;
	let username;
	let gameData;
	let readyInterval = null;
	let playInterval;

	
	//everytime we move we get the current circle that we are hovering over if any.
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
	
	function drawBoard(){
		let canvas = document.getElementById("gameboard");
		let ctx = canvas.getContext("2d");
		ctx.clearRect(0,0,800,400);
		let y = 250;

		//draw all 6 pockets with the power of mod
		for (let i = 0; i < 12; i++){
			let x = 100 * (i % 6) + 150;
			if ((i >  5 && currCircle == 13 - (i - 6) && gameData.playerNo == 2 && gameData.myTurn && gameData.currBoard[currCircle] != 0) ||
				(i <= 5 && currCircle == i % 6 + 1    && gameData.playerNo == 1 && gameData.myTurn && gameData.currBoard[currCircle] != 0)){
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

	function readyUp(){
		//add user to readied players table
		let url = "http://gavin-mancala-project.herokuapp.com:" + process.env.PORT +"?readyUp=1&username=" + username + "&playing=0";
		fetch(url)
			.then(checkStatus)
			.then(function(responseText){
				if (responseText != "wait"){
					//start game
					gameData = JSON.parse(responseText);
					drawBoard();
					document.getElementById("vs").innerHTML = username + " Vs. " + gameData.other;
					document.getElementById("lobbyscreen").className = "hidden";
					document.getElementById("playscreen").className = "shown";
					document.getElementById("winscreen").className = "hidden";
					clearInterval(readyInterval);
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

	function checkStatus(response){
		if (response.status >= 200 && response.status < 300){
			return response.text();
		}else{
			return Promise.reject(new Error(response.status + ":" + response.statusText));
		}
	}

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

	function movePiece(){
		if (currCircle > 0 && currCircle < 7 && gameData.playerNo == 1 && gameData.myTurn && gameData.currBoard[currCircle] != 0||
			currCircle > 7 && currCircle <= 13 && gameData.playerNo == 2 && gameData.myTurn && gameData.currBoard[currCircle] != 0){
			let url = "http://gavin-mancala-project.herokuapp.com:" + process.env.PORT + "?readyUp=0&playing=1&boardId=" + gameData.boardNo + "&index=" + currCircle;
			fetch(url)
				.then(checkStatus)
				.then(function(responseText){
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
				})
		}
	}

	function getGameData(){
		let url = "http://gavin-mancala-project.herokuapp.com:" + process.env.PORT + "?readyUp=0&playing=2&boardId=" + gameData.boardNo;
		fetch(url)
			.then(checkStatus)
			.then(function(responseText){
				if (responseText != "nothing new"){
					let newData = JSON.parse(responseText);
					gameData.currBoard = newData.board;
					let p1Sum = sumSide(gameData.currBoard, 1)
					let p2Sum = sumSide(gameData.currBoard, 0)
					if (p1Sum == 0 || p2Sum == 0){
						gameData.currBoard[7] += p1Sum;
						gameData.currBoard[0] += p2Sum;
						if (gameData.currBoard[0] > gameData.currBoard[7] && gameData.playerNo == 2){
							//player 2 has won
							document.getElementById("winner").innerHTML = username + " Has Won!";
							document.getElementById("score").innerHTML = gameData.currBoard[0] + " : " + gameData.currBoard[7]
						}else if (gameData.currBoard[0] > gameData.currBoard[7] && gameData.playerNo == 1){
							//player 2 has won
							document.getElementById("winner").innerHTML = gameData.other + " Has Won!";
							document.getElementById("score").innerHTML = gameData.currBoard[0] + " : " + gameData.currBoard[7]
						}else if (gameData.currBoard[0] < gameData.currBoard[7] && gameData.playerNo == 2){
							//player 1 has won
							document.getElementById("winner").innerHTML = gameData.other + " Has Won!";
							document.getElementById("score").innerHTML = gameData.currBoard[7] + " : " + gameData.currBoard[0]
						}else if (gameData.currBoard[0] < gameData.currBoard[7] && gameData.playerNo == 1){
							document.getElementById("winner").innerHTML = username + " Has Won!";
							document.getElementById("score").innerHTML = gameData.currBoard[7] + " : " + gameData.currBoard[0]
						}else{
							document.getElementById("winner").innerHTML = "TIE";
							document.getElementById("score").innerHTML = "24 : 24";
						}
						document.getElementById("winscreen").className = "shown";
						document.getElementById("playscreen").className = "hidden";
						document.getElementById("lobbyscreen").className = "shown";
						clearInterval(playInterval);
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

	window.onload = function(){
		document.getElementById("entrysubmit").onclick = function(){
			//enter lobby screen
			username = document.getElementById("usernameinput").value;
			document.getElementById("entryscreen").className = "hidden";
			document.getElementById("lobbyscreen").className = "shown";
			document.getElementById("userwelcome").innerHTML += username;
		}
		document.getElementById("gameboard").onmousemove = checkMouse;
		document.getElementById("ready").onclick = readyUp;
		document.getElementById("gameboard").onclick = movePiece;
	}
})();



















