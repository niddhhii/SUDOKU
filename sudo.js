function relMouseCoords(event) {
    var totalOffsetX = 0;
    var totalOffsetY = 0;
    var canvasX = 0;
    var canvasY = 0;
    var currentElement = this;

    do {
        totalOffsetX += currentElement.offsetLeft;
        totalOffsetY += currentElement.offsetTop;
    }
    while (currentElement = currentElement.offsetParent)

    canvasX = event.pageX - totalOffsetX;
    canvasY = event.pageY - totalOffsetY;

    return { x: canvasX, y: canvasY }
}
HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;

Array.prototype.contains = function (element) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] == element) {
            return true;
        }
    }
    return false;
}

var SquareSize = 3;
var BoardSize = SquareSize * SquareSize;

function AllowedValues(n) {
    this._mask = n;
}

AllowedValues.prototype.getSingle = function () {
    var single = 0;
    var count = 0;
    for (var i = 1; i <= BoardSize; i++)
        if ((this._mask & (1 << i)) != 0) {
            count++;
            single = i;
        }
    return count == 1 ? single : 0;
};

AllowedValues.prototype.setSingle = function (n) {
    this._mask = 1 << n;
};

AllowedValues.prototype.count = function () {
    var count = 0;
    for (var i = 1; i <= BoardSize; i++)
        if ((this._mask & (1 << i)) != 0)
            count++;
    return count;
};

AllowedValues.prototype.isAllowed = function (n) {
    return n >= 1 && n <= BoardSize && ((this._mask & (1 << n)) != 0);
};

AllowedValues.prototype.removeValues = function (bm) {
    this._mask &= ~bm._mask;
};

AllowedValues.prototype.allowedValuesArray = function () {
    var ret = new Array();
    for (var i = 1; i <= BoardSize; i++)
        if (((1 << i) & this._mask) != 0)
            ret.push(i);
    return ret;
};

AllowedValues.prototype.clone = function () {
    return new AllowedValues(this._mask);
};

function Cell(value) {
    this._value = value;
    this._allowed = new AllowedValues(0x3e);
    this._answer = 0;
    this._given = false;
}

Cell.prototype.clone = function (value) {
    var clone = new Cell();
    clone._value = this._value;
    clone._allowed = this._allowed.clone();
    clone._answer = this._answer;
    clone._given = this._given;
    return clone;
};

Cell.prototype.single = function (value) {
    this._value = value;
    this._allowed = new AllowedValues(0x3e);
    this._answer = 0;
};

Cell.prototype.valueMask = function () {
    return this._value == 0 ? 0 : 1 << this._value;
};

Cell.prototype.hasAnswer = function () {
    return this._answer != 0;
};

Cell.prototype.getAnswer = function () {
    return this._answer;
};

Cell.prototype.setAnswer = function (n) {
    if (n < 0 || n > 9)
        throw "Illegal value not in the range 1..9.";
    this._answer = n;
};

Cell.prototype.getValue = function () {
    return this._value;
};

Cell.prototype.setValue = function (n) {
    if (n < 0 || n > 9)
        throw "Illegal value not in the range 1..9.";
    if (n != 0 && !this._allowed.isAllowed(n))
        throw "Not allowed.";
    this._value = n;
    this._given = false;
};

Cell.prototype.setGiven = function (n) {
    if (n < 0 || n > 9)
        throw "Illegal value not in the range 1..9.";
    this._value = n;
    this._given = n != 0;
    this._answer = 0;
};

Cell.prototype.isGiven = function () {
    return this._given;
};

Cell.prototype.isAssigned = function () {
    return this._value != 0;
};

Cell.prototype.clear = function () {
    this._value = 0;
    this._allowed = new AllowedValues(0x3E);
    this._answer = 0;
    this._given = 0;
};

Cell.prototype.isAllowed = function (value) {
    return this._allowed.isAllowed(value);
};

Cell.prototype.setAllowed = function (value) {
    this._allowed = new AllowedValues(value);
};

Cell.prototype.getAllowedClone = function (value) {
    return this._allowed.clone();
};

var SibType = { "Row": 1, "Col": 2, "Square": 3 };

function Location(row, col) {
    this.row = row;
    this.col = col;
}

Location.empty = new Location(-1, -1);

Location.prototype.isEmpty = function () {
    return this.row < 0;
};

Location.prototype.modulo = function (n) {
    if (n < 0)
        return n + BoardSize;
    return n % BoardSize;
};

Location.prototype.left = function () {
    return new Location(this.row, this.modulo(this.col - 1));
};

