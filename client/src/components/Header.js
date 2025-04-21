import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Header.css';

const Header = () => {
  const location = useLocation();
  
  return (
    <header className="header">
      <div className="container header-container">
        <div className="logo">
          <Link to="/">
            <h1>Hell's Kitchen</h1>
            <span className="tagline">Where Dreams Become Nightmares</span>
          </Link>
        </div>
        
        <nav className="main-nav">
          <ul>
            <li className={location.pathname === '/' ? 'active' : ''}>
              <Link to="/">Home</Link>
            </li>
            <li className={location.pathname === '/profile' ? 'active' : ''}>
              <Link to="/profile">Profile</Link>
            </li>
            <li className={location.pathname === '/recipe-extractor' ? 'active' : ''}>
              <Link to="/recipe-extractor">Recipe Extractor</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;