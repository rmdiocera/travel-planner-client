export default defineEventHandler(async () => {
  const config = useRuntimeConfig()

  const data = await $fetch(`${config.public.apiBaseUrl}/api/v1/itineraries`, {
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
    },
  })

  return data
})
