import { NavLink, Outlet } from "react-router-dom";

export function Layout() {
  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <NavLink to="/" className="nav-brand">
            TalentMesh
          </NavLink>
          <nav className="nav-links">
            <NavLink to="/candidates" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              Candidates
            </NavLink>
            <NavLink to="/jobs" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              Jobs
            </NavLink>
            <NavLink to="/skill-gap" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              Skill Gap
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="app-shell">
        <Outlet />
      </main>
    </>
  );
}
