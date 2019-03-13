const Util = {
    ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    copyTileArray: (tiles) => {
        return tiles.map((tile) => new Tile(tile.row, tile.col, tile.symbol))
    },
    copyDeepArray: (arr) => {
        return arr.map((row) => [...row])
    },
    createMatrix: (width, height) => {
        const matrix = [];
        for (let r = 0; r < height; r++) {
            const row = [];
            for (let c = 0; c < width; c++) {
                row.push(null);
            }
            matrix.push(row);
        }
        return matrix;
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
};


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
        this.emptySpaces = emptySpaces;
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
            }, 1000 * i); // TODO: find better way
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


class Searcher {
    constructor(startNode, goalTest, getNeighbors, checkVisited) {
        this.startNode = startNode;
        this.goalTest = goalTest;
        this.getNeighbors = getNeighbors;
        this.checkVisited = checkVisited;
    }
    bfs() {
        const queue = [];
        const visited = [];
        queue.push(this.startNode);
        while (queue.length > 0) {
            const currentNode = queue.shift();
            if (this.goalTest(currentNode.tiles)) {
                return currentNode;
            }
            if (!this.checkVisited(currentNode, visited)) {
                visited.push(currentNode);
                const neighbors = this.getNeighbors(currentNode);
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
        const goalTest = (tiles) => {
            const tileArr = Util.createMatrix(this.board.width, this.board.height);
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
        const getNeighbors = (node) => {
            const tiles = node.tiles;
            const emptySpaces = node.emptySpaces;
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
        const checkVisited = (node, visitedArr) => {
            return visitedArr.filter((visitedNode) => Util.arrayEquals(visitedNode.tiles, node.tiles) && 
                Util.arrayEquals(visitedNode.emptySpaces, node.emptySpaces)).length > 0;
        }
        const startNode = {
            tiles: Util.copyTileArray(this.board.tiles),
            emptySpaces: Util.copyDeepArray(this.board.emptySpaces),
            actions: []
        };
        const searcher = new Searcher(startNode, goalTest, getNeighbors, checkVisited);
        const result = searcher.bfs();
        this.board.emptySpaces = result.emptySpaces;
        this.board.doActions(result.actions);
    }
    render() {
        Util.clearChildren(document.getElementById('stuff')).appendChild(this.inputForm.render());
        Util.clearChildren(document.getElementById('board-wrapper')).appendChild(this.board.render());
    }
}


(new Main()).render();
