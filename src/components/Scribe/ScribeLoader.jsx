import Lottie from 'lottie-react'
import React from 'react'

import useMediaQuery from 'cozy-ui/transpiled/react/hooks/useMediaQuery'

import animationData from '@/assets/scribeLoaderAnimation.json'
import styles from '@/components/Scribe/styles.styl'

/**
 * The loader of the former scribe, held on its first frame for a user who
 * asks for reduced motion: the label beside it tells what goes on
 *
 * @param {object} props
 * @param {20|40} props.size - 40 in the compact layout
 */
export function ScribeLoader({ size }) {
  const isMotionReduced = useMediaQuery('(prefers-reduced-motion: reduce)')

  return (
    <Lottie
      animationData={animationData}
      loop={!isMotionReduced}
      autoplay={!isMotionReduced}
      aria-hidden="true"
      className={
        size === 40 ? styles['scribe-loader-large'] : styles['scribe-loader']
      }
    />
  )
}
