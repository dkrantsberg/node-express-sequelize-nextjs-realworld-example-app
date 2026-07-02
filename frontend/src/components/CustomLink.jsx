/* Helper for a link that accepts parameters such as className */

import React from 'react'
import { Link } from 'react-router-dom'

const CustomLink = ({ className, href, onClick, children }) => {
  return (
    <Link to={href} onClick={onClick} className={className || ''}>
      {children}
    </Link>
  )
}

export default CustomLink
