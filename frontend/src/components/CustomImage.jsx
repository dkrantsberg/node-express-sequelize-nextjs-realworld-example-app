import React from 'react'

import { defaultProfileImage } from '@/config'

// https://stackoverflow.com/questions/34097560/react-js-replace-img-src-onerror
const handleBrokenImage = (e) => {
  e.target.src = defaultProfileImage
  e.target.onerror = null
}

const CustomImage = ({ src, alt, className }) => {
  const classes = ['hide-text']
  if (className) {
    classes.push(className)
  }
  return (
    <img
      {...{
        alt,
        src,
        onError: handleBrokenImage,
        className: classes.join(' '),
      }}
    />
  )
}

export default CustomImage
