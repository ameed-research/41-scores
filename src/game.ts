export const TARGET = 41
export const TRICKS_PER_ROUND = 13
export const MIN_TOTAL_BID = 11
export const PLAYER_COUNT = 4

export interface Round {
  dealer: number
  bids: number[]
  /** true = the player earned the bid, false = did not */
  earned: boolean[]
}

export interface Game {
  players: string[]
  firstDealer: number
  rounds: Round[]
}

export const INVALID_BID = 6

/** Points at stake for a bid: 7-12 count double, 13 is worth 41 */
export function bidValue(bid: number): number {
  if (bid === TRICKS_PER_ROUND) return 41
  if (bid >= 7) return bid * 2
  return bid
}

export function isValidBid(bid: number): boolean {
  return bid >= 2 && bid <= TRICKS_PER_ROUND && bid !== INVALID_BID
}

export function roundDelta(bid: number, earned: boolean): number {
  return earned ? bidValue(bid) : -bidValue(bid)
}

/** Running totals after each round: result[round][player] */
export function runningTotals(game: Game): number[][] {
  const out: number[][] = []
  let prev = game.players.map(() => 0)
  for (const r of game.rounds) {
    prev = prev.map((s, i) => s + roundDelta(r.bids[i], r.earned[i]))
    out.push(prev)
  }
  return out
}

export function currentScores(game: Game): number[] {
  const rt = runningTotals(game)
  return rt.length ? rt[rt.length - 1] : game.players.map(() => 0)
}

// (6 is never a valid bid, so it becomes 7)
// 0-29 -> 2, 30-39 -> 3, 40-49 -> 4 ... 90-99 -> 9, capped at 13
export function minBid(score: number): number {
  if (score < 30) return 2
  const m = Math.min(TRICKS_PER_ROUND, Math.floor(score / 10))
  return m === INVALID_BID ? INVALID_BID + 1 : m
}

export function winner(game: Game): number | null {
  const t = currentScores(game)
  const top = Math.max(...t)
  return top >= TARGET ? t.indexOf(top) : null
}

export function currentDealer(game: Game): number {
  const last = game.rounds[game.rounds.length - 1]
  return last ? (last.dealer + 1) % PLAYER_COUNT : game.firstDealer
}
