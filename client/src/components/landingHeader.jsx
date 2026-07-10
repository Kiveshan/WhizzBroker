"use client"
import "../css/modal.module.css"

const Header = ({ onLoginClick, onRegisterClick }) => {
  return (
    <header className="header2">
      <div className="header-spacer" />
      <div className="header-buttons1">
        <button className="header-btn login-btn" onClick={onLoginClick}>
          Login
        </button>
        {/* <button className="header-btn register-btn" onClick={onRegisterClick}>
          Register
        </button> */}
      </div>
    </header>
  )
}

export default Header

