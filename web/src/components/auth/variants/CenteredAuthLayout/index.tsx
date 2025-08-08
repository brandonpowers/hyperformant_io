import React from 'react';
import NavbarAuth from 'components/ui/navbar/NavbarAuth';
import Footer from 'components/ui/footer/Footer';

const Centered = (props: { maincard: JSX.Element }) => {
  const { maincard } = props;
  return (
    <div className="flex min-h-screen w-full flex-col self-center justify-self-center bg-gradient-main">
      <NavbarAuth />
      <div className="flex-1 flex items-center justify-center py-12">
        {maincard}
      </div>
      <Footer />
    </div>
  );
};

export default Centered;