Location.prototype.right = function () {
    return new Location(this.row, this.modulo(this.col + 1));
};

Location.prototype.up = function () {
    return new Location(this.modulo(this.row - 1), this.col);
};

Location.prototype.down = function () {
    return new Location(this.modulo(this.row + 1), this.col);
};

Location.prototype.toString = function () {
    return "Row=" + String(this.row) + "Col=" + String(this.col);
};

Location.prototype.getSquare = function () {
    return 3 * Math.floor(this.row / 3) + Math.floor(this.col / 3);
};

Location.prototype.equals = function (a) {
    return a.row == this.row && a.col == this.col;
};

Location.prototype.notEquals = function (a) {
    return a.row != this.row || a.col != this.col;
};

Location.grid = function () {
    var locs = new Array();
    for (var i = 0; i < BoardSize; i++)
        for (var j = 0; j < BoardSize; j++)
            locs.push(new Location(i, j));
    return locs;
};

Location.prototype.rowSibs = function () {
    var locs = new Array();
    for (var i = 0; i < BoardSize; i++)
        if (i != this.col)
            locs.push(new Location(this.row, i));
    return locs;
};

Location.prototype.colSibs = function () {
    var locs = new Array();
    for (var i = 0; i < BoardSize; i++)
        if (i != this.row)
            locs.push(new Location(i, this.col));
    return locs;
};

Location.prototype.squareSibs = function () {
    var locs = new Array();
    var baseRow = 3 * Math.floor(this.row / 3);
    var baseCol = 3 * Math.floor(this.col / 3);
    for (var i = 0; i < SquareSize; i++) {
        var r = baseRow + i;
        for (var j = 0; j < SquareSize; j++) {
            var c = baseCol + j;
            if (r != this.row || c != this.col)
                locs.push(new Location(r, c));
        }
    }
    return locs;
};

Location.prototype.getSibs = function (type) {
    switch (type) {
        case SibType.Row:
            return this.rowSibs();
        case SibType.Col:
            return this.colSibs();
        case SibType.Square:
            return this.squareSibs();
    }
};

function Board() {
    let context = canvas1.getContext('2d');
    context.font = "Lato";
    function MultiDimArray(rows, cols) {
        var a = new Array(rows);
        for (var i = 0; i < rows; i++) {
            a[i] = new Array(cols);
            for (var j = 0; j < cols; j++)
                a[i][j] = new Cell();
        }
        return a;
    }

    this._digits = MultiDimArray(BoardSize, BoardSize);
    this._isSolved = false;
    this._isValid = false;
    
}

Board.prototype.clone = function () {
    var clone = new Board();
    clone._isSolved = this._isSolved;
    clone._isValid = this._isValid;
    clone._digits = new Array(BoardSize);
    for (var i = 0; i < BoardSize; i++) {
        clone._digits[i] = new Array(BoardSize);
        for (var j = 0; j < BoardSize; j++)
            clone._digits[i][j] = this._digits[i][j].clone();
    }
    return clone;
};

Board.prototype.copyTo = function (target) {
    target._isSolved = this._isSolved;
    target._isValid = this._isValid;
    for (var i = 0; i < BoardSize; i++)
        for (var j = 0; j < BoardSize; j++)
            target._digits[i][j] = this._digits[i][j].clone();
};

Board.prototype.getCell = function (loc) {
    return this._digits[loc.row][loc.col];
};

Board.prototype.setCell = function (loc, value) {
    this._digits[loc.row][loc.col] = value;
};

Board.prototype.clear = function () {
    for (var i = 0; i < BoardSize; i++)
        for (var j = 0; j < BoardSize; j++)
            this._digits[i][j].clear();
    this.updateAllowed();
};

Board.prototype.reset = function () {
    for (var i = 0; i < BoardSize; i++)
        for (var j = 0; j < BoardSize; j++) {
            var cell = this._digits[i][j];
            if (!cell.isGiven())
                cell.clear();
        }
    this.updateAllowed();
};

Board.prototype.checkIsValidSibs = function (loc, digit, locs) {
    for (var i = 0; i < locs.length; i++) {
        var loc = locs[i];
        var cell = this._digits[loc.row][loc.col];
        if (cell.getAnswer() == digit)
            return false;
    }
    return true;
};

Board.prototype.checkIsValid = function (loc, digit) {
    if (!this.checkIsValidSibs(loc, digit, loc.colSibs()))
        return false;
    if (!this.checkIsValidSibs(loc, digit, loc.rowSibs()))
        return false;
    if (!this.checkIsValidSibs(loc, digit, loc.squareSibs()))
        return false;

    return true;
};

