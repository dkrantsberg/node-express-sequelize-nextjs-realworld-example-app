import React from 'react'
import { NavLink as RouterNavLink } from 'react-router-dom'

const NavLink = ({ href, onClick, children }) => {
  return (
    <RouterNavLink
      to={href}
      end
      onClick={onClick}
      className={({ isActive }) => `${isActive ? 'active ' : ''}nav-link`}
    >
      {children}
    </RouterNavLink>
  )
}

export default NavLink
