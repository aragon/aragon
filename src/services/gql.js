import { connectGraphEndpoint } from '../environment'

const query = `query Organizations($id: ID!) {
    organizations(where: {id: $id},  orderBy: createdAt, orderDirection: desc){ 
      id
      address
      createdAt
    }
  }`

const ORGANIZATION_INFO = 'ORGANIZATION_INFO&'

export async function getOrganizationByAddress(daoAddress) {
  const LOCAL_STORAGE_KEY = `${ORGANIZATION_INFO}${daoAddress}`
  if (localStorage.getItem(LOCAL_STORAGE_KEY)) {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY))
  }

  const data = await fetch(connectGraphEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { id: daoAddress.toLowerCase() },
    }),
  })

  if (data.ok) {
    const json = await data.json()
    if (
      json &&
      json.data.organizations &&
      json.data.organizations.length === 1
    ) {
      const organization = json.data.organizations[0]
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(organization))
      return json.data.organizations[0]
    }
  }
  return null
}