Board.prototype.acceptPossibles = function () {
    var more = false;
    var locs = Location.grid();
    for (var i = 0; i < locs.length; i++) {
        var loc = locs[i];
        var cell = this._digits[loc.row][loc.col];
        if (!cell.isAssigned() && cell.hasAnswer() && this.checkIsValid(loc, cell.getAnswer())) {
            cell.setValue(cell.getAnswer());
            more = true;
        }
    }
    return more;
};

Board.prototype.checkForHiddenSingles = function (loc, st) {
    var cell = this.getCell(loc);
    if (!cell.isAssigned() && !cell.hasAnswer()) {
        var allowed = cell.getAllowedClone();
        var locs = loc.getSibs(st);
        for (var i = 0; i < locs.length; i++) {
            var sib = locs[i];
            var sibCell = this.getCell(sib);
            if (!sibCell.isAssigned())
                allowed.removeValues(sibCell.getAllowedClone());
        }
        var answer = allowed.getSingle();
        if (answer != 0) {
            cell.setAnswer(answer);
            return true;
        }
    }
    return false;
};

Board.prototype.findCellWithFewestChoices = function () {
    var minLocation = Location.empty;
    var minCount = 9;
    var locs = Location.grid();
    for (var i = 0; i < locs.length; i++) {
        var loc = locs[i];
        var cell = this.getCell(loc);
        if (!cell.isAssigned()) {
            var count = cell.getAllowedClone().count();
            if (count < minCount) {
                minLocation = loc;
                minCount = count;
            }
        }
    }
    return minLocation;
};

Board.prototype.updateAllowed = function () {

    var cols = new Array(BoardSize);
    var rows = new Array(BoardSize);
    var squares = new Array(BoardSize);

    var locs = Location.grid();
    for (var i = 0; i < locs.length; i++) {
        var loc = locs[i];
        var contains = this.getCell(loc).valueMask();
        rows[loc.row] |= contains;
        cols[loc.col] |= contains;
        squares[loc.getSquare()] |= contains;
    }

    this._isValid = true;
    this._isSolved = true;
    for (var i = 0; i < locs.length; i++) {
        var loc = locs[i];
        var contains = rows[loc.row] | cols[loc.col] | squares[loc.getSquare()];
        var cell = this.getCell(loc);
        cell.setAllowed(~contains);
        cell.setAnswer(0);
        if (!cell.isAssigned()) {
            this._isSolved = false;
            var mask = new AllowedValues(~contains);
            var count = mask.count();
            if (count == 0)
                this._isValid = false;
            else if (count == 1)
                cell.setAnswer(mask.getSingle());
        }
    }

    for (var i = 0; i < locs.length; i++) {
        var loc = locs[i];
        if (!this.checkForHiddenSingles(loc, SibType.Row))
            if (!this.checkForHiddenSingles(loc, SibType.Col))
                this.checkForHiddenSingles(loc, SibType.Square);
    }

};

Board.prototype.trySolve = function (loc, value) {
    if (!loc.isEmpty())
    {
        var cell = this.getCell(loc);
        if (!cell.isAllowed(value))
            throw "Internal error.";
        cell.setValue(value);
    }

    do {
        this.updateAllowed();
        if (!this._isValid)
            return false;
    } while (this.acceptPossibles());

    if (this._isSolved)
        return true;

    if (!this._isValid)
        return false;

    var locChoice = this.findCellWithFewestChoices();
    if (locChoice.isEmpty())
        return false;

    var cell = this.getCell(locChoice);
    var allowedValues = cell._allowed.allowedValuesArray();
    for (var i = 0; i < allowedValues.length; i++) {
        var val = allowedValues[i];
        var board = this.clone();
        if (board.trySolve(locChoice, val)) {
            board.copyTo(this);
            return true;
        }
    }

    return false;
};

Board.prototype.toString = function () {
    var text = "";
    for (var row = 0; row < BoardSize; row++)
        for (var col = 0; col < BoardSize; col++) {
            var val = this._digits[row][col].getValue();
            text += val == 0 ? "." : String(val);
        }
    return text;
};

Board.prototype.setString = function (value) {
    if (value.length != (BoardSize * BoardSize))
        return false;
    var n = 0;
    for (var row = 0; row < BoardSize; row++)
        for (var col = 0; col < BoardSize; col++) {
            var ch = parseInt(value.charAt(n++));
            var cell = this._digits[row][col];
            cell.setGiven(!isNaN(ch) ? ch : 0);
        }
    this.updateAllowed();
    return true;
};

