export type BBox = [number, number, number, number] // [west, south, east, north]
export type Format = 'png' | 'jpeg' | 'jpg'

interface Options {
  title: string
  url: string
  format: Format
  identifier: string
  minzoom: number
  maxzoom: number
  spaces?: number
  abstract?: string
  bbox?: BBox
  abstract?: string
  keywords?: string[]
  accessConstraints?: string
  fees?: string
}

interface ExceptionOptions {
  spaces?: number
}

export function getCapabilities (options: Options): string
export function exception (message: string, options: ExceptionOptions): string