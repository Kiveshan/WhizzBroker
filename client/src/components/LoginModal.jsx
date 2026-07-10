"use client";

function LoginModal({ onClose, onSubmit, onSwitchToRegister }) {
  return (
    <div className="modal active">
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Login.jpg-9st7NYUcTeqReWZBx5pIoT7XYuw3UN.jpeg"
            alt="LogiTech Flow Logo"
            className="modal-logo"
          />
          <h2 className="modal-title">Login</h2>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Enter Email"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter Password"
              className="form-input"
            />
          </div>

          <div className="forgot-password">
            Forgot your password?{" "}
            <a href="#" className="link">
              Click Here
            </a>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={onSubmit}>
              Login
            </button>
          </div>

          <div className="form-footer">
            New Profile{" "}
            <a
              href="#"
              className="link"
              onClick={(e) => {
                e.preventDefault();
                onSwitchToRegister();
              }}
            >
              Register Here
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
