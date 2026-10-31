import type { components } from '../../../src/api/schema.gen'
import { API, HEADERS } from './tickets'

export type OlyaReport = components['schemas']['OlyaReport']

const mock = new URLSearchParams(window.location.search).get('mock')

export async function getReport(): Promise<OlyaReport> {
  const res = await fetch(`${API}/api/report${mock ? `?mock=${encodeURIComponent(mock)}` : ''}`, { headers: HEADERS })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}
