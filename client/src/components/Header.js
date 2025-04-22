import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Header.css';

const Header = () => {
  const location = useLocation();
  const [showDevMenu, setShowDevMenu] = useState(false);
  
  const toggleDevMenu = () => {
    setShowDevMenu(!showDevMenu);
  };
  
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
            <li className="dev-menu-toggle">
              <button onClick={toggleDevMenu}>
                Dev Tools {showDevMenu ? '▲' : '▼'}
              </button>
              {showDevMenu && (
                <div className="dev-dropdown">
                  <ul>
                    <li className={location.pathname === '/test-socket' ? 'active' : ''}>
                      <Link to="/test-socket">Socket Tester</Link>
                    </li>
                    <li className={location.pathname === '/recipe-tester' ? 'active' : ''}>
                      <Link to="/recipe-tester">Recipe Tester</Link>
                    </li>
                    <li className={location.pathname === '/youtube-extractor' ? 'active' : ''}>
                      <Link to="/youtube-extractor">YouTube Extractor</Link>
                    </li>
                  </ul>
                </div>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;