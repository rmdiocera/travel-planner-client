import { getCountries } from '@countrystatecity/countries'

export default defineEventHandler(async () => {
  const countries = await getCountries()
  const names = countries.map(country => country.name)

  return names
})
