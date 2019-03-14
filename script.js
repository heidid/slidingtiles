const Util = {
    ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    copyTileArray: (tiles) => {
        return tiles.map((tile) => new Tile(tile.state.row, tile.state.col, tile.state.symbol))
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
    tileArrayToBasicMatrix: (tiles, width, height, useIndex) => {
        const matrix = Util.createMatrix(width, height);
        let i = 0;
        for (const tile of tiles) {
            matrix[tile.state.row][tile.state.col] = useIndex ? i : tile.state.symbol;
            i++;
        }
        return matrix
    },
    manhattanDist: (a, b) => {
        return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    }
};


class Component {
    constructor(tagName, className) {
        this._el = null;
        this._state = {};
        this.tagName = tagName;
        this.className = className;
    }
    get attributes() { }
    get eventHandlers() { }
    get state() {
        return this._state;
    }
    set state(newState) {
        // console.log(newState);
        const oldState = this._state;
        Object.keys(newState).forEach((k) => {
            this._state[k] = newState[k];
        });
        this.render();
    }
    setInnerHTML(htmlStr) {
        this.innerHTML = htmlStr;
    }
    setChildren(nodesArr) {
        this.childNodes = nodesArr;
    }
    render() {
        // console.log('render');
        if (!this._el) {
            const el = document.createElement(this.tagName);
            el.classList.add(this.className);
            this._el = el;
        }
        if (this.attributes) {
            Object.keys(this.attributes).forEach((key) => {
                if (key === 'classList') {
                    this._el.className = '';
                    this._el.classList.add(this.className);
                    this._el.classList.add(...this.attributes.classList);
                } else {
                    this._el.setAttribute(key, this.attributes[key]);
                }
            });
        }
        if (this.eventHandlers) {
            Object.keys(this.eventHandlers).forEach((key) => {
                this._el[key] = this.eventHandlers[key];
            });
        }
        while (this._el.firstChild) { // TODO: do we always have to do this?
            this._el.removeChild(this._el.firstChild)
        }
        if (this.innerHTML) {
            this._el.innerHTML = this.innerHTML;
        } else if (this.childNodes) {
            this.childNodes.forEach((node) => this._el.appendChild(node));
        }
        return this._el;
    }
}


class Tile extends Component {
    HEIGHT = 50;
    WIDTH = 50;
    constructor(row, col, symbol) {
        super('div', Tile.name);
        this.state = {
            row,
            col,
            symbol,
            highlight: false
        };
    }
    get styles() {
        const styles = {
            'top': `${this.state.row * this.HEIGHT}px`,
            'left': `${this.state.col * this.WIDTH}px`
        };
        return Util.formatInlineStyles(styles);
    }
    get attributes() {
        const attr = {
            style: this.styles,
            classList: []
        };
        if (this.state.highlight) {
            attr.classList.push('highlight');
        }
        return attr;
    }
    render() {
        this.setInnerHTML(`${this.state.symbol}`);
        return super.render();
    }
}


class RectangularBoard extends Component {
    constructor(props, width, height, tiles, emptySpaces) {
        super('div', RectangularBoard.name);
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
    get attributes() {
        return { style: this.styles };
    }
    highlightStr(str) {
        this.tiles.forEach(tile => tile.state.highlight = false);
        for (let i = 0; i < this.height; i++) {
            const row = this.tiles.slice(i * this.width, i * this.width + this.width).map(tile => tile.state.symbol).join('');
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
                this.tiles[action.tileId].state = {
                    row: this.tiles[action.tileId].state.row + action.dy,
                    col: this.tiles[action.tileId].state.col + action.dx
                }
            }, 1000 * i); // TODO: find better way
        });
    }
    render() {
        this.setChildren(this.tiles.map(tile => tile.render()));
        return super.render();
    }
}


class InputForm extends Component {
    constructor(props) {
        super('form', InputForm.name);
        this.props = props;
    }
    get eventHandlers() {
        return {
            onsubmit: (event) => {
                event.preventDefault();
                this.props.moveTiles(event.target.goalStr.value.toUpperCase());
            }
        };
    }
    render() {
        const markup = `
            <label for="goalStr">Goal:</label>
            <input type="text" name="goalStr" id="goalStr" maxLength="${this.props.maxLength}" autofocus>
            <input type="submit" value="Move Tiles">`;
        this.setInnerHTML(markup);
        return super.render();
    }
}


