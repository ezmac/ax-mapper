// RaceBox Mini BLE client — Nordic UART Service, UBX binary protocol
// UART Service: 6E400001-B5A3-F393-E0A9-E50E24DCCA9E
// TX char (notify): 6E400003-B5A3-F393-E0A9-E50E24DCCA9E
// RX char (write):  6E400002-B5A3-F393-E0A9-E50E24DCCA9E

const UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
const TX_CHAR      = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'

export interface RaceBoxFix {
  lat: number
  lon: number
  accuracyM: number
  fixType: number    // 3 = 3D fix
  numSV: number
  speedMps: number
  headingDeg: number
}

export type RaceBoxListener = (fix: RaceBoxFix) => void

export interface RaceBoxClient {
  disconnect(): void
}

// UBX checksum: Fletcher over bytes from class to end of payload
function ubxChecksum(buf: Uint8Array, from: number, len: number): [number, number] {
  let a = 0, b = 0
  for (let i = from; i < from + len; i++) {
    a = (a + buf[i]) & 0xff
    b = (b + a) & 0xff
  }
  return [a, b]
}

export async function connectRaceBox(onFix: RaceBoxListener): Promise<RaceBoxClient> {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: 'RaceBox' }],
    optionalServices: [UART_SERVICE],
  })

  const server = await device.gatt!.connect()
  const service = await server.getPrimaryService(UART_SERVICE)
  const txChar = await service.getCharacteristic(TX_CHAR)

  // Reassembly buffer — packets can split across BLE notifications
  let buf = new Uint8Array(0)

  function append(chunk: DataView) {
    const next = new Uint8Array(buf.length + chunk.byteLength)
    next.set(buf, 0)
    next.set(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength), buf.length)
    buf = next
  }

  function consume() {
    while (buf.length >= 6) {
      // Find sync
      if (buf[0] !== 0xb5 || buf[1] !== 0x62) {
        // Scan forward for next sync
        let i = 1
        while (i < buf.length - 1 && !(buf[i] === 0xb5 && buf[i + 1] === 0x62)) i++
        buf = buf.slice(i)
        if (buf.length < 6) break
      }

      const payloadLen = buf[4] | (buf[5] << 8)
      const totalLen = 6 + payloadLen + 2  // header(6) + payload + cksum(2)
      if (buf.length < totalLen) break      // wait for more data

      const msgClass = buf[2]
      const msgId = buf[3]

      // Validate checksum
      const [ckA, ckB] = ubxChecksum(buf, 2, 4 + payloadLen)
      if (buf[6 + payloadLen] !== ckA || buf[7 + payloadLen] !== ckB) {
        // Bad checksum — drop one byte and resync
        buf = buf.slice(1)
        continue
      }

      if (msgClass === 0xff && msgId === 0x01 && payloadLen >= 68) {
        parseDataMessage(buf.slice(6, 6 + payloadLen))
      }

      buf = buf.slice(totalLen)
    }
  }

  function parseDataMessage(p: Uint8Array) {
    const view = new DataView(p.buffer, p.byteOffset, p.byteLength)

    const fixType = p[20]
    const fixFlags = p[21]
    const latLonFlags = p[66]

    // Require 3D fix, valid fix flag, and valid lat/lon
    if (fixType !== 3 || (fixFlags & 0x01) === 0 || (latLonFlags & 0x01) !== 0) return

    const lon = view.getInt32(24, true) / 1e7
    const lat = view.getInt32(28, true) / 1e7
    const accuracyM = view.getUint32(40, true) / 1000
    const numSV = p[23]
    const speedMps = view.getInt32(44, true) / 1000
    const headingDeg = view.getInt32(64, true) / 100000

    onFix({ lat, lon, accuracyM, fixType, numSV, speedMps, headingDeg })
  }

  txChar.addEventListener('characteristicvaluechanged', (e) => {
    const target = e.target as BluetoothRemoteGATTCharacteristic
    if (target.value) {
      append(target.value)
      consume()
    }
  })

  await txChar.startNotifications()

  return {
    disconnect() {
      txChar.stopNotifications().catch(() => {})
      device.gatt?.disconnect()
    },
  }
}
