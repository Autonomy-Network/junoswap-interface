import 'normalize.css'
import 'styles/globals.scss'
import 'focus-visible'

import { ErrorBoundary } from 'components/ErrorBoundary'
// import { TestnetDialog } from 'components/TestnetDialog'
import {
  globalCss,
  styled,
  useSubscribeDefaultAppTheme,
  useThemeClassName,
} from 'junoblocks'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'
import { RecoilRoot } from 'recoil'
import { queryClient } from 'services/queryClient'

import { __TEST_MODE__ } from '../util/constants'

const applyGlobalStyles = globalCss({
  body: {
    backgroundColor: '$backgroundColors$base',
  },
})

function NextJsAppRoot({ children }) {
  const themeClassName = useThemeClassName()

  useSubscribeDefaultAppTheme()

  /* apply theme class on body also */
  useEffect(() => {
    document.body.classList.add(themeClassName)
    applyGlobalStyles()
    return () => {
      document.body.classList.remove(themeClassName)
    }
  }, [themeClassName])

  return (
    <StyledContentWrapper
      data-app-wrapper=""
      lang="en-US"
      className={typeof window === 'undefined' ? null : themeClassName}
      suppressHydrationWarning
    >
      {typeof window === 'undefined' ? null : children}
    </StyledContentWrapper>
  )
}

const StyledContentWrapper = styled('div', {
  backgroundColor: '$backgroundColors$base',
})

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <RecoilRoot>
      <QueryClientProvider client={queryClient}>
        <NextJsAppRoot>
          <ErrorBoundary>
            <Component {...pageProps} />
            {/* {__TEST_MODE__ && <TestnetDialog />} */}
            <Toaster position="top-right" toastOptions={{ duration: 10000 }} />
          </ErrorBoundary>
        </NextJsAppRoot>
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      </QueryClientProvider>
    </RecoilRoot>
  )
}

export default MyApp
