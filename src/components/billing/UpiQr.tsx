import qrcode from 'qrcode-generator'

/**
 * Black on white whatever the theme, because phone cameras need that contrast to read it.
 * Low error correction keeps the squares large, since a clean screen needs little recovery.
 */
export default function UpiQr({ value }: { value: string }) {
  const code = qrcode(0, 'L')
  code.addData(value)
  code.make()
  const size = code.getModuleCount()
  let path = ''
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (code.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`
    }
  }
  return (
    <svg viewBox={`-2 -2 ${size + 4} ${size + 4}`} shapeRendering="crispEdges" role="img" aria-label="UPI payment QR code" className="block w-full">
      <rect x={-2} y={-2} width={size + 4} height={size + 4} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  )
}
