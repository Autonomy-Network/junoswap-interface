import {
  Button,
  Column,
  dollarValueFormatterWithDecimals,
  Exchange,
  formatTokenBalance,
  IconWrapper,
  Inline,
  styled,
  Text,
} from 'junoblocks'
import React, { useState } from 'react'
import { useRecoilValue } from 'recoil'

import { useTxRates } from '../hooks'
import { tokenSwapAtom } from '../swapAtoms'

type TransactionTipsProps = {
  isPriceLoading: boolean
  tokenToTokenPrice: number
  currentPrice: number
  onTokenSwaps: () => void
  disabled?: boolean
  size?: 'large' | 'small'
}

export const TransactionTips = ({
  isPriceLoading,
  tokenToTokenPrice,
  currentPrice,
  onTokenSwaps,
  disabled,
  size = 'large',
}: TransactionTipsProps) => {
  const [swappedPosition, setSwappedPositions] = useState(false)
  const [tokenA, tokenB] = useRecoilValue(tokenSwapAtom)

  const { isShowing, conversionRate, conversionRateInDollar, dollarValue } =
    useTxRates({
      tokenASymbol: tokenA?.tokenSymbol,
      tokenBSymbol: tokenB?.tokenSymbol,
      tokenAAmount: 1,
      tokenToTokenPrice,
      isLoading: isPriceLoading,
    })

  const switchTokensButton = (
    <Button
      icon={<StyledIconWrapper icon={<Exchange />} flipped={swappedPosition} />}
      variant="ghost"
      onClick={
        !disabled
          ? () => {
              setSwappedPositions(!swappedPosition)
              onTokenSwaps()
            }
          : undefined
      }
      iconColor="tertiary"
    />
  )

  const transactionRates = (
    <>
      1 {tokenA.tokenSymbol} ≈ {formatTokenBalance(conversionRate)}{' '}
      {tokenB.tokenSymbol}
      {' ≈ '}$
      {dollarValueFormatterWithDecimals(conversionRateInDollar, {
        includeCommaSeparation: true,
      })}
    </>
  )

  const formattedDollarValue = dollarValueFormatterWithDecimals(dollarValue, {
    includeCommaSeparation: true,
  })

  const marketValue =
    tokenToTokenPrice === 0 || currentPrice === 0
      ? null
      : window.location.href.includes('/limit-order')
      ? tokenToTokenPrice === currentPrice
        ? '0.00'
        : (
            ((currentPrice - tokenToTokenPrice) * 100) /
            tokenToTokenPrice
          ).toFixed(2)
      : window.location.href.includes('/stop-loss')
      ? tokenToTokenPrice === currentPrice
        ? '0.00'
        : (
            ((tokenToTokenPrice - currentPrice) * 100) /
            tokenToTokenPrice
          ).toFixed(2)
      : null
  console.log(marketValue)

  if (size === 'small') {
    return (
      <Inline
        justifyContent="space-between"
        css={{
          padding: isShowing ? '$10 $12 $10 $9' : '$11 $12 $11 $9',
          borderTop: '1px solid $borderColors$inactive',
          borderBottom: '1px solid $borderColors$inactive',
        }}
      >
        {switchTokensButton}
        {isShowing && (
          <Column align="flex-end" gap={2}>
            <Text variant="caption" color="disabled" wrap={false}>
              {transactionRates}
            </Text>
            <Text variant="caption" color="disabled" wrap={false}>
              Swap estimate: ${formattedDollarValue}
            </Text>
          </Column>
        )}
      </Inline>
    )
  }

  return (
    <StyledDivForWrapper>
      <StyledDivForPriceWrapper>
        <StyledDivForRateWrapper>
          {switchTokensButton}

          {isShowing && (
            <Text variant="legend" wrap={false}>
              {transactionRates}
            </Text>
          )}
        </StyledDivForRateWrapper>

        <Text variant="legend">${formattedDollarValue}</Text>
      </StyledDivForPriceWrapper>
      {marketValue && (
        <StyledDivForMarketWrapper above={marketValue !== '0.00'}>
          {`${marketValue}% ${
            window.location.href.includes('/limit-order')
              ? 'above market value'
              : 'below market value'
          }`}
        </StyledDivForMarketWrapper>
      )}
    </StyledDivForWrapper>
  )
}

const StyledDivForWrapper = styled('div', {
  padding: '$8 $16 $8 $12',
  borderTop: '1px solid $borderColors$inactive',
  borderBottom: '1px solid $borderColors$inactive',
})

const StyledDivForPriceWrapper = styled('div', {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  justifyContent: 'space-between',
  alignItems: 'center',
  textAlign: 'right',
})

const StyledDivForMarketWrapper = styled('div', {
  variants: {
    above: {
      true: {
        color: '$colors$valid',
        fontWeight: 'bold',
      },
      false: {
        color: '$colors$error',
        fontWeight: 'bold',
      },
    },
  },
})

const StyledDivForRateWrapper = styled('div', {
  display: 'flex',
  alignItems: 'center',
  textAlign: 'left',
  columnGap: '$space$6',
})

const StyledIconWrapper = styled(IconWrapper, {
  variants: {
    flipped: {
      true: {
        transform: 'rotateX(180deg)',
      },
      false: {
        transform: 'rotateX(0deg)',
      },
    },
  },
})