class Searcher {
    constructor(startNode, goalTest, getNeighbors, checkVisited, heuristic) {
        this.startNode = startNode;
        this.goalTest = goalTest;
        this.getNeighbors = getNeighbors;
        this.checkVisited = checkVisited;
        this.heuristic = heuristic;
    }
    search() {
        // return this.bfs();
        return this.aStar();
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
                    // console.log(neighbor.tiles);
                    queue.push({ 
                        tiles: neighbor.tiles, 
                        emptySpaces: neighbor.emptySpaces,
                        actions: currentNode.actions.concat([neighbor.action])
                    });
                }
            }
        }
    }
    aStar() {
        const pq = new PriorityQueue({ comparator: (a, b) => b[1] - a[1] });
        const visited = [];
        pq.queue([this.startNode, this.heuristic(this.startNode)]);
        while (pq.length > 0) {
            const currentNode = pq.dequeue();
            if (this.goalTest(currentNode[0].tiles)) {
                return currentNode[0];
            }
            if (!this.checkVisited(currentNode[0], visited)) {
                visited.push(currentNode[0]);
                const neighbors = this.getNeighbors(currentNode[0]);
                for (const neighbor of neighbors) {
                    const costSoFar = currentNode[0].actions.length;
                    const neighborNode = { 
                        tiles: neighbor.tiles, 
                        emptySpaces: neighbor.emptySpaces,
                        actions: currentNode[0].actions.concat([neighbor.action])
                    };
                    pq.queue([neighborNode, costSoFar + this.heuristic(neighborNode)]);
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
                tiles.push(new Tile(i, j, Util.ALPHABET[(i * cols + j) % 26]))
            }
        }
        tiles.pop(); // so there's one empty space

        this.board = new RectangularBoard({ render: () => this.render() }, cols, rows, tiles, [[rows - 1, cols - 1]]);
        this.inputForm = new InputForm({ 
            maxLength: this.board.width,
            moveTiles: (goalStr) => this.startBfs(goalStr)
        });
    }
    startBfs(goalStr) {
        const goalTest = (tiles) => {
            const tileArr = Util.tileArrayToBasicMatrix(tiles, this.board.width, this.board.height);
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
                    if (Math.abs(coords[0] - tile.state.row) + Math.abs(coords[1] - tile.state.col) === 1) {
                        let newTiles = Util.copyTileArray(tiles);
                        newTiles[j].state = {
                            row: coords[0],
                            col: coords[1]
                        };
                        let newEmptySpaces = Util.copyDeepArray(emptySpaces);
                        newEmptySpaces[i][0] = tile.state.row;
                        newEmptySpaces[i][1] = tile.state.col;
                        neighbors.push({
                            tiles: newTiles,
                            emptySpaces: newEmptySpaces,
                            action: {
                                tileId: j,
                                dx: coords[1] - tile.state.col,
                                dy: coords[0] - tile.state.row
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
        const heuristic = (node) => {
            const currentState = Util.tileArrayToBasicMatrix(node.tiles, this.board.width, this.board.height);
            const goalState = Util.createMatrix(this.board.width, this.board.height);
            let totalDist = 0;
            for (let r = 0; r < this.board.height; r++) {
                for (let c = 0; c < this.board.width; c++) {
                    const id = currentState[r][c];
                    for (let i = 0; i < this.board.height; i++) {
                        for (let j = 0; j < this.board.width; j++) {
                            if (id === goalState[i][j]) { // each id only appears once
                                totalDist += Util.manhattanDist([r, c], [i, j]);
                            }
                        }
                    }
                }
            }
            console.log(totalDist);
            return totalDist;
        };
        const searcher = new Searcher(startNode, goalTest, getNeighbors, checkVisited, heuristic);
        const result = searcher.search();
        this.board.emptySpaces = result.emptySpaces;
        console.log(result.tiles);
        this.board.doActions(result.actions);
    }
    render() {
        document.getElementById('stuff').appendChild(this.inputForm.render());
        document.getElementById('board-wrapper').appendChild(this.board.render());
    }
}


(new Main()).render();
