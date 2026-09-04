export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)

  const data = await $fetch(`${config.public.apiBaseUrl}/api/v1/itineraries`, {
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
    },
    params: query,
  })

  return data
})
