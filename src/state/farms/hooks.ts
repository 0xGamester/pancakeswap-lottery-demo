import { ChainId, Fetcher, Route, Token } from '@pancakeswap/sdk'
import { useWeb3React } from '@web3-react/core'
import BigNumber from 'bignumber.js'
import { farmsConfig, SLOW_INTERVAL } from 'config/constants'
import { CHAIN_ID } from 'config/constants/networks'
import { useFastRefreshEffect } from 'hooks/useRefreshEffect'
import useSWRImmutable from 'swr/immutable'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useAppDispatch } from 'state'
import { fetchFarmsPublicDataAsync, fetchFarmUserDataAsync } from '.'
import { DeserializedFarm, DeserializedFarmsState, DeserializedFarmUserData, State } from '../types'
import {
  farmSelector,
  farmFromLpSymbolSelector,
  priceCakeFromPidSelector,
  priceBnbFromPidSelector,
  makeBusdPriceFromPidSelector,
  makeUserFarmFromPidSelector,
  makeLpTokenPriceFromLpSymbolSelector,
  makeFarmFromPidSelector,
} from './selectors'
import { simpleRpcProvider } from 'utils/providers'
import { mainnetTokens } from 'config/constants/tokens'

export const usePollFarmsWithUserData = () => {
  const dispatch = useAppDispatch()
  const { account } = useWeb3React()

  useSWRImmutable(
    ['publicFarmData'],
    () => {
      const pids = farmsConfig.map((farmToFetch) => farmToFetch.pid)
      dispatch(fetchFarmsPublicDataAsync(pids))
    },
    {
      refreshInterval: SLOW_INTERVAL,
    },
  )

  useSWRImmutable(
    account ? ['farmsWithUserData', account] : null,
    () => {
      const pids = farmsConfig.map((farmToFetch) => farmToFetch.pid)
      dispatch(fetchFarmUserDataAsync({ account, pids }))
    },
    {
      refreshInterval: SLOW_INTERVAL,
    },
  )
}

/**
 * Fetches the "core" farm data used globally
 * 2 = CAKE-BNB LP
 * 3 = BUSD-BNB LP
 */
const coreFarmPIDs = CHAIN_ID === String(ChainId.MAINNET) ? [2, 3] : [1, 2]
export const usePollCoreFarmData = () => {
  const dispatch = useAppDispatch()

  useFastRefreshEffect(() => {
    dispatch(fetchFarmsPublicDataAsync(coreFarmPIDs))
  }, [dispatch])
}

export const useFarms = (): DeserializedFarmsState => {
  return useSelector(farmSelector)
}

export const useFarmsPoolLength = (): number => {
  return useSelector((state: State) => state.farms.poolLength)
}

export const useFarmFromPid = (pid: number): DeserializedFarm => {
  const farmFromPid = useMemo(() => makeFarmFromPidSelector(pid), [pid])
  return useSelector(farmFromPid)
}

export const useFarmFromLpSymbol = (lpSymbol: string): DeserializedFarm => {
  const farmFromLpSymbol = useMemo(() => farmFromLpSymbolSelector(lpSymbol), [lpSymbol])
  return useSelector(farmFromLpSymbol)
}

export const useFarmUser = (pid): DeserializedFarmUserData => {
  const farmFromPidUser = useMemo(() => makeUserFarmFromPidSelector(pid), [pid])
  return useSelector(farmFromPidUser)
}

// Return the base token price for a farm, from a given pid
export const useBusdPriceFromPid = (pid: number): BigNumber => {
  const busdPriceFromPid = useMemo(() => makeBusdPriceFromPidSelector(pid), [pid])
  return useSelector(busdPriceFromPid)
}

export const useLpTokenPrice = (symbol: string) => {
  const lpTokenPriceFromLpSymbol = useMemo(() => makeLpTokenPriceFromLpSymbolSelector(symbol), [symbol])
  return useSelector(lpTokenPriceFromLpSymbol)
}

/**
 * @@deprecated use the BUSD hook in /hooks
 */
export const usePriceCakeBusd = (): BigNumber => {
  return useSelector(priceCakeFromPidSelector)
}

export const usePriceBnbBusd = (): BigNumber => {
  return useSelector(priceBnbFromPidSelector)
}

export const usePriceCakeTokenBusd = async(): Promise<string> => {
  try {
    const wbnbToCake = await Fetcher.fetchPairData(mainnetTokens.wbnb, mainnetTokens.cake, simpleRpcProvider);
    const priceInBUSD = new Route([wbnbToCake], mainnetTokens.cake);

    return priceInBUSD.midPrice.toFixed(4);
  } catch (err) {
    console.error(`Failed to fetch token price of ${mainnetTokens.cake.symbol}: ${err}`);
  }
}