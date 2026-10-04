import { useEffect, useState } from 'react'
import {
  MIN_TOTAL_BID, TARGET, TRICKS_PER_ROUND,
  currentDealer, currentScores, isValidBid, minBid, roundDelta, runningTotals, winner,
  type Game,
} from './game'

const STORAGE_KEY = 'scores-401-game-v2'

function load(): Game | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Game) : null
  } catch {
    return null
  }
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n)
}

function Setup({ onStart }: { onStart: (g: Game) => void }) {
  const [names, setNames] = useState(['', '', '', ''])
  const [dealer, setDealer] = useState(0)
  const final = names.map((n, i) => n.trim() || `لاعب ${i + 1}`)
  return (
    <div className="card">
      <h2>لعبة جديدة</h2>
      <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        {names.map((n, i) => (
          <input
            key={i}
            placeholder={`لاعب ${i + 1}`}
            value={n}
            onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))}
          />
        ))}
        <label className="row">
          أول موزّع:
          <select value={dealer} onChange={(e) => setDealer(Number(e.target.value))}>
            {final.map((n, i) => <option key={i} value={i}>{n}</option>)}
          </select>
        </label>
        <button className="primary" onClick={() => onStart({ players: final, firstDealer: dealer, rounds: [] })}>
          ابدأ اللعبة
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [game, setGame] = useState<Game | null>(load)
  const [dealerOverride, setDealerOverride] = useState<number | null>(null)
  const [bids, setBids] = useState<string[]>(['', '', '', ''])
  const [earned, setEarned] = useState<(boolean | null)[]>([null, null, null, null])

  useEffect(() => {
    try {
      if (game) localStorage.setItem(STORAGE_KEY, JSON.stringify(game))
      else localStorage.removeItem(STORAGE_KEY)
    } catch { /* storage unavailable */ }
  }, [game])

  if (!game) return <><h1>نتائج ٤١</h1><Setup onStart={setGame} /></>

  const history = runningTotals(game)
  const scores = currentScores(game)
  const win = winner(game)
  const dealer = dealerOverride ?? currentDealer(game)

  const bidNums = bids.map(Number)
  const bidValid = bids.map((b, i) => b !== '' && bidNums[i] >= minBid(scores[i]) && isValidBid(bidNums[i]))
  const earnedTotal = bidNums.reduce((a, b, i) => a + (earned[i] === true ? b : 0), 0)
  const earnedTooMany = earnedTotal > TRICKS_PER_ROUND
  const complete = bidValid.every(Boolean) && earned.every((e) => e !== null) && !earnedTooMany
  const bidSum = bidNums.reduce((a, c) => a + c, 0)
  const lowTotal = bidValid.every(Boolean) && bidSum < MIN_TOTAL_BID

  const resetPending = () => {
    setBids(['', '', '', ''])
    setEarned([null, null, null, null])
  }
  const setBid = (i: number, v: string) => {
    setBids(bids.map((x, j) => (j === i ? v : x)))
    setEarned(earned.map((x, j) => (j === i ? null : x)))
  }
  const setResult = (i: number, v: boolean) =>
    setEarned(earned.map((x, j) => (j === i ? (x === v ? null : v) : x)))

  const save = () => {
    setGame({ ...game, rounds: [...game.rounds, { dealer, bids: bidNums, earned: earned as boolean[] }] })
    setDealerOverride(null)
    resetPending()
  }
  const skip = () => {
    setDealerOverride((dealer + 1) % game.players.length)
    resetPending()
  }
  const undo = () => {
    if (!confirm('حذف آخر جولة؟')) return
    setGame({ ...game, rounds: game.rounds.slice(0, -1) })
    setDealerOverride(null)
    resetPending()
  }
  const newGame = () => {
    if (confirm('التخلي عن هذه اللعبة وبدء لعبة جديدة؟')) {
      setGame(null)
      setDealerOverride(null)
      resetPending()
    }
  }

  return (
    <>
      <div className="row spread">
        <h1>نتائج ٤١</h1>
        <button onClick={newGame}>لعبة جديدة</button>
      </div>
      {win !== null && <div className="banner">فاز {game.players[win]} بـ {scores[win]} نقطة!</div>}
      <div className="card scroll">
        <table className="board">
          <thead>
            <tr>
              {game.players.map((n, i) => <th key={i}>{n}</th>)}
              <th>العمليات</th>
            </tr>
          </thead>
          <tbody>
            {game.rounds.map((r, ri) => (
              <tr key={ri}>
                {r.bids.map((bid, i) => {
                  const d = roundDelta(bid, r.earned[i])
                  return (
                    <td key={i} className={r.earned[i] ? 'pos' : 'neg'}>
                      {r.dealer === i && <span className="dbadge">م</span>}
                      <span className="num">{signed(d)} / {history[ri][i]}</span>
                    </td>
                  )
                })}
                <td>
                  {ri === game.rounds.length - 1 && <button onClick={undo} title="حذف آخر جولة">🗑</button>}
                </td>
              </tr>
            ))}
            {win === null && (
              <tr className="current">
                {game.players.map((_, i) => {
                  const e = earned[i]
                  return (
                    <td key={i}>
                      <div className="cell">
                        <button
                          className={`dbadge ${dealer === i ? '' : 'off'}`}
                          onClick={() => setDealerOverride(i)}
                          title={dealer === i ? 'الموزّع' : 'اجعله الموزّع'}
                        >م</button>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="bid"
                          value={bids[i]}
                          onChange={(ev) => setBid(i, ev.target.value.replace(/\D/g, '').slice(0, 2))}
                        />
                      </div>
                      <div className="cell">
                        <button className={e === true ? 'on-good' : ''} disabled={!bidValid[i]}
                          onClick={() => setResult(i, true)} title="كسب الطلب">👍</button>
                        <button className={e === false ? 'on-bad' : ''} disabled={!bidValid[i]}
                          onClick={() => setResult(i, false)} title="لم يكسب الطلب">👎</button>
                      </div>
                      <div className={`muted ${e === null ? '' : e ? 'pos' : 'neg'}`}>
                        {e === null ? `النتيجة ${scores[i]}` : <span className="num">{signed(roundDelta(bidNums[i], e))} / {scores[i] + roundDelta(bidNums[i], e)}</span>}
                      </div>
                    </td>
                  )
                })}
                <td>
                  <div className="cell">
                    <button className="primary" disabled={!complete} onClick={save}>حفظ</button>
                    <button onClick={skip} title="مسح المدخلات وتمرير التوزيع إلى اللاعب التالي">تخطّي</button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {earnedTooMany && win === null && (
          <p className="error">مجموع الطلبات المكسوبة {earnedTotal} وهو أكبر من {TRICKS_PER_ROUND}: راجع الإبهامات.</p>
        )}
        {lowTotal && win === null && (
          <p className="error">مجموع الطلبات {bidSum} وهو أقل من {MIN_TOTAL_BID}: يجب إعادة التوزيع.</p>
        )}
        <p className="muted">كل خانة تعرض نقاط الجولة / المجموع الجديد. أول من يصل إلى {TARGET} يفوز.</p>
      </div>
    </>
  )
}
