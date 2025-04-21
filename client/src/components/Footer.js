import React from 'react';
import '../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-branding">
            <h3>Hell's Kitchen</h3>
            <p>A Gordon Ramsay-inspired health & fitness app</p>
          </div>
          
          <div className="footer-links">
            <div className="footer-section">
              <h4>Navigation</h4>
              <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/profile">User Profile</a></li>
                <li><a href="/recipe-extractor">Recipe Extractor</a></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>Resources</h4>
              <ul>
                <li><a href="https://www.gordonramsay.com/" target="_blank" rel="noopener noreferrer">Gordon Ramsay Official</a></li>
                <li><a href="https://www.youtube.com/user/gordonramsay" target="_blank" rel="noopener noreferrer">YouTube Channel</a></li>
                <li><a href="https://www.fox.com/hells-kitchen/" target="_blank" rel="noopener noreferrer">Hell's Kitchen Show</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Hell's Kitchen Fitness App. All rights reserved.</p>
          <p>This is a demo app and not affiliated with Gordon Ramsay or Hell's Kitchen.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;