import { useEffect, useState } from 'react'

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

function Roller({ digit, settled }: { digit: number; settled: boolean }) {
  return (
    <span className="roller" aria-hidden>
      <span style={{ transform: `translateY(${settled ? -digit * 10 : 0}%)` }}>
        {DIGITS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </span>
    </span>
  )
}

/** Analyser-style number: each digit rolls to its value instead of a JS count-up, so it costs no re-renders. */
export function Readout({ text, className = '' }: { text: string; className?: string }) {
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSettled(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const chars = [...text]
  return (
    <span className={`font-mono whitespace-nowrap ${className}`}>
      <span className="sr-only">{text}</span>
      {chars.map((char, index) => {
        const fromEnd = chars.length - index
        const digit = Number(char)
        return Number.isInteger(digit) && char !== ' ' ? (
          <Roller key={fromEnd} digit={digit} settled={settled} />
        ) : (
          <span key={fromEnd} aria-hidden className="inline-block align-bottom leading-[1.2em]">
            {char}
          </span>
        )
      })}
    </span>
  )
}
