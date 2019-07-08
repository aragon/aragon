import { useContext, useState, useCallback, useEffect } from 'react'
import {
  IdentityContext,
  identityEventTypes,
} from '../../IdentityManager/IdentityManager'
import { atou } from '../../../string-utils'

const QUERY_VAR = '&l='

function useSharedLink(wrapper, toast) {
  const { identityEvents$ } = useContext(IdentityContext)
  const [isSharedLink, setIsSharedLink] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [sharedIdentities, setSharedIdentities] = useState([])

  const handleCleanHash = () => {
    const { hash } = window.location
    const path = hash.substr(0, hash.indexOf(QUERY_VAR))
    window.location.hash = path
  }
  const handleSharedIdentitiesSave = (
    filteredIdentities,
    identitiesSelected
  ) => async () => {
    if (!wrapper) {
      return
    }
    setIsSaving(true)
    const list = filteredIdentities.filter(({ address }) =>
      identitiesSelected.get(address)
    )
    for (const { name, address } of list) {
      await wrapper.modifyAddressIdentity(address, { name })
    }
    identityEvents$.next({ type: identityEventTypes.IMPORT })
    toast('Custom labels added')
    handleCleanHash()
    setIsSharedLink(false)
    setIsSaving(false)
  }
  const handleSharedIdentitiesCancel = () => {
    handleCleanHash()
    setIsSharedLink(false)
  }

  useEffect(() => {
    const index = window.location.hash.indexOf(QUERY_VAR)
    if (index > -1) {
      const raw = window.location.hash.substr(index + QUERY_VAR.length)
      try {
        const data = JSON.parse(window.decodeURI(atou(raw)))
        setSharedIdentities(
          data.map(({ address, name }) => ({ address, name }))
        )
        setIsSharedLink(true)
      } catch (e) {
        console.warn(
          'There was an error parsing/validating the shared data: ',
          e
        )
      }
    }
  }, [])

  return {
    handleSharedIdentitiesCancel,
    handleSharedIdentitiesSave,
    isSavingSharedLink: isSaving,
    isSharedLink,
    sharedIdentities,
  }
}

export default useSharedLink
