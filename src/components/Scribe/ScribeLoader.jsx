import Lottie from 'lottie-react'
import React from 'react'

import animationData from '@/assets/scribeLoaderAnimation.json'
import styles from '@/components/Scribe/styles.styl'

/**
 * The loader of the former scribe
 *
 * @param {object} props
 * @param {20|40} props.size - 40 in the compact layout
 */
export function ScribeLoader({ size }) {
  return (
    <Lottie
      animationData={animationData}
      loop
      autoplay
      aria-hidden="true"
      className={
        size === 40 ? styles['scribe-loader-large'] : styles['scribe-loader']
      }
    />
  )
}
