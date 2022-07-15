import { useTokenBalance } from 'hooks/useTokenBalance'
import { useTokenList } from 'hooks/useTokenList'
import {
  Button,
  ErrorIcon,
  IconWrapper,
  styled,
  useMedia,
  usePersistance,
} from 'junoblocks'
import { useEffect, useRef, useState } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import {
  TransactionStatus,
  transactionStatusState,
} from 'state/atoms/transactionAtoms'

import { useTokenToTokenPrice } from '../hooks'
import { tokenSwapAtom } from '../swapAtoms'
import { HorizontalDivider } from './Divider'
import { RateInput } from './RateInput'
import { TokenSelector } from './TokenSelector'
import { TransactionAction } from './TransactionAction'
import { Transactions } from './Transactions'
import { TransactionTips } from './TransactionTips'

type LimitOrderModuleProps = {
  /* will be used if provided on first render instead of internal state */
  initialTokenPair?: readonly [string, string]
}

export const LimitOrderModule = ({
  initialTokenPair,
}: LimitOrderModuleProps) => {
  /* connect to recoil */
  const [[tokenA, tokenB], setTokenSwapState] = useRecoilState(tokenSwapAtom)
  const transactionStatus = useRecoilValue(transactionStatusState)

  /* fetch token list and set initial state */
  const [tokenList, isTokenListLoading] = useTokenList()
  useEffect(() => {
    const shouldSetDefaultTokenAState =
      !tokenA.tokenSymbol && !tokenB.tokenSymbol && tokenList
    if (shouldSetDefaultTokenAState) {
      setTokenSwapState([
        {
          tokenSymbol: tokenList.base_token.symbol,
          amount: tokenA.amount || 0,
        },
        tokenB,
        true,
      ])
    }
  }, [tokenList, tokenA, tokenB, setTokenSwapState])

  const [currentPrice, setCurrentPrice] = useState(0)

  const initialTokenPairValue = useRef(initialTokenPair).current
  useEffect(
    function setInitialTokenPairIfProvided() {
      if (initialTokenPairValue) {
        const [tokenASymbol, tokenBSymbol] = initialTokenPairValue
        setTokenSwapState([
          {
            tokenSymbol: tokenASymbol,
            amount: 0,
          },
          {
            tokenSymbol: tokenBSymbol,
            amount: 0,
          },
          true,
        ])
      }
    },
    [initialTokenPairValue, setTokenSwapState]
  )

  const isUiDisabled =
    transactionStatus === TransactionStatus.EXECUTING || isTokenListLoading
  const uiSize = useMedia('sm') ? 'small' : 'large'

  /* fetch token to token price */
  const [currentTokenPrice, currentTokenRate, isPriceLoading] =
    useTokenToTokenPrice({
      tokenASymbol: tokenA?.tokenSymbol,
      tokenBSymbol: tokenB?.tokenSymbol,
      tokenAmount: tokenA?.amount,
    })

  /* persist token price when querying a new one */
  const persistTokenPrice = usePersistance(
    isPriceLoading ? undefined : currentTokenPrice
  )
  const persistTokenRate = usePersistance(
    isPriceLoading ? undefined : currentTokenRate
  )

  /* select token price */
  const tokenPrice =
    (isPriceLoading ? persistTokenPrice : currentTokenPrice) || 0
  const tokenRate = (isPriceLoading ? persistTokenRate : currentTokenRate) || 0

  useEffect(() => {
    if (currentTokenRate) setCurrentPrice(currentTokenRate)
  }, [currentTokenRate])

  const handleSwapTokenPositions = () => {
    setTokenSwapState([
      tokenB ? { ...tokenB, amount: tokenPrice } : tokenB,
      tokenA ? { ...tokenA, amount: tokenB.amount } : tokenA,
      true,
    ])
  }

  const { balance: availableAmount } = useTokenBalance(tokenA.tokenSymbol)

  return (
    <>
      <StyledDivForWrapper>
        <TokenSelector
          header="from"
          tokenSymbol={tokenA.tokenSymbol}
          amount={tokenA.amount}
          onChange={(updateTokenA) => {
            setTokenSwapState([updateTokenA, tokenB, true])
          }}
          disabled={isUiDisabled}
          size={uiSize}
        />
        <TransactionTips
          disabled={isUiDisabled}
          isPriceLoading={isPriceLoading}
          tokenToTokenPrice={tokenRate}
          currentPrice={currentPrice}
          onTokenSwaps={handleSwapTokenPositions}
          size={uiSize}
        />
        <RateInput
          tokenToTokenPrice={tokenRate}
          isPriceLoading={isPriceLoading}
          amount={currentPrice}
          onAmountChange={setCurrentPrice}
        />
        <HorizontalDivider size="small" />
        <TokenSelector
          header="to"
          readOnly
          tokenSymbol={tokenB.tokenSymbol}
          amount={currentPrice * tokenA.amount}
          onChange={(updatedTokenB) => {
            setTokenSwapState([tokenA, updatedTokenB, true])
          }}
          disabled={isUiDisabled}
          size={uiSize}
        />
      </StyledDivForWrapper>
      {tokenA.amount > availableAmount && (
        <StyledDivForError>
          <StyledButtonForError variant="primary" size="large">
            <IconWrapper
              size="medium"
              icon={<ErrorIcon />}
              css={{ marginRight: '6px' }}
            />
            Insufficient Balance
          </StyledButtonForError>
        </StyledDivForError>
      )}
      <TransactionAction
        isPriceLoading={isPriceLoading}
        tokenToTokenPrice={currentPrice * tokenA.amount}
        tokenToTokenRate={tokenRate}
        currentPrice={currentPrice}
        size={uiSize}
      />
      <Transactions />
    </>
  )
}

const StyledDivForWrapper = styled('div', {
  borderRadius: '8px',
  backgroundColor: '$colors$dark10',
})

const StyledDivForError = styled('div', {
  display: 'grid',
  gridTemplateColumns: '1fr',
  alignItems: 'center',
  marginTop: '12px',
  borderRadius: '6px',
  backgroundColor: '$colors$error',
})

const StyledButtonForError = styled(Button, {
  fontWeight: 'bolder',
  cursor: 'not-allowed',
  pointerEvents: 'none',
  background: 'transparent',
})
