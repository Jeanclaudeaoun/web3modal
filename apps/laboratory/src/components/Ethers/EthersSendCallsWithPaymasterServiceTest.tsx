import { Button, Stack, Text, Input, Tooltip } from '@chakra-ui/react'
import { useState } from 'react'
import { useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react'
import { EthereumProvider } from '@walletconnect/ethereum-provider'
import { useChakraToast } from '../Toast'
import { parseGwei } from 'viem'
import { vitalikEthAddress } from '../../utils/DataUtil'
import { BrowserProvider } from 'ethers'
import {
  WALLET_CAPABILITY_NAMES,
  EIP_5792_RPC_METHODS,
  getCapabilitySupportedChainInfoForEthers
} from '../../utils/EIP5792Utils'

export function EthersSendCallsWithPaymasterServiceTest() {
  const toast = useChakraToast()
  const { address, chainId, isConnected } = useWeb3ModalAccount()
  const { walletProvider } = useWeb3ModalProvider()
  const [paymasterServiceUrl, setPaymasterServiceUrl] = useState<string>('')
  const [isLoading, setLoading] = useState(false)
  async function onSendCalls() {
    try {
      setLoading(true)
      if (!walletProvider || !address) {
        throw Error('user is disconnected')
      }
      if (!chainId) {
        throw Error('chain not selected')
      }

      if (!paymasterServiceUrl) {
        throw Error('paymasterServiceUrl not set')
      }
      const provider = new BrowserProvider(walletProvider, chainId)
      const amountToSend = parseGwei('0.001').toString(16)
      const calls = [
        {
          to: vitalikEthAddress,
          value: `0x${amountToSend}`
        },
        {
          to: vitalikEthAddress,
          data: '0xdeadbeef'
        }
      ]
      const sendCallsParams = {
        version: '1.0',
        chainId: `0x${BigInt(chainId).toString(16)}`,
        from: address,
        calls,
        capabilities: {
          paymasterService: {
            url: paymasterServiceUrl
          }
        }
      }
      const batchCallHash = await provider.send(EIP_5792_RPC_METHODS.WALLET_SEND_CALLS, [
        sendCallsParams
      ])
      toast({
        title: 'SendCalls Success',
        description: batchCallHash,
        type: 'success'
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to send calls',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  function isSendCallsSupported(): boolean {
    if (walletProvider instanceof EthereumProvider) {
      return Boolean(
        walletProvider?.signer?.session?.namespaces?.['eip155']?.methods?.includes(
          EIP_5792_RPC_METHODS.WALLET_SEND_CALLS
        )
      )
    }

    return false
  }

  if (!isConnected || !walletProvider || !address) {
    return (
      <Text fontSize="md" color="yellow">
        Wallet not connected
      </Text>
    )
  }

  if (!isSendCallsSupported()) {
    return (
      <Text fontSize="md" color="yellow">
        Wallet does not support this feature
      </Text>
    )
  }

  const paymasterServiceSupportedChains =
    walletProvider instanceof EthereumProvider
      ? getCapabilitySupportedChainInfoForEthers(
          WALLET_CAPABILITY_NAMES.PAYMASTER_SERVICE,
          walletProvider,
          address
        )
      : []

  if (paymasterServiceSupportedChains.length === 0) {
    return (
      <Text fontSize="md" color="yellow">
        Account does not support paymaster service feature
      </Text>
    )
  }

  return paymasterServiceSupportedChains.find(
    chainInfo => chainInfo.chainId === Number(chainId)
  ) ? (
    <Stack direction={['column', 'column', 'column']}>
      <Tooltip label="Paymaster Service URL should be of ERC-7677 paymaster service proxy">
        <Input
          placeholder="http://api.pimlico.io/v2/sepolia/rpc?apikey=..."
          onChange={e => setPaymasterServiceUrl(e.target.value)}
          value={paymasterServiceUrl}
          isDisabled={isLoading}
          whiteSpace="nowrap"
          textOverflow="ellipsis"
        />
      </Tooltip>
      <Button
        width={'fit-content'}
        colorScheme="cyan"
        data-test-id="send-calls-paymaster-service-button"
        onClick={onSendCalls}
        isDisabled={isLoading || !paymasterServiceUrl}
      >
        SendCalls W/ Paymaster Service
      </Button>
    </Stack>
  ) : (
    <Text fontSize="md" color="yellow">
      Switch to {paymasterServiceSupportedChains.map(ci => ci.chainName).join(', ')} to test this
      feature
    </Text>
  )
}
