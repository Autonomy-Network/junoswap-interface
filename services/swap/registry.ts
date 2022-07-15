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

const testnet = {
  networkInfo: {
    url: 'https://rpc.uni.juno.deuslabs.fi',
    chainId: 'uni-3',
  },

  addresses: {
    wallet1: 'juno16g2rahf5846rxzp3fwlswy08fz8ccuwk03k57y',
    wallet2: 'juno16e3t7td2wu0wmggnxa3xnyu5whljyed69ptvkp',
    wallet3: 'juno1yq0azfkky8aqq4kvzdawrs7tm3rmpl8xs6vcx2',
  },

  mnemonicKeys: {
    wallet1:
      'clip hire initial neck maid actor venue client foam budget lock catalog sweet steak waste crater broccoli pipe steak sister coyote moment obvious choose',
    wallet2:
      'audit crawl employ lunch figure cigar chapter wrestle endless process unique angry',
    wallet3:
      'ability pitch abuse game alter broccoli lottery warm baby tonight misery lumber',
  },

  contracts: {
    // Autonomy common contracts
    auto: 'juno1gn026jj57n0snq7vyl29nypuvzuavs4xsfsja6q6f9glxcqdlmkqf2l96y', // codeId: 1327
    registryStake:
      'juno1f5lgj5dhl72ngchtzpxf6cl2drga6ndj50fgvryk50d98czghvkscq27lc', // codeId: 1328

    // Test "Autonomy-station"
    fundsRouter:
      'juno1qthxmvn8qr32wwa26n4xafed48uwxf4al7q43mh76pzr0tu6tr8s6yq8tj', // codeId: 1333
    timeConditions:
      'juno1rnh4qlrg3hlqs9wd0jfy24gwepaqks9e2cpmfcqnu8fhk74q3uzsysax2k', // codeId: 1334
    testCounter:
      'juno19sp4qf36mat8ht8aluh0gj2nqcn59kln7u6g7fg0gh2t3w6aw67s8hqxpx', // codeId: 1335

    // Test "Wrapper-Junoswap"
    tcw: 'juno1uwgw49jtlfn6havmmju3h6cncdvfmnnet5v3wahclpaj6wzqe9tqt225dw', // "TCW": Test cw20 token   codeId: 1330
    tcwUjunoSwap:
      'juno1zgkua2rfxsqmgtu4k8jhxkh9mgr5ldh9khfcuzmp6tkfvnmg6xkqemecxe', // codeId: 1331
    wrapperJunoSwap:
      'juno1rtrsaryw4c2nru55f93mk5x3980pyx2q43874888azkw7vaw7xtslz0z76', // codeId: 1332
  },
} as const

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
      max_output: type === 'limit-order' ? `${Infinity}` : `${minToken}`,
      recipient_exist: false,
    },
  })

  const fee = tokenA.native
    ? tokenA.denom === 'ujunox'
      ? [coin(parseInt(`${tokenAmount}`) + parseInt('1000'), 'ujunox')]
      : [coin(1000, 'ujunox'), coin(parseInt(`${tokenAmount}`), tokenA.denom)]
    : [coin(1000, 'ujunox')]

  if (!tokenA.native) {
    await client.execute(
      senderAddress,
      tokenA.token_address,
      {
        increase_allowance: {
          spender: testnet.contracts.registryStake,
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
    testnet.contracts.registryStake,
    {
      create_request: {
        target: testnet.contracts.wrapperJunoSwap,
        msg: wrapperSwapMsg,
        input_asset: {
          info: input_token,
          amount: `${tokenAmount}`,
        },
      },
    },
    'auto',
    undefined,
    fee
  )

  const requestsQuery: any = await client.queryContractSmart(
    testnet.contracts.registryStake,
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
    testnet.contracts.registryStake,
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
    testnet.contracts.registryStake,
    {
      cancel_request: {
        id,
      },
    },
    'auto',
    undefined
  )
}
