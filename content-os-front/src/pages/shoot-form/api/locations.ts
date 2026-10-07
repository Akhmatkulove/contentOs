import { http, type Schemas } from '@/shared/api'

export type LocationSuggestion = Schemas['LocationSuggestion']

// Addresses in Uzbekistan for the Location field (Yandex Geosuggest, via the backend).
export async function fetchLocationSuggestions(query: string): Promise<LocationSuggestion[]> {
  return (await http.get<LocationSuggestion[]>('/locations/suggest', { params: { q: query } })).data
}
