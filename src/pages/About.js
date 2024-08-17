import React from 'react';

const About = () => {
  return (
    <>
      <section id='about-sidebar-left'></section>
      <section className='about-container'>
        <div className='neu-card about-text'>
          <ul>
           
            <li>
              <img
                src='/img/tfjs.png'
                className='logo-tfjs'
                alt='TensorFlowJS'
              />
              <img
                src='/img/reactjs.png'
                className='logo-reactjs'
                alt='ReactJS'
              />
            </li>
            
          </ul>
        </div>
      </section>
      <section id='about-sidebar-right'></section>
    </>
  );
};

export default About;
