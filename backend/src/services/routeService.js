/**
 * Route planning across the hospital floor.
 *
 * The floor is a grid. A* is a reasonable fit here: the space is small enough
 * that an optimal path is cheap to compute, and hospital staff expect the robot
 * to take the obvious corridor rather than a clever-looking diagonal shortcut
 * through a doorway it cannot physically fit through. Movement is therefore
 * restricted to four directions.
 */

import ApiError from '../utils/ApiError.js';

const CARDINAL_MOVES = [
  [0, -1], // north
  [1, 0], // east
  [0, 1], // south
  [-1, 0], // west
];

const key = (x, y) => `${x},${y}`;

/** Manhattan distance — admissible for 4-directional movement, so A* stays optimal. */
const heuristic = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);

/**
 * A tiny binary heap. An array sort on every pop would dominate the runtime
 * once the grid grows past a few hundred cells.
 */
class MinHeap {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(node) {
    this.items.push(node);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].f <= this.items[i].f) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop() {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.items.length && this.items[left].f < this.items[smallest].f) smallest = left;
        if (right < this.items.length && this.items[right].f < this.items[smallest].f) smallest = right;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

/**
 * Builds a Set of blocked cells for O(1) lookup.
 * @param {number[][]} obstacles pairs of [x, y]
 */
export const buildObstacleSet = (obstacles = []) =>
  new Set(obstacles.map(([x, y]) => key(x, y)));

/**
 * Cost added for changing direction. Small enough that it can never outweigh a
 * single extra step on a grid this size (worst case 20*14 turns * 0.001 = 0.28),
 * so the path returned is still the shortest one — turns only break ties between
 * equally short routes. Without this, A* returns a staircase across open floor;
 * with it, the robot runs the corridor and turns once, which is what staff expect
 * to see and what a real drivetrain would actually do.
 */
const TURN_PENALTY = 0.001;

/** Search state includes heading, since arriving at a cell facing a different way costs differently. */
const stateKey = (x, y, dir) => `${x},${y},${dir}`;

/**
 * Finds the shortest obstacle-aware path between two grid cells, preferring
 * routes with fewer turns among those of equal length.
 *
 * @returns {number[][]} cells from start to goal inclusive, or [] if unreachable.
 */
export const findPath = (start, goal, grid) => {
  const width = grid?.width ?? 20;
  const height = grid?.height ?? 14;
  const blocked = buildObstacleSet(grid?.obstacles);

  const [sx, sy] = start;
  const [gx, gy] = goal;

  const inBounds = (x, y) => x >= 0 && y >= 0 && x < width && y < height;
  if (!inBounds(sx, sy) || !inBounds(gx, gy)) return [];
  // A goal sitting on an obstacle is a data problem, not a pathfinding one.
  if (blocked.has(key(gx, gy))) return [];
  if (blocked.has(key(sx, sy))) return [];
  if (sx === gx && sy === gy) return [[sx, sy]];

  const open = new MinHeap();
  // -1 means "no heading yet", so the first move is never counted as a turn.
  const startKey = stateKey(sx, sy, -1);
  const gScore = new Map([[startKey, 0]]);
  const cameFrom = new Map();
  const closed = new Set();

  open.push({ x: sx, y: sy, dir: -1, g: 0, f: heuristic(sx, sy, gx, gy) });

  while (open.size) {
    const current = open.pop();
    const currentKey = stateKey(current.x, current.y, current.dir);

    if (current.x === gx && current.y === gy) {
      const path = [[current.x, current.y]];
      let cursor = currentKey;
      while (cameFrom.has(cursor)) {
        const prev = cameFrom.get(cursor);
        path.push([prev.x, prev.y]);
        cursor = stateKey(prev.x, prev.y, prev.dir);
      }
      return path.reverse();
    }

    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    for (let dir = 0; dir < CARDINAL_MOVES.length; dir += 1) {
      const [dx, dy] = CARDINAL_MOVES[dir];
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (!inBounds(nx, ny) || blocked.has(key(nx, ny))) continue;

      const nKey = stateKey(nx, ny, dir);
      if (closed.has(nKey)) continue;

      const turned = current.dir !== -1 && current.dir !== dir;
      const tentative = current.g + 1 + (turned ? TURN_PENALTY : 0);

      if (tentative < (gScore.get(nKey) ?? Infinity)) {
        gScore.set(nKey, tentative);
        cameFrom.set(nKey, { x: current.x, y: current.y, dir: current.dir });
        open.push({
          x: nx,
          y: ny,
          dir,
          g: tentative,
          f: tentative + heuristic(nx, ny, gx, gy),
        });
      }
    }
  }

  return []; // No corridor connects the two cells.
};

/**
 * Strips cells that only continue a straight line, keeping the turns. The 3D
 * scene interpolates between waypoints, so fewer collinear points means less
 * data on the wire and identical motion.
 */
export const simplifyPath = (path) => {
  if (path.length <= 2) return path;
  const out = [path[0]];
  for (let i = 1; i < path.length - 1; i += 1) {
    const [px, py] = path[i - 1];
    const [cx, cy] = path[i];
    const [nx, ny] = path[i + 1];
    const turning = (cx - px) !== (nx - cx) || (cy - py) !== (ny - cy);
    if (turning) out.push([cx, cy]);
  }
  out.push(path[path.length - 1]);
  return out;
};

/**
 * Plans a route between two named departments.
 * @param {object} hospital a Hospital document
 */
export const planDepartmentRoute = (hospital, fromName, toName) => {
  const resolveCell = (name) => {
    if (!name || /waste\s*station/i.test(name)) {
      return [hospital.wasteStation.x, hospital.wasteStation.y];
    }
    const dept = hospital.departments.find(
      (d) => d.name.toLowerCase() === String(name).toLowerCase()
    );
    return dept ? [dept.cell.x, dept.cell.y] : null;
  };

  const from = resolveCell(fromName);
  const to = resolveCell(toName);

  // These are caller mistakes — a department that does not exist, or a floor plan
  // that walls one off — so they carry a 4xx rather than surfacing as a crash.
  if (!from) throw ApiError.badRequest(`Unknown origin "${fromName}"`);
  if (!to) throw ApiError.badRequest(`Unknown destination "${toName}"`);

  const raw = findPath(from, to, hospital.grid);
  if (!raw.length) {
    throw ApiError.badRequest(
      `No route from "${fromName}" to "${toName}" — the floor plan blocks every path`
    );
  }

  return {
    route: simplifyPath(raw),
    fullPath: raw,
    /** Cells traversed, start and goal inclusive. */
    cells: raw.length,
    /** Steps the robot actually drives, which is one fewer than the cell count. */
    length: raw.length - 1,
  };
};

export default { findPath, simplifyPath, planDepartmentRoute, buildObstacleSet };
