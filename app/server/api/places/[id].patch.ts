export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const response = await $fetch(`${config.public.apiBaseUrl}/api/v1/places/${id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body,
  })

  return response
})