var CellSize = 60;
var SubCellSize = 18;

var canvas1 = document.getElementById("canvas1");
var extraInfo = document.getElementById("extraInfo");

var board1 = new Board();
var selectRow = 0;
var selectCol = 0;
var showAllowed = false;
var showSingles = false;
var undoStack = Array();

function undo() {
    var tos = undoStack.pop();
    if (tos) {
        board1 = tos;
        updateUI();
    }
}

function clearUndo() {
    undoStack= Array();
}

function pushBoard() {
    undoStack.push(board1.clone());
}

function checkStatus() {
    extraInfo.innerHTML = "";
    if (!board1._isValid)
        swal('INVALID',"","error");//message.innerHTML = "*Invalid*";
    else if (board1._isSolved)
        swal("SOLVED","","success");//message.innerHTML = "*Solved*";
    else
        message.innerHTML = "";
}
function drawGrid() {
    var context = canvas1.getContext('2d');
    context.fillStyle="#74b9ff ";
    context.fillRect(180.33,0,180.33,180.33);
    context.fillRect(0,180.33,180.33,180.33);
    context.fillRect(360.66,180.33,180.33,180.33);
    context.fillRect(180.33,360.66,180.33,180.33);

    context.strokeStyle = '#b3e7ff';
    for (var i = 0; i <= BoardSize; i++) {
        context.beginPath();
        var thick = i % 3 == 0;
        context.lineWidth = thick ? 2 : 1;
        context.moveTo(i * CellSize + 0.5, 0.5);
        context.lineTo(i * CellSize + 0.5, BoardSize * CellSize + 0.5);

        context.moveTo(0.5, i * CellSize + 0.5);
        context.lineTo(BoardSize * CellSize + 0.5, i * CellSize + 0.5);
        context.stroke();
    }
    
}

function drawCells() {
    var context = canvas1.getContext('2d');

    context.font = "12pt Lato";
    context.textAlign = "center";
    context.textBaseline = "middle";
    var normalColor = "#aaaaaa";
    var singleColor = "#ff143c";

    for (var row = 0; row < BoardSize; row++)
        for (var col = 0; col < BoardSize; col++) {

            if (row == selectRow && col == selectCol) {
                var margin = 2;
                context.beginPath();
                context.rect(col * CellSize + margin + 0.5, row * CellSize + margin + 0.5, CellSize - 2 * margin, CellSize - 2 * margin);
                context.fillStyle = "#cdd4ce";
                context.fill();
            }
        }
    context.fillStyle = "#999999";

    if (showAllowed)
        for (var row = 0; row < BoardSize; row++)
            for (var col = 0; col < BoardSize; col++) {
                var cell = board1.getCell(new Location(row, col));
                if (!cell.isAssigned()) {
                    var allowedValues = cell._allowed.allowedValuesArray();
                    for (var i = 0; i < allowedValues.length; i++) {
                        var val = allowedValues[i];
                        var x = (col + 0.5) * CellSize;
                        var y = (row + 0.5) * CellSize;
                        var subRow = Math.floor((val - 1) / 3) - 1;
                        var subCol = Math.floor((val - 1) % 3) - 1;
                        x += subCol * SubCellSize;
                        y += subRow * SubCellSize;
                        var hiddenSingle = allowedValues.length != 1 && val == cell.getAnswer();
                        context.fillStyle = normalColor;
                        if (showSingles && val == cell.getAnswer())
                            context.fillStyle = singleColor;
                        context.fillText(val, x, y);
                    }
                }
            }

    var selectCell = board1.getCell(new Location(selectRow, selectCol));
    var selectValue = selectCell.getValue();

    context.font = "32pt Lato";
    context.textAlign = "center";
    context.textBaseline = "middle";
    var normalForeColor = "#191929";
    var sameDigitForeColor = "#40407a";
    context.fillStyle = normalForeColor;
    for (var row = 0; row < BoardSize; row++)
        for (var col = 0; col < BoardSize; col++) {
            var cell = board1.getCell(new Location(row, col));
            var x = (col + 0.5) * CellSize;
            var y = (row + 0.5) * CellSize;
            var sameDigit = cell.getValue() == selectValue && selectValue != 0;
            var value = cell.getValue();
            if (value != 0) {
                context.fillStyle = cell.isGiven() ? "#ffffff" : "#ffda79";
                if (sameDigit)
                    context.fillStyle = sameDigitForeColor;
                context.fillText(value, x, y);
            }
        }
}

function drawCanvas() {
    canvas1.width = canvas1.width;
    drawGrid();
    drawCells();
}

