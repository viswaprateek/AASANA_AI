import React from 'react';
import {  Link } from 'raviger'
import './Header.css'

import DarkMode from './DarkMode';
const Header = () => {
  return (
    <header>
      <div className='heading-left-1'></div>
      <div className='heading-left-2'></div>
      <span className='heading'>AASANA-AI</span>
      <div className='link-wrapper'>
         <Link href="/">Home</Link>
        <Link href="/about">About</Link>
      </div>

      <DarkMode />
    </header>
  );
};

export default Header;
