import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <span className="brand">ApplyWise</span>
      <nav>
        <NavLink to="/" end>
          Dashboard
        </NavLink>
        <NavLink to="/match">AI Match</NavLink>
      </nav>
      <div className="navbar-user">
        <span>{user?.name}</span>
        <button className="link" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
}