function updateUI() {
    drawCanvas();
    checkStatus();
    tbSerial.value = board1.toString();
}

function readOptions() {
    drawCanvas();
}


function selectCell(row, col) {
    selectRow = row;
    selectCol = col;
    drawCanvas();
}

function moveSelection(row, col) {
    selectRow += row;
    selectCol += col;
    if (selectRow < 0)
        selectRow = 8;
    else if (selectRow > 8)
        selectRow = 0;
    if (selectCol < 0)
        selectCol = 8;
    else if (selectCol > 8)
        selectCol = 0;
    drawCanvas();
}

function setDigitInCell(digit) {
    var cell = board1.getCell(new Location(selectRow, selectCol));
    message.innerHTML = "";
    if (cell.isGiven())
        return;
    if (digit != 0 && !cell.isAllowed(digit)) {
        message.innerHTML = "Digit not allowed";
        return;
    }
    pushBoard();
    cell.setValue(digit);
    board1.updateAllowed();
    updateUI();
}

canvas1.onmousedown = function canvasMouseDown(ev) {
    var x = ev.pageX - this.offsetLeft;
    var y = ev.pageY - this.offsetTop;
    var coords = this.relMouseCoords(ev);
    selectCell(Math.floor(coords.y / CellSize), Math.floor(coords.x / CellSize));
}

document.onkeydown = function (ev) {
    switch (ev.keyCode) {
        case 37:
            moveSelection(0, -1);
            break;
        case 38:
            moveSelection(-1, 0);
            break;
        case 39:
            moveSelection(0, 1);
            break;
        case 40:
            moveSelection(1, 0);
            break;
        default:
            var key = Number(ev.keyCode);
            var digit = key >= 96 ? key - 96 : key - 48;
            if (digit >= 0 && digit <= 9)
                setDigitInCell(digit);
            break;
    }
}

/*function loadText() {
    var ret = board1.setString(tbSerial.value);
    updateUI();
    if (!ret)
        message.innerHTML = "String is not of length 81";
}*/


function acceptPossibles() {
    pushBoard();
    board1.acceptPossibles();
    board1.updateAllowed();
    updateUI();
}

function hint() {
    solution = board1.clone();
    if (solution.trySolve(Location.empty, 0)) {
        var cell = solution.getCell(new Location(selectRow, selectCol));
        if (!cell.isGiven())
            setDigitInCell(cell.getValue());
    }
}

function reset() {
    clearUndo();
    board1.reset();
    updateUI();
}

function solve() {
    pushBoard();
    var n = new Date();
    var s = n.getTime();
    board1.trySolve(Location.empty, 0);
    var diff = new Date().getTime() - s;
    updateUI();
    extraInfo.innerHTML = "Solve took " + String(diff) + " milliseconds";
}

let context = canvas1.getContext('2d');
context.font = "Lato";
board1.setString(".....6..1.87..5..........823..1.4..6..43.8.....95..43...6......9....125.2.37.9...");
updateUI();
var digCellSize = 54;

function initDigitSource() {
    var context = canvas2.getContext('2d');
    context.strokeStyle = '#808080';
    var SourceSize = BoardSize + 1;
    for (var i = 0; i <= SourceSize; i++) {
        context.beginPath();
        context.lineWidth = 1;
        context.moveTo(i * digCellSize + 0.5, 0.5);
        context.lineTo(i * digCellSize + 0.5, digCellSize + 0.5);
        context.stroke();
    }
    for (var i = 0; i <= 1; i++) {
        context.beginPath();
        context.lineWidth = 1;
        context.moveTo(0.5, i * digCellSize + 0.5);
        context.lineTo(SourceSize * digCellSize + 0.5, i * digCellSize + 0.5);
        context.stroke();
    }
    context.font = "24pt Lato";
    context.textAlign = "center";
    context.textBaseline = "middle";
    var normalForeColor = "#708090";
    context.fillStyle = normalForeColor;
    for (var col = 0; col < SourceSize; col++) {
        var x = (col + 0.5) * digCellSize;
        var y = 0.5 * digCellSize;
        var value = col < 9 ? col + 1 : "Del";
        context.fillStyle = normalForeColor;
        context.fillText(value, x, y);
    }

}
initDigitSource();

canvas2.onmousedown = function canvasMouseDown(ev) {
    var x = ev.pageX - this.offsetLeft;
    var y = ev.pageY - this.offsetTop;
    var coords = this.relMouseCoords(ev);
    var dig = Math.floor(coords.x / digCellSize) + 1;
    if (dig == 10)
        dig = 0;
    setDigitInCell(dig);
}