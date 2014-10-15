document.addEventListener('DOMContentLoaded', function() {
  document.write('<div id="tis-root" style="position:fixed;width:280px;height:400px;left:50%;top:50%;margin:-240px -160px;background:rgba(0,0,0,0.8);box-shadow:0 0 30px #000;border-radius:30px;padding:40px"><div id="tis-grid" style="background:#000;width:200px;height:400px;box-shadow:0 0 10px #222;"></div><div id="tis-status" style="position:absolute;right:20px;top:40px;width:80px;color:#eee;font:normal 15px sans-serif"></div></div>');
  var gridElt = document.getElementById('tis-grid'),
      gridElts = [],
      statusElt = document.getElementById('tis-status'),
      grid = [],
      shadowGrid = [],
      w = 10,
      h = 22,
      s = w*h,
      // I J L O S T Z
      backgroundLUT = '#080808 #0dd #44f #e80 #ee0 #0e0 #a0a #f22'.split(' '),
      // http://tetris.wikia.com/wiki/SRS
      //     1     2     4     8
      //    16    32    64   128
      //   256   512  1024  2048
      //  4096  8192 16384 32768
      shapes = [
        ,
        [240, 17476, 3840, 8738], // I
        [113, 550, 1136, 802], // J
        [116, 1570, 368, 547], // L
        [102, 102, 102, 102], // O
        [54, 1122, 864, 561], // S
        [114, 610, 624, 562], // T
        [99, 612, 1584, 306]], // Z
      currentTetromino,
      currentX,
      currentY,
      currentRotation,
      lock = 1,
      lost,
      score = 0,
      lines = 0,
      level = 1,
      bag = [],
      i, x, y, rx, ry, tmp, tmp2
      ;

  for (i = 0; i < s; i++) {
    grid.push(0);
    if (i > 19)
      gridElt.innerHTML += '<div id="tis-' + i + '" style="width:20px;height:20px;float:left;box-shadow:-2px -2px 8px rgba(0,0,0,0.4) inset, 0 0 2px #000 inset;"></div>';
  }
  // No idea why we need a separate loop. But it breaks otherwise.
  for (i = 20; i < s; i++) {
    gridElts[i] = document.getElementById('tis-' + i);
  }

  function render() {
    // TODO show ghost piece
    for (y = 0; y < h; y++)
      for (x = 0; x < w; x++) {
        i = y*w + x;
        shadowGrid[i] = (currentTetromino &&
            x >= currentX && x < currentX+4 &&
            y >= currentY && y < currentY+4 &&
            (shapes[currentTetromino][currentRotation] & (1 << (4 * (y-currentY) + (x-currentX))))) ?
            currentTetromino : grid[i] || 0;
        if (gridElts[i])
          gridElts[i].style.background = backgroundLUT[shadowGrid[i]];
      }
    tmp = '<div style="text-align:right;font-size:150%">';
    statusElt.innerHTML = 'Score' + tmp + score + '</div>Lines' + tmp + lines + '</div>Level' + tmp + level + '</div>';
  }

  function isBlocked(posX, posY, rotation, shape) {
    for (y = 0; y < 4; y++)
      for (x = 0; x < 4; x++) {
        rx = posX + x;
        ry = posY + y;
        if (shapes[currentTetromino][rotation] & (1 << (4*y + x)) &&
            (rx < 0 || rx >= w || ry < 0 || ry >= h || grid[ry*w + rx])) {
          return 1;
        }
      }
    return 0;
  }

  function tick() {
    if (lost) {
      if (lost > 1) {
        for (x = 0; x < w; x++)
          grid[lost*w + x] = 1 + Math.floor(Math.random() * 7);
        render();
        lost--;
        window.setTimeout(tick, 100);
      }
      return;
    }

    if (lock) {
      // Lock it in place
      render();
      for (i = 0; i < s; i++) grid[i] = shadowGrid[i];
      currentTetromino = 0;
      lock = 0;

      // Find full rows
      tmp2 = 0;
      for (y = 0; y < h; y++) {
        tmp = 1;
        for (x = 0; x < w; x++) {
          if (!grid[y*w + x]) {
            tmp = 0;
            break;
          }
        }
        if (tmp) {
          tmp2++;
          for (i = y*w+w-1; i >= 0; i--) {
            grid[i] = grid[i-w];
          }
        }
      }
      score += [0, 100, 300, 500, 800][tmp2] * level;
      lines += tmp2;
      level = 1 + Math.floor(lines / 10);

      // Shuffle bag if needed
      // TODO show next piece
      if (!bag.length) {
        for (i = 0; i < 7; i++) bag[i] = i+1;
        for (i = 0; i < 7; i++) {
          j = Math.floor(Math.random() * 7);
          tmp = bag[j]; bag[j] = bag[i]; bag[i] = tmp;
        }
      }

      // Spawn new tetromino
      currentTetromino = bag.shift();
      currentX = 3;
      currentY = 0;
      currentRotation = 0;
      if (isBlocked(currentX, currentY, currentRotation)) {
        // Game over
        document.removeEventListener('keydown', onKeyDown);
        lost = h;
      }
    } else {
      if (!isBlocked(currentX, currentY + 1, currentRotation))
        currentY++;
      else {
        // TODO lock delay
        lock = true;
      }
    }

    render();
    window.setTimeout(tick, 1000 / (level + 1));
  }
  tick();

  // TODO nicer key repeat, probably use requestAnimationFrame
  function onKeyDown(e) {
    if (lock) return;
    switch (e.keyCode) {
      case 37: // left
        if (!isBlocked(currentX - 1, currentY, currentRotation)) currentX--;
        break;
      case 39: // right
        if (!isBlocked(currentX + 1, currentY, currentRotation)) currentX++;
        break;
      case 38: // up
        // Hard drop
        while (!isBlocked(currentX, currentY + 1, currentRotation)) currentY++;
        lock = true;
        break;
      case 40: // down
        // Soft drop
        if (!isBlocked(currentX, currentY + 1, currentRotation)) currentY++;
      case 90: // z
      case 186: // ; (dvorak)
        // TODO wall kicks
        // http://web.archive.org/web/20081216145551/http://www.the-shell.net/img/srs_study.html
        if (!isBlocked(currentX, currentY, (currentRotation+3) % 4)) currentRotation = (currentRotation+3)%4;
        break;
      case 88: // x
      case 81: // q (dvorak)
        if (!isBlocked(currentX, currentY, (currentRotation+1) % 4)) currentRotation = (currentRotation+1)%4;
        break;
    }
    render();
  }
  document.addEventListener('keydown', onKeyDown);
});
