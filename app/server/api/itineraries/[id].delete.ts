export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const id = getRouterParam(event, 'id')

  const data = await $fetch(`${config.public.apiBaseUrl}/api/v1/itineraries/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
    },
  })

  return data
})
