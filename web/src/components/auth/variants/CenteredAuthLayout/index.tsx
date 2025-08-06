import React from 'react';
import NavbarAuth from 'components/ui/navbar/NavbarAuth';
import Footer from 'components/ui/footer/Footer';

const Centered = (props: { maincard: JSX.Element }) => {
  const { maincard } = props;
  return (
    <div className="flex min-h-screen w-full flex-col self-center justify-self-center [background:linear-gradient(180deg,rgba(255,255,255,.15),#fff),linear-gradient(234deg,#215578_20%,#fff)] dark:[background:linear-gradient(180deg,rgba(0,0,0,.15),#000),linear-gradient(234deg,#215578_20%,#000)]">
      <NavbarAuth />
      <div className="flex-1 flex items-center justify-center py-12">
        {maincard}
      </div>
      <Footer />
    </div>
  );
};

export default Centered;
