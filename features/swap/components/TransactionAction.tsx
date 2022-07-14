import { useConnectWallet } from 'hooks/useConnectWallet'
import { useTokenBalance } from 'hooks/useTokenBalance'
import { Button, Inline, Spinner, styled, Text } from 'junoblocks'
import React, { useEffect, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { walletState, WalletStatusType } from 'state/atoms/walletAtoms'
import { NETWORK_FEE } from 'util/constants'

import { useRegistry, useTokenSwap } from '../hooks'
import { slippageAtom, tokenSwapAtom } from '../swapAtoms'
import { SlippageSelector } from './SlippageSelector'

type TransactionTipsProps = {
  isPriceLoading?: boolean
  tokenToTokenPrice?: number
  tokenToTokenRate?: number
  currentPrice?: number
  size?: 'small' | 'large'
}

export const TransactionAction = ({
  isPriceLoading,
  tokenToTokenRate,
  tokenToTokenPrice,
  currentPrice,
  size = 'large',
}: TransactionTipsProps) => {
  const [requestedSwap, setRequestedSwap] = useState(false)
  const [tokenA, tokenB] = useRecoilValue(tokenSwapAtom)
  const { balance: tokenABalance } = useTokenBalance(tokenA?.tokenSymbol)
  /* wallet state */
  const { status } = useRecoilValue(walletState)
  const { mutate: connectWallet } = useConnectWallet()
  const [slippage, setSlippage] = useRecoilState(slippageAtom)

  const { mutate: handleSwap, isLoading: isExecutingTransaction } =
    useTokenSwap({
      tokenASymbol: tokenA?.tokenSymbol,
      tokenBSymbol: tokenB?.tokenSymbol,
      tokenAmount: tokenA?.amount,
      tokenToTokenPrice: tokenToTokenPrice || 0,
    })

  const { mutate: handleRegistry, isLoading: isExecutingRegistryTransaction } =
    useRegistry({
      tokenASymbol: tokenA?.tokenSymbol,
      tokenBSymbol: tokenB?.tokenSymbol,
      tokenAmount: tokenA?.amount,
      tokenToTokenPrice: tokenToTokenPrice || 0,
    })

  /* proceed with the swap only if the price is loaded */

  useEffect(() => {
    const shouldTriggerTransaction =
      !isPriceLoading &&
      !isExecutingTransaction &&
      !isExecutingRegistryTransaction &&
      requestedSwap
    if (shouldTriggerTransaction) {
      if (
        window.location.href.includes('/limit-order') ||
        window.location.href.includes('/stop-loss')
      ) {
        handleRegistry()
        setRequestedSwap(false)
      } else {
        handleSwap()
        setRequestedSwap(false)
      }
    }
  }, [
    isPriceLoading,
    isExecutingTransaction,
    requestedSwap,
    handleSwap,
    isExecutingRegistryTransaction,
    handleRegistry,
  ])

  const handleSwapButtonClick = () => {
    if (status === WalletStatusType.connected) {
      return setRequestedSwap(true)
    }

    connectWallet(null)
  }

  const shouldDisableSubmissionButton =
    isExecutingTransaction ||
    isExecutingRegistryTransaction ||
    !tokenB.tokenSymbol ||
    !tokenA.tokenSymbol ||
    status !== WalletStatusType.connected ||
    tokenA.amount <= 0 ||
    tokenA?.amount > tokenABalance ||
    (window.location.href.includes('/limit-order')
      ? currentPrice <= tokenToTokenRate
      : currentPrice >= tokenToTokenRate)

  if (size === 'small') {
    return (
      <>
        <Inline css={{ display: 'grid', padding: '$6 0' }}>
          <SlippageSelector
            slippage={slippage}
            onSlippageChange={setSlippage}
            css={{ width: '100%' }}
          />
        </Inline>
        <Inline
          justifyContent="space-between"
          css={{
            padding: '$8 $12',
            backgroundColor: '$colors$dark10',
            borderRadius: '$1',
          }}
        >
          <Text variant="legend" transform="uppercase">
            Swap fee
          </Text>
          <Text variant="legend">{NETWORK_FEE * 100}%</Text>
        </Inline>
        <Inline css={{ display: 'grid', paddingTop: '$8' }}>
          <Button
            variant="primary"
            size="large"
            disabled={shouldDisableSubmissionButton}
            onClick={
              !isExecutingTransaction && !isPriceLoading
                ? handleSwapButtonClick
                : undefined
            }
          >
            {isExecutingTransaction ? <Spinner instant /> : 'Swap'}
          </Button>
        </Inline>
      </>
    )
  }

  return (
    <StyledDivForWrapper>
      <Button
        variant="primary"
        size="large"
        disabled={shouldDisableSubmissionButton}
        onClick={
          !isExecutingTransaction && !isPriceLoading
            ? handleSwapButtonClick
            : undefined
        }
      >
        {isExecutingTransaction || isExecutingRegistryTransaction ? (
          <Spinner instant />
        ) : document.location.href.includes('/limit-order') ||
          document.location.href.includes('/stop-loss') ? (
          'Place Order'
        ) : (
          'Swap'
        )}
      </Button>
    </StyledDivForWrapper>
  )
}

const StyledDivForWrapper = styled('div', {
  display: 'grid',
  gridTemplateColumns: '1fr',
  columnGap: 12,
  alignItems: 'center',
  padding: '12px 0',
})
