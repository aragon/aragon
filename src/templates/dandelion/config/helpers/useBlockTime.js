import { network } from '../../../../environment'

const NETWORK_TIMES = new Map([
  ['main', 13.5],
  ['kovan', 4],
  ['rinkeby', 14.5],
  ['ropsten', 11.5],
  ['goerli', 15],
  ['private', 8],
])
export default function useBlockTime() {
  return network ? NETWORK_TIMES.get(network.type) : null
}
