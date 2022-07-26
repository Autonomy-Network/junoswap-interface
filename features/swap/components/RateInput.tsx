import { Button, styled, Text } from 'junoblocks'
import React, { useRef, useState } from 'react'
import { useRecoilState } from 'recoil'

import { useTxRates } from '../hooks'
import { tokenSwapAtom } from '../swapAtoms'
import { SelectorInput } from './SelectorInput'

type RateInputProps = {
  readOnly?: boolean
  disabled?: boolean
  tokenToTokenPrice: number
  isPriceLoading: boolean
  size?: 'small' | 'large'
  amount: number
  onAmountChange: (amount: number) => void
}

export const RateInput = ({
  disabled,
  tokenToTokenPrice,
  isPriceLoading,
  size = 'large',
  amount,
  onAmountChange,
}: RateInputProps) => {
  const wrapperRef = useRef<HTMLDivElement>()
  const inputRef = useRef<HTMLInputElement>()
  const [[tokenA, tokenB], _] = useRecoilState(tokenSwapAtom)

  const [isInputForAmountFocused, setInputForAmountFocused] = useState(false)

  const { conversionRate } = useTxRates({
    tokenASymbol: tokenA?.tokenSymbol,
    tokenBSymbol: tokenB?.tokenSymbol,
    tokenAAmount: 1,
    tokenToTokenPrice,
    isLoading: isPriceLoading,
  })

  if (size === 'small') {
    return <></>
  }

  const headerText = (
    <StyledDivForWrapper>
      <Text
        variant="primary"
        transform="capitalize"
        css={{ paddingLeft: '10px', fontWeight: 'bolder' }}
      >
        Rate
      </Text>
    </StyledDivForWrapper>
  )

  const currentButton = (
    <Button
      variant="primary"
      size="small"
      onClick={() => onAmountChange(conversionRate)}
      css={{ padding: '0.1rem 0.5rem' }}
    >
      Current
    </Button>
  )

  return (
    <StyledDivForContainer selected={isInputForAmountFocused} ref={wrapperRef}>
      {headerText}
      <StyledDivForWrapper>
        {currentButton}
        <StyledDivForAmountWrapper>
          <SelectorInput
            inputRef={inputRef}
            amount={amount}
            onAmountChange={onAmountChange}
            disabled={disabled}
            onFocus={() => setInputForAmountFocused(true)}
            onBlur={() => setInputForAmountFocused(false)}
          />
        </StyledDivForAmountWrapper>
      </StyledDivForWrapper>
    </StyledDivForContainer>
  )
}

const selectedVariantForInputWrapper = {
  true: {
    borderRadius: '$2',
    boxShadow: '0 0 0 $space$1 $borderColors$selected',
  },
  false: {
    boxShadow: '0 0 0 $space$1 $colors$dark0',
    '&:hover': {
      backgroundColor: '$colors$dark5',
    },
  },
}

const StyledDivForContainer = styled('div', {
  transition: 'box-shadow .1s ease-out',
  variants: {
    selected: selectedVariantForInputWrapper,
  },
})

const StyledDivForWrapper = styled('div', {
  padding: '$5 $15 $5 $7',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  position: 'relative',
  zIndex: 0,
})

const StyledDivForAmountWrapper = styled('div', {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  position: 'relative',
  zIndex: 1,
})
