export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const body = await readFormData(event)

  const response = await $fetch.raw(`${config.public.apiBaseUrl}/api/v1/places`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body,
  })

  setResponseStatus(event, response.status)
  return response._data
})
