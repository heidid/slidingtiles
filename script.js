const Util = {
	ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
	copyTileArray: (tiles) => {
		return tiles.map((tile) => new Tile(tile.row, tile.col, tile.symbol))
	},
	copyDeepArray: (arr) => {
		return arr.map((row) => [...row])
	},
	arrayEquals: (arr1, arr2) => {
		// https://stackoverflow.com/questions/27030/comparing-arrays-of-objects-in-javascript
		return JSON.stringify(arr1) === JSON.stringify(arr2);
	},
	formatInlineStyles: (styles) => {
		return Object.keys(styles).map(prop => `${prop}: ${styles[prop]};`).join(' ');
	},
	createElement: (tagName, className, attributes) => {
		const el = document.createElement(tagName);
		el.classList.add(className);
		Object.keys(attributes).forEach((key) => {
			el.setAttribute(key, attributes[key]);
		});
		return el;
	},
	clearChildren: (node) => {
		while (node.firstChild) {
			node.removeChild(node.firstChild)
		}
		return node;
	}
}


class Tile {
	HEIGHT = 50;
	WIDTH = 50;
	constructor(row, col, symbol) {
		this.row = row;
		this.col = col;
		this.symbol = symbol;
		this.highlight = false;
	}
	get styles() {
		const styles = {
			'top': `${this.row * this.HEIGHT}px`,
			'left': `${this.col * this.WIDTH}px`
		};
		return Util.formatInlineStyles(styles);
	}
	render() {
		const el = Util.createElement('div', Tile.name, { style: this.styles });
		if (this.highlight) el.classList.add('highlight');
		el.innerHTML = `${this.symbol}`;
		return el;
	}
}


class RectangularBoard {
	constructor(props, width, height, tiles, emptySpaces) {
		this.props = props;
		this.width = width;
		this.height = height;
		this.tiles = tiles;
		this.emptySpaces = emptySpaces
	}
	get styles() {
		const styles = {
			'width': `${this.tiles[0].WIDTH * this.width}px`,
			'height': `${this.tiles[0].HEIGHT * this.height}px`
		};
		return Util.formatInlineStyles(styles);
	}
	highlightStr(str) {
		this.tiles.forEach(tile => tile.highlight = false);
		for (let i = 0; i < this.height; i++) {
			const row = this.tiles.slice(i * this.width, i * this.width + this.width).map(tile => tile.symbol).join('');
			if (row.indexOf(str) != -1) {
				// console.log(i);
				for (let j = row.indexOf(str); j < row.indexOf(str) + str.length; j += this.tiles[i * this.width + j].symbol.length) {
					this.tiles[i * this.width + j].highlight = true;
				}
				break;
			}
		}
		this.render();
	}
	doActions(actions) {
		console.log('doing ' + actions.length + ' actions');
		actions.forEach((action, i) => {
			setTimeout(() => {
				this.tiles[action.tileId].row += action.dy;
				this.tiles[action.tileId].col += action.dx;
				this.props.render();
			}, 1000 * i);
		});
	}
	render() {
		const el = Util.createElement('div', RectangularBoard.name, { style: this.styles })
		el.classList.add('board');
		el.innerHTML = this.tiles.map(tile => tile.render().outerHTML).join('\n');
		return el;
	}
}


class InputForm {
	constructor(props) {
		this.props = props;
	}
	render() {
		const form = Util.createElement('form', InputForm.name, {})
		form.innerHTML = `<label for="goalStr">Goal:</label>
			<input type="text" name="goalStr" id="goalStr">
			<input type="submit" value="Move Tiles">`;
		form.onsubmit = (e) => {
			event.preventDefault();
			this.props.moveTiles(form.goalStr.value);
		};
		return form;
	}
}


class Main {
	constructor() {
		const rows = 3;
		const cols = 3;
		const tiles = [];
		for (let i = 0; i < rows; i++) {
			for (let j = 0; j < cols; j++) {
				tiles.push(new Tile(i, j, Util.ALPHABET[i * cols + j]))
			}
		}
		tiles.pop(); // so there's one empty space

		this.board = new RectangularBoard({ render: () => this.render() }, cols, rows, tiles, [[rows - 1, cols - 1]]);
		this.inputForm = new InputForm({ moveTiles: (goalStr) => this.startBfs(goalStr) });
	}
	startBfs(goalStr) {
		const actions = this.bfs(goalStr);
		console.log(actions);
		this.board.doActions(actions);
	}
	bfs(goalStr) {
		const goalTest = (tiles) => {
			console.log('goalTest');
			console.log(tiles);

			const tileArr = [];
			for (let r = 0; r < this.board.height; r++) {
				const row = [];
				for (let c = 0; c < this.board.width; c++) {
					row.push(null);
				}
				tileArr.push(row);
			}
			for (const tile of tiles) {
				tileArr[tile.row][tile.col] = tile.symbol;
			}

			for (let i = 0; i < this.board.height; i++) {
				const row = tileArr[i].join('');
				if (row.indexOf(goalStr) != -1) {
					return true;
				}
			}
			return false;
		};
		const getNeighbors = (tiles, emptySpaces) => {
			const neighbors = [];
			emptySpaces.forEach((coords, i) => {
				tiles.forEach((tile, j) => {
					if (Math.abs(coords[0] - tile.row) + Math.abs(coords[1] - tile.col) === 1) {
						let newTiles = Util.copyTileArray(tiles);
						newTiles[j].row = coords[0];
						newTiles[j].col = coords[1];
						let newEmptySpaces = Util.copyDeepArray(emptySpaces);
						newEmptySpaces[i][0] = tile.row;
						newEmptySpaces[i][1] = tile.col;
						neighbors.push({
							tiles: newTiles,
							emptySpaces: newEmptySpaces,
							action: {
								tileId: j,
								dx: coords[1] - tile.col,
								dy: coords[0] - tile.row
							}
						});
					}
				})
			});
			return neighbors;
		}
		// console.log(neighbors);
		// this.board.tiles = neighbors[0][0];
		// this.board.emptySpaces = neighbors[0][1];
		// this.board.highlightStr(goalStr);
		// this.render();
		// const n = getNeighbors(this.board.tiles, this.board.emptySpaces);
		const queue = [];
		const visited = [];
		queue.push({ tiles: this.board.tiles, emptySpaces: this.board.emptySpaces, actions: [] });
		while (queue.length > 0) {
			const currentNode = queue.shift();
			// console.log(currentNode.tiles);
			if (goalTest(currentNode.tiles)) {
				console.log('DONE');
				console.log(currentNode.actions);
				return currentNode.actions;
			}
			if (visited.filter((visitedNode) => Util.arrayEquals(visitedNode.tiles, currentNode.tiles) && 
				Util.arrayEquals(visitedNode.emptySpaces, currentNode.emptySpaces)).length === 0) {
				visited.push(currentNode);
				const neighbors = getNeighbors(currentNode.tiles, currentNode.emptySpaces);
				for (const neighbor of neighbors) {
					queue.push({ 
						tiles: neighbor.tiles, 
						emptySpaces: neighbor.emptySpaces,
						actions: currentNode.actions.concat([neighbor.action])
					});
				}
			}
		}
	}
	render() {
		Util.clearChildren(document.getElementById('stuff')).appendChild(this.inputForm.render());
		Util.clearChildren(document.getElementById('board-wrapper')).appendChild(this.board.render());
	}
}


(new Main()).render();
