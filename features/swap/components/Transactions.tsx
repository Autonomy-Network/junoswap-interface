import { useTokenList } from 'hooks/useTokenList'
import {
  Button,
  ImageForTokenLogo,
  Inline,
  Spinner,
  styled,
  Text,
} from 'junoblocks'
import React, { useEffect, useMemo, useState } from 'react'
import { useRecoilState } from 'recoil'
import { registryRequests } from 'services/swap/registry'
import { walletState } from 'state/atoms/walletAtoms'
import { convertMicroDenomToDenom } from 'util/conversion'

import { useRegistryCancel } from '../hooks/useRegistry'

const TransactionItem = ({
  request,
  activeTab,
}: {
  request: any
  activeTab: string
}) => {
  const {
    mutate: handleRegistryCancel,
    isLoading: isExecutingRegistryCancelTransaction,
  } = useRegistryCancel({
    id: request.id,
  })

  const handleCancel = () => {
    if (!isExecutingRegistryCancelTransaction) {
      handleRegistryCancel()
    }
  }

  return (
    <StyledDivForTransaction>
      <Inline css={{ display: 'flex', justifyContent: 'space-between' }}>
        <Inline css={{ display: 'flex' }}>
          <ImageForTokenLogo
            logoURI={request.inputToken.logoURI}
            size="big"
            alt={request.inputToken.symbol}
            loading="lazy"
            css={{ marginRight: '$space$6' }}
          />
          <Text
            variant="caption"
            css={{ marginRight: '$space$18', fontWeight: 'bolder' }}
          >
            {request.inputToken.symbol}
          </Text>
          <Text
            variant="caption"
            css={{ marginRight: '$space$18', fontWeight: 'bolder' }}
          >
            {'->'}
          </Text>
          <ImageForTokenLogo
            logoURI={request.outputToken.logoURI}
            size="big"
            alt={request.outputToken.symbol}
            loading="lazy"
            css={{ marginRight: '$space$6' }}
          />
          <Text variant="caption" css={{ fontWeight: 'bolder' }}>
            {request.outputToken.symbol}
          </Text>
        </Inline>
        {activeTab === 'created' && (
          <StyledButtonCancel
            variant="primary"
            style={{ backgroundColor: '$colors$error70' }}
            onClick={handleCancel}
            disabled={isExecutingRegistryCancelTransaction}
          >
            {isExecutingRegistryCancelTransaction ? (
              <Spinner instant />
            ) : (
              'Cancel'
            )}
          </StyledButtonCancel>
        )}
      </Inline>
      <Text
        variant="caption"
        css={{
          fontWeight: 'bolder',
          textAlign: 'left',
          margin: '$space$4 0',
        }}
      >
        Sell{' '}
        {convertMicroDenomToDenom(
          request.inputToken.amount,
          request.inputToken.decimals
        )}{' '}
        {request.inputToken.symbol} for{' '}
        {convertMicroDenomToDenom(
          request.outputToken.amount,
          request.outputToken.decimals
        )}{' '}
        {request.outputToken.symbol}
      </Text>
      <Text variant="caption" css={{ textAlign: 'left' }}>
        {new Date(request.createdAt * 1000).toString()}
      </Text>
    </StyledDivForTransaction>
  )
}

export const Transactions = () => {
  const [activeTab, setActiveTab] = useState('created')
  const [{ client, address, transactions }, setWalletState] =
    useRecoilState(walletState)
  const [tokenList] = useTokenList()

  const requests = useMemo(() => {
    if (!tokenList || !transactions) return []
    return transactions
      .filter((transaction: any) =>
        window.location.href.includes(transaction.type)
      )
      .map((transaction) => {
        const inputToken = tokenList.tokens.find(
          (token) =>
            transaction.inputToken.denom === token.denom ||
            transaction.inputToken.denom === token.token_address
        )
        const {
          logoURI: inputLogo,
          symbol: inputSymbol,
          decimals: inputDecimals,
        } = inputToken
        const outputToken = tokenList.tokens.find(
          (token) =>
            transaction.outputToken.denom === token.denom ||
            transaction.outputToken.denom === token.token_address
        )
        const {
          logoURI: outputLogo,
          symbol: outputSymbol,
          decimals: outputDecimals,
        } = outputToken

        return {
          ...transaction,
          inputToken: {
            ...transaction.inputToken,
            logoURI: inputLogo,
            symbol: inputSymbol,
            decimals: inputDecimals,
          },
          outputToken: {
            ...transaction.outputToken,
            logoURI: outputLogo,
            symbol: outputSymbol,
            decimals: outputDecimals,
          },
        }
      })
  }, [tokenList, transactions])

  useEffect(() => {
    const interval = setInterval(async () => {
      const refetchedTransactions = await registryRequests({
        client,
        senderAddress: address,
      })
      setWalletState((value) => ({
        ...value,
        transactions: refetchedTransactions,
      }))
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <StyledDivForWrapper>
      <StyledDivForTabs>
        <StyledButtonForTabs
          variant="ghost"
          size="large"
          onClick={() => setActiveTab('created')}
          active={activeTab === 'created'}
        >
          <Text variant="body">open</Text>
        </StyledButtonForTabs>
        <StyledButtonForTabs
          variant="ghost"
          size="large"
          onClick={() => setActiveTab('executed')}
          active={activeTab === 'executed'}
        >
          <Text variant="body">executed</Text>
        </StyledButtonForTabs>
        <StyledButtonForTabs
          variant="ghost"
          size="large"
          onClick={() => setActiveTab('canceled')}
          active={activeTab === 'canceled'}
        >
          <Text variant="body">cancelled</Text>
        </StyledButtonForTabs>
      </StyledDivForTabs>
      <StyledDivForTransactionContainer>
        {requests
          .filter((request) => request.status === activeTab)
          .map((request: any) => (
            <TransactionItem
              key={`transaction_${request.id}`}
              activeTab={activeTab}
              request={request}
            />
          ))}
      </StyledDivForTransactionContainer>
    </StyledDivForWrapper>
  )
}

const StyledDivForWrapper = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  borderRadius: '6px',
  backgroundColor: '$colors$dark10',
})

const StyledDivForTabs = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  alignItems: 'stretch',
  textTransform: 'uppercase',
  borderRadius: 8,
  height: '100%',
  width: '100%',
  padding: '$space$6 $space$12 0 $space$12',
})

const StyledButtonForTabs = styled(Button, {
  flex: '1',
  textTransform: 'capitalize',
  background: 'transparent',
  borderBottomLeftRadius: '0',
  borderBottomRightRadius: '0',
  opacity: '.5',
  '&:hover': {
    backgroundColor: 'transparent',
  },
  '&:focus': {
    backgroundColor: 'transparent',
  },
  variants: {
    active: {
      true: {
        opacity: '1',
        borderBottom: '2px solid $colors$dark20',
      },
    },
  },
})

const StyledDivForTransactionContainer = styled('div', {
  paddingTop: '$space$6',
  paddingBottom: '$space$6',
  width: '100%',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
})

const StyledDivForTransaction = styled('div', {
  borderRadius: '10px',
  border: '1px solid $colors$dark10',
  display: 'flex',
  flexDirection: 'column',
  padding: '$space$6',
  margin: '$space$6 0',
  width: 'calc(100% - $space$24)',
})

const StyledButtonCancel = styled(Button, {
  background: '$colors$error90',
  width: '4rem',
  height: '2rem',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  '&:hover': {
    backgroundColor: '$colors$error70',
  },
  variants: {
    disabled: {
      true: {
        pointerEvents: 'none',
        cursor: 'not-allowed',
      },
    },
  },
})
