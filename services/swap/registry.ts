import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import { coin } from '@cosmjs/stargate'

import { TokenInfo } from '../../queries/usePoolsListQuery'

type RegistryArgs = {
  swapDirection: 'tokenAtoTokenB' | 'tokenBtoTokenA'
  tokenAmount: number
  price: number
  slippage: number
  senderAddress: string
  swapAddress: string
  tokenA: TokenInfo
  tokenB: TokenInfo
  client: SigningCosmWasmClient
  type: 'limit-order' | 'stop-loss'
}

type RegistryRequestsArgs = {
  client: SigningCosmWasmClient
  senderAddress: string
}

type RegistryCancelRequestsArgs = {
  client: SigningCosmWasmClient
  senderAddress: string
  id: number
}

function toEncodedBinary(obj: any): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64')
}

function toDecodedBinary(obj: any): any {
  return JSON.parse(Buffer.from(obj, 'base64').toString())
}

export const registry = async ({
  tokenA,
  tokenB,
  swapDirection,
  swapAddress,
  senderAddress,
  price,
  tokenAmount,
  client,
  type,
}: RegistryArgs) => {
  const minToken = Math.floor(price)

  const swapMessage = toEncodedBinary({
    swap: {
      input_token: swapDirection === 'tokenAtoTokenB' ? 'Token1' : 'Token2',
      input_amount: `${tokenAmount}`,
      min_output: `${minToken}`,
      expiration: undefined,
    },
  })

  const input_token = tokenA.native
    ? {
        native_token: {
          denom: tokenA.denom,
        },
      }
    : {
        token: {
          contract_addr: tokenA.token_address,
        },
      }
  const output_token = tokenB.native
    ? {
        native_token: {
          denom: tokenB.denom,
        },
      }
    : {
        token: {
          contract_addr: tokenB.token_address,
        },
      }

  const wrapperSwapMsg = toEncodedBinary({
    swap: {
      user: senderAddress,
      contract_addr: swapAddress,
      swap_msg: swapMessage,
      input_token,
      output_token,
      input_amount: `${tokenAmount}`,
      min_output: type === 'limit-order' ? `${minToken}` : '0',
      max_output:
        type === 'limit-order'
          ? process.env.NEXT_PUBLIC_INFINITE
          : `${minToken}`,
      recipient_exist: false,
    },
  })

  const funds = tokenA.native
    ? tokenA.denom === process.env.NEXT_PUBLIC_FEE_DENOM
      ? [
          coin(
            parseInt(`${tokenAmount}`) +
              parseInt(process.env.NEXT_PUBLIC_FEE_PRICE),
            process.env.NEXT_PUBLIC_FEE_DENOM
          ),
        ]
      : [
          coin(parseInt(`${tokenAmount}`), tokenA.denom),
          coin(
            parseInt(process.env.NEXT_PUBLIC_FEE_PRICE),
            process.env.NEXT_PUBLIC_FEE_DENOM
          ),
        ]
    : [
        coin(
          parseInt(process.env.NEXT_PUBLIC_FEE_PRICE),
          process.env.NEXT_PUBLIC_FEE_DENOM
        ),
      ]

  if (!tokenA.native) {
    await client.execute(
      senderAddress,
      tokenA.token_address,
      {
        increase_allowance: {
          spender: `${process.env.NEXT_PUBLIC_REGISTRY_STAKE_ADDRESS}`,
          amount: `${tokenAmount}`,
          expires: undefined,
        },
      },
      'auto',
      undefined
    )
  }

  await client.execute(
    senderAddress,
    `${process.env.NEXT_PUBLIC_REGISTRY_STAKE_ADDRESS}`,
    {
      create_request: {
        target: `${process.env.NEXT_PUBLIC_WRAPPER_JUNO_SWAP}`,
        msg: wrapperSwapMsg,
        input_asset: {
          info: input_token,
          amount: `${tokenAmount}`,
        },
      },
    },
    'auto',
    undefined,
    funds
  )

  const requestsQuery: any = await client.queryContractSmart(
    `${process.env.NEXT_PUBLIC_REGISTRY_STAKE_ADDRESS}`,
    {
      requests: {},
    }
  )
  const requestId = requestsQuery.requests[0].id
  return requestId
}

export const registryRequests = async ({
  client,
  senderAddress,
}: RegistryRequestsArgs) => {
  const requestQueries: any = await client.queryContractSmart(
    `${process.env.NEXT_PUBLIC_REGISTRY_STAKE_ADDRESS}`,
    {
      requests: {},
    }
  )

  const response = requestQueries.requests
    .map((query) => {
      const { id, request } = query
      const msg = toDecodedBinary(request.msg)
      const { swap } = msg
      return {
        address: request.user,
        id: id,
        type: swap.min_output === '0' ? 'stop-loss' : 'limit-order',
        status: request.status,
        createdAt: request.created_at,
        inputToken: {
          denom: swap.input_token.native_token
            ? swap.input_token.native_token.denom
            : swap.input_token.token.contract_addr,
          amount: swap.input_amount,
        },
        outputToken: {
          denom: swap.output_token.native_token
            ? swap.output_token.native_token.denom
            : swap.output_token.token.contract_addr,
          amount: swap.min_output === '0' ? swap.max_output : swap.min_output,
        },
      }
    })
    .filter((query) => query.address === senderAddress)
  return response
}

export const registryCancelRequests = async ({
  client,
  senderAddress,
  id,
}: RegistryCancelRequestsArgs) => {
  await client.execute(
    senderAddress,
    `${process.env.NEXT_PUBLIC_REGISTRY_STAKE_ADDRESS}`,
    {
      cancel_request: {
        id,
      },
    },
    'auto',
    undefined
  )
}
